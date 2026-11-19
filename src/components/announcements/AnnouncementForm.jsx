import React, { useState } from 'react';
import { Loader2, Megaphone, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { labOf } from '@/lib/labs';
import { ANNOUNCEMENT_CATEGORIES } from '@/lib/announcementCategories';
import usePendingFiles from '@/hooks/usePendingFiles';
import { AttachButton, PendingFileChips } from '@/components/common/PendingFiles';

const selectClass =
  'h-10 rounded-xl border border-border bg-white px-2.5 text-sm outline-none transition-colors focus:border-foreground/30';

export default function AnnouncementForm({ onPublish, scopeLab = '' }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('general');
  const [eventAt, setEventAt] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const files = usePendingFiles(setError);

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Add a title and a message.');
      return;
    }
    setPosting(true);
    setError('');
    try {
      const attachments = await files.uploadAll();
      await onPublish({
        title: title.trim(),
        body: body.trim(),
        priority,
        category,
        // datetime-local gives local time with no zone; store it as ISO so
        // every reader renders the same instant in their own zone.
        event_at: eventAt ? new Date(eventAt).toISOString() : '',
        attachments,
      });
      setTitle('');
      setBody('');
      setPriority('normal');
      setCategory('general');
      setEventAt('');
      files.clear();
    } catch (err) {
      setError(err.message || 'Could not publish the announcement');
    }
    setPosting(false);
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-border/70 bg-white p-4 sm:p-5">
      <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Megaphone className="h-3.5 w-3.5" /> New announcement
      </h2>

      {scopeLab && (
        <p className="mt-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          Posts to {labOf(scopeLab).label} only — your lab, not the whole batch.
        </p>
      )}

      <div className="mt-3 space-y-2.5">
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError('');
          }}
          maxLength={120}
          placeholder="Title — e.g. Submission deadline moved to Sunday"
        />
        <Textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setError('');
          }}
          rows={3}
          maxLength={2000}
          placeholder="What does your batch need to know?"
        />
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={selectClass}
            >
              {ANNOUNCEMENT_CATEGORIES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
            When (optional)
            <input
              type="datetime-local"
              value={eventAt}
              onChange={(event) => setEventAt(event.target.value)}
              className={selectClass}
            />
          </label>
        </div>
        {files.pending.length > 0 && (
          <PendingFileChips pending={files.pending} onRemove={files.removeAt} />
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {[
              { key: 'normal', label: 'Normal' },
              { key: 'important', label: 'Important' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setPriority(option.key)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  priority === option.key
                    ? 'bg-foreground text-background'
                    : 'border border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <AttachButton onFiles={files.addFiles} disabled={posting} />
        </div>

        <Button type="submit" size="sm" className="rounded-full px-4" disabled={posting}>
          {posting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Publish
        </Button>
      </div>
    </form>
  );
}
