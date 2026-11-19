import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  canDeleteWork,
  canReviewWork,
  forbidden,
  isApproved,
  isOwner,
  pendingApproval,
} from '../../shared/access.ts';

const QUOTA_BYTES = 500 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const WORK_TYPES = ['social_post', 'document', 'illustrator', 'wordpress', 'other'];
const VISIBILITY = ['all', 'lab', 'private'];

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

// Returns the real stored size of a file, or null when it cannot be measured.
// Quota accounting must never trust the client-declared size: a caller could
// declare 1 byte for a 100 MB file and bypass both the per-file cap and the
// 500 MB quota. Callers reject the write when any size comes back null.
const sizeOf = async (base44, fileUri) => {
  const signed = await base44.asServiceRole.integrations.Core
    .CreateFileSignedUrl({ file_uri: fileUri, expires_in: 120 })
    .catch(() => null);
  if (!signed?.signed_url) return null;
  try {
    const res = await fetch(signed.signed_url, {
      headers: { Range: 'bytes=0-0' },
      signal: AbortSignal.timeout(8000),
    });
    const range = res.headers.get('content-range');
    const total = range ? Number(String(range).split('/').pop()) : Number(res.headers.get('content-length'));
    if (res.body) res.body.cancel?.().catch(() => {});
    return Number.isFinite(total) && total > 0 ? total : null;
  } catch {
    return null;
  }
};

// Measures real stored bytes, a few files at a time.
const measureAll = async (base44, entries) => {
  const sizes = [];
  for (let index = 0; index < entries.length; index += 5) {
    const chunk = entries.slice(index, index + 5);
    const chunkSizes = await Promise.all(chunk.map((entry) => sizeOf(base44, entry.file_uri)));
    sizes.push(...chunkSizes);
  }
  return sizes;
};

const unmeasuredError = () =>
  Response.json(
    { error: 'Could not verify the size of one of your files. Please try the upload again.' },
    { status: 400 }
  );

const usedBytesOf = async (db, userId) => {
  let total = 0;
  let cursor;
  // Follow the cursor until it runs out so heavy users are measured in full.
  // The 50-page ceiling (50 × 200 = 10,000 works) is only a runaway guard;
  // if a user ever approaches it, this needs a server-side sum instead.
  for (let page = 0; page < 50; page += 1) {
    const result = await db.Work.filter(
      { created_by_id: userId },
      cursor ? { limit: 200, cursor } : { limit: 200 }
    );
    (result.items || []).forEach((work) => {
      total += Number(work.file_size_bytes) || 0;
    });
    cursor = result.next_cursor;
    if (!cursor) break;
  }
  return total;
};

const fileEntries = (cover, attachments) => {
  const entries = [];
  const coverUri = clip(cover, 500);
  if (coverUri) entries.push({ file_uri: coverUri, name: 'cover', size_bytes: 0 });
  (Array.isArray(attachments) ? attachments.slice(0, MAX_FILES) : []).forEach((item) => {
    const uri = clip(item?.file_uri, 500);
    if (!uri) return;
    entries.push({
      file_uri: uri,
      name: clip(item?.name, 160) || 'file',
      size_bytes: Number(item?.size_bytes) || 0,
    });
  });
  return entries;
};

const quotaError = (total, remaining) =>
  Response.json(
    {
      error: `This upload is ${Math.round(total / (1024 * 1024))} MB but only ${Math.round(
        Math.max(remaining, 0) / (1024 * 1024)
      )} MB of your 500 MB quota is free. Delete a work to make room.`,
      quota_bytes: QUOTA_BYTES,
    },
    { status: 400 }
  );

