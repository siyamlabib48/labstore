import { getCaller, mapUser, serviceClient, svc, withCors } from '../_shared/svc.ts';
import {
  canDecideFriendApproval,
  forbidden,
  friendApprovalNeeded,
  isApproved,
  pendingApproval,
} from '../_shared/access.ts';

const clip = (text: unknown, max: number) => String(text || '').slice(0, max);

// Friend requests between students of different (or unknown) gender are held
// for staff approval — always on, no toggle. This function is the gate: it
// either creates the pending Friendship directly or files a
// FriendApprovalRequest for the requester's lab dedicated teacher / batch
// coordinator to decide. The decide action then creates the Friendship on
// approval.
async function handler(req: Request) {
  try {
    const db = serviceClient();
    const me = await getCaller(req, db);
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isApproved(me)) return pendingApproval();

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const loadUser = async (userId: string) => {
      if (!userId) return null;
      return mapUser(await svc.get(db, 'profiles', userId));
    };

    // Rows between the pair, whichever direction they were started in.
    const pairRows = async (table: string, a: string, b: string) => {
      const [forward, reverse] = await Promise.all([
        svc.filter(db, table, { requester_id: a, recipient_id: b }, { limit: 50 }),
        svc.filter(db, table, { requester_id: b, recipient_id: a }, { limit: 50 }),
      ]);
      return [...forward, ...reverse];
    };

    const createFriendship = async (requester: any, recipient: any, note: string) =>
      await svc.create(db, 'friendships', {
        requester_id: requester.id,
        recipient_id: recipient.id,
        requester_name: requester.full_name || '',
        requester_lab: requester.lab || '',
        recipient_name: recipient.full_name || '',
        recipient_lab: recipient.lab || '',
        status: 'pending',
        note: note || '',
        created_by_id: me.id,
      });

    // Same field shape as notify's friend_request action.
    const friendRequestNotification = (requesterName: string, recipient: any) => ({
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

      const friendships = await pairRows('friendships', me.id, recipient.id);
      if (friendships.some((row: any) => row.status === 'accepted')) {
        return Response.json({ error: 'You are already friends' }, { status: 400 });
      }
      if (friendships.some((row: any) => row.status === 'pending')) {
        return Response.json({ error: 'A friend request is already pending between you' }, { status: 400 });
      }
      // Rejected rows are kept as history; they never block a fresh request.

      const approvals = await pairRows('friend_approval_requests', me.id, recipient.id);
      if (approvals.some((row: any) => row.status === 'pending')) {
        return Response.json(
          { error: 'A request between you is already waiting for staff approval' },
          { status: 400 }
        );
      }

      if (!friendApprovalNeeded(me, recipient)) {
        const friendship = await createFriendship(me, recipient, note);
        await svc.bulkCreate(db, 'notifications', [friendRequestNotification(me.full_name, recipient)]);
        return Response.json({ route: 'direct', friendship_id: friendship.id });
      }

      const approval = await svc.create(db, 'friend_approval_requests', {
        requester_id: me.id,
        requester_name: me.full_name || '',
        recipient_id: recipient.id,
        recipient_name: recipient.full_name || '',
        batch: me.batch || null,
        lab: me.lab || '',
        note,
        status: 'pending',
        created_by_id: me.id,
      });

      // Approvers: the requester's lab dedicated teacher (the lab's main
      // teacher) plus the batch coordinators. If the batch has neither
      // yet, owners are notified instead, so a held request can never get
      // stuck with nobody able to decide it.
      let approvers: any[] = [];
      if (me.batch) {
        const [teachers, coordinators] = await Promise.all([
          svc.filter(db, 'profiles', { batch: me.batch, lab: me.lab || '', staff_role: 'dedicated_teacher' }),
          svc.filter(db, 'profiles', { batch: me.batch, staff_role: 'coordinator' }),
        ]);
        approvers = [...teachers, ...coordinators].filter(
          (u: any) => u.approval_status === 'approved' && u.id !== me.id && u.id !== recipient.id
        );
      }
      if (approvers.length === 0) {
        const everyone = await svc.filter(db, 'profiles', {}, { limit: 1000 });
        approvers = everyone.filter((u: any) => u.is_admin);
      }
      if (approvers.length > 0) {
        await svc.bulkCreate(
          db,
          'notifications',
          approvers.map((approver: any) => ({
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
      const approval = approvalId ? await svc.get(db, 'friend_approval_requests', approvalId) : null;
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

      await svc.update(db, 'friend_approval_requests', approval.id, {
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
        const rows: Record<string, unknown>[] = [];
        // The pair may have connected another way while this waited — never
        // create a second Friendship for them.
        const friendships = await pairRows('friendships', approval.requester_id, approval.recipient_id);
        const already = friendships.some(
          (row: any) => row.status === 'pending' || row.status === 'accepted'
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
        await svc.bulkCreate(db, 'notifications', rows);
      } else {
        // The reason is the private approval message: it goes only to the
        // requester, inside their notification.
        await svc.bulkCreate(db, 'notifications', [
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

Deno.serve(withCors(handler));
