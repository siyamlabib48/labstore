import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  canApproveSignups,
  canChangeRoles,
  canCoordinate,
  canManageBatch,
  forbidden,
  isApproved,
  isOwner,
  pendingApproval,
  sameBatch,
} from '../../shared/access.ts';

const STAFF_ROLES = ['coordinator', 'teacher', 'cr', 'acr', 'member'];
const APPROVAL_STATES = ['pending', 'approved', 'rejected'];

const safeMember = (u) => ({
  id: u.id,
  full_name: u.full_name || '',
  email: u.email || '',
  lab: u.lab || '',
  batch: u.batch || '',
  staff_role: u.staff_role || 'member',
  is_lab_leader: !!u.is_lab_leader,
  approval_status: u.approval_status || 'pending',
  created_date: u.created_date,
});

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isApproved(caller)) return pendingApproval();

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const owner = isOwner(caller);
    const staffManager = canManageBatch(caller);
    const db = base44.asServiceRole.entities;

    const loadTarget = async (userId) => {
      if (!userId) return null;
      return await db.User.get(userId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    };

    const loadBatch = async (batchId) => {
      if (!batchId) return null;
      return await db.Batch.get(batchId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    };

    // Roster reads page through to the end instead of trusting a single bare
    // filter/list read, which can stop at the SDK's default page size and
    // silently cut a large roster (a missing member then looks unassigned,
    // uninvitable or leaderless). The 20-page ceiling (20 × 500 = 10,000
    // users) is a runaway guard only, mirroring the works tally in
    // getLeaderboard. Results may arrive as a page object or a bare array.
    const listUsers = async (query) => {
      const all = [];
      let cursor;
      for (let page = 0; page < 20; page += 1) {
        const res = await db.User.filter(query || {}, cursor ? { limit: 500, cursor } : { limit: 500 });
        all.push(...(Array.isArray(res) ? res : res.items || []));
        cursor = Array.isArray(res) ? null : res.next_cursor;
        if (!cursor) break;
      }
      return all;
    };

    // Emails are personal data: only the people who manage the batch see them.
    // Everyone else in the batch gets the roster without contact details.
    const canSeeEmails = owner || staffManager || !!caller.is_lab_leader;

    if (action === 'directory') {
      const batchId = String(body.batch_id || '');
      if (!batchId) return Response.json({ error: 'batch_id is required' }, { status: 400 });
      if (!owner && !sameBatch(caller, batchId)) return forbidden();

      const users = await listUsers({ batch: batchId });
      const members = (users || [])
        .filter((u) => u.role !== 'admin')
        .map((u) => {
          const member = safeMember(u);
          if (!canSeeEmails) member.email = '';
          return member;
        });
      return Response.json({ members });
    }

    if (action === 'unassigned') {
      // Teachers and coordinators need this list to place a new sign-up in
      // their own batch; they can only ever assign into that batch.
      if (!owner && !staffManager) return forbidden();
      const users = await listUsers();
      const members = (users || [])
        .filter((u) => u.role !== 'admin' && !u.batch)
        .map(safeMember);
      return Response.json({ members });
    }

    if (action === 'assign') {
      const target = await loadTarget(String(body.user_id || ''));
      if (!target) return Response.json({ error: 'Member not found' }, { status: 404 });
      if (target.role === 'admin') return forbidden();

      const batchId = String(body.batch_id || target.batch || '');
      if (!batchId) return Response.json({ error: 'batch_id is required' }, { status: 400 });

      if (!owner) {
        if (!staffManager) return forbidden();
        if (!sameBatch(caller, batchId)) return forbidden();
        // A teacher or coordinator may place an unassigned sign-up straight into
        // their own batch's lab, but never pull in another batch's member.
        if (target.batch && !sameBatch(caller, target.batch)) return forbidden();
        if (['coordinator', 'teacher'].includes(target.staff_role)) return forbidden();
      }

      const batch = await loadBatch(batchId);
      if (!batch) return Response.json({ error: 'Batch not found' }, { status: 404 });

      const lab = body.lab !== undefined ? String(body.lab) : target.lab || '';
      if (lab && !(batch.labs || []).includes(lab)) {
        return Response.json({ error: 'That lab is not part of this batch' }, { status: 400 });
      }

      const patch = { batch: batchId, lab, approval_status: 'approved' };
      if (body.staff_role !== undefined) {
        // Role changes are an owner-only capability.
        if (!canChangeRoles(caller)) return forbidden();
        if (!STAFF_ROLES.includes(body.staff_role)) {
          return Response.json({ error: 'Unknown staff role' }, { status: 400 });
        }
        patch.staff_role = body.staff_role;
      }
      if (body.approval_status !== undefined) {
        if (!canApproveSignups(caller)) return forbidden();
        if (!APPROVAL_STATES.includes(body.approval_status)) {
          return Response.json({ error: 'Unknown approval state' }, { status: 400 });
        }
        patch.approval_status = body.approval_status;
      }

      await db.User.update(target.id, patch);
      return Response.json({ member: safeMember({ ...target, ...patch }) });
    }

    if (action === 'approve' || action === 'reject') {
      const target = await loadTarget(String(body.user_id || ''));
      if (!target) return Response.json({ error: 'Member not found' }, { status: 404 });
      if (target.role === 'admin') return forbidden();
      if (!canApproveSignups(caller)) return forbidden();
      if (!owner && !sameBatch(caller, target.batch)) return forbidden();

      const patch = { approval_status: action === 'approve' ? 'approved' : 'rejected' };
      await db.User.update(target.id, patch);
      return Response.json({ member: safeMember({ ...target, ...patch }) });
    }

    if (action === 'remove') {
      const target = await loadTarget(String(body.user_id || ''));
      if (!target) return Response.json({ error: 'Member not found' }, { status: 404 });
      if (target.role === 'admin') return Response.json({ error: 'Owner cannot be removed' }, { status: 400 });
      if (!owner) {
        // Removal is a coordinator decision inside their own batch. Teachers,
        // CRs, ACRs and lab leaders are denied.
        if (!canCoordinate(caller)) return forbidden();
        if (!sameBatch(caller, target.batch)) return forbidden();
        // A coordinator cannot remove another batch's staff.
        if (['coordinator', 'teacher'].includes(target.staff_role)) return forbidden();
      }

      await db.User.update(target.id, {
        batch: '',
        lab: '',
        is_lab_leader: false,
        staff_role: 'member',
        approval_status: 'pending',
      });
      return Response.json({ ok: true });
    }

    if (action === 'setLeader') {
      const target = await loadTarget(String(body.user_id || ''));
      if (!target) return Response.json({ error: 'Member not found' }, { status: 404 });
      const allowed = owner || (canCoordinate(caller) && sameBatch(caller, target.batch));
      if (!allowed) return forbidden();
      if (target.role === 'admin') return forbidden();
      if (!target.lab) return Response.json({ error: 'Assign a lab first' }, { status: 400 });

      const makeLeader = !!body.is_leader;
      if (makeLeader) {
        const mates = await listUsers({ batch: target.batch, lab: target.lab });
        const previous = (mates || []).filter((u) => u.id !== target.id && u.is_lab_leader);
        if (previous.length) {
          await db.User.bulkUpdate(previous.map((u) => ({ id: u.id, is_lab_leader: false })));
        }
      }
      await db.User.update(target.id, { is_lab_leader: makeLeader });
      return Response.json({ ok: true });
    }

    if (action === 'invite') {
      const email = String(body.email || '').trim().toLowerCase();
      const batchId = String(body.batch_id || '');
      const lab = String(body.lab || '');
      if (!email || !batchId) {
        return Response.json({ error: 'email and batch_id are required' }, { status: 400 });
      }
      if (!owner && !(staffManager && sameBatch(caller, batchId))) return forbidden();

      const batch = await loadBatch(batchId);
      if (!batch) return Response.json({ error: 'Batch not found' }, { status: 404 });
      if (lab && !(batch.labs || []).includes(lab)) {
        return Response.json({ error: 'That lab is not part of this batch' }, { status: 400 });
      }

      let invited = false;
      let note = '';
      try {
        await base44.asServiceRole.users.inviteUser(email, 'user');
        invited = true;
      } catch (error) {
        note = error.message;
      }

      const users = await listUsers();
      const existing = (users || []).find((u) => (u.email || '').toLowerCase() === email);
      if (existing && !owner && (existing.role === 'admin' || (existing.batch && !sameBatch(caller, existing.batch)))) {
        return forbidden();
      }
      if (existing && existing.role !== 'admin') {
        const patch = {
          batch: batchId,
          lab,
          approval_status: 'approved',
          staff_role: existing.staff_role || 'member',
        };
        // Only the owner may set a staff role while inviting.
        if (owner && body.staff_role !== undefined) {
          if (!STAFF_ROLES.includes(body.staff_role)) {
            return Response.json({ error: 'Unknown staff role' }, { status: 400 });
          }
          patch.staff_role = body.staff_role;
        }
        await db.User.update(existing.id, patch);
      }

      // When the invitee has no account yet there is nothing to place: say so
      // explicitly, so the admin knows the batch/lab assignment is still
      // pending until the invitee signs up and lands in the unassigned list.
      return Response.json({
        invited,
        matched: !!existing,
        placement_pending: !existing,
        note,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}