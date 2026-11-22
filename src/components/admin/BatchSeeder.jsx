import React, { useState } from 'react';
import { DatabaseZap, Loader2 } from 'lucide-react';
import { db } from '@/api/dataClient';
import { Button } from '@/components/ui/button';

// Owner-only one-shot: creates the two canonical batches and moves lab-tagged
// members and their works into the right one. Posts, comments, notices, chat
// messages and progress records that are missing a batch inherit their
// author's the same way. Older comments are also stamped with their post's
// visibility, so comments written before that field existed show correctly
// on academy posts.
export default function BatchSeeder({ onDone }) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    setSummary('');
    try {
      const res = await db.functions.invoke('initBatches', {});
      if (res.data?.error) throw new Error(res.data.error);
      const { users_backfilled, works_backfilled, records_backfilled, orphans_skipped } =
        res.data || {};
      const visibilityStamped = res.data?.backfill?.post_comments?.visibility_stamped || 0;
      setSummary(
        `${users_backfilled || 0} users backfilled, ${works_backfilled || 0} works backfilled, ${
          records_backfilled || 0
        } other records backfilled, ${orphans_skipped || 0} orphans skipped, ${visibilityStamped} comment visibilities stamped.`
      );
      await onDone?.();
    } catch (err) {
      setError(err.message || 'Could not initialize the batches');
    }
    setBusy(false);
  };

  return (
    <section className="rounded-3xl border border-border/70 bg-white p-4 sm:p-5">
      <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <DatabaseZap className="h-3.5 w-3.5" /> Batch setup
      </h2>
      <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">
        Creates “Freelancing Course — Batch 8” (labs A, B, C) and “AI Course — Batch 2” (lab Ai), then
        moves every member whose lab is set but has no batch into the matching batch, and gives their
        works the same batch. Any post, comment, notice, chat message or progress record still
        missing a batch inherits its author's, and comments written before post visibility was
        tracked are stamped with their post's visibility. Safe to run again.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" className="rounded-full px-4" onClick={run} disabled={busy}>
          {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Initialize batches
        </Button>
        {summary && <span className="text-xs font-semibold text-[#047857]">{summary}</span>}
        {error && <span className="text-xs font-semibold text-destructive">{error}</span>}
      </div>
    </section>
  );
}