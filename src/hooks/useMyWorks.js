import { useCallback, useEffect, useState } from 'react';
import { db } from '@/api/dataClient';

const WORKS_EVENT = 'labstore:works-changed';

export function notifyWorksChanged() {
  window.dispatchEvent(new Event(WORKS_EVENT));
}

export default function useMyWorks(userId) {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    const page = await db.entities.Work.filter(
      { created_by_id: userId },
      { sort: '-created_date', limit: 200 }
    );
    setWorks(page.items || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
    window.addEventListener(WORKS_EVENT, reload);
    return () => window.removeEventListener(WORKS_EVENT, reload);
  }, [reload]);

  const usedBytes = works.reduce((sum, work) => sum + (work.file_size_bytes || 0), 0);

  return { works, loading, reload, usedBytes };
}