import React from 'react';
import { Link } from 'react-router-dom';
import { labOf } from '@/lib/labs';
import { initials } from '@/lib/format';

export default function FriendRow({ name, lab, userId, note, actions }) {
  const subtitle = note || (lab ? labOf(lab).label : 'Member');

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-white p-2.5">
      <Link to={`/u/${userId}`} className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold uppercase text-background">
          {initials(name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold">{name || 'Member'}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
        </span>
      </Link>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}