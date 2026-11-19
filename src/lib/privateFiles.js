import { base44 } from '@/api/base44Client';

const cache = new Map();

export function getSignedUrl(fileUri) {
  if (!fileUri) return Promise.resolve(null);
  if (cache.has(fileUri)) return cache.get(fileUri);
  const request = base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 3600 })
    .then((res) => res?.signed_url || null)
    .catch(() => null);
  cache.set(fileUri, request);
  return request;
}

export async function uploadPrivateFile(file) {
  const res = await base44.integrations.Core.UploadPrivateFile({ file });
  return res.file_uri;
}