import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import AccessDenied from '@/components/gates/AccessDenied';

// Route-level guard: renders the page only when the signed-in member passes
// `can`. Unauthenticated visitors are handled by the Layout gate, so this only
// produces an access-denied state.
export default function RoleGuard({ can, deniedTitle, deniedMessage, children }) {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  if (user && !can(user)) {
    return <AccessDenied title={deniedTitle} message={deniedMessage} />;
  }

  return children;
}