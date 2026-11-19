import React from 'react';
import { VISIBILITY_OPTIONS } from '@/lib/postVisibility';
import { cn } from '@/lib/utils';

// Four options, each with the audience spelled out underneath so nobody has to
// guess what "Academy" reaches.
export default function VisibilityPicker({ value, onChange, disabled = false }) {
  const active = VISIBILITY_OPTIONS.find((option) => option.key === value) || VISIBILITY_OPTIONS[1];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {VISIBILITY_OPTIONS.map((option) => {
          const selected = option.key === value;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              disabled={disabled}
              title={option.hint}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50',
                selected
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <span aria-hidden="true">{option.emoji}</span>
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{active.hint}</p>
    </div>
  );
}