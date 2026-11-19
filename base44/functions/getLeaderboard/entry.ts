import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { isApproved, isOwner, pendingApproval } from '../../shared/access.ts';

// Rankings resolve in this order: lab board (batch + lab), batch board, or — for
// the owner only — every batch. Deleted works never count: the tally is built from
// the Work rows that exist right now.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isApproved(user)) return pendingApproval();

    const body = await req.json().catch(() => ({}));
    const owner = isOwner(user);
    const requestedBatch = typeof body.batch_id === 'string' ? body.batch_id.trim() : '';
    const requestedLab = typeof body.lab === 'string' ? body.lab.trim() : '';

    // A member only ever ranks inside their own batch. Inside that batch they
    // may view any lab's board (the UI offers one chip per lab), but a lab
    // from another batch is silently ignored — the same narrowing applied to
    // an out-of-batch batch_id — and the request falls back to the batch board.
    const scopeBatch = owner ? requestedBatch : user.batch || '';
    let scopeLab = owner ? requestedLab : '';
    if (!owner && requestedLab && scopeBatch) {
      let batchLabs = [];
      try {
        const batch = await base44.asServiceRole.entities.Batch.get(scopeBatch);
        batchLabs = Array.isArray(batch?.labs) ? batch.labs : [];
      } catch {
        batchLabs = [];
      }
      // The caller's own lab always works, even if the batch record's lab
      // list is missing or stale.
      if (batchLabs.includes(requestedLab) || requestedLab === user.lab) {
        scopeLab = requestedLab;
      }
    }

    if (!owner && !scopeBatch) {
      return Response.json({ rows: [], total_works: 0, scope: 'batch', scope_batch: '', scope_lab: '' });
    }

    const scope = scopeLab && scopeBatch ? 'lab' : scopeBatch ? 'batch' : 'all';

    const workQuery = {};
    if (scopeBatch) workQuery.batch = scopeBatch;
    if (scope === 'lab') workQuery.lab = scopeLab;

    const works = [];
    let cursor;
    // Runaway guard: at most 20 pages × 500 = 10,000 works are tallied for a
    // board. Works beyond that in scope are NOT counted (ranks would skew),
    // so if a batch ever approaches ~10k works this needs a server-side tally.
    for (let page = 0; page < 20; page += 1) {
      const result = await base44.asServiceRole.entities.Work.filter(
        workQuery,
        cursor ? { limit: 500, cursor } : { limit: 500 }
      );
      works.push(...(result.items || []));
      cursor = result.next_cursor;
      if (!cursor) break;
    }

    const counts = new Map();
    for (const work of works) {
      const author = work.created_by_id;
      if (!author) continue;
      counts.set(author, (counts.get(author) || 0) + 1);
    }

    const userQuery = {};
    if (scopeBatch) userQuery.batch = scopeBatch;
    if (scope === 'lab') userQuery.lab = scopeLab;

    // Roster read: no explicit page-through. Batches are small (a few dozen
    // members), so the filtered set is expected to arrive whole; if a batch
    // ever grows into the hundreds this read needs the same cursor loop as
    // the works tally above, or members would silently drop off the board.
    const users = await base44.asServiceRole.entities.User.filter(userQuery);
    const rows = (users || [])
      .filter((u) => u.role !== 'admin' && (!!u.lab || !!u.batch))
      // Pending and rejected accounts never appear on a public ranking.
      .filter((u) => u.approval_status === 'approved' || (!u.approval_status && !!u.lab))
      .map((u) => ({
        user_id: u.id,
        full_name: u.full_name || 'Student',
        lab: u.lab || '',
        batch: u.batch || '',
        staff_role: u.staff_role || 'member',
        is_lab_leader: !!u.is_lab_leader,
        work_count: counts.get(u.id) || 0,
      }))
      .sort((a, b) => b.work_count - a.work_count || a.full_name.localeCompare(b.full_name))
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return Response.json({
      rows,
      total_works: works.length,
      scope,
      scope_batch: scopeBatch,
      scope_lab: scope === 'lab' ? scopeLab : '',
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}