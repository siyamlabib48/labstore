import { supabase } from '@/api/supabaseClient';

// Sign in with email and password. When the account has a verified TOTP
// factor, the new session stays at assurance level aal1 and the caller
// must route the user through the /mfa challenge before the sign-in is
// treated as complete; the result flags that with `mfa_required`.
export async function loginWithMfa(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const mfaRequired = !!aal && aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2';
  return { ...data, mfa_required: mfaRequired };
}

// Sends the user to this app's own MFA challenge page, keeping the
// post-login destination.
export async function continueMfa(result, returnTo) {
  const url = new URL('/mfa', window.location.origin);
  url.search = new URLSearchParams({ returnTo: returnTo || '/' });
  window.location.assign(url.href);
}

// provider: 'google' | 'microsoft' | 'facebook' | 'apple'
// ('microsoft' is 'azure' in Supabase's provider names.)
export async function loginWithSocial(provider, returnTo) {
  const supabaseProvider = provider === 'microsoft' ? 'azure' : provider;
  const redirectTo = new URL(returnTo || '/', window.location.origin).href;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: supabaseProvider,
    options: { redirectTo },
  });
  if (error) throw error;
}

export function loginWithGoogle(returnTo) {
  return loginWithSocial('google', returnTo);
}
