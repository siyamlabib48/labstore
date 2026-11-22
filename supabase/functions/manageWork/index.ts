import { getCaller, serviceClient, svc } from '../_shared/svc.ts';
import {
  canDeleteWork,
  canReviewWork,
  forbidden,
  isApproved,
  isOwner,
  pendingApproval,
} from '../_shared/access.ts';

const QUOTA_BYTES = 500 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const WORK_TYPES = ['social_post', 'document', 'illustrator', 'wordpress', 'other'];
const VISIBILITY = ['all', 'lab', 'private'];
const PRIVATE_BUCKET = 'private-files';

const clip = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

// Returns the real stored size of a file, or null when it cannot be measured.
// Quota accounting must never trust the client-declared size: a caller could
// declare 1 byte for a 100 MB file and bypass both the per-file cap and the
// 500 MB quota. Callers reject the write when any size comes back null.
// A stored file is measured through a short-lived signed URL and a 1-byte
// range request, exactly like the previous backend did.
const sizeOf = async (db: any, fileUri: string) => {
  let url = fileUri;
  if (!/^https?:\/\//.test(fileUri)) {
    const signed = await db.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(fileUri, 120)
      .catch(() => null);
    if (!signed?.data?.signedUrl) return null;
    url = signed.data.signedUrl;
  }
  try {
    const res = await fetch(url, {
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
const measureAll = async (db: any, entries: any[]) => {
  const sizes: (number | null)[] = [];
  for (let index = 0; index < entries.length; index += 5) {
    const chunk = entries.slice(index, index + 5);
    const chunkSizes = await Promise.all(chunk.map((entry) => sizeOf(db, entry.file_uri)));
    sizes.push(...chunkSizes);
  }
  return sizes;
};

const unmeasuredError = () =>
  Response.json(
    { error: 'Could not verify the size of one of your files. Please try the upload again.' },
    { status: 400 }
  );

const usedBytesOf = async (db: any, userId: string) => {
  let total = 0;
  // Page through every work so heavy users are measured in full. The
  // 50-page ceiling (50 × 200 = 10,000 works) is only a runaway guard;
  // if a user ever approaches it, this needs a server-side sum instead.
  for (let page = 0; page < 50; page += 1) {
    const rows = await svc.filter(db, 'works', { created_by_id: userId }, { limit: 200, offset: page * 200 });
    rows.forEach((work: any) => {
      total += Number(work.file_size_bytes) || 0;
    });
    if (rows.length < 200) break;
  }
  return total;
};

const fileEntries = (cover: unknown, attachments: unknown) => {
  const entries: { file_uri: string; name: string; size_bytes: number }[] = [];
  const coverUri = clip(cover, 500);
  if (coverUri) entries.push({ file_uri: coverUri, name: 'cover', size_bytes: 0 });
  (Array.isArray(attachments) ? attachments.slice(0, MAX_FILES) : []).forEach((item: any) => {
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

const quotaError = (total: number, remaining: number) =>
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
async function handler(req: Request) {
  try {
    const db = serviceClient();
    const me = await getCaller(req, db);
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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

      const batch = await svc.get(db, 'batches', batchId);
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

      const sizes = await measureAll(db, entries);
      if (sizes.some((size) => size === null)) return unmeasuredError();
      const total = sizes.reduce((sum: number, size) => sum + (size || 0), 0);
      const largest = sizes.length ? Math.max(...(sizes as number[])) : 0;
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

      const created = await svc.create(db, 'works', {
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
        created_by_id: me.id,
      });

      // A public upload is news for the lab: tell the other approved members
      // of the work's lab (the whole batch when the work has no lab). Private
      // and lab-only works are never announced. Best-effort — a notification
      // failure must never fail the upload itself.
      if (visibility === 'all') {
        try {
          const members = await svc.filter(db, 'profiles', { batch: batchId }, { limit: 500 });
          const rows = (members || [])
            .filter(
              (member: any) =>
                member.id !== me.id &&
                member.approval_status === 'approved' &&
                (!lab || member.lab === lab)
            )
            .slice(0, 200)
            .map((member: any) => ({
              user_id: member.id,
              type: 'new_upload',
              title: `${me.full_name || me.email || 'A member'} uploaded new work`,
              body: clip(title, 120),
              link: `/work/${created.id}`,
              actor_name: me.full_name || me.email || '',
              is_read: false,
            }));
          if (rows.length) await svc.bulkCreate(db, 'notifications', rows);
        } catch (notifyError) {
          console.error('new_upload notification failed', notifyError);
        }
      }

      return Response.json({ work: created, used_bytes: used + total, quota_bytes: QUOTA_BYTES });
    }

    if (action === 'update') {
      const workId = String(body.work_id || '');
      if (!workId) return Response.json({ error: 'work_id is required' }, { status: 400 });

      const record = await svc.get(db, 'works', workId);
      if (!record) return Response.json({ error: 'Work not found' }, { status: 404 });

      const isCreator = record.created_by_id === me.id;
      if (!isCreator && !canReviewWork(me, record)) return forbidden();

      const patch: Record<string, unknown> = {};
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
        const sizes = await measureAll(db, entries);
        if (sizes.some((size) => size === null)) return unmeasuredError();
        const total = sizes.reduce((sum: number, size) => sum + (size || 0), 0);
        if ((sizes.length ? Math.max(...(sizes as number[])) : 0) > MAX_FILE_BYTES) {
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

      const updated = await svc.update(db, 'works', workId, patch);
      const used = await usedBytesOf(db, record.created_by_id || me.id);
      return Response.json({ work: updated, used_bytes: used, quota_bytes: QUOTA_BYTES });
    }

    if (action === 'delete') {
      const workId = String(body.work_id || '');
      if (!workId) return Response.json({ error: 'work_id is required' }, { status: 400 });

      const record = await svc.get(db, 'works', workId);
      if (!record) return Response.json({ error: 'Work not found' }, { status: 404 });
      if (!canDeleteWork(me, record)) return forbidden();

      await svc.remove(db, 'works', workId);
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

Deno.serve(handler);
