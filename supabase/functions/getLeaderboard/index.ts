import { getCaller, serviceClient, svc } from '../_shared/svc.ts';
import { isApproved, isOwner, pendingApproval } from '../_shared/access.ts';

// Rankings resolve in this order: lab board (batch + lab), batch board, or — for
// the owner only — every batch. Deleted works never count: the tally is built from
// the Work rows that exist right now.
async function handler(req: Request) {
  try {
    const db = serviceClient();
    const user = await getCaller(req, db);
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
      let batchLabs: string[] = [];
      try {
        const batch = await svc.get(db, 'batches', scopeBatch);
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

    const workQuery: Record<string, unknown> = {};
    if (scopeBatch) workQuery.batch = scopeBatch;
    if (scope === 'lab') workQuery.lab = scopeLab;

    const works: any[] = [];
    // Runaway guard: at most 20 pages × 500 = 10,000 works are tallied for a
    // board. Works beyond that in scope are NOT counted (ranks would skew),
    // so if a batch ever approaches ~10k works this needs a server-side tally.
    for (let page = 0; page < 20; page += 1) {
      const batchRows = await svc.filter(db, 'works', workQuery, { limit: 500, offset: page * 500 });
      works.push(...batchRows);
      if (batchRows.length < 500) break;
    }

    const counts = new Map<string, number>();
    for (const work of works) {
      const author = work.created_by_id;
      if (!author) continue;
      counts.set(author, (counts.get(author) || 0) + 1);
    }

    const userQuery: Record<string, unknown> = {};
    if (scopeBatch) userQuery.batch = scopeBatch;
    if (scope === 'lab') userQuery.lab = scopeLab;

    // Roster read: batches are small (a few dozen members), so the filtered
    // set is expected to arrive whole under the query default cap.
    const users = await svc.filter(db, 'profiles', userQuery, { limit: 1000 });
    const rows = (users || [])
      .filter((u: any) => !u.is_admin && (!!u.lab || !!u.batch))
      // Pending and rejected accounts never appear on a public ranking.
      .filter((u: any) => u.approval_status === 'approved' || (!u.approval_status && !!u.lab))
      .map((u: any) => ({
        user_id: u.id,
        full_name: u.full_name || 'Student',
        lab: u.lab || '',
        batch: u.batch || '',
        staff_role: u.staff_role || 'member',
        work_count: counts.get(u.id) || 0,
      }))
      .sort((a: any, b: any) => b.work_count - a.work_count || a.full_name.localeCompare(b.full_name))
      .map((row: any, index: number) => ({ ...row, rank: index + 1 }));

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

Deno.serve(handler);
