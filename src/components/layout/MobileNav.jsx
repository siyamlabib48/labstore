import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { navItems } from '@/lib/navItems';
import { canManageBatch } from '@/lib/staffRoles';
import { usePendingCount } from '@/hooks/useFriends';
import MobileMoreMenu from '@/components/layout/MobileMoreMenu';
import { cn } from '@/lib/utils';

// Four primary destinations plus a More sheet, so the bar never scrolls or
// squeezes eleven links into one cramped row on a phone.
const PRIMARY = ['/', '/gallery', '/golpo-gujob', '/announcements'];

export default function MobileNav({ user }) {
  const pending = usePendingCount(user?.id);
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = navItems({ canManage: canManageBatch(user), pending });

  const primary = PRIMARY.map((to) => items.find((item) => item.to === to)).filter(Boolean);
  const secondary = items.filter((item) => !PRIMARY.includes(item.to));
  const secondaryBadge = secondary.reduce((total, item) => total + (item.badge || 0), 0);
  const onSecondary = secondary.some((item) => pathname === item.to);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-white/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 items-stretch pb-[env(safe-area-inset-bottom)]">
          {primary.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-0 flex-col items-center gap-1 px-0.5 pb-2 pt-2.5 text-[9px] font-semibold transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon className={cn('h-[18px] w-[18px]', isActive && 'stroke-[2.4]')} />
                      {item.badge > 0 && (
                        <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#DB2777] px-1 text-[8px] font-bold leading-none text-white">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-center">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 px-0.5 pb-2 pt-2.5 text-[9px] font-semibold transition-colors',
              onSecondary ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <span className="relative">
              <MoreHorizontal className={cn('h-[18px] w-[18px]', onSecondary && 'stroke-[2.4]')} />
              {secondaryBadge > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#DB2777] px-1 text-[8px] font-bold leading-none text-white">
                  {secondaryBadge}
                </span>
              )}
            </span>
            <span className="w-full truncate text-center">More</span>
          </button>
        </div>
      </nav>

      <MobileMoreMenu open={moreOpen} onOpenChange={setMoreOpen} items={secondary} />
    </>
  );
}