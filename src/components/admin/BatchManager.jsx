import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { LAB_KEYS, LABS } from '@/lib/labs';
import { BATCH_STATUS, batchStatusOf } from '@/lib/batches';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const empty = { name: '', course_name: '', description: '', status: 'upcoming', labs: ['A'] };

export default function BatchManager({ batches, onCreate, onUpdate, busy }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const toggleLab = (key) =>
    setForm((prev) => ({
      ...prev,
      labs: prev.labs.includes(key) ? prev.labs.filter((item) => item !== key) : [...prev.labs, key],
    }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.labs.length) return;
    setSaving(true);
    await onCreate({
      ...form,
      name: form.name.trim(),
      course_name: form.course_name.trim(),
      labs: LAB_KEYS.filter((key) => form.labs.includes(key)),
    });
    setForm(empty);
    setSaving(false);
  };

  const toggleBatchLab = (batch, key) => {
    const current = batch.labs || [];
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    if (!next.length) return;
    onUpdate(batch.id, { labs: LAB_KEYS.filter((item) => next.includes(item)) });
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Batches
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Every batch is its own workspace — gallery, leaderboard, directory and chats.
        </p>
      </div>

      <div className="space-y-2">
        {batches.map((batch) => {
          const status = batchStatusOf(batch.status);
          return (
            <div key={batch.id} className="rounded-2xl border border-border/70 bg-white p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-tight">{batch.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {batch.course_name || 'Course'} · {(batch.labs || []).length} lab
                    {(batch.labs || []).length === 1 ? '' : 's'}
                  </p>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', status.chip)}>
                  {status.label}
                </span>
                <select
                  value={batch.status}
                  onChange={(event) => onUpdate(batch.id, { status: event.target.value })}
                  disabled={busy === batch.id}
                  className="h-7 rounded-md border border-border bg-white px-1.5 text-[10px] font-semibold"
                >
                  {Object.entries(BATCH_STATUS).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LAB_KEYS.map((key) => {
                  const active = (batch.labs || []).includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleBatchLab(batch, key)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all',
                        active ? `${LABS[key].solid} text-white` : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {LABS[key].label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="space-y-2.5 rounded-2xl border border-dashed border-border bg-white/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Create a batch
        </p>
        <Input
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Batch name — e.g. Freelancing Course — Batch 9"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={form.course_name}
            onChange={(event) => setForm((prev) => ({ ...prev, course_name: event.target.value }))}
            placeholder="Course name"
          />
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            className="h-9 rounded-md border border-input bg-white px-2 text-sm"
          >
            {Object.entries(BATCH_STATUS).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Short description"
          rows={2}
        />
        <div className="flex flex-wrap gap-1.5">
          {LAB_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleLab(key)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all',
                form.labs.includes(key) ? `${LABS[key].solid} text-white` : 'bg-muted text-muted-foreground'
              )}
            >
              {LABS[key].label}
            </button>
          ))}
        </div>
        <Button type="submit" size="sm" className="rounded-full" disabled={saving || !form.name.trim()}>
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
          Create batch
        </Button>
      </form>
    </section>
  );
}