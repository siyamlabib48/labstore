import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { navItems } from '@/lib/navItems';
import { useAuth } from '@/lib/AuthContext';
import LabBadge from '@/components/common/LabBadge';
import QuotaMeter from '@/components/account/QuotaMeter';
import BatchSwitcher from '@/components/layout/BatchSwitcher';
import NotificationBell from '@/components/notifications/NotificationBell';
import { canManageBatch, roleOf } from '@/lib/staffRoles';
import { initials } from '@/lib/format';
import { Image } from '@/components/ui/image';
import { usePendingCount } from '@/hooks/useFriends';
import { cn } from '@/lib/utils';

export default function Sidebar({ user, usedBytes }) {
  const { logout } = useAuth();
  const canManage = canManageBatch(user);
  const pending = usePendingCount(user?.id);
  const items = navItems({ canManage, pending });
  const role = roleOf(user);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col overflow-y-auto border-r border-border/70 bg-white/60 px-5 py-7 backdrop-blur lg:flex">
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
          <span className="font-heading text-sm font-bold text-background">LS</span>
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-heading text-[15px] font-bold tracking-tight">Labstore</p>
          <p className="text-[11px] text-muted-foreground">Academy cloud</p>
        </div>
        <NotificationBell />
      </div>

      <div className="mt-5">
        <BatchSwitcher />
      </div>

      <nav className="mt-5 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
              {item.badge > 0 && (
                <span className="ml-auto rounded-full bg-[#DB2777] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-6">
        <QuotaMeter usedBytes={usedBytes} />

        <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-white/70 p-2.5">
          <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground text-[11px] font-bold uppercase text-background">
              {user?.avatar_url ? (
                <Image src={user.avatar_url} alt={user?.full_name || 'Profile'} className="h-full w-full object-cover" />
              ) : (
                initials(user?.full_name || user?.email)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {user?.full_name || 'Member'}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                {user?.lab && <LabBadge lab={user.lab} withDot={false} className="px-1.5 py-0.5 text-[10px]" />}
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', role.chip)}>
                  {role.short}
                </span>
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            title="Sign out"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}