import React from 'react';
import { visibilityOf } from '@/lib/postVisibility';
import { cn } from '@/lib/utils';

export default function PostVisibilityBadge({ visibility, className }) {
  const option = visibilityOf(visibility);

  return (
    <span
      title={option.hint}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground',
        className
      )}
    >
      <span aria-hidden="true">{option.emoji}</span>
      {option.label}
    </span>
  );
}