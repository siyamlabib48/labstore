import React from 'react';
import { workTypeOf } from '@/lib/workTypes';
import { cn } from '@/lib/utils';

export default function WorkTypeBadge({ type, className, showIcon = true }) {
  const meta = workTypeOf(type);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1 text-[11px] font-semibold text-muted-foreground',
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {meta.label}
    </span>
  );
}