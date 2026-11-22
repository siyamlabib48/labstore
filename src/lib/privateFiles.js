import { db } from '@/api/dataClient';

const cache = new Map();

export function getSignedUrl(fileUri) {
  if (!fileUri) return Promise.resolve(null);
  if (cache.has(fileUri)) return cache.get(fileUri);
  const request = db.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 3600 })
    .then((res) => res?.signed_url || null)
    .catch(() => null);
  cache.set(fileUri, request);
  return request;
}

export async function uploadPrivateFile(file) {
  const res = await db.integrations.Core.UploadPrivateFile({ file });
  return res.file_uri;
}