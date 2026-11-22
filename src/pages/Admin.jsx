import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { db } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { useBatch } from '@/lib/BatchContext';
import {
  canManageBatch,
  canRemoveMembers,
  canSetLabLeader,
  isOwner as isOwnerOf,
  removeNeedsOverride,
} from '@/lib/staffRoles';
import BatchManager from '@/components/admin/BatchManager';
import BatchSeeder from '@/components/admin/BatchSeeder';
import RemoveMemberDialog from '@/components/admin/RemoveMemberDialog';
import MemberDirectory from '@/components/admin/MemberDirectory';
import PendingSignups from '@/components/admin/PendingSignups';
import ReportsQueue from '@/components/admin/ReportsQueue';
import FriendApprovalsQueue from '@/components/friends/FriendApprovalsQueue';
import InviteMember from '@/components/admin/InviteMember';
import { cn } from '@/lib/utils';

export default function Admin() {
  const { user } = useAuth();
  const { batches, available, activeBatch, refresh } = useBatch();
  const owner = isOwnerOf(user);
  const canManage = canManageBatch(user);
  const removable = canRemoveMembers(user);
  const canLead = canSetLabLeader(user);

  const scope = owner ? batches.filter((item) => item.status !== 'archived') : available;
  const [batchId, setBatchId] = useState('');
  const batch =
    scope.find((item) => item.id === batchId) ||
    scope.find((item) => item.id === activeBatch?.id) ||
    scope[0] ||
    null;

  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportBusyId, setReportBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [batchBusy, setBatchBusy] = useState(null);
  const [error, setError] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);

  const call = async (payload) => {
    const res = await db.functions.invoke('manageMembers', payload);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  };

  const loadMembers = async (id) => {
    if (!id) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await call({ action: 'directory', batch_id: id });
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const loadPending = async () => {
    if (!canManage) return;
    try {
      const data = await call({ action: 'unassigned' });
      setPending(data.members || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // Member reports are handled per batch: only pending ones need a decision.
  const loadReports = async (id) => {
    if (!id) {
      setReports([]);
      return;
    }
    try {
      const page = await db.entities.Report.filter(
        { batch: id, status: 'pending' },
        { sort: '-created_date', limit: 100 }
      );
      setReports(page.items || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const dismissReport = async (report) => {
    setReportBusyId(report.id);
    setError('');
    try {
      await db.entities.Report.update(report.id, { status: 'dismissed' });
      await loadReports(batch?.id);
    } catch (err) {
      setError(err.message);
    }
    setReportBusyId(null);
  };

  const actionReport = async (report) => {
    setReportBusyId(report.id);
    setError('');
    try {
      if (report.target_type === 'post') {
        await db.entities.Post.delete(report.target_id);
      } else {
        await db.entities.PostComment.delete(report.target_id);
      }
      await db.entities.Report.update(report.id, { status: 'actioned' });
      await loadReports(batch?.id);
    } catch (err) {
      setError(err.message);
    }
    setReportBusyId(null);
  };

  useEffect(() => {
    if (canManage) loadMembers(batch?.id);
  }, [batch?.id, canManage]);

  useEffect(() => {
    if (canManage) loadPending();
  }, [canManage]);

  useEffect(() => {
    if (canManage) loadReports(batch?.id);
  }, [batch?.id, canManage]);

  if (!canManage) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-20 text-center">
        <ShieldCheck className="mx-auto h-7 w-7 text-muted-foreground" />
        <h2 className="mt-3 font-heading text-xl font-bold tracking-tight">Staff area</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Only the owner, batch coordinators and teachers can manage members.
        </p>
      </div>
    );
  }

  const act = async (busyKey, payload) => {
    setBusyId(busyKey);
    setError('');
    try {
      await call(payload);
      await loadMembers(payload.batch_id || batch?.id);
      await loadPending();
    } catch (err) {
      setError(err.message);
    }
    setBusyId(null);
  };

  const changeLab = (member, lab) =>
    act(member.id, { action: 'assign', user_id: member.id, batch_id: batch.id, lab });

  const changeRole = (member, staff_role) =>
    act(member.id, { action: 'assign', user_id: member.id, batch_id: batch.id, lab: member.lab, staff_role });

  const toggleLeader = (member) =>
    act(member.id, { action: 'setLeader', user_id: member.id, is_leader: !member.is_lab_leader });

  const removeMember = (member) => act(member.id, { action: 'remove', user_id: member.id });

  // The owner may remove anyone, but that is an override and is confirmed first.
  const requestRemove = (member) => {
    if (removeNeedsOverride(user)) {
      setRemoveTarget(member);
      return;
    }
    removeMember(member);
  };

  const placeInBatch = (person, payload) =>
    act(person.id, { action: 'assign', user_id: person.id, ...payload });

  const invite = async ({ email, lab }) => {
    setBusyId('invite');
    setError('');
    try {
      const data = await call({ action: 'invite', email, batch_id: batch.id, lab });
      if (!data.invited && !data.matched) {
        setError(data.note || 'Could not add that email — try again or add them from App Users.');
      }
      await loadMembers(batch.id);
      await loadPending();
    } catch (err) {
      setError(err.message);
    }
    setBusyId(null);
  };

  const createBatch = async (payload) => {
    setBatchBusy('create');
    await db.entities.Batch.create(payload);
    await refresh();
    setBatchBusy(null);
  };

  const updateBatch = async (id, patch) => {
    setBatchBusy(id);
    await db.entities.Batch.update(id, patch);
    await refresh();
    setBatchBusy(null);
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {owner ? 'Owner console' : 'Staff console'}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          Batches & members
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Create batches, approve sign-ups, assign labs and pick one lab leader per lab.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-[#DB2777]/30 bg-[#DB2777]/5 p-3 text-xs text-[#BE185D]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {owner && <BatchSeeder onDone={refresh} />}

      {owner && (
        <BatchManager
          batches={batches}
          onCreate={createBatch}
          onUpdate={updateBatch}
          busy={batchBusy}
        />
      )}

      {canManage && <PendingSignups members={pending} batches={scope} onAssign={placeInBatch} busyId={busyId} />}

      {canManage && (
        <ReportsQueue
          reports={reports}
          busyId={reportBusyId}
          onDismiss={dismissReport}
          onRemoveContent={actionReport}
        />
      )}

      {(owner || canManage) && <FriendApprovalsQueue me={user} />}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Members
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {scope.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setBatchId(item.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold transition-all',
                  item.id === batch?.id
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {item.name.replace(`${item.course_name || ''} — `, '')}
              </button>
            ))}
          </div>
        </div>

        {batch && <InviteMember batch={batch} onInvite={invite} busy={busyId === 'invite'} />}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <MemberDirectory
            members={members}
            batch={batch}
            isOwner={owner}
            canRemove={removable}
            canSetLeader={canLead}
            onChangeLab={changeLab}
            onChangeRole={changeRole}
            onToggleLeader={toggleLeader}
            onRemove={requestRemove}
            busyId={busyId}
          />
        )}
      </section>

      <RemoveMemberDialog
        member={removeTarget}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeMember(removeTarget);
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}