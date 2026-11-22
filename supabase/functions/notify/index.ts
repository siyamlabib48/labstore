import { getCaller, serviceClient, svc } from '../_shared/svc.ts';
import { canPublishAnnouncements, isApproved, isOwner, pendingApproval, sameBatch } from '../_shared/access.ts';

const clip = (text: unknown, max: number) => String(text || '').slice(0, max);

// Creates in-app notifications for the right recipients. Every action re-checks
// the triggering record server-side so a caller cannot notify arbitrary members.
export default async function (req: Request) {
  try {
    const db = serviceClient();
    const me = await getCaller(req, db);
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isApproved(me)) return pendingApproval();

    const body = await req.json().catch(() => ({}));
    const { action, announcement_id, friendship_id, post_id, comment_id } = body;
    const rows: Record<string, unknown>[] = [];

    if (action === 'announcement') {
      const announcement = await svc.get(db, 'announcements', announcement_id).catch(() => null);
      if (!announcement) return Response.json({ error: 'Announcement not found' }, { status: 404 });
      const allowed =
        announcement.created_by_id === me.id ||
        isOwner(me) ||
        (canPublishAnnouncements(me) && sameBatch(me, announcement.batch));
      if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

      // Explicit 500-row fetch so the recipient cap below — not a query
      // default page size — is the binding limit.
      const members = await svc.filter(db, 'profiles', { batch: announcement.batch }, { limit: 500 });

      // The announcement's category picks the notification type, so homework
      // deadlines, holidays and batch updates stand out from general notices.
      const categoryTypes: Record<string, string> = {
        homework: 'homework',
        holiday: 'holiday',
        batch_update: 'batch_update',
      };
      const type = categoryTypes[announcement.category] || 'announcement';

      // Filter to the real audience FIRST (author, other labs and unapproved
      // accounts excluded), then cap: one notification row per recipient.
      // Batches here are small — a few labs of a few dozen members — so 500
      // is a runaway guard, not an expected limit; if a batch ever grows
      // past it, members beyond the cap would NOT be notified and this
      // fan-out would need batching instead of a bigger slice.
      const recipients = (members || []).filter((member: any) => {
        if (member.id === me.id) return false;
        // A lab-targeted notice (an ACR writes to their own lab only) reaches
        // that lab's members, not the whole batch.
        if (announcement.lab && member.lab !== announcement.lab) return false;
        if (member.approval_status !== 'approved' && !(!member.approval_status && member.lab)) return false;
        return true;
      });
      recipients.slice(0, 500).forEach((member: any) => {
        rows.push({
          user_id: member.id,
          type,
          title:
            announcement.priority === 'important'
              ? `Important: ${announcement.title}`
              : announcement.title,
          body: clip(announcement.body, 160),
          link: '/announcements',
          actor_name: announcement.author_name || '',
          is_read: false,
        });
      });
    } else if (action === 'friend_request') {
      const friendship = await svc.get(db, 'friendships', friendship_id).catch(() => null);
      if (!friendship) return Response.json({ error: 'Request not found' }, { status: 404 });
      if (friendship.requester_id !== me.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

      rows.push({
        user_id: friendship.recipient_id,
        type: 'friend_request',
        title: `${friendship.requester_name || 'A member'} sent you a friend request`,
        body: 'Open Friends to accept or decline.',
        link: '/friends',
        actor_name: friendship.requester_name || '',
        is_read: false,
      });
    } else if (action === 'friend_accept') {
      const friendship = await svc.get(db, 'friendships', friendship_id).catch(() => null);
      if (!friendship) return Response.json({ error: 'Request not found' }, { status: 404 });
      if (friendship.recipient_id !== me.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (friendship.status !== 'accepted') {
        return Response.json({ error: 'Request is not accepted yet' }, { status: 400 });
      }

      rows.push({
        user_id: friendship.requester_id,
        type: 'friend_accept',
        title: `${friendship.recipient_name || 'A member'} accepted your friend request`,
        body: 'You two are connected now.',
        link: '/friends',
        actor_name: friendship.recipient_name || '',
        is_read: false,
      });
    } else if (action === 'post_like') {
      const post = await svc.get(db, 'posts', post_id).catch(() => null);
      if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });
      // Academy posts are readable academy-wide, so a like from another batch
      // is legitimate engagement and the author should hear about it.
      if (post.batch && post.visibility !== 'academy' && !isOwner(me) && !sameBatch(me, post.batch)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const likes = await svc.filter(db, 'post_likes', { post_id, user_id: me.id }, { limit: 1 });
      if (likes.length === 0) {
        return Response.json({ error: 'Like not found' }, { status: 400 });
      }

      if (post.created_by_id && post.created_by_id !== me.id) {
        rows.push({
          user_id: post.created_by_id,
          type: 'post_like',
          title: `${me.full_name || 'A member'} liked your post`,
          body: clip(post.content, 120),
          link: '/golpo-gujob',
          actor_name: me.full_name || '',
          is_read: false,
        });
      }
    } else if (action === 'post_comment') {
      const comment = await svc.get(db, 'post_comments', comment_id).catch(() => null);
      if (!comment) return Response.json({ error: 'Comment not found' }, { status: 404 });
      if (comment.created_by_id !== me.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const post = await svc.get(db, 'posts', comment.post_id).catch(() => null);
      // Same academy exception as post_like: cross-batch comments on academy
      // posts are allowed, so their authors get notified too.
      if (post && post.batch && post.visibility !== 'academy' && !isOwner(me) && !sameBatch(me, post.batch)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (post && post.created_by_id && post.created_by_id !== me.id) {
        rows.push({
          user_id: post.created_by_id,
          type: 'post_comment',
          title: `${me.full_name || 'A member'} commented on your post`,
          body: clip(comment.body, 120),
          link: '/golpo-gujob',
          actor_name: me.full_name || '',
          is_read: false,
        });
      }
    } else if (action === 'comment_reply') {
      // A reply notifies the PARENT comment's author — the post author is
      // already covered by post_comment for the same reply, so when the
      // parent author IS the post author this action deliberately sends
      // nothing and nobody is notified twice for one reply.
      const reply = await svc.get(db, 'post_comments', comment_id).catch(() => null);
      if (!reply) return Response.json({ error: 'Comment not found' }, { status: 404 });
      if (reply.created_by_id !== me.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!reply.parent_id) return Response.json({ error: 'Comment is not a reply' }, { status: 400 });

      const parent = await svc.get(db, 'post_comments', reply.parent_id).catch(() => null);
      if (!parent || parent.post_id !== reply.post_id) {
        return Response.json({ error: 'Parent comment not found' }, { status: 404 });
      }

      const post = await svc.get(db, 'posts', reply.post_id).catch(() => null);
      // Same academy exception as post_comment: cross-batch replies on
      // academy posts are allowed, so their authors get notified too.
      if (post && post.batch && post.visibility !== 'academy' && !isOwner(me) && !sameBatch(me, post.batch)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const recipient = parent.created_by_id;
      if (recipient && recipient !== me.id && recipient !== post?.created_by_id) {
        rows.push({
          user_id: recipient,
          type: 'comment_reply',
          title: `${me.full_name || 'A member'} replied to your comment`,
          body: clip(reply.body, 120),
          link: '/golpo-gujob',
          actor_name: me.full_name || '',
          is_read: false,
        });
      }
    } else {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    if (rows.length === 0) return Response.json({ created: 0 });
    await svc.bulkCreate(db, 'notifications', rows);
    return Response.json({ created: rows.length });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
