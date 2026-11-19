import React, { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PROGRESS_ORDER, percentOf, progressStatusOf } from '@/lib/progressStatus';
import { cn } from '@/lib/utils';

export default function ManageProgressDialog({
  member,
  records,
  onOpenChange,
  onAdd,
  onStatus,
  onRemove,
}) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async (event) => {
    event.preventDefault();
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    await onAdd(value);
    setTitle('');
    setBusy(false);
  };

  const percent = percentOf(records);

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {member?.full_name || member?.email || 'Student'}
          </DialogTitle>
          <DialogDescription>
            {member?.lab ? `Lab ${member.lab} · ` : ''}
            {percent}% of {records.length} milestone{records.length === 1 ? '' : 's'} complete
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={add} className="flex items-center gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Add a milestone, e.g. Week 3 — landing page"
            className="h-9 flex-1 rounded-full border border-border bg-background px-3 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
          />
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="flex h-9 items-center gap-1 rounded-full bg-foreground px-3 text-[11px] font-semibold text-background disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </form>

        <div className="mt-1 space-y-2">
          {records.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
              No milestones yet — add the first one above.
            </p>
          )}

          {records.map((row) => {
            const status = progressStatusOf(row.status);
            return (
              <div key={row.id} className="flex items-center gap-2 rounded-xl border border-border/70 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{row.title}</p>
                  <span className={cn('mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold', status.chip)}>
                    {status.label}
                  </span>
                </div>
                <select
                  value={row.status}
                  onChange={(event) => onStatus(row, event.target.value)}
                  className="h-7 rounded-md border border-border bg-white px-1.5 text-[10px] font-medium"
                >
                  {PROGRESS_ORDER.map((key) => (
                    <option key={key} value={key}>
                      {progressStatusOf(key).label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onRemove(row)}
                  title="Delete milestone"
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}