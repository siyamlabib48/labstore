import React, { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { getSignedUrl } from '@/lib/privateFiles';
import { formatBytes } from '@/lib/format';

export default function AttachmentRow({ attachment }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    getSignedUrl(attachment.file_uri).then((signed) => {
      if (alive) setUrl(signed);
    });
    return () => {
      alive = false;
    };
  }, [attachment.file_uri]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-white px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{attachment.name || 'File'}</p>
        <p className="text-[11px] text-muted-foreground">{formatBytes(attachment.size_bytes)}</p>
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          download={attachment.name || undefined}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" /> Open
        </a>
      ) : (
        <span className="text-[11px] text-muted-foreground">Preparing…</span>
      )}
    </div>
  );
}