import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase, BYPASS_AUTH, fetchProfile } from '@/api/supabaseClient';
import { getDemoUser } from '@/lib/demoRoles';

const AuthContext = createContext();

// Demo user for the BYPASS_AUTH build flag (see supabaseClient.js): a local
// user that passes the client-side gates so the pages can be reviewed
// without signing in. Its role comes from the demo role switcher preset
// (demoRoles.js) — owner by default. Unlocks the UI shell only, never data.

// There is no hosted "app settings" endpoint anymore; the only consumer
// needed the app id, so a static object keeps that contract.
const APP_PUBLIC_SETTINGS = { id: 'labstore', public_settings: {} };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const authCheckRef = useRef(null);

  useEffect(() => {
    checkAppState();

    // Keep the context in step with the Supabase session: sign-ins and
    // sign-outs in other tabs, token refreshes and password-recovery
    // landings all flow through here.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (BYPASS_AUTH) return;
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        checkUserAuth();
      }
    });
    return () => subscription?.subscription?.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAppState = async () => {
    if (BYPASS_AUTH) {
      setUser(getDemoUser());
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthChecked(true);
      return;
    }
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      setAppPublicSettings(APP_PUBLIC_SETTINGS);

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data.session) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('App state check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'Failed to load app'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    // Collapse concurrent checks into one request.
    if (authCheckRef.current) return authCheckRef.current;
    setIsLoadingAuth(true);

    const run = (async () => {
      let lastError = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          if (!data.user) throw Object.assign(new Error('No session'), { status: 401 });

          const profile = await fetchProfile(data.user);
          if (!profile) {
            // Auth account exists but no profile row: the account was not
            // registered through this app (or its profile was removed).
            setUser(null);
            setIsAuthenticated(false);
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
            return null;
          }

          setUser(profile);
          setIsAuthenticated(true);
          setAuthError(null);
          return profile;
        } catch (error) {
          lastError = error;
          const rejected = error?.status === 401 || error?.status === 403;
          if (rejected || attempt === 1) break;
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      // Only a real auth rejection ends the session — a network blip must not.
      if (lastError?.status === 401 || lastError?.status === 403) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else {
        console.error('User auth check failed:', lastError);
      }
      return null;
    })();

    authCheckRef.current = run;
    try {
      return await run;
    } finally {
      authCheckRef.current = null;
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  // Re-reads the signed-in member without flipping the app into a loading state,
  // so saved profile changes appear instantly instead of flashing a spinner.
  const refreshUser = async () => {
    if (BYPASS_AUTH) {
      const demoUser = getDemoUser();
      setUser(demoUser);
      setIsAuthenticated(true);
      return demoUser;
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const profile = await fetchProfile(data.user);
    if (profile) {
      setUser(profile);
      setIsAuthenticated(true);
    }
    return profile;
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (!BYPASS_AUTH) {
      await supabase.auth.signOut().catch(() => {});
    }
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnTo=${returnTo}`;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
