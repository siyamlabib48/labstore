import { supabase } from '@/api/supabaseClient';

// Data layer for the whole app, on Supabase. It deliberately keeps the
// surface the pages and hooks were written against — entities with
// filter/list/get/create/update/delete/count/subscribe returning
// { items, next_cursor, has_more } pages, functions.invoke, and the Core
// file integrations — so the migration swaps the engine, not the app.
// Differences from the old backend are absorbed here:
// - created_date/updated_date are created_at/updated_at in Postgres; rows
//   gain the old names back on the way out, and sort/filter keys are
//   translated on the way in.
// - created_by_id is filled from the signed-in session on create, the way
//   the old backend stamped authorship server-side.
// - Empty strings aimed at uuid columns become null ('' is not a uuid).

const ENTITY_TABLES = {
  User: 'profiles',
  Batch: 'batches',
  Post: 'posts',
  PostComment: 'post_comments',
  PostLike: 'post_likes',
  PostVote: 'post_votes',
  CommentVote: 'comment_votes',
  Work: 'works',
  ChatMessage: 'chat_messages',
  ChatReadState: 'chat_read_states',
  Announcement: 'announcements',
  AnnouncementRead: 'announcement_reads',
  Notification: 'notifications',
  Friendship: 'friendships',
  FriendApprovalRequest: 'friend_approval_requests',
  Report: 'reports',
  StudentProgress: 'student_progress',
};

const KEY_IN = { created_date: 'created_at', updated_date: 'updated_at' };
const keyIn = (key) => KEY_IN[key] || key;
const isUuidKey = (key) => key === 'batch' || key.endsWith('_id');

function rowOut(row) {
  if (!row || typeof row !== 'object') return row;
  return { ...row, created_date: row.created_at, updated_date: row.updated_at };
}

function payloadIn(data) {
  const out = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (key === 'created_date' || key === 'updated_date') return;
    out[keyIn(key)] = value === '' && isUuidKey(key) ? null : value;
  });
  return out;
}

function fail(error) {
  const err = new Error(error?.message || 'Request failed');
  err.status = error?.status || 400;
  err.code = error?.code;
  throw err;
}

const OPS = { $ne: 'neq', $gt: 'gt', $gte: 'gte', $lt: 'lt', $lte: 'lte' };

function orPart(key, value) {
  const column = keyIn(key);
  if (value && typeof value === 'object') {
    if (Array.isArray(value.$in)) return `${column}.in.(${value.$in.join(',')})`;
    const op = Object.keys(OPS).find((name) => value[name] !== undefined);
    if (op) return `${column}.${OPS[op]}.${value[op]}`;
  }
  return `${column}.eq.${value}`;
}

function applyConditions(query, conditions) {
  let q = query;
  Object.entries(conditions || {}).forEach(([key, value]) => {
    if (key === '$or' && Array.isArray(value)) {
      const parts = value.flatMap((sub) =>
        Object.entries(sub).map(([subKey, subValue]) => orPart(subKey, subValue))
      );
      q = q.or(parts.join(','));
      return;
    }
    if (key === '$and' && Array.isArray(value)) {
      value.forEach((sub) => {
        q = applyConditions(q, sub);
      });
      return;
    }
    const column = keyIn(key);
    if (value === null) {
      q = q.is(column, null);
    } else if (value && typeof value === 'object') {
      if (Array.isArray(value.$in)) q = q.in(column, value.$in);
      else if (value.$ne !== undefined) q = q.neq(column, value.$ne);
      else if (value.$gt !== undefined) q = q.gt(column, value.$gt);
      else if (value.$gte !== undefined) q = q.gte(column, value.$gte);
      else if (value.$lt !== undefined) q = q.lt(column, value.$lt);
      else if (value.$lte !== undefined) q = q.lte(column, value.$lte);
      else q = q.eq(column, value);
    } else {
      q = q.eq(column, value);
    }
  });
  return q;
}

function applySort(query, sort) {
  if (!sort) return query;
  const specs = Array.isArray(sort) ? sort : [sort];
  let q = query;
  specs.forEach((spec) => {
    const descending = String(spec).startsWith('-');
    const column = keyIn(String(spec).replace(/^-/, ''));
    q = q.order(column, { ascending: !descending });
  });
  return q;
}

