import { useCallback, useEffect, useState } from 'react';
import { db } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';

const NOTIFY_EVENT = 'lablink:notifications-changed';

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFY_EVENT));
}

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return undefined;
    let alive = true;
    const load = () => {
      db.entities.Notification.count({ user_id: user.id, is_read: false }).then((value) => {
        if (alive) setCount(value || 0);
      });
    };
    load();
    window.addEventListener(NOTIFY_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(NOTIFY_EVENT, load);
    };
  }, [user?.id]);

  return count;
}

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const page = await db.entities.Notification.filter(
      { user_id: user.id },
      { sort: '-created_date', limit: 50 }
    );
    setItems(page.items || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const markRead = async (id) => {
    await db.entities.Notification.update(id, { is_read: true });
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, is_read: true } : row)));
    notifyNotificationsChanged();
  };

  const markAllRead = async () => {
    await db.entities.Notification.updateMany(
      { user_id: user.id, is_read: false },
      { $set: { is_read: true } }
    );
    setItems((prev) => prev.map((row) => ({ ...row, is_read: true })));
    notifyNotificationsChanged();
  };

  const remove = async (id) => {
    await db.entities.Notification.delete(id);
    setItems((prev) => prev.filter((row) => row.id !== id));
    notifyNotificationsChanged();
  };

  return { items, loading, reload, markRead, markAllRead, remove };
}