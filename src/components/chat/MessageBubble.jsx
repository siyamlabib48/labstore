import React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initials, timeAgo } from '@/lib/format';
import LabBadge from '@/components/common/LabBadge';
import AttachmentsList from '@/components/common/AttachmentsList';

export default function MessageBubble({ message, mine, showLab, onDelete }) {
  const name = message.author_name || 'Member';

  return (
    <div className={cn('group flex w-full gap-2', mine ? 'justify-end' : 'justify-start')}>
      {!mine && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase text-muted-foreground">
          {initials(name)}
        </div>
      )}

      <div className={cn('max-w-[78%] space-y-1', mine && 'items-end text-right')}>
        {!mine && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-semibold text-foreground">{name}</span>
            {showLab && message.author_lab && <LabBadge lab={message.author_lab} />}
          </div>
        )}

        {(message.attachments?.length || 0) > 0 && (
          <div className="w-60 max-w-full sm:w-72">
            <AttachmentsList attachments={message.attachments} />
          </div>
        )}

        {!!(message.body || '').trim() && (
          <div
            className={cn(
              'relative inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
              mine
                ? 'rounded-br-md bg-foreground text-background'
                : 'rounded-bl-md border border-border/70 bg-white text-foreground'
            )}
          >
            {message.body}
          </div>
        )}

        <div className={cn('flex items-center gap-2 text-[10px] text-muted-foreground', mine && 'justify-end')}>
          <span title={new Date(message.created_date).toLocaleString()}>
            {timeAgo(message.created_date)}
          </span>
          {mine && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className="inline-flex items-center gap-0.5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}