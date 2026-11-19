import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import PendingScreen from '@/components/gates/PendingScreen';
import { isApproved } from '@/lib/staffRoles';

// The single landing page for accounts that are not approved yet. It sits
// outside the app layout, so no page or query runs while waiting.
export default function PendingApproval() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isApproved(user)) return <Navigate to="/" replace />;

  return <PendingScreen user={user} rejected={user.approval_status === 'rejected'} />;
}