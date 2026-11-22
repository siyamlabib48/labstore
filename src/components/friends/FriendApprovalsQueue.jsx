import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Check, X } from 'lucide-react';
import { db } from '@/api/dataClient';
import { useToast } from '@/components/ui/use-toast';
import { timeAgo } from '@/lib/format';
import { labOf } from '@/lib/labs';

// Friend requests held by the approval safeguard, waiting on a staff
// decision. Visible only to the people who can decide them: the requester's
// lab teacher, the batch coordinator, or the owner. RLS scopes the rows the
// same way; the filter here is a second belt on the same braces.
export default function FriendApprovalsQueue({ me }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [reasons, setReasons] = useState({});

  const isOwner = me?.role === 'admin';
  const canDecide =
    !!me && (isOwner || me.staff_role === 'teacher' || me.staff_role === 'coordinator');
  const myId = me?.id;
  const myBatch = me?.batch;
  const myLab = me?.lab;
  const myRole = me?.staff_role;

  const load = useCallback(async () => {
    if (!canDecide) {
      setLoading(false);
      return;
    }
    const page = await db.entities.FriendApprovalRequest.filter(
      { status: 'pending' },
      { sort: '-created_date', limit: 100 }
    ).catch(() => ({ items: [] }));
    const inScope = (row) => {
      if (isOwner) return true;
      if (myRole === 'coordinator') return !!myBatch && row.batch === myBatch;
      if (myRole === 'teacher') {
        return !!myBatch && row.batch === myBatch && !!myLab && row.lab === myLab;
      }
      return false;
    };
    setItems((page.items || []).filter(inScope));
    setLoading(false);
    // myId is listed so a fresh sign-in refetches; the scope fields above are
    // the primitives the filter actually reads.
  }, [canDecide, isOwner, myId, myBatch, myLab, myRole]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (row, decision) => {
    const reason = (reasons[row.id] || '').trim();
    if (decision === 'rejected' && !reason) {
      toast({
        variant: 'destructive',
        title: 'A reason is required',
        description: 'Tell the student why, so they understand the decision.',
      });
      return;
    }
    setBusyId(row.id);
    try {
      const res = await db.functions.invoke('manageFriendApproval', {
        action: 'decide',
        approval_id: row.id,
        decision,
        reason: reason || undefined,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({
        title: decision === 'approved' ? 'Request approved' : 'Request rejected',
        description:
          decision === 'approved'
            ? 'The friend request has been sent on to the recipient.'
            : 'The student has been told, with your reason.',
      });
      await load();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not save the decision',
        description: err.message || 'Please try again.',
      });
    }
    setBusyId(null);
  };

  if (!canDecide || loading || items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/70 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Friend approvals
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">{items.length}</span>
      </div>

      <div className="mt-3 space-y-2.5">
        {items.map((row) => (
          <div key={row.id} className="rounded-xl border border-border/70 p-3">
            <p className="text-xs leading-relaxed">
              <span className="font-semibold">{row.requester_name || 'A student'}</span>
              {row.lab ? (
                <span className="text-muted-foreground"> ({labOf(row.lab).label})</span>
              ) : null}{' '}
              wants to add{' '}
              <span className="font-semibold">{row.recipient_name || 'a member'}</span> as a
              friend
              <span className="text-muted-foreground"> · {timeAgo(row.created_date)}</span>
            </p>

            {row.note && (
              <p className="mt-1.5 whitespace-pre-line break-words rounded-lg bg-muted/50 px-2.5 py-2 text-xs leading-relaxed text-foreground/80">
                “{row.note}”
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                onClick={() => decide(row, 'approved')}
                disabled={busyId === row.id}
              >
                {busyId === row.id ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1 h-3.5 w-3.5" />
                )}
                Approve
              </button>
              <input
                value={reasons[row.id] || ''}
                onChange={(event) =>
                  setReasons((prev) => ({ ...prev, [row.id]: event.target.value }))
                }
                placeholder="Reason (required to reject)"
                maxLength={300}
                className="flex h-8 min-w-[180px] flex-1 rounded-md border border-input bg-white px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                className="inline-flex h-8 items-center justify-center rounded-full border border-input bg-white px-3 text-[11px] font-medium transition-colors hover:bg-muted disabled:opacity-40"
                onClick={() => decide(row, 'rejected')}
                disabled={busyId === row.id}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
