import React, { useState } from 'react';
import { CornerDownRight, Loader2, Send } from 'lucide-react';
import CommentVoteButtons from '@/components/feed/CommentVoteButtons';
import DeleteCommentButton from '@/components/feed/DeleteCommentButton';
import ReportButton from '@/components/feed/ReportButton';
import { initials, timeAgo } from '@/lib/format';

export default function CommentItem({ comment, replyingTo = '', onReply, vote, onVote, canDelete = false, onDelete, userId }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    await onReply(body, comment.id);
    setText('');
    setOpen(false);
    setSending(false);
  };

  return (
    <div className="flex items-start gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold uppercase text-muted-foreground">
        {initials(comment.author_name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="rounded-xl bg-muted/60 px-2.5 py-1.5">
          {replyingTo && (
            <p className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              <CornerDownRight className="h-2.5 w-2.5" />
              {replyingTo}
            </p>
          )}
          <p className="text-[11px] font-semibold">
            {comment.author_name || 'Member'}
            <span className="ml-1.5 font-normal text-muted-foreground">
              {timeAgo(comment.created_date)}
            </span>
          </p>
          <p className="whitespace-pre-line break-words text-xs leading-relaxed text-foreground/80">
            {comment.body}
          </p>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 px-1">
          <CommentVoteButtons vote={vote} onVote={onVote} />

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {open ? 'Cancel' : 'Reply'}
          </button>

          {canDelete && <DeleteCommentButton onDelete={() => onDelete(comment.id)} />}

          {userId && comment.created_by_id !== userId && (
            <ReportButton
              variant="text"
              targetType="comment"
              targetId={comment.id}
              batch={comment.batch}
              userId={userId}
            />
          )}
        </div>

        {open && (
          <form onSubmit={submit} className="mt-1 flex items-center gap-1.5">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={400}
              autoFocus
              placeholder={`Reply to ${comment.author_name || 'member'}…`}
              className="h-8 flex-1 rounded-full border border-border bg-background px-3 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-40"
              title="Send reply"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}