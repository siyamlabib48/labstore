import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const LIMIT = 80;
const REFRESH_DELAY = 400;

export default function useChat({ batchId, scope, lab, user }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const refreshTimer = useRef(null);
  const cursorRef = useRef(null);

  // A member only ever reads and writes their own batch's rooms. Switching the
  // batch in the UI cannot open someone else's room.
  const inMyBatch = !!batchId && (user?.role === 'admin' || (!!user?.batch && batchId === user.batch));

  const roomQuery = useCallback(() => {
    const query = { batch: batchId, scope };
    if (scope === 'lab') query.lab = lab || '';
    return query;
  }, [batchId, scope, lab]);

  const load = useCallback(async () => {
    if (!inMyBatch || !batchId) {
      setMessages([]);
      setHasMore(false);
      cursorRef.current = null;
      setLoading(false);
      return;
    }
    const page = await base44.entities.ChatMessage.filter(roomQuery(), {
      sort: '-created_date',
      limit: LIMIT,
    });
    cursorRef.current = page.next_cursor || null;
    setHasMore(!!page.next_cursor);
    setMessages((page.items || []).slice().reverse());
    setLoading(false);
  }, [batchId, inMyBatch, roomQuery]);

  useEffect(() => {
    // Switching batch or room must never show the previous room's messages.
    setMessages([]);
    setLoading(true);
    load();

    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      const row = event?.data;
      // Only this room's events refresh this room, and a burst of events
      // coalesces into one reload.
      if (!inMyBatch || !row || row.batch !== batchId || row.scope !== scope) return;
      if (scope === 'lab' && (row.lab || '') !== (lab || '')) return;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => load(), REFRESH_DELAY);
    });

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      unsubscribe();
    };
  }, [load, batchId, scope, lab, inMyBatch]);

  // Fetches the next older page and prepends it. The live load above always
  // re-fetches the latest page, so older pages are a browsing convenience,
  // not part of the live window.
  const loadOlder = async () => {
    if (!cursorRef.current || loadingOlder || !inMyBatch) return;
    setLoadingOlder(true);
    try {
      const page = await base44.entities.ChatMessage.filter(roomQuery(), {
        sort: '-created_date',
        limit: LIMIT,
        cursor: cursorRef.current,
      });
      cursorRef.current = page.next_cursor || null;
      setHasMore(!!page.next_cursor);
      const older = (page.items || []).slice().reverse();
      setMessages((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...older.filter((item) => !seen.has(item.id)), ...prev];
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (body, attachments = []) => {
    if (!inMyBatch) throw new Error('You can only post in your own batch chat.');
    const row = await base44.entities.ChatMessage.create({
      body: body || '',
      attachments,
      scope,
      batch: batchId,
      lab: scope === 'lab' ? lab || '' : '',
      author_name: user.full_name || user.email || '',
      author_lab: user.lab || '',
    });
    setMessages((prev) => (prev.some((item) => item.id === row.id) ? prev : [...prev, row]));
    return row;
  };

  const remove = async (id) => {
    await base44.entities.ChatMessage.delete(id);
    setMessages((prev) => prev.filter((item) => item.id !== id));
  };

  return { messages, loading, loadingOlder, hasMore, loadOlder, send, remove, reload: load, inMyBatch };
}
