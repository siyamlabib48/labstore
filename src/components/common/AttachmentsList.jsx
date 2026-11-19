import React from 'react';
import PrivateImage from '@/components/common/PrivateImage';
import AttachmentRow from '@/components/work/AttachmentRow';
import { cn } from '@/lib/utils';

const IMAGE_NAME = /\.(png|jpe?g|gif|webp|avif|bmp)$/i;

export const isImageAttachment = (attachment) => IMAGE_NAME.test(attachment?.name || '');

// Renders a message/announcement attachment list in the private-file pattern
// used across the app: images inline via PrivateImage (signed URL), every
// other file as a download row — the same { file_uri, name, size_bytes }
// shape works and announcements store.
export default function AttachmentsList({ attachments, imageClassName = '' }) {
  const items = (attachments || []).filter((item) => item?.file_uri);
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((attachment, index) =>
        isImageAttachment(attachment) ? (
          <PrivateImage
            key={`${attachment.file_uri}-${index}`}
            fileUri={attachment.file_uri}
            alt={attachment.name || 'Attached image'}
            className={cn('max-h-56 w-full rounded-xl object-cover', imageClassName)}
          />
        ) : (
          <AttachmentRow key={`${attachment.file_uri}-${index}`} attachment={attachment} />
        )
      )}
    </div>
  );
}
