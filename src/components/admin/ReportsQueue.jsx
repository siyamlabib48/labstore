import React from 'react';
import { Flag, Loader2, Trash2 } from 'lucide-react';
import { reportReasonLabel } from '@/components/feed/ReportButton';
import { timeAgo } from '@/lib/format';

// Pending member reports for the batch on screen. Staff either dismiss a
// report that needs no action, or remove the content and mark it actioned.
export default function ReportsQueue({ reports, busyId, onDismiss, onRemoveContent }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Flag className="h-3.5 w-3.5" /> Reports
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">{reports.length}</span>
      </div>

      <div className="mt-3 space-y-2.5">
        {reports.length === 0 ? (
          <p className="rounded-xl bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">
            No pending reports. You're all caught up.
          </p>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="rounded-xl border border-border/70 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {report.target_type === 'post' ? 'Post' : 'Comment'}
                </span>
                <span className="text-xs font-semibold">{reportReasonLabel(report.reason)}</span>
                <span className="text-[11px] text-muted-foreground">
                  · reported {timeAgo(report.created_date)}
                </span>
              </div>

              {report.details && (
                <p className="mt-1.5 whitespace-pre-line break-words text-xs leading-relaxed text-foreground/80">
                  {report.details}
                </p>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-white px-2.5 text-[11px] font-medium transition-colors hover:bg-muted disabled:opacity-40"
                  disabled={busyId === report.id}
                  onClick={() => onDismiss(report)}
                >
                  {busyId === report.id ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Dismiss
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-destructive px-2.5 text-[11px] font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-40"
                  disabled={busyId === report.id}
                  onClick={() => onRemoveContent(report)}
                >
                  {busyId === report.id ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  Remove content &amp; action
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
