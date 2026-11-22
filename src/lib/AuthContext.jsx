import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { getAccessToken } from '@base44/sdk';
import { base44, BYPASS_AUTH } from '@/api/base44Client';

const AuthContext = createContext();

// Demo user for the BYPASS_AUTH build flag (see base44Client.js): a local
// owner user that passes every client-side gate so the pages can be
// reviewed without signing in. Unlocks the UI shell only, never data.
const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@labstore.local',
  full_name: 'Demo User',
  role: 'admin',
  approval_status: 'approved',
  staff_role: 'owner',
  batch: null,
  lab: null,
};

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
  }, []);

  const checkAppState = async () => {
    if (BYPASS_AUTH) {
      setUser(DEMO_USER);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthChecked(true);
      return;
    }
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      try {
        const publicSettings = await base44.app.getPublicSettings();
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated.
        // getAccessToken() also persists a token handed over in the URL, so the
        // session survives a reload instead of dropping back to signed-out.
        if (getAccessToken()) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
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
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          setIsAuthenticated(true);
          setAuthError(null);
          return currentUser;
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
      setUser(DEMO_USER);
      setIsAuthenticated(true);
      return DEMO_USER;
    }
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setIsAuthenticated(true);
    return currentUser;
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
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