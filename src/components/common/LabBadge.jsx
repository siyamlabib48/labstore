import React from 'react';
import { labOf } from '@/lib/labs';
import { cn } from '@/lib/utils';

export default function LabBadge({ lab, className, withDot = true }) {
  const meta = labOf(lab);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide',
        meta.chip,
        className
      )}
    >
      {withDot && <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />}
      {meta.label}
    </span>
  );
}