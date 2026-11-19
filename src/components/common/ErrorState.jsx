import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Could not load this',
  message = 'Something went wrong while fetching data. Check your connection and try again.',
  onRetry,
  compact = false,
}) {
  return (
    <div
      className={
        compact
          ? 'flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive'
          : 'rounded-3xl border border-dashed border-destructive/40 bg-white/70 px-6 py-12 text-center'
      }
    >
      <AlertCircle className={compact ? 'mt-0.5 h-4 w-4 shrink-0' : 'mx-auto h-6 w-6 text-destructive'} />
      <div className={compact ? '' : 'mt-2'}>
        <p className={compact ? 'font-semibold' : 'font-heading text-base font-bold text-foreground'}>
          {title}
        </p>
        <p className={compact ? 'mt-0.5' : 'mx-auto mt-1 max-w-sm text-sm text-muted-foreground'}>
          {message}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw className="h-3 w-3" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}