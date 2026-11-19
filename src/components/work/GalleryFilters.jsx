import React from 'react';
import { LAB_KEYS, LABS, labOf } from '@/lib/labs';
import { WORK_TYPES } from '@/lib/workTypes';
import { cn } from '@/lib/utils';

function Chip({ active, onClick, children, activeClass }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
        active
          ? cn('border-transparent text-white shadow-sm', activeClass || 'bg-foreground')
          : 'border-border/80 bg-white text-muted-foreground hover:border-foreground/20 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

export default function GalleryFilters({ lab, onLab, type, onType, labs = LAB_KEYS }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Chip active={lab === 'all'} onClick={() => onLab('all')}>
          All labs
        </Chip>
        {labs.map((key) => {
          const meta = labOf(key);
          return (
            <Chip
              key={key}
              active={lab === key}
              onClick={() => onLab(key)}
              activeClass={meta.solid}
            >
              <span
                className={cn('h-1.5 w-1.5 rounded-full', lab === key ? 'bg-white/80' : meta.dot)}
              />
              {LABS[key].label}
            </Chip>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Chip active={type === 'all'} onClick={() => onType('all')}>
          Any type
        </Chip>
        {WORK_TYPES.map((item) => {
          const Icon = item.icon;
          return (
            <Chip key={item.key} active={type === item.key} onClick={() => onType(item.key)}>
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}