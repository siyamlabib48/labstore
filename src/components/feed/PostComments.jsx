import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import CommentItem from '@/components/feed/CommentItem';

export default function PostComments({
  comments,
  onAdd,
  userId,
  commentVotes = {},
  onVoteComment,
  onDeleteComment,
  canModerate = false,
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const byId = comments.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const rootOf = (comment) => {
    let current = comment;
    while (current.parent_id && byId[current.parent_id]) current = byId[current.parent_id];
    return current;
  };

  const roots = comments.filter((comment) => !comment.parent_id || !byId[comment.parent_id]);
  const threadOf = (root) =>
    comments.filter((comment) => comment.id !== root.id && rootOf(comment).id === root.id);

  const submit = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    await onAdd(body);
    setText('');
    setSending(false);
  };

  return (
    <div className="mt-3 space-y-3 border-t border-border/70 pt-3">
      {comments.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No comments yet — start the thread.</p>
      ) : (
        <div className="space-y-3">
          {roots.map((root) => {
            const replies = threadOf(root);
            return (
              <div key={root.id} className="space-y-2">
                <CommentItem
                  comment={root}
                  onReply={onAdd}
                  vote={commentVotes[root.id]}
                  onVote={(value) => onVoteComment(root.id, value)}
                  canDelete={canModerate || root.created_by_id === userId}
                  onDelete={(id) => onDeleteComment(id)}
                  userId={userId}
                />
                {replies.length > 0 && (
                  <div className="space-y-2 border-l border-border/70 pl-3">
                    {replies.map((reply) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        replyingTo={
                          reply.parent_id !== root.id ? byId[reply.parent_id]?.author_name : ''
                        }
                        onReply={onAdd}
                        vote={commentVotes[reply.id]}
                        onVote={(value) => onVoteComment(reply.id, value)}
                        canDelete={canModerate || reply.created_by_id === userId}
                        onDelete={(id) => onDeleteComment(id)}
                        userId={userId}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={400}
          placeholder="Write a comment…"
          className="h-8 flex-1 rounded-full border border-border bg-background px-3 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-40"
          title="Send comment"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </form>
    </div>
  );
}