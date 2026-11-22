import React from 'react';
import { Loader2, Target } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useBatch } from '@/lib/BatchContext';
import { canTrackProgress } from '@/lib/staffRoles';
import MyProgress from '@/components/progress/MyProgress';
import StudentProgressList from '@/components/progress/StudentProgressList';
import Leaderboard from '@/pages/Leaderboard';

// Progress and Ranks share one page behind one nav item: the two
// panels sit side by side in a flex row with a partition between them
// (stacked, with a horizontal rule, on small screens), so both are
// visible at once — no tab switching. /leaderboard redirects here.
export default function Progress() {
  return (
    <div className="flex flex-col lg:flex-row lg:divide-x lg:divide-border/70">
      <div className="min-w-0 flex-1 lg:pr-8">
        <ProgressView />
      </div>
      <div className="mt-10 min-w-0 flex-1 border-t border-border/70 pt-8 lg:mt-0 lg:border-t-0 lg:pl-8 lg:pt-0">
        <Leaderboard />
      </div>
    </div>
  );
}

function ProgressView() {
  const { user } = useAuth();
  const { activeBatch, loading } = useBatch();

  // Tracking is the dedicated teacher's job (coordinator/owner above
  // them); everyone else — class teachers, CR/ACR, students — sees
  // their own track here.
  const canTrack = canTrackProgress(user);

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

      <div className="w-full">
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
          <StudentProgressList batch={activeBatch} user={user} labScope="" />
        ) : (
          <MyProgress batch={activeBatch} user={user} />
        )}
      </div>
    </div>
  );
}