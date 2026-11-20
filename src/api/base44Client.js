import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// On Base44 hosting this stays '' (same-origin /api). On GitHub Pages there
// is no /api, so the Pages build sets VITE_BASE44_SERVER_URL to the Base44
// API host (https://base44.app — the @base44/sdk default). Without this,
// every API call, including login, 404s on Pages.
const serverUrl = import.meta.env.VITE_BASE44_SERVER_URL || '';

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl,
  appBaseUrl
});
