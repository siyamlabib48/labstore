import React, { useEffect, useRef } from 'react';
import { ChevronUp, Loader2, MessagesSquare } from 'lucide-react';
import useChat from '@/hooks/useChat';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatComposer from '@/components/chat/ChatComposer';

export default function ChatRoom({ batchId, scope, lab, user, showLab, placeholder, emptyTitle, emptyHint, onSeen }) {
  const { messages, loading, loadingOlder, hasMore, loadOlder, send, remove } = useChat({ batchId, scope, lab, user });
  const scrollRef = useRef(null);
  const viewRef = useRef({ firstId: null, height: 0, top: 0 });
  const seenRef = useRef('');
  const onSeenRef = useRef(onSeen);
  onSeenRef.current = onSeen;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const firstId = messages[0]?.id || null;
    const prev = viewRef.current;
    if (prev.firstId && firstId && prev.firstId !== firstId) {
      // An older page was prepended: keep the viewport on the same message
      // instead of jumping to the bottom.
      node.scrollTop = prev.top + (node.scrollHeight - prev.height);
    } else if (!loading) {
      node.scrollTop = node.scrollHeight;
    }
    viewRef.current = { firstId, height: node.scrollHeight, top: node.scrollTop };
  }, [messages, loading]);

  // Tell the chat page the newest message this member has on screen, so the
  // room's unread marker can clear. Guarded by the last reported timestamp
  // so it fires once per new message, not on every render.
  useEffect(() => {
    const latest = messages[messages.length - 1];
    if (!latest?.created_date || seenRef.current === latest.created_date) return;
    seenRef.current = latest.created_date;
    onSeenRef.current?.(latest.created_date);
  }, [messages]);

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-white">
      <div ref={scrollRef} className="h-[56vh] min-h-[320px] space-y-4 overflow-y-auto bg-background/40 px-3 py-4 sm:px-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <MessagesSquare className="mx-auto h-7 w-7 text-muted-foreground" />
            <h3 className="mt-3 font-heading text-lg font-bold tracking-tight">{emptyTitle}</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">{emptyHint}</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-1">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
                >
                  {loadingOlder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                  Load older messages
                </button>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                mine={message.created_by_id === user.id}
                showLab={showLab}
                onDelete={remove}
              />
            ))}
          </>
        )}
      </div>

      <ChatComposer onSend={send} placeholder={placeholder} />
    </div>
  );
}
