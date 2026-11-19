import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, UserX } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ProfileHeader from '@/components/profile/ProfileHeader';
import FriendButton from '@/components/profile/FriendButton';
import EditProfileDialog from '@/components/profile/EditProfileDialog';
import ProfilePostItem from '@/components/profile/ProfilePostItem';
import WorkCard from '@/components/work/WorkCard';
import ErrorState from '@/components/common/ErrorState';

const POSTS_PAGE_SIZE = 10;

export default function Profile() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const targetId = id || user?.id;
  const isMe = !id || id === user?.id;

  const [profile, setProfile] = useState(null);
  const [works, setWorks] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postCounts, setPostCounts] = useState({});
  const [postsCursor, setPostsCursor] = useState(null);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');

  // Reaction/comment totals for a page of posts, in two batched reads — the
  // same hydration shape the feed uses, never one query per post.
  const hydratePostCounts = async (rows) => {
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return;
    const [likePage, commentPage] = await Promise.all([
      base44.entities.PostLike.filter({ post_id: { $in: ids } }, { limit: 500 }),
      base44.entities.PostComment.filter({ post_id: { $in: ids } }, { limit: 500 }),
    ]);
    const counts = {};
    ids.forEach((id) => {
      counts[id] = { reactions: 0, comments: 0 };
    });
    (likePage.items || []).forEach((row) => {
      if (counts[row.post_id]) counts[row.post_id].reactions += 1;
    });
    (commentPage.items || []).forEach((row) => {
      if (counts[row.post_id]) counts[row.post_id].comments += 1;
    });
    setPostCounts((prev) => ({ ...prev, ...counts }));
  };

  const load = async () => {
    if (!targetId) return;
    setError('');
    try {
      const res = await base44.functions.invoke('getProfile', { user_id: targetId });
      if (res.data?.error || !res.data?.profile) {
        setMissing(true);
        setLoading(false);
        return;
      }
      setProfile(res.data.profile);

      const page = await base44.entities.Work.filter(
        { created_by_id: targetId },
        { sort: '-created_date', limit: 6 }
      );
      setWorks(page.items || []);

      // The member's wall posts. Post RLS decides what this viewer may read:
      // the owner gets every post including private ones, a visitor only the
      // posts they could already see on the feed.
      try {
        const postPage = await base44.entities.Post.filter(
          { created_by_id: targetId },
          { sort: '-created_date', limit: POSTS_PAGE_SIZE }
        );
        const rows = postPage.items || [];
        setPosts(rows);
        setPostsCursor(postPage.next_cursor || null);
        setPostsHasMore(!!postPage.has_more);
        await hydratePostCounts(rows);
      } catch (postErr) {
        setPosts([]);
        setPostsHasMore(false);
      }
    } catch (err) {
      setError(err.message || 'Could not load this profile');
    }
    setLoading(false);
  };

  const loadMorePosts = async () => {
    if (!postsCursor || loadingMorePosts) return;
    setLoadingMorePosts(true);
    try {
      const postPage = await base44.entities.Post.filter(
        { created_by_id: targetId },
        { sort: '-created_date', limit: POSTS_PAGE_SIZE, cursor: postsCursor }
      );
      const rows = postPage.items || [];
      setPosts((prev) => [...prev, ...rows]);
      setPostsCursor(postPage.next_cursor || null);
      setPostsHasMore(!!postPage.has_more);
      await hydratePostCounts(rows);
    } catch (err) {
      setPostsHasMore(false);
    }
    setLoadingMorePosts(false);
  };

  useEffect(() => {
    setLoading(true);
    setMissing(false);
    load();
  }, [targetId]);

  useEffect(() => {
    if (!missing) return undefined;
    const tag = document.createElement('meta');
    tag.name = 'prerender-status-code';
    tag.content = '404';
    document.head.appendChild(tag);
    return () => tag.remove();
  }, [missing]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Profile could not load"
        message={error}
        onRetry={() => {
          setLoading(true);
          load();
        }}
      />
    );
  }

  if (missing || !profile) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-20 text-center">
        <UserX className="mx-auto h-7 w-7 text-muted-foreground" />
        <h2 className="mt-3 font-heading text-xl font-bold tracking-tight">Profile not found</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          This member may have been removed from the academy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProfileHeader
        profile={profile}
        isMe={isMe}
        actions={
          isMe ? (
            <EditProfileDialog
              user={user}
              onSaved={async () => {
                await refreshUser();
                await load();
              }}
            />
          ) : (
            <FriendButton me={user} target={profile} />
          )
        }
      />

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {isMe ? 'Your recent works' : 'Public works'}
        </h2>

        {works.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white/60 px-5 py-12 text-center">
            <p className="text-sm font-semibold">Nothing public yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              {isMe
                ? 'Upload a work with "Everyone" visibility and it will show up here.'
                : 'This member has not shared any public works yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {isMe ? 'Your posts' : 'Posts'}
        </h2>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white/60 px-5 py-12 text-center">
            <p className="text-sm font-semibold">No posts to show</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              {isMe
                ? 'Posts you share on the wall will show up here.'
                : 'This member has not shared any posts you can see yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <ProfilePostItem
                key={post.id}
                post={post}
                profile={profile}
                counts={postCounts[post.id]}
              />
            ))}
            {postsHasMore && (
              <button
                type="button"
                onClick={loadMorePosts}
                disabled={loadingMorePosts}
                className="mx-auto flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50"
              >
                {loadingMorePosts && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Load more posts
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}