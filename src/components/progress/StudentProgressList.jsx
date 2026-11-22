import React, { useEffect, useState } from 'react';
import { Loader2, Search, Target } from 'lucide-react';
import { db } from '@/api/dataClient';
import useProgress from '@/hooks/useProgress';
import LabBadge from '@/components/common/LabBadge';
import ManageProgressDialog from '@/components/progress/ManageProgressDialog';
import { percentOf } from '@/lib/progressStatus';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function StudentProgressList({ batch, user, labScope }) {
  const { records, loading, addMilestone, setStatus, removeMilestone } = useProgress({
    batchId: batch.id,
    user,
  });
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setMembersLoading(true);
      const res = await db.functions.invoke('manageMembers', {
        action: 'directory',
        batch_id: batch.id,
      });
      if (!alive) return;
      setMembers(res.data?.members || []);
      setMembersLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [batch.id]);

  const roster = members
    .filter((member) => (labScope ? member.lab === labScope : true))
    .filter((member) => {
      const term = query.trim().toLowerCase();
      if (!term) return true;
      return `${member.full_name || ''} ${member.email || ''}`.toLowerCase().includes(term);
    })
    .map((member) => {
      const rows = records.filter((row) => row.user_id === member.id);
      return { member, rows, percent: percentOf(rows) };
    })
    .sort((a, b) => a.percent - b.percent || (a.member.full_name || '').localeCompare(b.member.full_name || ''));

  const busy = loading || membersLoading;
  const selectedRows = selected ? records.filter((row) => row.user_id === selected.id) : [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a student by name or email…"
          className="h-9 w-full rounded-full border border-border bg-white pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
        />
      </div>

      {busy ? (
        <div className="flex items-center justify-center py-14 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : roster.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-14 text-center">
          <Target className="mx-auto h-7 w-7 text-muted-foreground" />
          <h3 className="mt-3 font-heading text-lg font-bold tracking-tight">Nobody to track yet</h3>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
            Students appear here once the owner places them in this batch.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {roster.map(({ member, rows, percent }) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelected(member)}
              className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-white p-3 text-left transition-colors hover:border-foreground/20"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold uppercase text-background">
                {initials(member.full_name || member.email)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 truncate text-xs font-semibold">
                  {member.full_name || member.email}
                  {member.lab && <LabBadge lab={member.lab} className="px-1.5 py-0 text-[9px]" />}
                </p>
                <div className="mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      percent >= 100 ? 'bg-[#15803D]' : percent > 0 ? 'bg-[#E1861B]' : 'bg-slate-300'
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums">{percent}%</p>
                <p className="text-[10px] text-muted-foreground">
                  {rows.length} milestone{rows.length === 1 ? '' : 's'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <ManageProgressDialog
        member={selected}
        records={selectedRows}
        onOpenChange={(open) => !open && setSelected(null)}
        onAdd={(title) => addMilestone(selected, title)}
        onStatus={(row, status) => setStatus(row, status)}
        onRemove={(row) => removeMilestone(row)}
      />
    </div>
  );
}