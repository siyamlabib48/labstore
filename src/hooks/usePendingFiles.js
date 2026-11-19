import { useRef, useState } from 'react';
import { uploadPrivateFile } from '@/lib/privateFiles';

export const MAX_PENDING_FILES = 4;
export const MAX_PENDING_FILE_BYTES = 10 * 1024 * 1024;

const isImage = (file) => (file.type || '').startsWith('image/');

// Holds files picked in a composer (chat, announcements) before they are
// uploaded. Uploads go through the app's private-file flow and come back in
// the { file_uri, name, size_bytes } shape every attachment list stores.
export default function usePendingFiles(setError) {
  const [pending, setPending] = useState([]);
  const pendingRef = useRef([]);
  pendingRef.current = pending;

  const addFiles = (fileList) => {
    const picked = Array.from(fileList || []);
    if (picked.length === 0) return;
    const room = MAX_PENDING_FILES - pendingRef.current.length;
    if (room <= 0) {
      setError?.(`Up to ${MAX_PENDING_FILES} files at a time.`);
      return;
    }
    const accepted = [];
    for (const file of picked.slice(0, room)) {
      if (file.size > MAX_PENDING_FILE_BYTES) {
        setError?.(
          `${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)} MB — the limit is 10 MB per file.`
        );
        continue;
      }
      accepted.push({ file, preview: isImage(file) ? URL.createObjectURL(file) : null });
    }
    if (picked.length > room) {
      setError?.(`Up to ${MAX_PENDING_FILES} files at a time — some were left off.`);
    }
    if (accepted.length) setPending((prev) => [...prev, ...accepted]);
  };

  const removeAt = (index) => {
    setPending((prev) => {
      const next = prev.slice();
      const [gone] = next.splice(index, 1);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return next;
    });
  };

  const clear = () => {
    pendingRef.current.forEach((item) => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    });
    setPending([]);
  };

  const uploadAll = async () =>
    Promise.all(
      pendingRef.current.map(async (item) => ({
        file_uri: await uploadPrivateFile(item.file),
        name: item.file.name,
        size_bytes: item.file.size,
      }))
    );

  return { pending, addFiles, removeAt, clear, uploadAll };
}
