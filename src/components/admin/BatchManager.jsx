import React, { useState } from 'react';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { LAB_KEYS, LABS } from '@/lib/labs';
import { BATCH_STATUS, batchStatusOf } from '@/lib/batches';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const empty = { name: '', course_name: '', description: '', status: 'upcoming', labs: ['A'] };

export default function BatchManager({ batches, onCreate, onUpdate, onDelete, memberCounts, isOwnerUser, busy }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const startEdit = (batch) => {
    setEditingId(batch.id);
    setEditForm({
      name: batch.name || '',
      course_name: batch.course_name || '',
      description: batch.description || '',
    });
  };

  const saveEdit = async (batch) => {
    if (!editForm.name.trim()) return;
    await onUpdate(batch.id, {
      name: editForm.name.trim(),
      course_name: editForm.course_name.trim(),
      description: editForm.description.trim(),
    });
    setEditingId(null);
    setEditForm(null);
  };

  // Coordinators may delete only a batch with no members in it; once a
  // student has been placed, deletion is owner-only (the row policies
  // enforce the same rule server-side).
  const deleteBlocked = (batch) => !isOwnerUser && (memberCounts?.[batch.id] ?? 0) > 0;

  const handleDelete = (batch) => {
    const count = memberCounts?.[batch.id] ?? 0;
    const warning =
      count > 0
        ? `Delete "${batch.name}"? It has ${count} member${count === 1 ? '' : 's'} — they will lose their batch placement. This cannot be undone.`
        : `Delete "${batch.name}"? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    onDelete(batch.id);
  };

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
                    {(batch.labs || []).length === 1 ? '' : 's'} · {memberCounts?.[batch.id] ?? 0} member
                    {(memberCounts?.[batch.id] ?? 0) === 1 ? '' : 's'}
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
                <button
                  type="button"
                  onClick={() => (editingId === batch.id ? setEditingId(null) : startEdit(batch))}
                  disabled={busy === batch.id}
                  aria-label={`Edit ${batch.name}`}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(batch)}
                  disabled={busy === batch.id || deleteBlocked(batch)}
                  aria-label={`Delete ${batch.name}`}
                  title={
                    deleteBlocked(batch)
                      ? 'This batch has members — only the owner can delete it'
                      : `Delete ${batch.name}`
                  }
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-[#DB2777]/10 hover:text-[#BE185D] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
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
              {deleteBlocked(batch) && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  This batch has members, so only the owner can delete it.
                </p>
              )}
              {editingId === batch.id && editForm && (
                <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                  <Input
                    value={editForm.name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Batch name"
                  />
                  <Input
                    value={editForm.course_name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, course_name: event.target.value }))}
                    placeholder="Course name"
                  />
                  <Textarea
                    value={editForm.description}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Short description"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full"
                      disabled={busy === batch.id || !editForm.name.trim()}
                      onClick={() => saveEdit(batch)}
                    >
                      Save changes
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
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