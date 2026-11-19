import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCheck, BellOff } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationRow from '@/components/notifications/NotificationRow';
import { Button } from '@/components/ui/button';

export default function Notifications() {
  const navigate = useNavigate();
  const { items, loading, markRead, markAllRead, remove } = useNotifications();
  const unread = items.filter((row) => !row.is_read).length;

  const open = async (item) => {
    if (!item.is_read) await markRead(item.id);
    if (item.link) navigate(item.link);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Inbox
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : 'You are all caught up.'}
          </p>
        </div>

        {unread > 0 && (
          <Button variant="outline" size="sm" className="rounded-full" onClick={markAllRead}>
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
          <BellOff className="mx-auto h-7 w-7 text-muted-foreground" />
          <h2 className="mt-3 font-heading text-xl font-bold tracking-tight">Nothing yet</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            Announcements, friend requests and reactions on your posts will land here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onOpen={open} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  );
}