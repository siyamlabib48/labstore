import React from 'react';
import { CalendarClock, Eye, Trash2 } from 'lucide-react';
import { staffRoleOf } from '@/lib/staffRoles';
import { announcementCategoryOf } from '@/lib/announcementCategories';
import { initials, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import AttachmentsList from '@/components/common/AttachmentsList';

export default function AnnouncementCard({ item, canDelete, onDelete, isNew = false, readCount = null }) {
  const role = staffRoleOf(item.author_role);
  const category = announcementCategoryOf(item.category);
  const eventDate = item.event_at ? new Date(item.event_at) : null;
  const showEvent = eventDate && !Number.isNaN(eventDate.getTime());

  return (
    <article className="rounded-3xl border border-border/70 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold uppercase text-background">
          {initials(item.author_name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-heading text-base font-bold tracking-tight">{item.title}</h3>
            {item.priority === 'important' && (
              <span className="rounded-full bg-[#DC2626]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#B91C1C]">
                Important
              </span>
            )}
            {item.category && item.category !== 'general' && (
              <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide', category.chip)}>
                {category.label}
              </span>
            )}
            {isNew && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DB2777] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                <span className="h-1 w-1 rounded-full bg-white" />
                New
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/80">{item.author_name || 'Academy'}</span>
            <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', role.chip)}>
              {role.short}
            </span>
            {timeAgo(item.created_date)}
            {readCount !== null && (
              <span className="inline-flex items-center gap-1" title="Members who have seen this announcement">
                <Eye className="h-3 w-3" /> Read by {readCount}
              </span>
            )}
          </p>
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            title="Delete announcement"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85">
        {item.body}
      </p>

      {showEvent && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1.5 text-xs font-semibold text-foreground/80">
          <CalendarClock className="h-3.5 w-3.5" />
          {eventDate.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      )}

      {(item.attachments?.length || 0) > 0 && (
        <div className="mt-3">
          <AttachmentsList attachments={item.attachments} imageClassName="max-h-64" />
        </div>
      )}
    </article>
  );
}
