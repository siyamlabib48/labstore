import { getCaller, mapUser, serviceClient, svc } from '../_shared/svc.ts';
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
} from '../_shared/access.ts';

const STAFF_ROLES = ['coordinator', 'dedicated_teacher', 'teacher', 'cr', 'acr', 'member'];
const APPROVAL_STATES = ['pending', 'approved', 'rejected'];

const safeMember = (u: any) => ({
  id: u.id,
  full_name: u.full_name || '',
  email: u.email || '',
  lab: u.lab || '',
  batch: u.batch || '',
  staff_role: u.staff_role || 'member',
  approval_status: u.approval_status || 'pending',
  created_date: u.created_at,
});

async function handler(req: Request) {
  try {
    const db = serviceClient();
    const caller = await getCaller(req, db);
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isApproved(caller)) return pendingApproval();

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const owner = isOwner(caller);
    const staffManager = canManageBatch(caller);

    const loadTarget = async (userId: string) => {
      if (!userId) return null;
      return mapUser(await svc.get(db, 'profiles', userId));
    };

    const loadBatch = async (batchId: string) => {
      if (!batchId) return null;
      return await svc.get(db, 'batches', batchId);
    };

    // Roster reads page through to the end instead of trusting a single
    // read, which can stop at a default page size and silently cut a large
    // roster (a missing member then looks unassigned, uninvitable or
    // leaderless). The 20-page ceiling (20 × 500 = 10,000 users) is a
    // runaway guard only, mirroring the works tally in getLeaderboard.
    const listUsers = async (query: Record<string, unknown> = {}) => {
      const all: any[] = [];
      for (let page = 0; page < 20; page += 1) {
        const rows = await svc.filter(db, 'profiles', query, { limit: 500, offset: page * 500 });
        all.push(...rows.map(mapUser));
        if (rows.length < 500) break;
      }
      return all;
    };

    // Emails are personal data: only the people who manage the batch see
    // them, plus the lab's CR/ACR who lead it. Everyone else in the batch
    // gets the roster without contact details.
    const canSeeEmails = owner || staffManager || ['cr', 'acr'].includes(caller.staff_role);

    if (action === 'directory') {
      const batchId = String(body.batch_id || '');
      if (!batchId) return Response.json({ error: 'batch_id is required' }, { status: 400 });
      if (!owner && !sameBatch(caller, batchId)) return forbidden();

      const users = await listUsers({ batch: batchId });
      const members = (users || [])
        .filter((u: any) => u.role !== 'admin')
        .map((u: any) => {
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
        .filter((u: any) => u.role !== 'admin' && !u.batch)
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

      const patch: Record<string, unknown> = { batch: batchId, lab, approval_status: 'approved' };
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

      await svc.update(db, 'profiles', target.id, patch);
      return Response.json({ member: safeMember({ ...target, ...patch }) });
    }

    if (action === 'approve' || action === 'reject') {
      const target = await loadTarget(String(body.user_id || ''));
      if (!target) return Response.json({ error: 'Member not found' }, { status: 404 });
      if (target.role === 'admin') return forbidden();
      if (!canApproveSignups(caller)) return forbidden();
      if (!owner && !sameBatch(caller, target.batch)) return forbidden();

      const patch = { approval_status: action === 'approve' ? 'approved' : 'rejected' };
      await svc.update(db, 'profiles', target.id, patch);
      return Response.json({ member: safeMember({ ...target, ...patch }) });
    }

    if (action === 'remove') {
      const target = await loadTarget(String(body.user_id || ''));
      if (!target) return Response.json({ error: 'Member not found' }, { status: 404 });
      if (target.role === 'admin') return Response.json({ error: 'Owner cannot be removed' }, { status: 400 });
      if (!owner) {
        // Removal is a coordinator decision inside their own batch. Teachers,
        // CRs and ACRs are denied.
        if (!canCoordinate(caller)) return forbidden();
        if (!sameBatch(caller, target.batch)) return forbidden();
        // A coordinator cannot remove another batch's staff.
        if (['coordinator', 'teacher', 'dedicated_teacher'].includes(target.staff_role)) return forbidden();
      }

      await svc.update(db, 'profiles', target.id, {
        batch: null,
        lab: '',
        staff_role: 'member',
        approval_status: 'pending',
      });
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
        // Supabase Auth sends the invite email; the invitee sets a password
        // through the link and their profile row appears via the signup
        // trigger, ready to be placed below or from the unassigned list.
        const { error: inviteError } = await db.auth.admin.inviteUserByEmail(email);
        if (inviteError) throw inviteError;
        invited = true;
      } catch (error: any) {
        note = error.message;
      }

      const users = await listUsers();
      const existing = (users || []).find((u: any) => (u.email || '').toLowerCase() === email);
      if (existing && !owner && (existing.role === 'admin' || (existing.batch && !sameBatch(caller, existing.batch)))) {
        return forbidden();
      }
      if (existing && existing.role !== 'admin') {
        const patch: Record<string, unknown> = {
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
        await svc.update(db, 'profiles', existing.id, patch);
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

Deno.serve(handler);
