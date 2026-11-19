import React from 'react';
import { HardDrive } from 'lucide-react';
import { formatBytes, QUOTA_BYTES } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function QuotaMeter({ usedBytes = 0, compact = false, className }) {
  const pct = Math.min(100, Math.round((usedBytes / QUOTA_BYTES) * 100));
  const nearLimit = pct >= 85;

  return (
    <div className={cn('rounded-xl border border-border/70 bg-white/70 p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <HardDrive className="h-3.5 w-3.5" /> Storage
        </span>
        <span className="text-[11px] font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            nearLimit ? 'bg-[#DB2777]' : 'bg-foreground'
          )}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      {!compact && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {formatBytes(usedBytes)} of {formatBytes(QUOTA_BYTES)} used
        </p>
      )}
    </div>
  );
}