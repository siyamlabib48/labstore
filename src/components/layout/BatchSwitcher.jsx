import React from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { useBatch } from '@/lib/BatchContext';
import { batchStatusOf } from '@/lib/batches';
import { cn } from '@/lib/utils';

export default function BatchSwitcher({ compact = false, className }) {
  const { available, activeBatch, setActiveBatchId, loading } = useBatch();

  if (loading) {
    return <div className={cn('h-9 animate-pulse rounded-xl bg-muted', className)} />;
  }

  if (!available.length) {
    return (
      <div className={cn('rounded-xl border border-dashed border-border px-3 py-2', className)}>
        <p className="text-[11px] font-semibold text-muted-foreground">No batch assigned yet</p>
      </div>
    );
  }

  if (available.length === 1) {
    const status = batchStatusOf(activeBatch.status);
    return (
      <div className={cn('rounded-xl border border-border/70 bg-white px-3 py-2', className)}>
        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {activeBatch.course_name || 'Batch'}
        </p>
        <p className="truncate text-xs font-semibold text-foreground">
          {activeBatch.name.replace(`${activeBatch.course_name || ''} — `, '')}
        </p>
        {!compact && (
          <span className={cn('mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', status.chip)}>
            {status.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-xl border border-border/70 bg-white', className)}>
      <select
        value={activeBatch?.id || ''}
        onChange={(event) => setActiveBatchId(event.target.value)}
        className="w-full appearance-none bg-transparent py-2 pl-3 pr-8 text-xs font-semibold text-foreground outline-none"
        aria-label="Switch batch"
      >
        {available.map((batch) => (
          <option key={batch.id} value={batch.id}>
            {batch.name}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}