import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Loader2, MessageCircle, Pencil } from 'lucide-react';
import LabBadge from '@/components/common/LabBadge';
import PrivateImage from '@/components/common/PrivateImage';
import PostComments from '@/components/feed/PostComments';
import PostReactions from '@/components/feed/PostReactions';
import PostVisibilityBadge from '@/components/feed/PostVisibilityBadge';
import AuthorAvatar from '@/components/feed/AuthorAvatar';
import DeletePostButton from '@/components/feed/DeletePostButton';
import ReportButton from '@/components/feed/ReportButton';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function PostCard({
  post,
  user,
  reaction,
  vote,
  comments,
  commentVotes,
  onReact,
  onVote,
  onAddComment,
  onVoteComment,
  onDeleteComment,
  onDelete,
  onEdit,
  canModerate = false,
}) {
  const [open, setOpen] = useState(false);
  const [voting, setVoting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const isMine = post.created_by_id === user?.id;
  // Staff moderate inside their own batch only.
  const inMyBatch = !post.batch || post.batch === user?.batch;
  const canModerateHere = canModerate && inMyBatch;
  // Authors remove their own post; staff moderate inside their own batch only.
  const showDelete = isMine || canModerateHere;
  const voteScore = vote?.score || 0;
  const myVote = vote?.mine || 0;

  const castVote = async (value) => {
    if (voting) return;
    setVoting(true);
    await onVote(post.id, value);
    setVoting(false);
  };

  const startEdit = () => {
    setDraft(post.content || '');
    setEditError('');
    setEditing(true);
  };

  const saveEdit = async () => {
    const content = draft.trim();
    if (!content || saving) {
      if (!content) setEditError('Write something first — or delete the post instead.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      await onEdit(post.id, content);
      setEditing(false);
    } catch (err) {
      setEditError(err.message || 'Could not save your edit');
    }
    setSaving(false);
  };

  return (
    <article className="rounded-3xl border border-border/70 bg-white p-4 sm:p-5">
      <header className="flex items-start gap-2.5">
        <Link to={`/u/${post.created_by_id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
          <AuthorAvatar name={post.author_name} avatarUrl={post.author_avatar} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{post.author_name || 'Member'}</span>
            <span className="flex items-center gap-1.5">
              {post.author_lab && <LabBadge lab={post.author_lab} className="px-1.5 py-0 text-[9px]" />}
              <span className="text-[10px] font-medium text-muted-foreground">
                {timeAgo(post.created_date)}
                {post.edited ? ' · Edited' : ''}
              </span>
              <PostVisibilityBadge
                visibility={post.visibility}
                className="px-1.5 py-0 text-[9px]"
              />
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-0.5">
          {isMine && !editing && (
            <button
              type="button"
              onClick={startEdit}
              title="Edit post"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {!isMine && (
            <ReportButton
              targetType="post"
              targetId={post.id}
              batch={post.batch}
              userId={user?.id}
            />
          )}
          {showDelete && <DeletePostButton isMine={isMine} onDelete={() => onDelete(post.id)} />}
        </div>
      </header>

      {editing ? (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={1000}
            autoFocus
            className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
          />
          {editError && <p className="mt-1.5 text-xs text-destructive">{editError}</p>}
          <div className="mt-2 flex items-center justify-end gap-2">
            <span className="mr-auto text-[11px] text-muted-foreground">{draft.length}/1000</span>
            <button
              type="button"
              className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition-opacity disabled:opacity-40"
              onClick={saveEdit}
              disabled={saving || !draft.trim()}
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      ) : (
        post.content && (
          <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85">
            {post.content}
          </p>
        )
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

      <footer className="mt-3 flex flex-wrap items-center gap-1.5">
        <div className="inline-flex items-center rounded-full border border-border/70 bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => castVote(1)}
            title="Upvote"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
              myVote === 1
                ? 'bg-white text-[#B45309] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <span
            className={cn(
              'min-w-[1.5rem] text-center text-[11px] font-bold tabular-nums',
              voteScore > 0 && 'text-[#B45309]',
              voteScore < 0 && 'text-[#4338CA]',
              voteScore === 0 && 'text-muted-foreground'
            )}
          >
            {voteScore}
          </span>
          <button
            type="button"
            onClick={() => castVote(-1)}
            title="Downvote"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
              myVote === -1
                ? 'bg-white text-[#4338CA] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <PostReactions reaction={reaction} onReact={(type) => onReact(post.id, type)} />

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
            open ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {comments.length ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comment'}
        </button>
      </footer>

      {open && (
        <PostComments
          comments={comments}
          onAdd={(body, parentId) => onAddComment(post.id, body, parentId)}
          userId={user?.id}
          commentVotes={commentVotes}
          onVoteComment={(commentId, value) => onVoteComment(post.id, commentId, value)}
          onDeleteComment={(commentId) => onDeleteComment(post.id, commentId)}
          canModerate={canModerateHere}
        />
      )}
    </article>
  );
}