import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FolderOpen, FlaskConical, Upload, ArrowRight, Loader2 } from 'lucide-react';
import { db } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { useBatch } from '@/lib/BatchContext';
import { batchStatusOf, batchLabs } from '@/lib/batches';
import { roleOf } from '@/lib/staffRoles';
import { labOf } from '@/lib/labs';
import WorkCard from '@/components/work/WorkCard';
import LabBadge from '@/components/common/LabBadge';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Home() {
  const { user } = useAuth();
  const { activeBatch, loading: batchLoading } = useBatch();
  const [members, setMembers] = useState([]);
  const [works, setWorks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!activeBatch) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([
      db.functions.invoke('manageMembers', { action: 'directory', batch_id: activeBatch.id }),
      db.entities.Work.filter({ batch: activeBatch.id }, { sort: '-created_date', limit: 3 }),
      db.entities.Work.count({ batch: activeBatch.id }),
    ])
      .then(([directory, page, count]) => {
        if (!alive) return;
        setMembers(directory.data?.members || []);
        setWorks(page.items || []);
        setTotal(count || 0);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError('We could not load this batch right now.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeBatch?.id, reloadKey]);

  if (batchLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!activeBatch) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-20 text-center">
        <h2 className="font-heading text-xl font-bold tracking-tight">No batch yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Your account is approved but hasn't been placed in a batch. Your coordinator will add you
          to a batch and lab shortly.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Dashboard could not load"
        message={error}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    );
  }

  const status = batchStatusOf(activeBatch.status);
  const labs = batchLabs(activeBatch);
  const role = roleOf(user);
  const myLab = user?.lab && labs.includes(user.lab) ? user.lab : null;

  const perLab = labs.map((key) => ({
    key,
    count: members.filter((member) => member.lab === key).length,
  }));

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {activeBatch.course_name || 'Course'}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
            {activeBatch.name.replace(`${activeBatch.course_name || ''} — `, '')}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', status.chip)}>
              {status.label}
            </span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', role.chip)}>
              {role.label}
            </span>
            {myLab && <LabBadge lab={myLab} className="px-2 py-0.5 text-[10px]" />}
          </div>
          {activeBatch.description && (
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {activeBatch.description}
            </p>
          )}
        </div>

        <Button asChild size="lg" className="rounded-full px-6">
          <Link to="/upload">
            <Upload className="mr-2 h-4 w-4" /> Upload work
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Members', value: members.length, icon: Users },
          { label: 'Works', value: total, icon: FolderOpen },
          { label: 'Labs', value: labs.length, icon: FlaskConical },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-border/70 bg-white p-4">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-2 font-heading text-2xl font-bold leading-none tracking-tight">
                {loading ? '—' : stat.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recent uploads
            </h2>
            <Link to="/gallery" className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
              Open gallery <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : works.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white/60 px-5 py-12 text-center">
              <p className="text-sm font-semibold">Nothing uploaded in this batch yet</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                Post your first project and it will show up here for everyone in {activeBatch.name}.
              </p>
              <Button asChild size="sm" className="mt-4 rounded-full">
                <Link to="/upload">Upload a work</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {works.map((work) => (
                <WorkCard key={work.id} work={work} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Labs in this batch
          </h2>
          <div className="space-y-2">
            {perLab.map((item) => {
              const meta = labOf(item.key);
              return (
                <Link
                  key={item.key}
                  to="/gallery"
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white p-3 transition-colors hover:border-foreground/20"
                >
                  <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
                  <span className="flex-1 text-sm font-semibold">{meta.label}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {item.count} member{item.count === 1 ? '' : 's'}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border/70 bg-white p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Keep going
            </h3>
            <div className="mt-2 space-y-1.5">
              <Link to="/progress?tab=ranks" className="flex items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold hover:bg-muted">
                Batch leaderboard <ArrowRight className="h-3 w-3" />
              </Link>
              <Link to="/gallery?view=mine" className="flex items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold hover:bg-muted">
                My works & storage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}