import { useCallback, useEffect, useState } from 'react';
import { db } from '@/api/dataClient';
import { useToast } from '@/components/ui/use-toast';

const FRIENDS_EVENT = 'lablink:friends-changed';

export function notifyFriendsChanged() {
  window.dispatchEvent(new Event(FRIENDS_EVENT));
}

export function usePendingCount(userId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    const load = () => {
      db.entities.Friendship.count({ recipient_id: userId, status: 'pending' }).then((value) => {
        if (alive) setCount(value || 0);
      });
    };
    load();
    window.addEventListener(FRIENDS_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(FRIENDS_EVENT, load);
    };
  }, [userId]);

  return count;
}

export function useFriendship(me, target) {
  const targetId = target?.id;
  const { toast } = useToast();
  const [row, setRow] = useState(null);
  const [approvalPending, setApprovalPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!me?.id || !targetId || me.id === targetId) {
      setRow(null);
      setApprovalPending(false);
      setLoading(false);
      return;
    }
    const page = await db.entities.Friendship.filter(
      {
        $or: [
          { requester_id: me.id, recipient_id: targetId },
          { requester_id: targetId, recipient_id: me.id },
        ],
      },
      { limit: 10 }
    );
    // A rejected row is history, not a live relationship: it never counts as
    // the pair's state and never blocks a fresh request.
    const live = (page.items || []).find((item) => item.status !== 'rejected') || null;
    setRow(live);
    if (!live) {
      const approvals = await db.entities.FriendApprovalRequest.filter(
        { requester_id: me.id, recipient_id: targetId, status: 'pending' },
        { limit: 1 }
      ).catch(() => ({ items: [] }));
      setApprovalPending((approvals.items || []).length > 0);
    } else {
      setApprovalPending(false);
    }
    setLoading(false);
  }, [me?.id, targetId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const run = async (action) => {
    setBusy(true);
    await action();
    await load();
    notifyFriendsChanged();
    setBusy(false);
  };

  // Sending always goes through manageFriendApproval: the server decides
  // whether the request goes straight to the recipient or is held for a
  // teacher/coordinator decision first (the friend-approval safeguard), and
  // it re-checks duplicates there — a stale page can never create a second
  // pending/accepted row for the pair.
  const send = (note) =>
    run(async () => {
      try {
        const res = await db.functions.invoke('manageFriendApproval', {
          action: 'request',
          recipient_id: target.id,
          note: (note || '').trim() || undefined,
        });
        if (res.data?.error) throw new Error(res.data.error);
        if (res.data?.route === 'approval') {
          toast({
            title: 'Sent for teacher approval',
            description:
              'This request needs a teacher or coordinator to approve it before it is sent on.',
          });
        } else {
          toast({ title: 'Friend request sent' });
        }
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Could not send the request',
          description: err.message || 'Please try again.',
        });
      }
    });

  const cancel = () => run(() => db.entities.Friendship.delete(row.id));
  const accept = () =>
    run(async () => {
      await db.entities.Friendship.update(row.id, { status: 'accepted' });
      await db.functions
        .invoke('notify', { action: 'friend_accept', friendship_id: row.id })
        .catch(() => {});
    });
  // Declining keeps the row as 'rejected' instead of deleting it, so the
  // refusal is on record. It never blocks a fresh request later.
  const decline = () =>
    run(() => db.entities.Friendship.update(row.id, { status: 'rejected' }));

  const status = row
    ? row.status === 'accepted'
      ? 'friends'
      : row.requester_id === me?.id
        ? 'outgoing'
        : 'incoming'
    : approvalPending
      ? 'approval'
      : 'none';

  return { status, row, loading, busy, send, cancel, accept, decline, reload: load };
}

export function useFriendLists(me) {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!me?.id) {
      setLoading(false);
      return;
    }
    const [inc, out, acc] = await Promise.all([
      db.entities.Friendship.filter(
        { recipient_id: me.id, status: 'pending' },
        { sort: '-created_date', limit: 50 }
      ),
      db.entities.Friendship.filter(
        { requester_id: me.id, status: 'pending' },
        { sort: '-created_date', limit: 50 }
      ),
      db.entities.Friendship.filter(
        { status: 'accepted', $or: [{ requester_id: me.id }, { recipient_id: me.id }] },
        { sort: '-updated_date', limit: 100 }
      ),
    ]);
    setIncoming(inc.items || []);
    setOutgoing(out.items || []);
    setFriends(acc.items || []);
    setLoading(false);
  }, [me?.id]);

  useEffect(() => {
    reload();
    window.addEventListener(FRIENDS_EVENT, reload);
    return () => window.removeEventListener(FRIENDS_EVENT, reload);
  }, [reload]);

  return { incoming, outgoing, friends, loading, reload };
}

export function otherParty(row, me) {
  const iAmRequester = row.requester_id === me?.id;
  return {
    id: iAmRequester ? row.recipient_id : row.requester_id,
    name: iAmRequester ? row.recipient_name : row.requester_name,
    lab: iAmRequester ? row.recipient_lab : row.requester_lab,
  };
}