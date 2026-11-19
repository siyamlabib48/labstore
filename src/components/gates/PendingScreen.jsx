import React from 'react';
import { Clock, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function PendingScreen({ user, rejected = false }) {
  const { checkUserAuth, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-white p-8 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.4)]">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
            rejected ? 'bg-[#DB2777]/10 text-[#BE185D]' : 'bg-[#E1861B]/10 text-[#B45309]'
          }`}
        >
          {rejected ? <XCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
        </div>

        <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight">
          {rejected ? 'Access not approved' : 'Waiting for approval'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {rejected
            ? 'Your sign-up was not approved. Talk to the lab owner if you think this is a mistake.'
            : 'The owner still needs to approve your account and assign you to a lab. You will get full access as soon as that happens.'}
        </p>

        <div className="mt-5 rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          Signed in as {user?.email}
        </div>

        {!rejected && (
          <Button variant="outline" className="mt-5 w-full" onClick={() => checkUserAuth()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Check again
          </Button>
        )}
        <Button variant="ghost" className="mt-2 w-full text-muted-foreground" onClick={() => logout()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}