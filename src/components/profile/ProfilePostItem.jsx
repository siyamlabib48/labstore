import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import AuthorAvatar from '@/components/feed/AuthorAvatar';
import PostVisibilityBadge from '@/components/feed/PostVisibilityBadge';
import PrivateImage from '@/components/common/PrivateImage';
import { timeAgo } from '@/lib/format';

// Read-only rendering of one of the profile owner's posts. The full PostCard
// needs the feed hook's whole interaction machinery (reactions, votes,
// comments, moderation), which would mean building a second interactive feed
// here — so this mirrors its look and shows counts only. Which posts arrive
// is decided by Post RLS: the owner sees all of their posts, a visitor only
// the ones they could already see on the wall.
export default function ProfilePostItem({ post, profile, counts }) {
  return (
    <article className="rounded-3xl border border-border/70 bg-white p-4 sm:p-5">
      <header className="flex items-start gap-2.5">
        <AuthorAvatar name={profile?.full_name} avatarUrl={profile?.avatar_url} className="" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {post.author_name || profile?.full_name || 'Member'}
          </p>
          <p className="text-xs text-muted-foreground">
            {timeAgo(post.created_date)}
            {post.edited ? ' · Edited' : ''}
          </p>
        </div>
        <PostVisibilityBadge visibility={post.visibility} className="" />
      </header>

      {post.content && (
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85">
          {post.content}
        </p>
      )}

      {post.image_uri && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border/70">
          <PrivateImage
            fileUri={post.image_uri}
            alt="Post attachment"
            className="h-60 w-full object-cover sm:h-80"
          />
        </div>
      )}

      <footer className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5" />
          {counts?.reactions || 0}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          {counts?.comments || 0}
        </span>
      </footer>
    </article>
  );
}
