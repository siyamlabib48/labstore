import { getCaller, mapUser, serviceClient, svc, withCors } from '../_shared/svc.ts';
import { isApproved, isOwner, pendingApproval } from '../_shared/access.ts';

// The two canonical batches the academy runs on.
const TARGETS = [
  {
    name: 'Freelancing Course — Batch 8',
    course_name: 'Freelancing Course',
    labs: ['A', 'B', 'C'],
    accent: '#1D4ED8',
  },
  {
    name: 'AI Course — Batch 2',
    course_name: 'AI Course',
    labs: ['Ai'],
    accent: '#7C3AED',
  },
];

// Which batch a lab key belongs to.
const BATCH_FOR_LAB: Record<string, number> = { A: 0, B: 0, C: 0, Ai: 1 };

const chunk = (rows: any[], size: number) => {
  const out: any[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

// Owner-only one-shot: makes sure both batches exist with the right labs, then
// puts lab-tagged users and their works into the correct batch. Every other
// record that carries a batch (posts, comments, announcements, chat messages,
// progress) inherits one the same way — from its lab where the record carries
// one, otherwise from its author's batch. Records whose owner has no batch
// are left untouched; a batch is never guessed for them. Comments written
// before PostComment carried post_visibility are also stamped with their
// parent post's visibility, so older comments on academy posts become
// visible academy-wide like new ones.
async function handler(req: Request) {
  try {
    const db = serviceClient();
    const caller = await getCaller(req, db);
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isApproved(caller)) return pendingApproval();
    if (!isOwner(caller)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Applies per-row patches a chunk at a time. This is a one-shot admin
    // tool over small tables, so individual updates are fine.
    const applyPatches = async (table: string, patches: { id: string;[key: string]: unknown }[]) => {
      for (const group of chunk(patches, 25)) {
        await Promise.all(
          group.map(({ id, ...patch }) => svc.update(db, table, id, patch))
        );
      }
    };

    // Pages through a whole table, 200 rows at a time.
    const scanAll = async (table: string, maxPages = 40) => {
      const rows: any[] = [];
      for (let page = 0; page < maxPages; page += 1) {
        const batchRows = await svc.filter(db, table, {}, { limit: 200, offset: page * 200 });
        rows.push(...batchRows);
        if (batchRows.length < 200) break;
      }
      return rows;
    };

    const existingBatches = await scanAll('batches', 10);

    const batches: any[] = [];
    let batchesCreated = 0;
    for (const target of TARGETS) {
      const match = existingBatches.find((b: any) => b.name === target.name);
      if (match) {
        batches.push(match);
        continue;
      }
      batchesCreated += 1;
      const created = await svc.create(db, 'batches', {
        name: target.name,
        course_name: target.course_name,
        description: `${target.course_name} cohort`,
        status: 'active',
        labs: target.labs,
        accent: target.accent,
        created_by_id: caller.id,
      });
      batches.push(created);
    }

    // Every member, so works can inherit their creator's batch.
    const users = (await scanAll('profiles', 20)).map(mapUser);

    let orphans = 0;
    const userPatches: { id: string; batch: string }[] = [];
    for (const user of users) {
      if (user.role === 'admin' || user.batch) continue;
      const index = BATCH_FOR_LAB[user.lab];
      if (index === undefined) {
        orphans += 1;
        continue;
      }
      userPatches.push({ id: user.id, batch: batches[index].id });
    }

    await applyPatches('profiles', userPatches);

    const batchOfUser = new Map(users.map((u: any) => [u.id, u.batch || '']));
    for (const patch of userPatches) batchOfUser.set(patch.id, patch.batch);
    const userById = new Map(users.map((u: any) => [u.id, u]));

    // Lab keys are unambiguous across the academy (A/B/C only exist in
    // Freelancing, Ai only in AI), so a record carrying a lab can take its
    // batch from the lab; anything else inherits its author's batch.
    const batchFromLab = (lab: string) => {
      const index = BATCH_FOR_LAB[lab];
      return index === undefined ? '' : batches[index].id;
    };
    const batchFromOwner = (ownerId: string) => batchOfUser.get(ownerId) || '';

    // Fills the batch on every row of a table that is missing one.
    // `decide(row)` returns the patch for a row, or null when no reliable
    // batch exists — those rows are counted as skipped and left untouched.
    // Also returns every row's final batch, so child records (comments)
    // can inherit from their parent.
    const backfill = async (table: string, decide: (row: any) => Record<string, unknown> | null, maxPages = 40) => {
      const rows = await scanAll(table, maxPages);
      const patches: { id: string;[key: string]: unknown }[] = [];
      const batchById = new Map<string, string>();
      let skipped = 0;
      for (const row of rows) {
        if (row.batch) {
          batchById.set(row.id, row.batch);
          continue;
        }
        const patch = decide(row);
        if (patch?.batch) {
          patches.push({ id: row.id, ...patch });
          batchById.set(row.id, patch.batch as string);
        } else {
          skipped += 1;
        }
      }
      await applyPatches(table, patches);
      return { backfilled: patches.length, skipped, batchById };
    };

    const works = await scanAll('works');

    const workPatches: { id: string; batch: string }[] = [];
    for (const work of works) {
      if (work.batch) continue;
      const batchId = batchOfUser.get(work.created_by_id) || '';
      if (!batchId) {
        orphans += 1;
        continue;
      }
      workPatches.push({ id: work.id, batch: batchId });
    }

    await applyPatches('works', workPatches);

    // The remaining batch-carrying records, in dependency order: comments
    // inherit from their post first, so posts are settled before them.
    const posts = await backfill('posts', (post: any) => {
      const batchId = batchFromOwner(post.created_by_id);
      return batchId ? { batch: batchId } : null;
    });

    // Every post by id, re-read now that post batches are settled. The
    // comment pass below needs each post's visibility and final batch.
    const allPosts = await scanAll('posts');
    const postById = new Map(allPosts.map((post: any) => [post.id, post]));

    const postComments = await backfill('post_comments', (comment: any) => {
      const batchId = posts.batchById.get(comment.post_id) || batchFromOwner(comment.created_by_id);
      return batchId ? { batch: batchId } : null;
    });

    // Comments written before post_visibility existed carry none, and the
    // comment read rule only opens a comment to other batches when it is
    // stamped 'academy' — so legacy comments stay invisible across batches
    // even on academy posts. Stamp each one from its parent post, exactly
    // as new comments are stamped at creation. A comment whose post no
    // longer exists is skipped and counted, never guessed. On academy
    // posts the comment's batch is also corrected to the post's batch in
    // the same patch: legacy rows can carry the commenter's batch, and
    // moderation rights follow the comment's batch. Comments that already
    // carry a post_visibility are left completely untouched, so a second
    // run stamps nothing.
    const allComments = await scanAll('post_comments');
    const visibilityPatches: { id: string;[key: string]: unknown }[] = [];
    let visibilitySkipped = 0;
    for (const comment of allComments) {
      if (comment.post_visibility) continue;
      const post = postById.get(comment.post_id);
      if (!post) {
        visibilitySkipped += 1;
        continue;
      }
      const patch: Record<string, unknown> = { post_visibility: post.visibility || 'batch' };
      if (patch.post_visibility === 'academy' && post.batch && comment.batch !== post.batch) {
        patch.batch = post.batch;
      }
      visibilityPatches.push({ id: comment.id, ...patch });
    }

    await applyPatches('post_comments', visibilityPatches);

    const announcements = await backfill('announcements', (announcement: any) => {
      const batchId = batchFromOwner(announcement.created_by_id);
      return batchId ? { batch: batchId } : null;
    });

    const chatMessages = await backfill(
      'chat_messages',
      (message: any) => {
        const batchId = batchFromLab(message.lab) || batchFromOwner(message.created_by_id);
        return batchId ? { batch: batchId } : null;
      },
      60
    );

    // Progress belongs to the student named on the record (user_id), who also
    // supplies the lab when the record itself is missing one.
    const studentProgress = await backfill('student_progress', (record: any) => {
      const student = userById.get(record.user_id);
      const batchId = (student && batchFromOwner(student.id)) || batchFromLab(record.lab);
      if (!batchId) return null;
      const patch: Record<string, unknown> = { batch: batchId };
      if (!record.lab && student?.lab) patch.lab = student.lab;
      return patch;
    });

    const backfillSummary = {
      posts: { backfilled: posts.backfilled, skipped: posts.skipped },
      post_comments: {
        backfilled: postComments.backfilled,
        skipped: postComments.skipped,
        visibility_stamped: visibilityPatches.length,
        visibility_skipped: visibilitySkipped,
      },
      announcements: { backfilled: announcements.backfilled, skipped: announcements.skipped },
      chat_messages: { backfilled: chatMessages.backfilled, skipped: chatMessages.skipped },
      student_progress: {
        backfilled: studentProgress.backfilled,
        skipped: studentProgress.skipped,
      },
    };
    const recordsBackfilled = Object.values(backfillSummary).reduce(
      (sum, entry) => sum + entry.backfilled,
      0
    );
    const recordsSkipped = Object.values(backfillSummary).reduce(
      (sum, entry) => sum + entry.skipped,
      0
    );

    return Response.json({
      batches: batches.map((b: any) => ({ id: b.id, name: b.name, labs: b.labs || [] })),
      batches_created: batchesCreated,
      batches_existing: TARGETS.length - batchesCreated,
      users_backfilled: userPatches.length,
      works_backfilled: workPatches.length,
      records_backfilled: recordsBackfilled,
      backfill: backfillSummary,
      orphans_skipped: orphans + recordsSkipped,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

Deno.serve(withCors(handler));
