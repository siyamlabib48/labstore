import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { db } from '@/api/dataClient';
import { useBatch } from '@/lib/BatchContext';
import { batchLabs } from '@/lib/batches';
import { ChevronsUpDown } from 'lucide-react';
import WorkCard from '@/components/work/WorkCard';
import GalleryFilters from '@/components/work/GalleryFilters';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { labOf } from '@/lib/labs';

const PAGE_SIZE = 12;

export default function Gallery() {
  const { activeBatch, available, isOwner, loading: batchLoading } = useBatch();
  // The owner can look at one batch or every batch at once; everyone else stays
  // inside their own batch.
  const [scopeId, setScopeId] = useState('');
  const allBatches = isOwner && scopeId === 'all';
  const [lab, setLab] = useState('all');
  const [type, setType] = useState('all');
  const [works, setWorks] = useState([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const chosenId = scopeId || activeBatch?.id || '';
  const batchId = allBatches ? '' : chosenId;
  const chosenBatch = available.find((item) => item.id === chosenId) || activeBatch;
  const labs = allBatches
    ? Array.from(new Set(available.flatMap((item) => batchLabs(item))))
    : chosenId
    ? batchLabs(chosenBatch)
    : [];

  useEffect(() => {
    setLab('all');
  }, [batchId]);

  useEffect(() => {
    if (!batchId && !allBatches) {
      setLoading(false);
      return;
    }
    let alive = true;
    const query = {};
    if (batchId) query.batch = batchId;
    if (lab !== 'all') query.lab = lab;
    if (type !== 'all') query.work_type = type;

    setLoading(true);
    setError('');
    Promise.all([
      db.entities.Work.filter(query, { sort: '-created_date', limit: PAGE_SIZE }),
      db.entities.Work.count(query),
    ])
      .then(([page, count]) => {
        if (!alive) return;
        setWorks(page.items || []);
        setCursor(page.next_cursor || null);
        setTotal(count || 0);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError('We could not load these works.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [batchId, lab, type, reloadKey]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    const query = {};
    if (batchId) query.batch = batchId;
    if (lab !== 'all') query.lab = lab;
    if (type !== 'all') query.work_type = type;
    const page = await db.entities.Work.filter(query, {
      sort: '-created_date',
      limit: PAGE_SIZE,
      cursor,
    });
    setWorks((prev) => [...prev, ...(page.items || [])]);
    setCursor(page.next_cursor || null);
    setLoadingMore(false);
  };

  const scope = lab === 'all' ? 'across every lab' : `in ${labOf(lab).label}`;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {activeBatch?.course_name || 'Project cloud'}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
            Gallery
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {batchLoading || loading
              ? 'Loading works…'
              : `${total} work${total === 1 ? '' : 's'} shared ${scope} in ${
                  allBatches ? `all ${available.length} batches` : chosenBatch?.name || 'your batch'
                }.`}
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full px-6">
          <Link to="/upload">
            <Plus className="mr-2 h-4 w-4" /> Upload work
          </Link>
        </Button>
      </div>

      {isOwner && (
        <div className="relative inline-block">
          <select
            value={allBatches ? 'all' : chosenId}
            onChange={(event) => setScopeId(event.target.value)}
            aria-label="Gallery scope"
            className="appearance-none rounded-full border border-border/80 bg-white py-1.5 pl-3.5 pr-8 text-xs font-semibold outline-none"
          >
            <option value="all">All batches</option>
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}

      <GalleryFilters lab={lab} onLab={setLab} type={type} onType={setType} labs={labs} />

      {error ? (
        <ErrorState
          title="Gallery could not load"
          message={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : !batchId && !allBatches ? (
        <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
          <h3 className="font-heading text-lg font-bold tracking-tight">No batch yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Gallery works are grouped by batch. You'll see your batch gallery once a coordinator
            places you in one.
          </p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border/70 bg-white">
              <div className="aspect-[4/3] animate-pulse bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : works.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
          <h3 className="font-heading text-lg font-bold tracking-tight">Nothing here yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            No works match this filter in {allBatches ? 'any batch' : chosenBatch?.name}. Be the
            first to put something on the board.
          </p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/upload">Upload your first work</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
          {cursor && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" className="rounded-full px-6" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}