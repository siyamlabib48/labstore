import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { isApproved, isOwner, pendingApproval, sameBatch } from '../../shared/access.ts';

// Returns the public profile of any member: identity, academy context, and
// aggregate counts. Never returns email or platform role.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { user_id } = body;

    // Batched author cards for a wall page: one query for every author on it,
    // returning only what a post already shows — never email or platform role.
    if (Array.isArray(body.user_ids)) {
      if (!isApproved(user)) return pendingApproval();
      // Only well-formed record ids reach the query — a stray value would fail
      // the whole lookup instead of just being skipped.
      const ids = [...new Set(body.user_ids.filter((id) => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)))].slice(0, 60);
      if (ids.length === 0) return Response.json({ authors: [] });

      const authors = await base44.asServiceRole.entities.User.filter({ id: { $in: ids } });
      return Response.json({
        authors: (authors || []).map((author) => ({
          id: author.id,
          full_name: author.full_name || '',
          avatar_url: author.avatar_url || '',
          lab: author.lab || '',
        })),
      });
    }

    if (!user_id || typeof user_id !== 'string') {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    const isSelf = user_id === user.id;
    // Only an approved member may browse other profiles.
    if (!isSelf && !isApproved(user)) return pendingApproval();

    const target = await base44.asServiceRole.entities.User.get(user_id).catch((e) =>
      e.status === 404 ? null : Promise.reject(e)
    );
    if (!target) return Response.json({ error: 'Profile not found' }, { status: 404 });

    // Profiles never cross the batch boundary: members see themselves and their
    // own batch; only the owner can look up anyone.
    if (!isSelf && !isOwner(user)) {
      if (!sameBatch(user, target.batch)) {
        return Response.json({ error: 'This profile is outside your batch' }, { status: 403 });
      }
    }

    const batchPromise = target.batch
      ? base44.asServiceRole.entities.Batch.get(target.batch).catch(() => null)
      : Promise.resolve(null);

    const [batch, sent, received, works, friendSent, friendReceived] = await Promise.all([
      batchPromise,
      base44.asServiceRole.entities.Friendship.count({ requester_id: user_id, status: 'accepted' }).catch(() => 0),
      base44.asServiceRole.entities.Friendship.count({ recipient_id: user_id, status: 'accepted' }).catch(() => 0),
      base44.asServiceRole.entities.Work.count({ created_by_id: user_id, visibility: 'all' }).catch(() => 0),
      isSelf
        ? Promise.resolve(0)
        : base44.asServiceRole.entities.Friendship.count({ requester_id: user.id, recipient_id: user_id, status: 'accepted' }).catch(() => 0),
      isSelf
        ? Promise.resolve(0)
        : base44.asServiceRole.entities.Friendship.count({ requester_id: user_id, recipient_id: user.id, status: 'accepted' }).catch(() => 0),
    ]);

    // Per-field privacy: the member picks an audience for each personal field
    // (everyone / batch / friends / only_me). A field the viewer may not see
    // is omitted from the response entirely — never sent blanked. Fields with
    // no stored choice fall back to today's behaviour (batch), except marital
    // status, which defaults to only_me.
    const AUDIENCES = ['everyone', 'batch', 'friends', 'only_me'];
    const DEFAULT_AUDIENCE = {
      website: 'batch',
      gender: 'batch',
      current_institution: 'batch',
      previous_institution: 'batch',
      marital_status: 'only_me',
    };
    const isFriend = (friendSent || 0) + (friendReceived || 0) > 0;
    const viewerIsAdmin = isOwner(user);
    const audienceOf = (field) => {
      const stored = target[`${field}_privacy`];
      return AUDIENCES.includes(stored) ? stored : DEFAULT_AUDIENCE[field];
    };
    const canSee = (field) => {
      if (isSelf || viewerIsAdmin) return true;
      const audience = audienceOf(field);
      if (audience === 'everyone') return true;
      if (audience === 'batch') return sameBatch(user, target.batch);
      if (audience === 'friends') return isFriend;
      return false;
    };

    const profile = {
      id: target.id,
      full_name: target.full_name || '',
      headline: target.headline || '',
      bio: target.bio || '',
      avatar_url: target.avatar_url || '',
      cover_photo: target.cover_photo || '',
      lab: target.lab || '',
      staff_role: target.staff_role || 'member',
      is_lab_leader: !!target.is_lab_leader,
      batch: target.batch || '',
      batch_name: batch?.name || '',
      joined_date: target.created_date || '',
      works_count: works || 0,
      friends_count: (sent || 0) + (received || 0),
    };

    if (canSee('website')) profile.website = target.website || '';
    if (canSee('gender')) profile.gender = target.gender || '';
    if (canSee('current_institution')) profile.current_institution = target.current_institution || '';
    if (canSee('previous_institution')) profile.previous_institution = target.previous_institution || '';
    if (canSee('marital_status')) profile.marital_status = target.marital_status || '';

    // The member's own view also carries the effective privacy settings, so
    // the profile UI can show what each field is currently set to.
    if (isSelf) {
      profile.field_privacy = {
        website: audienceOf('website'),
        gender: audienceOf('gender'),
        current_institution: audienceOf('current_institution'),
        previous_institution: audienceOf('previous_institution'),
        marital_status: audienceOf('marital_status'),
      };
    }

    return Response.json({ profile });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}