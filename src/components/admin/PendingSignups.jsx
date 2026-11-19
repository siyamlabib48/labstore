import React, { useState } from 'react';
import { Check, Loader2, Clock } from 'lucide-react';
import { LABS } from '@/lib/labs';
import { initials } from '@/lib/format';
import { Button } from '@/components/ui/button';

export default function PendingSignups({ members, batches, onAssign, busyId }) {
  const [draft, setDraft] = useState({});

  const set = (id, patch) => setDraft((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  return (
    <section className="rounded-2xl border border-border/70 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Waiting for a batch
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">{members.length}</span>
      </div>

      <div className="mt-3 space-y-2.5">
        {members.length === 0 ? (
          <p className="rounded-xl bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">
            No sign-ups waiting. You're all caught up.
          </p>
        ) : (
          members.map((person) => {
            const choice = draft[person.id] || {};
            const batchId = choice.batch_id || batches[0]?.id || '';
            const batch = batches.find((item) => item.id === batchId);
            const lab = choice.lab || (batch?.labs || [])[0] || '';
            const ready = !!batchId && !!lab;

            return (
              <div key={person.id} className="rounded-xl border border-border/70 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold uppercase text-muted-foreground">
                    {initials(person.full_name || person.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{person.full_name || 'New sign-up'}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{person.email}</p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <select
                    value={batchId}
                    onChange={(event) => set(person.id, { batch_id: event.target.value, lab: '' })}
                    className="h-8 flex-1 rounded-lg border border-border bg-white px-2 text-[11px] font-medium"
                  >
                    {batches.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={lab}
                    onChange={(event) => set(person.id, { lab: event.target.value })}
                    className="h-8 rounded-lg border border-border bg-white px-2 text-[11px] font-medium"
                  >
                    {(batch?.labs || []).map((key) => (
                      <option key={key} value={key}>
                        {LABS[key]?.label || key}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    className="h-8 rounded-lg px-2.5 text-[11px]"
                    disabled={!ready || busyId === person.id}
                    onClick={() => onAssign(person, { batch_id: batchId, lab })}
                  >
                    {busyId === person.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3.5 w-3.5" />
                    )}
                    Place
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}