import { createClient } from 'npm:@supabase/supabase-js@2';

// Shared plumbing for the Edge Functions: a service-role client (bypasses
// row policies — every function re-checks permissions itself through
// _shared/access.ts before touching data), the caller's identity, and
// small entity-style helpers over PostgREST so the ported function bodies
// keep the shapes they were written with.

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

// The caller's profile row mapped to the app-user shape the access helpers
// expect (role derived from is_admin), or null when there is no valid
// session. Mirrors what the frontend AuthContext builds from the same row.
export async function getCaller(req: Request, db: any) {
  const authHeader = req.headers.get('Authorization') || '';
  const anon = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const { data, error } = await anon.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();
  if (!profile) return null;
  return { ...profile, role: profile.is_admin ? 'admin' : 'user' };
}

function applyConditions(query: any, conditions: Record<string, unknown>) {
  let q = query;
  for (const [key, value] of Object.entries(conditions || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const ops = value as Record<string, unknown>;
      if (Array.isArray(ops.$in)) q = q.in(key, ops.$in);
      else if (ops.$ne !== undefined) q = q.neq(key, ops.$ne);
      else if (ops.$gt !== undefined) q = q.gt(key, ops.$gt);
      else if (ops.$gte !== undefined) q = q.gte(key, ops.$gte);
      else if (ops.$lt !== undefined) q = q.lt(key, ops.$lt);
      else if (ops.$lte !== undefined) q = q.lte(key, ops.$lte);
      else q = q.eq(key, value);
    } else if (value === null) {
      q = q.is(key, null);
    } else {
      q = q.eq(key, value);
    }
  }
  return q;
}

export const svc = {
  async get(db: any, table: string, id: string) {
    const { data, error } = await db.from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async filter(db: any, table: string, conditions: Record<string, unknown>, options: { limit?: number; sort?: string; offset?: number } = {}) {
    let q = db.from(table).select('*');
    q = applyConditions(q, conditions);
    if (options.sort) {
      const descending = options.sort.startsWith('-');
      q = q.order(options.sort.replace(/^-/, ''), { ascending: !descending });
    }
    if (options.offset !== undefined && options.limit) {
      q = q.range(options.offset, options.offset + options.limit - 1);
    } else if (options.limit) {
      q = q.limit(options.limit);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async count(db: any, table: string, conditions: Record<string, unknown>) {
    let q = db.from(table).select('*', { count: 'exact', head: true });
    q = applyConditions(q, conditions);
    const { count, error } = await q;
    if (error) throw error;
    return count || 0;
  },

  async create(db: any, table: string, row: Record<string, unknown>) {
    const { data, error } = await db.from(table).insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async bulkCreate(db: any, table: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) return [];
    const { data, error } = await db.from(table).insert(rows).select();
    if (error) throw error;
    return data || [];
  },

  async update(db: any, table: string, id: string, patch: Record<string, unknown>) {
    const { data, error } = await db.from(table).update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(db: any, table: string, id: string) {
    const { error } = await db.from(table).delete().eq('id', id);
    if (error) throw error;
    return { id };
  },
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
