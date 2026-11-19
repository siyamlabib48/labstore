import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Users, Lock, Trash2, ArrowUpRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import useMyWorks, { notifyWorksChanged } from '@/hooks/useMyWorks';
import PrivateImage from '@/components/common/PrivateImage';
import LabBadge from '@/components/common/LabBadge';
import WorkTypeBadge from '@/components/common/WorkTypeBadge';
import QuotaMeter from '@/components/account/QuotaMeter';
import { Button } from '@/components/ui/button';
import { formatBytes, QUOTA_BYTES, timeAgo } from '@/lib/format';

const visibilityMeta = { all: Eye, lab: Users, private: Lock };

export default function MyWorks() {
  const { user } = useAuth();
  const { works, loading, reload, usedBytes } = useMyWorks(user?.id);

  const remove = async (work) => {
    if (!window.confirm(`Delete "${work.title}"? This frees ${formatBytes(work.file_size_bytes)}.`)) return;
    await base44.functions.invoke('manageWork', { action: 'delete', work_id: work.id });
    notifyWorksChanged();
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Your archive
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
            My works
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${works.length} work${works.length === 1 ? '' : 's'} · ${formatBytes(QUOTA_BYTES - usedBytes)} free`}
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full px-6">
          <Link to="/upload">
            <Plus className="mr-2 h-4 w-4" /> Upload work
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          {loading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          ) : works.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
              <h3 className="font-heading text-lg font-bold tracking-tight">Your archive is empty</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Upload your first project to start building your portfolio.
              </p>
              <Button asChild className="mt-5 rounded-full">
                <Link to="/upload">Upload a work</Link>
              </Button>
            </div>
          ) : (
            works.map((work) => {
              const VisIcon = visibilityMeta[work.visibility] || Eye;
              return (
                <div
                  key={work.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white p-3 transition-shadow hover:shadow-[0_14px_34px_-26px_rgba(15,23,42,0.4)]"
                >
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {work.cover_file_uri ? (
                      <PrivateImage
                        fileUri={work.cover_file_uri}
                        alt={work.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/work/${work.id}`}
                      className="line-clamp-1 text-sm font-semibold tracking-tight hover:underline"
                    >
                      {work.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <LabBadge lab={work.lab} className="px-2 py-0.5 text-[10px]" />
                      <WorkTypeBadge type={work.work_type} className="px-2 py-0.5 text-[10px]" />
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <VisIcon className="h-3 w-3" />
                        {work.visibility === 'all' ? 'All' : work.visibility === 'lab' ? 'Lab' : 'Private'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatBytes(work.file_size_bytes)} · {timeAgo(work.created_date)}
                    </p>
                  </div>

                  <Link
                    to={`/work/${work.id}`}
                    className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(work)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[#DB2777]/10 hover:text-[#BE185D]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-border/70 bg-white p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Storage quota
            </h3>
            <p className="mt-2 font-heading text-2xl font-bold tracking-tight">
              {formatBytes(usedBytes)}
              <span className="text-sm font-medium text-muted-foreground"> / 500 MB</span>
            </p>
            <QuotaMeter usedBytes={usedBytes} compact className="mt-3 border-none bg-transparent p-0" />
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Every upload counts against your 500 MB. Delete a work to free its space.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}