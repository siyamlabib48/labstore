import React from 'react';
import { FileText, Paperclip, X } from 'lucide-react';
import { MAX_PENDING_FILES } from '@/hooks/usePendingFiles';
import { formatBytes } from '@/lib/format';

// The attach button + selected-file chips shared by the chat composer and
// the announcement form. Plain elements on purpose (see the Phase 2–4
// components): this project's type setup charges an error per ui import.
export function AttachButton({ onFiles, disabled }) {
  return (
    <label
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title={`Attach up to ${MAX_PENDING_FILES} files, 10 MB each`}
    >
      <Paperclip className="h-3.5 w-3.5" /> Attach
      <input
        type="file"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </label>
  );
}

export function PendingFileChips({ pending, onRemove }) {
  if (!pending.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {pending.map((item, index) => (
        <span
          key={`${item.file.name}-${index}`}
          className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border/70 bg-muted/40 py-1 pl-1 pr-2"
        >
          {item.preview ? (
            <img src={item.preview} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block max-w-[140px] truncate text-[11px] font-medium leading-tight">
              {item.file.name}
            </span>
            <span className="block text-[10px] leading-tight text-muted-foreground">
              {formatBytes(item.file.size)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onRemove(index)}
            title="Remove file"
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-white hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
