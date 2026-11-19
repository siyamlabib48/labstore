import React, { useEffect, useState } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useBatch } from '@/lib/BatchContext';
import LeaderboardRow from '@/components/leaderboard/LeaderboardRow';
import ErrorState from '@/components/common/ErrorState';
import { labOf } from '@/lib/labs';
import { cn } from '@/lib/utils';

export default function Leaderboard() {
  const { user } = useAuth();
  const { activeBatch, batches, isOwner } = useBatch();
  const [tab, setTab] = useState('batch');
  const [rows, setRows] = useState([]);
  const [scope, setScope] = useState('');
  const [scopeLab, setScopeLab] = useState('');
  const [labSel, setLabSel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const batchId = activeBatch?.id || '';
  const batchLabs = activeBatch?.labs || [];

  // The lab board defaults to the member's own lab; if they have none (or the
  // batch changed under the selection), fall back to the batch's first lab.
  useEffect(() => {
    if (batchLabs.length === 0) return;
    if (!batchLabs.includes(labSel)) {
      setLabSel(batchLabs.includes(user?.lab) ? user.lab : batchLabs[0]);
    }
  }, [batchLabs, labSel, user?.lab]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const payload =
      tab === 'all' ? {} : tab === 'lab' ? { batch_id: batchId, lab: labSel } : { batch_id: batchId };
    base44.functions
      .invoke('getLeaderboard', payload)
      .then((res) => {
        if (!alive) return;
        setRows(res.data?.rows || []);
        setScope(res.data?.scope || '');
        setScopeLab(res.data?.scope_lab || '');
      })
      .catch(() => {
        if (alive) setError('We could not load the rankings.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tab, batchId, labSel, reloadKey]);

  const myRank = rows.findIndex((row) => row.user_id === user?.id) + 1;
  const myRow = rows.find((row) => row.user_id === user?.id);

  // Tabs that cannot apply to this member are not rendered at all. The lab
  // board exists whenever the batch has labs; the global board is owner-only.
  const tabs = [
    ...(batchLabs.length ? [{ key: 'lab', label: 'My Lab' }] : []),
    { key: 'batch', label: 'Batch' },
    ...(isOwner ? [{ key: 'all', label: 'Global' }] : []),
  ];

  const shownLab = scopeLab || labSel;
  const scopeLabel =
    scope === 'lab'
      ? labOf(shownLab).label
      : scope === 'all'
      ? `all ${batches.length} batches`
      : activeBatch?.name || 'your batch';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Who is shipping
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          Leaderboard
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Ranked by works uploaded. Deleted works don't count. Showing {scopeLabel}.
        </p>
      </div>

      <div className="inline-flex rounded-full border border-border/80 bg-white p-1">
        {tabs.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setTab(option.key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
              tab === option.key
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === 'lab' && batchLabs.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {batchLabs.map((labKey) => {
            const meta = labOf(labKey);
            const active = labSel === labKey;
            return (
              <button
                key={labKey}
                type="button"
                onClick={() => setLabSel(labKey)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all',
                  active
                    ? cn('text-white', meta.solid, meta.border)
                    : 'border-border/80 bg-white text-muted-foreground hover:text-foreground'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', active ? 'bg-white' : meta.dot)} />
                {meta.label}
                {user?.lab === labKey && <span className="font-medium opacity-80">(yours)</span>}
              </button>
            );
          })}
        </div>
      )}

      {myRow && (
        <div className="flex items-center gap-3 rounded-2xl bg-foreground p-4 text-background">
          <Trophy className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            You are <span className="font-bold">#{myRank}</span> on this board with{' '}
            <span className="font-bold">{myRow.work_count}</span> work
            {myRow.work_count === 1 ? '' : 's'}.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <ErrorState
          title="Rankings could not load"
          message={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
          <h3 className="font-heading text-lg font-bold tracking-tight">
            {scope === 'lab' ? `No members ranked in ${labOf(shownLab).label} yet` : 'No members ranked yet'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {scope === 'lab'
              ? 'Members of this lab will appear here once they are approved and start uploading works.'
              : 'The board fills up as members are assigned to labs and upload works.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row, index) => (
            <LeaderboardRow
              key={row.user_id}
              row={row}
              rank={index + 1}
              isMe={row.user_id === user?.id}
              showLab={scope !== 'lab'}
              accent={scope === 'lab' ? labOf(shownLab) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}