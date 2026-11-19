import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  canDecideFriendApproval,
  forbidden,
  friendApprovalNeeded,
  isApproved,
  pendingApproval,
} from '../../shared/access.ts';

const clip = (text, max) => String(text || '').slice(0, max);
const listOf = (res) => (Array.isArray(res) ? res : res?.items || []);

// Friend requests between students of different (or unknown) gender are held
// for staff approval — always on, no toggle. This function is the gate: it
// either creates the pending Friendship directly or files a
// FriendApprovalRequest for the requester's lab teacher / batch coordinator
// to decide. The decide action then creates the Friendship on approval.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isApproved(me)) return pendingApproval();

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const db = base44.asServiceRole.entities;

    const loadUser = async (userId) => {
      if (!userId) return null;
      return await db.User.get(userId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    };

    // Rows between the pair, whichever direction they were started in.
    const pairRows = async (entity, a, b) => {
      const [forward, reverse] = await Promise.all([
        entity.filter({ requester_id: a, recipient_id: b }, { limit: 50 }),
        entity.filter({ requester_id: b, recipient_id: a }, { limit: 50 }),
      ]);
      return [...listOf(forward), ...listOf(reverse)];
    };

    const createFriendship = async (requester, recipient, note) =>
      await db.Friendship.create({
        requester_id: requester.id,
        recipient_id: recipient.id,
        requester_name: requester.full_name || '',
        requester_lab: requester.lab || '',
        recipient_name: recipient.full_name || '',
        recipient_lab: recipient.lab || '',
        status: 'pending',
        note: note || '',
      });

    // Same field shape as notify's friend_request action.
    const friendRequestNotification = (requesterName, recipient) => ({
      user_id: recipient.id,
      type: 'friend_request',
      title: `${requesterName || 'A member'} sent you a friend request`,
      body: 'Open Friends to accept or decline.',
      link: '/friends',
      actor_name: requesterName || '',
      is_read: false,
    });

    if (action === 'request') {
      const recipient = await loadUser(String(body.recipient_id || ''));
      if (!recipient) return Response.json({ error: 'Member not found' }, { status: 404 });
      if (recipient.id === me.id) {
        return Response.json({ error: 'You cannot send a friend request to yourself' }, { status: 400 });
      }
      if (recipient.role !== 'admin' && recipient.approval_status !== 'approved') {
        return Response.json({ error: 'That member is not available yet' }, { status: 400 });
      }
      const note = clip(body.note, 300).trim();

      const friendships = await pairRows(db.Friendship, me.id, recipient.id);
      if (friendships.some((row) => row.status === 'accepted')) {
        return Response.json({ error: 'You are already friends' }, { status: 400 });
      }
      if (friendships.some((row) => row.status === 'pending')) {
        return Response.json({ error: 'A friend request is already pending between you' }, { status: 400 });
      }
      // Rejected rows are kept as history; they never block a fresh request.

      const approvals = await pairRows(db.FriendApprovalRequest, me.id, recipient.id);
      if (approvals.some((row) => row.status === 'pending')) {
        return Response.json(
          { error: 'A request between you is already waiting for staff approval' },
          { status: 400 }
        );
      }

      if (!friendApprovalNeeded(me, recipient)) {
        const friendship = await createFriendship(me, recipient, note);
        await db.Notification.bulkCreate([friendRequestNotification(me.full_name, recipient)]);
        return Response.json({ route: 'direct', friendship_id: friendship.id });
      }

      const approval = await db.FriendApprovalRequest.create({
        requester_id: me.id,
        requester_name: me.full_name || '',
        recipient_id: recipient.id,
        recipient_name: recipient.full_name || '',
        batch: me.batch || '',
        lab: me.lab || '',
        note,
        status: 'pending',
      });

      // Approvers: the requester's lab teachers plus the batch coordinators.
      // If the batch has neither yet, owners are notified instead, so a held
      // request can never get stuck with nobody able to decide it.
      let approvers = [];
      if (me.batch) {
        const [teachers, coordinators] = await Promise.all([
          db.User.filter({ batch: me.batch, lab: me.lab || '', staff_role: 'teacher' }),
          db.User.filter({ batch: me.batch, staff_role: 'coordinator' }),
        ]);
        approvers = [...listOf(teachers), ...listOf(coordinators)].filter(
          (u) => u.approval_status === 'approved' && u.id !== me.id && u.id !== recipient.id
        );
      }
      if (approvers.length === 0) {
        const everyone = await db.User.list();
        approvers = listOf(everyone).filter((u) => u.role === 'admin');
      }
      if (approvers.length > 0) {
        await db.Notification.bulkCreate(
          approvers.map((approver) => ({
            user_id: approver.id,
            type: 'friend_approval_needed',
            title: `${me.full_name || 'A student'} wants to add ${recipient.full_name || 'a member'} as a friend`,
            body: note ? clip(note, 160) : 'This friend request needs your approval before it is sent.',
            link: '/friends',
            actor_name: me.full_name || '',
            is_read: false,
          }))
        );
      }
      return Response.json({ route: 'approval', approval_id: approval.id });
    }

    if (action === 'decide') {
      const approvalId = String(body.approval_id || '');
      const approval = approvalId
        ? await db.FriendApprovalRequest.get(approvalId).catch((e) =>
            e.status === 404 ? null : Promise.reject(e)
          )
        : null;
      if (!approval) return Response.json({ error: 'Approval request not found' }, { status: 404 });
      if (!canDecideFriendApproval(me, approval)) return forbidden();
      if (approval.status !== 'pending') {
        return Response.json({ error: 'This request has already been decided' }, { status: 400 });
      }
      const decision =
        body.decision === 'approved' ? 'approved' : body.decision === 'rejected' ? 'rejected' : null;
      if (!decision) {
        return Response.json({ error: 'decision must be approved or rejected' }, { status: 400 });
      }
      const reason = clip(body.reason, 300).trim();
      if (decision === 'rejected' && !reason) {
        return Response.json({ error: 'A reason is required when rejecting' }, { status: 400 });
      }

      await db.FriendApprovalRequest.update(approval.id, {
        status: decision,
        decided_by: me.id,
        decision_reason: reason,
      });

      const [requester, recipient] = await Promise.all([
        loadUser(approval.requester_id),
        loadUser(approval.recipient_id),
      ]);
      const requesterName = requester?.full_name || approval.requester_name || 'A student';
      const recipientName = recipient?.full_name || approval.recipient_name || 'a member';

      if (decision === 'approved') {
        const rows = [];
        // The pair may have connected another way while this waited — never
        // create a second Friendship for them.
        const friendships = await pairRows(db.Friendship, approval.requester_id, approval.recipient_id);
        const already = friendships.some(
          (row) => row.status === 'pending' || row.status === 'accepted'
        );
        if (!already && requester && recipient) {
          await createFriendship(
            { ...requester, full_name: requesterName },
            { ...recipient, full_name: recipientName },
            approval.note || ''
          );
          rows.push(friendRequestNotification(requesterName, recipient));
        }
        rows.push({
          user_id: approval.requester_id,
          type: 'friend_approval_approved',
          title: 'Your friend request was approved',
          body: `Your request to add ${recipientName} was approved and has been sent.`,
          link: '/friends',
          actor_name: me.full_name || '',
          is_read: false,
        });
        await db.Notification.bulkCreate(rows);
      } else {
        // The reason is the private approval message: it goes only to the
        // requester, inside their notification.
        await db.Notification.bulkCreate([
          {
            user_id: approval.requester_id,
            type: 'friend_approval_rejected',
            title: 'Your friend request was not approved',
            body: reason,
            link: '/friends',
            actor_name: me.full_name || '',
            is_read: false,
          },
        ]);
      }
      return Response.json({ ok: true, status: decision });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
