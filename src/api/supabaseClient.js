import { createClient } from '@supabase/supabase-js';

const env = import.meta.env;

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

// Temporary demo bypass (build-time opt-in only): a build made with
// VITE_BYPASS_AUTH=true opens the app shell with a local demo user so pages
// can be reviewed without signing in. No session exists, so the backend
// still rejects every data call. Default builds never set it.
export const BYPASS_AUTH = env.VITE_BYPASS_AUTH === 'true';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// The app was written against a user object that carries the platform role
// as `role` ('admin' | 'user') alongside the profile fields. Supabase keeps
// the profile in public.profiles with an is_admin flag instead, so map the
// row back to the shape the rest of the app already understands.
export const toAppUser = (profile, authUser) => {
  if (!profile) return null;
  return {
    ...profile,
    email: profile.email || authUser?.email || '',
    role: profile.is_admin ? 'admin' : 'user',
  };
};

// Loads the signed-in member's profile row. The row is created by a
// database trigger when the auth account is created; retry once in case
// the trigger write has not landed yet.
export const fetchProfile = async (authUser) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    if (error) throw error;
    if (data) return toAppUser(data, authUser);
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return null;
};
