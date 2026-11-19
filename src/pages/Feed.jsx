import React, { useMemo, useState } from 'react';
import { Loader2, MessagesSquare } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useBatch } from '@/lib/BatchContext';
import { canModerateContent } from '@/lib/staffRoles';
import useFeed from '@/hooks/useFeed';
import PostComposer from '@/components/feed/PostComposer';
import PostCard from '@/components/feed/PostCard';
import FeedScopeTabs from '@/components/feed/FeedScopeTabs';
import SupportNote from '@/components/feed/SupportNote';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { key: 'latest', label: 'Latest' },
  { key: 'popular', label: 'Popular' },
];

export default function Feed() {
  const { user } = useAuth();
  const { activeBatch } = useBatch();
  const feedBatch = activeBatch?.id || user?.batch || '';
  const canModerate = canModerateContent(user);
  const [scope, setScope] = useState('all');
  const [sort, setSort] = useState('latest');
  const {
    posts,
    likes,
    votes,
    commentVotes,
    comments,
    loading,
    loadingMore,
    hasMore,
    error,
    load,
    loadMore,
    createPost,
    updatePost,
    deletePost,
    setReaction,
    toggleVote,
    addComment,
    toggleCommentVote,
    deleteComment,
  } = useFeed(user, feedBatch, scope === 'lab' ? user?.lab || '' : '', scope === 'academy');

  // Popular re-orders what is already on screen — the score comes from the
  // hydrated maps (net votes + reactions + comments), never from new queries.
  // Limitation: it ranks only the loaded pages, so a very popular older post
  // still has to be loaded ("Load older posts") before it can surface.
  const displayPosts = useMemo(() => {
    if (sort !== 'popular') return posts;
    const scoreOf = (post) =>
      (votes[post.id]?.score || 0) +
      (likes[post.id]?.total || 0) +
      (comments[post.id]?.length || 0);
    return [...posts].sort(
      (a, b) =>
        scoreOf(b) - scoreOf(a) ||
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );
  }, [posts, sort, votes, likes, comments]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          The open wall
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          Golpo-Gujob
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Stories, updates and small wins from every lab in your batch. Post a thought, a screenshot
          or a rumour worth sharing — classmates in your batch can react and reply.
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-4">
        <SupportNote />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <FeedScopeTabs scope={scope} onChange={setScope} lab={user?.lab} />

          <div className="inline-flex rounded-full border border-border/80 bg-white p-1">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSort(option.key)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                  sort === option.key
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <PostComposer user={user} onCreate={createPost} />

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="The wall could not load"
            message={error}
            onRetry={load}
          />
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
            <MessagesSquare className="mx-auto h-7 w-7 text-muted-foreground" />
            <h2 className="mt-3 font-heading text-xl font-bold tracking-tight">Nothing here yet</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              {scope === 'lab'
                ? 'Nobody in your lab has posted yet — be the first to say something.'
                : scope === 'academy'
                  ? 'No academy-wide posts yet — posts shared with the whole academy will show up here.'
                  : 'Be the first to say something — the wall is empty until somebody talks.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                reaction={likes[post.id]}
                vote={votes[post.id]}
                comments={comments[post.id] || []}
                commentVotes={commentVotes}
                onReact={setReaction}
                onVote={toggleVote}
                onAddComment={addComment}
                onVoteComment={toggleCommentVote}
                onDeleteComment={deleteComment}
                onDelete={deletePost}
                onEdit={updatePost}
                canModerate={canModerate}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center pt-1">
            <Button variant="outline" className="rounded-full" onClick={loadMore} disabled={loadingMore}>
              {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load older posts
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}