// Authoritative work lifecycle: measures real bytes before writing, enforces the
// 500 MB quota server-side, pins records to the caller's batch/lab, and frees
// quota on deletion because usage is always recomputed from stored works.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'usage') {
      const used = await usedBytesOf(db, me.id);
      return Response.json({ used_bytes: used, quota_bytes: QUOTA_BYTES });
    }

    if (!isApproved(me)) return pendingApproval();

    if (action === 'create') {
      const title = clip(body.title, 120);
      if (!title) return Response.json({ error: 'A title is required' }, { status: 400 });

      const workType = WORK_TYPES.includes(body.work_type) ? body.work_type : 'other';
      const visibility = VISIBILITY.includes(body.visibility) ? body.visibility : 'all';
      const owner = isOwner(me);

      const batchId = String((owner && body.batch_id) || me.batch || '');
      if (!batchId) {
        return Response.json({ error: 'You need a batch before uploading.' }, { status: 400 });
      }

      const batch = await db.Batch.get(batchId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!batch) return Response.json({ error: 'Batch not found' }, { status: 404 });
      if (batch.status === 'archived') {
        return Response.json({ error: 'This batch is archived and no longer accepts uploads.' }, { status: 400 });
      }

      const labs = (batch.labs || []).filter(Boolean);
      const requestedLab = owner ? clip(body.lab, 12) || me.lab || '' : me.lab || '';
      const lab = requestedLab || labs[0] || '';
      if (!lab) return Response.json({ error: 'A lab is required before uploading.' }, { status: 400 });
      if (labs.length && !labs.includes(lab)) {
        return Response.json({ error: 'That lab is not part of this batch' }, { status: 400 });
      }

      const cover = clip(body.cover_file_uri, 500);
      const entries = fileEntries(cover, body.attachments);
      if (entries.length > MAX_FILES) {
        return Response.json({ error: `Attach up to ${MAX_FILES} files per work.` }, { status: 400 });
      }

      const sizes = await measureAll(base44, entries);
      if (sizes.some((size) => size === null)) return unmeasuredError();
      const total = sizes.reduce((sum, size) => sum + size, 0);
      const largest = sizes.length ? Math.max(...sizes) : 0;
      if (largest > MAX_FILE_BYTES) {
        return Response.json({ error: 'Each file must be 100 MB or smaller.' }, { status: 400 });
      }

      const used = await usedBytesOf(db, me.id);
      const remaining = QUOTA_BYTES - used;
      if (total > remaining) return quotaError(total, remaining);

      const measured = entries.map((entry, index) => ({
        file_uri: entry.file_uri,
        name: entry.name,
        size_bytes: sizes[index],
      }));

      const created = await db.Work.create({
        title,
        description: clip(body.description, 4000),
        work_type: workType,
        batch: batchId,
        lab,
        link: clip(body.link, 500),
        cover_file_uri: cover ? measured[0].file_uri : '',
        attachments: cover ? measured.slice(1) : measured,
        file_size_bytes: total,
        visibility,
        creator_name: me.full_name || me.email || '',
      });

      // A public upload is news for the lab: tell the other approved members
      // of the work's lab (the whole batch when the work has no lab). Private
      // and lab-only works are never announced. Best-effort — a notification
      // failure must never fail the upload itself.
      if (visibility === 'all') {
        try {
          const members = await db.User.filter({ batch: batchId });
          const rows = (members || [])
            .filter(
              (member) =>
                member.id !== me.id &&
                member.approval_status === 'approved' &&
                (!lab || member.lab === lab)
            )
            .slice(0, 200)
            .map((member) => ({
              user_id: member.id,
              type: 'new_upload',
              title: `${me.full_name || me.email || 'A member'} uploaded new work`,
              body: clip(title, 120),
              link: `/work/${created.id}`,
              actor_name: me.full_name || me.email || '',
              is_read: false,
            }));
          if (rows.length) await db.Notification.bulkCreate(rows);
        } catch (notifyError) {
          console.error('new_upload notification failed', notifyError);
        }
      }

      return Response.json({ work: created, used_bytes: used + total, quota_bytes: QUOTA_BYTES });
    }

    if (action === 'update') {
      const workId = String(body.work_id || '');
      if (!workId) return Response.json({ error: 'work_id is required' }, { status: 400 });

      const record = await db.Work.get(workId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!record) return Response.json({ error: 'Work not found' }, { status: 404 });

      const isCreator = record.created_by_id === me.id;
      if (!isCreator && !canReviewWork(me, record)) return forbidden();

      const patch = {};
      if (body.title !== undefined) {
        const title = clip(body.title, 120);
        if (!title) return Response.json({ error: 'A title is required' }, { status: 400 });
        patch.title = title;
      }
      if (body.description !== undefined) patch.description = clip(body.description, 4000);
      if (body.link !== undefined) patch.link = clip(body.link, 500);
      if (body.visibility !== undefined && VISIBILITY.includes(body.visibility)) {
        patch.visibility = body.visibility;
      }

      const touchingFiles = body.cover_file_uri !== undefined || Array.isArray(body.attachments);
      if (touchingFiles) {
        // Files belong to the author: staff may review, never swap the bytes.
        if (!isCreator && !isOwner(me)) return forbidden();

        const cover = clip(body.cover_file_uri ?? record.cover_file_uri, 500);
        const entries = fileEntries(cover, body.attachments ?? record.attachments);
        if (entries.length > MAX_FILES) {
          return Response.json({ error: `Attach up to ${MAX_FILES} files per work.` }, { status: 400 });
        }
        const sizes = await measureAll(base44, entries);
        if (sizes.some((size) => size === null)) return unmeasuredError();
        const total = sizes.reduce((sum, size) => sum + size, 0);
        if ((sizes.length ? Math.max(...sizes) : 0) > MAX_FILE_BYTES) {
          return Response.json({ error: 'Each file must be 100 MB or smaller.' }, { status: 400 });
        }

        const usedByOthers =
          (await usedBytesOf(db, record.created_by_id)) - (Number(record.file_size_bytes) || 0);
        const remaining = QUOTA_BYTES - Math.max(usedByOthers, 0);
        if (total > remaining) return quotaError(total, remaining);

        const measured = entries.map((entry, index) => ({
          file_uri: entry.file_uri,
          name: entry.name,
          size_bytes: sizes[index],
        }));
        patch.cover_file_uri = cover ? measured[0].file_uri : '';
        patch.attachments = cover ? measured.slice(1) : measured;
        patch.file_size_bytes = total;
      }

      const updated = await db.Work.update(workId, patch);
      const used = await usedBytesOf(db, record.created_by_id || me.id);
      return Response.json({ work: updated, used_bytes: used, quota_bytes: QUOTA_BYTES });
    }

    if (action === 'delete') {
      const workId = String(body.work_id || '');
      if (!workId) return Response.json({ error: 'work_id is required' }, { status: 400 });

      const record = await db.Work.get(workId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!record) return Response.json({ error: 'Work not found' }, { status: 404 });
      if (!canDeleteWork(me, record)) return forbidden();

      await db.Work.delete(workId);
      const used = await usedBytesOf(db, record.created_by_id || me.id);
      return Response.json({
        ok: true,
        freed_bytes: Number(record.file_size_bytes) || 0,
        used_bytes: used,
        quota_bytes: QUOTA_BYTES,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}