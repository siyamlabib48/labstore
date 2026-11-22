import React from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import LabBadge from '@/components/common/LabBadge';
import { labOf } from '@/lib/labs';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const medalStyles = ['bg-[#FEF3C7] text-[#B45309]', 'bg-slate-100 text-slate-500', 'bg-[#FDE8D7] text-[#B45309]'];

export default function LeaderboardRow({ row, rank, isMe, showLab = true, accent = null }) {
  const meta = labOf(row.lab);
  const medal = rank <= 3 ? medalStyles[rank - 1] : null;

  return (
    <Link
      to={`/u/${row.user_id}`}
      className={cn(
        'relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-white p-3.5 transition-shadow hover:border-foreground/30',
        isMe ? 'border-foreground/25 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.5)]' : 'border-border/70'
      )}
    >
      {accent && <span className={cn('absolute inset-y-0 left-0 w-1', accent.solid)} />}

      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          medal || 'bg-muted text-muted-foreground'
        )}
      >
        {rank <= 3 ? <Crown className="h-4 w-4" /> : rank}
      </div>

      <div className="relative">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-[11px] font-bold uppercase text-background">
          {initials(row.full_name)}
        </div>
        {row.lab && (
          <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white', meta.dot)} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight">
          {row.full_name}
          {isMe && <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">(you)</span>}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {showLab && row.lab && <LabBadge lab={row.lab} className="px-2 py-0.5 text-[10px]" />}
        </div>
      </div>

      <div className="text-right">
        <p className="font-heading text-lg font-bold leading-none tracking-tight">{row.work_count}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">works</p>
      </div>
    </Link>
  );
}