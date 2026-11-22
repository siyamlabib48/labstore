import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Target, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useBatch } from '@/lib/BatchContext';
import { canManageBatch } from '@/lib/staffRoles';
import { cn } from '@/lib/utils';
import MyProgress from '@/components/progress/MyProgress';
import StudentProgressList from '@/components/progress/StudentProgressList';
import Leaderboard from '@/pages/Leaderboard';

// Progress and Ranks live on one page behind one nav item (they used to
// be two sidebar entries): the tabs switch between the milestone track
// and the leaderboard, which keeps its own Lab / Batch / Global scopes.
// /leaderboard redirects to ?tab=ranks.
export default function Progress() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'ranks' ? 'ranks' : 'progress';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'progress', label: 'Progress', icon: Target },
          { key: 'ranks', label: 'Ranks', icon: Trophy },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setSearchParams(option.key === 'ranks' ? { tab: 'ranks' } : {}, { replace: true })}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
              tab === option.key
                ? 'bg-slate-900 text-white'
                : 'border border-border/80 bg-white text-muted-foreground hover:text-foreground'
            )}
          >
            <option.icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        ))}
      </div>
      {tab === 'ranks' ? <Leaderboard /> : <ProgressView />}
    </div>
  );
}

function ProgressView() {
  const { user } = useAuth();
  const { activeBatch, loading } = useBatch();

  const staff = canManageBatch(user);
  // A CR/ACR leads their own lab: they track progress for that lab only.
  const repOnly = !staff && ['cr', 'acr'].includes(user?.staff_role);
  const canTrack = staff || repOnly;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {canTrack ? 'Lab tracking' : 'Your track'}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          Progress
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          {canTrack
            ? 'Add milestones per student and mark them off as work lands — a quick read on every lab.'
            : 'Every milestone your teachers add, and how far you have got with each one.'}
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !activeBatch ? (
          <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
            <Target className="mx-auto h-7 w-7 text-muted-foreground" />
            <h2 className="mt-3 font-heading text-xl font-bold tracking-tight">No batch yet</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Progress unlocks once you are placed in a batch.
            </p>
          </div>
        ) : canTrack ? (
          <StudentProgressList
            batch={activeBatch}
            user={user}
            labScope={repOnly ? user.lab || '' : ''}
          />
        ) : (
          <MyProgress batch={activeBatch} user={user} />
        )}
      </div>
    </div>
  );
}