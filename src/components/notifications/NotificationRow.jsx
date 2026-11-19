import React from 'react';
import {
  Megaphone,
  UserPlus,
  UserCheck,
  UserX,
  ShieldAlert,
  Heart,
  MessageCircle,
  Reply,
  BookOpen,
  Palmtree,
  RefreshCw,
  FileUp,
  X,
  Bell,
} from 'lucide-react';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

const ICONS = {
  announcement: Megaphone,
  friend_request: UserPlus,
  friend_accept: UserCheck,
  friend_approval_needed: ShieldAlert,
  friend_approval_approved: UserCheck,
  friend_approval_rejected: UserX,
  post_like: Heart,
  post_comment: MessageCircle,
  comment_reply: Reply,
  homework: BookOpen,
  holiday: Palmtree,
  batch_update: RefreshCw,
  new_upload: FileUp,
};

export default function NotificationRow({ item, onOpen, onRemove }) {
  const Icon = ICONS[item.type] || Bell;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-2xl border p-3 transition-colors',
        item.is_read ? 'border-border/70 bg-white' : 'border-foreground/15 bg-white'
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            item.is_read ? 'bg-muted text-muted-foreground' : 'bg-foreground text-background'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={cn('truncate text-xs', item.is_read ? 'font-medium' : 'font-bold')}>
              {item.title}
            </span>
            {!item.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#DB2777]" />}
          </span>
          {item.body && (
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.body}</span>
          )}
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {timeAgo(item.created_date)}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        title="Dismiss"
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}