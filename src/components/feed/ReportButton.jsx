import React, { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export const REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'inappropriate', label: 'Inappropriate content' },
  { key: 'misinformation', label: 'Misinformation' },
  { key: 'other', label: 'Something else' },
];

export const reportReasonLabel = (key) =>
  REPORT_REASONS.find((reason) => reason.key === key)?.label || 'Something else';

// Reporting hands content to the batch staff, so one pending report per
// member per item is enough — a second tap is answered, not duplicated.
export default function ReportButton({ targetType, targetId, batch, userId, variant = 'icon' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const existing = await base44.entities.Report.filter(
        { target_type: targetType, target_id: targetId, status: 'pending' },
        { limit: 50 }
      );
      const mine = (existing.items || []).some((row) => row.created_by_id === userId);
      if (mine) {
        toast({
          title: 'Already reported',
          description: 'You have already flagged this — the batch staff will take a look.',
        });
      } else {
        await base44.entities.Report.create({
          target_type: targetType,
          target_id: targetId,
          batch: batch || '',
          reason,
          details: details.trim(),
        });
        toast({
          title: 'Report sent',
          description: 'Thanks for flagging it — the batch staff will take a look.',
        });
      }
      setOpen(false);
      setReason('spam');
      setDetails('');
    } catch (err) {
      toast({
        title: 'Report could not be sent',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    }
    setBusy(false);
  };

  return (
    <>
      {variant === 'text' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Report
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`Report this ${targetType}`}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader className="text-left">
            <h2 className="font-heading text-lg font-semibold leading-none tracking-tight">
              Report this {targetType === 'post' ? 'post' : 'comment'}
            </h2>
            <p className="text-sm text-muted-foreground">
              The batch staff will see your report and decide what to do. The author is not told
              who reported it.
            </p>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Reason
              </span>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs font-medium"
              >
                {REPORT_REASONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Anything else? (optional)
              </span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Add a little context for the staff…"
                className={cn(
                  'w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs leading-relaxed outline-none',
                  'placeholder:text-muted-foreground focus:border-foreground/30'
                )}
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition-opacity disabled:opacity-40"
                disabled={busy}
              >
                {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Send report
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
