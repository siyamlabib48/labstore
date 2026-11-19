import React from 'react';
import { Search, X } from 'lucide-react';
import { labOf } from '@/lib/labs';
import { cn } from '@/lib/utils';

const ROLES = [
  { key: 'all', label: 'Everyone' },
  { key: 'staff', label: 'Staff only' },
  { key: 'leader', label: 'Lab leaders' },
];

export default function DirectoryFilters({
  query,
  onQuery,
  lab,
  onLab,
  role,
  onRole,
  labs,
  total,
  shown,
}) {
  const labOptions = [
    { key: 'all', label: 'All labs' },
    ...labs.map((key) => ({ key, label: labOf(key).label })),
    { key: 'none', label: 'No lab' },
  ];

  return (
    <div className="space-y-2.5 rounded-2xl border border-border/70 bg-white p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search members by name or email…"
          className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-9 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery('')}
            title="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {labOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onLab(option.key)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
              lab === option.key
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onRole(option.key)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors',
                role === option.key
                  ? 'border-foreground/20 bg-foreground/5 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {shown} of {total}
        </span>
      </div>
    </div>
  );
}