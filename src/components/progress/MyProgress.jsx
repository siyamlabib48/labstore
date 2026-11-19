import React from 'react';
import { CheckCircle2, Loader2, Target } from 'lucide-react';
import useProgress from '@/hooks/useProgress';
import { labOf } from '@/lib/labs';
import { percentOf, progressStatusOf } from '@/lib/progressStatus';
import { cn } from '@/lib/utils';

export default function MyProgress({ batch, user }) {
  const { records, loading } = useProgress({ batchId: batch.id, user });
  const mine = records.filter((row) => row.user_id === user.id);
  const percent = percentOf(mine);
  const done = mine.filter((row) => row.status === 'completed').length;
  const lab = labOf(user.lab);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {lab.label} · {batch.name}
            </p>
            <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight">
              {percent}% complete
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mine.length === 0
                ? 'No milestones have been added for you yet.'
                : `${done} of ${mine.length} milestone${mine.length === 1 ? '' : 's'} finished`}
            </p>
          </div>
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-lg font-bold text-background">
            {percent}%
          </span>
        </div>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-14 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : mine.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-14 text-center">
          <Target className="mx-auto h-7 w-7 text-muted-foreground" />
          <h3 className="mt-3 font-heading text-lg font-bold tracking-tight">Your track starts soon</h3>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
            Your teacher or lab leader will add milestones here, and this page fills up as you finish them.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {mine.map((row) => {
            const status = progressStatusOf(row.status);
            return (
              <div
                key={row.id}
                className="flex items-start gap-3 rounded-2xl border border-border/70 bg-white p-3.5"
              >
                <CheckCircle2
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    row.status === 'completed' ? 'text-[#15803D]' : 'text-muted-foreground/50'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{row.title}</p>
                  {row.note && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{row.note}</p>
                  )}
                  {row.updated_by_name && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Updated by {row.updated_by_name}
                    </p>
                  )}
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', status.chip)}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}