const decodeCursor = (cursor) => {
  const match = /^o_(\d+)$/.exec(cursor || '');
  return match ? Number(match[1]) : 0;
};

function makeEntity(table) {
  return {
    async filter(conditions = {}, options = {}) {
      const limit = options.limit || 100;
      const offset = decodeCursor(options.cursor);
      let q = supabase.from(table).select('*');
      q = applyConditions(q, conditions);
      q = applySort(q, options.sort);
      q = q.range(offset, offset + limit); // one extra row decides has_more
      const { data, error } = await q;
      if (error) fail(error);
      const rows = data || [];
      const hasMore = rows.length > limit;
      const items = (hasMore ? rows.slice(0, limit) : rows).map(rowOut);
      return {
        items,
        has_more: hasMore,
        next_cursor: hasMore ? `o_${offset + limit}` : null,
      };
    },

    async list(options = {}) {
      return this.filter({}, options);
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) fail(error);
      if (!data) {
        const err = new Error('Not found');
        err.status = 404;
        throw err;
      }
      return rowOut(data);
    },

    async create(data) {
      const payload = payloadIn(data);
      if (table !== 'profiles' && payload.created_by_id === undefined) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user?.id) payload.created_by_id = sessionData.session.user.id;
      }
      const { data: row, error } = await supabase.from(table).insert(payload).select().single();
      if (error) fail(error);
      return rowOut(row);
    },

    async update(id, data) {
      const { data: row, error } = await supabase
        .from(table)
        .update(payloadIn(data))
        .eq('id', id)
        .select()
        .single();
      if (error) fail(error);
      return rowOut(row);
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) fail(error);
      return { id };
    },

    async count(conditions = {}) {
      let q = supabase.from(table).select('*', { count: 'exact', head: true });
      q = applyConditions(q, conditions);
      const { count, error } = await q;
      if (error) fail(error);
      return count || 0;
    },

    // Live inserts/updates/deletes for one table, shaped like the old
    // realtime events: the callback receives { type, data } with the row.
    subscribe(callback) {
      const channel = supabase
        .channel(`db-${table}-${Math.random().toString(36).slice(2, 9)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          const type =
            payload.eventType === 'INSERT'
              ? 'create'
              : payload.eventType === 'UPDATE'
                ? 'update'
                : 'delete';
          callback({ type, data: rowOut(payload.new || payload.old) });
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}

const entities = {};
Object.entries(ENTITY_TABLES).forEach(([name, table]) => {
  entities[name] = makeEntity(table);
});

// ------------------------------------------------------------- functions
// Edge Functions keep the old names and payload shapes. supabase-js
// surfaces a non-2xx as an error and the JSON body on error.context.
const functions = {
  async invoke(name, payload = {}) {
    const { data, error } = await supabase.functions.invoke(name, { body: payload });
    if (error) {
      let message = error.message || 'Function call failed';
      try {
        const body = await error.context?.json();
        if (body?.error) message = body.error;
      } catch {
        // keep the generic message
      }
      const err = new Error(message);
      err.status = error.context?.status || 500;
      throw err;
    }
    // The app was written against an invoke() that resolves to
    // { data } — every call site reads res.data — so keep that shape
    // here rather than returning the body bare.
    return { data };
  },
};

// ---------------------------------------------------------------- files
const PUBLIC_BUCKET = 'public-files';
const PRIVATE_BUCKET = 'private-files';

function storagePath(file) {
  const safe = (file?.name || 'file').replace(/[^\w.\-]+/g, '_');
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
}

const integrations = {
  Core: {
    async UploadPublicFile({ file }) {
      const path = storagePath(file);
      const { error } = await supabase.storage.from(PUBLIC_BUCKET).upload(path, file);
      if (error) fail(error);
      const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
      return { file_url: data.publicUrl };
    },

    async UploadPrivateFile({ file }) {
      const path = storagePath(file);
      const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, file);
      if (error) fail(error);
      return { file_uri: path };
    },

    async CreateFileSignedUrl({ file_uri, expires_in = 3600 }) {
      if (!file_uri) return { signed_url: null };
      if (/^https?:\/\//.test(file_uri)) return { signed_url: file_uri };
      const { data, error } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .createSignedUrl(file_uri, expires_in);
      if (error) fail(error);
      return { signed_url: data.signedUrl };
    },
  },
};

export const db = { entities, functions, integrations };
