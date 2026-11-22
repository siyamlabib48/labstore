import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// On Base44 hosting this stays '' (same-origin /api). On GitHub Pages there
// is no /api, so the Pages build sets VITE_BASE44_SERVER_URL to the Base44
// API host (https://base44.app — the @base44/sdk default). Without this,
// every API call, including login, 404s on Pages.
const env = import.meta.env;
const serverUrl = env.VITE_BASE44_SERVER_URL || '';

// Temporary demo bypass (build-time opt-in only): a build made with
// VITE_BYPASS_AUTH=true opens the app shell with a local demo user so pages
// can be reviewed without signing in. No token is set, so the backend still
// rejects every data call. Default builds never set it.
export const BYPASS_AUTH = env.VITE_BYPASS_AUTH === 'true';

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl,
  appBaseUrl
});
