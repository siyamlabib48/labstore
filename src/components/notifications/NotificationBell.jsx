import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export default function NotificationBell({ className }) {
  const unread = useUnreadCount();

  return (
    <Link
      to="/notifications"
      title="Notifications"
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className
      )}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DB2777] px-1 text-[9px] font-bold leading-none text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}