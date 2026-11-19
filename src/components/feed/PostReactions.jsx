import React from 'react';
import { REACTIONS } from '@/lib/reactions';
import { cn } from '@/lib/utils';

// Three reactions, one row per member: the active one is filled, a different tap
// moves the reaction, the same tap removes it.
export default function PostReactions({ reaction, onReact }) {
  const summary = reaction || { counts: {}, total: 0, mine: '' };

  return (
    <div className="inline-flex items-center rounded-full border border-border/70 bg-muted/30 p-0.5">
      {REACTIONS.map(({ key, label, Icon, activeChip }) => {
        const active = summary.mine === key;
        const count = summary.counts?.[key] || 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onReact(key)}
            title={active ? `Remove your ${label.toLowerCase()}` : label}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold transition-colors',
              active ? activeChip : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', active && 'fill-current')} />
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}