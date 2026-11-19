import React from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { BatchProvider } from '@/lib/BatchContext';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import BatchSwitcher from '@/components/layout/BatchSwitcher';
import SignInScreen from '@/components/gates/SignInScreen';
import QuotaMeter from '@/components/account/QuotaMeter';
import NotificationBell from '@/components/notifications/NotificationBell';
import useMyWorks from '@/hooks/useMyWorks';
import { isApproved } from '@/lib/staffRoles';
import { Image } from '@/components/ui/image';
import { initials } from '@/lib/format';

export default function Layout() {
  const { user, isLoadingAuth } = useAuth();
  const { usedBytes } = useMyWorks(user?.id);

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!user) return <SignInScreen />;

  // The approval gate lives in one place: an unapproved account never mounts a
  // page, so no page query can leak data before staff approve it.
  if (!isApproved(user)) {
    return <Navigate to="/pending-approval" replace />;
  }

  return (
    <BatchProvider>
      <div className="min-h-screen bg-background">
        <Sidebar user={user} usedBytes={usedBytes} />

        <div className="lg:pl-[260px]">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 py-2.5 backdrop-blur lg:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground">
                <span className="font-heading text-[11px] font-bold text-background">LS</span>
              </div>
              <BatchSwitcher compact className="min-w-0 flex-1 border-none bg-transparent px-0" />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell />
              <QuotaMeter usedBytes={usedBytes} compact className="w-16 border-none bg-transparent p-0" />
              <Link
                to="/profile"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-foreground text-[10px] font-bold uppercase text-background"
              >
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.full_name || 'Profile'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(user?.full_name || user?.email)
                )}
              </Link>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-16 lg:pt-10">
            <Outlet />
          </main>
        </div>

        <MobileNav user={user} />
      </div>
    </BatchProvider>
  );
}