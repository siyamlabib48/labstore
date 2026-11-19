import React from 'react';
import { labOf } from '@/lib/labs';
import { cn } from '@/lib/utils';

// The wall reads batch-wide by default; one tab narrows it to the member's
// own lab, and the Academy tab widens it to the posts members of every batch
// chose to share academy-wide. Members without a lab skip the lab tab.
export default function FeedScopeTabs({ scope, onChange, lab }) {
  const tabs = [
    { key: 'all', label: 'Everyone' },
    ...(lab ? [{ key: 'lab', label: `${labOf(lab).label} only` }] : []),
    { key: 'academy', label: 'Academy' },
  ];

  return (
    <div className="inline-flex rounded-full border border-border/80 bg-white p-1">
      {tabs.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={cn(
            'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
            scope === option.key
              ? 'bg-foreground text-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}