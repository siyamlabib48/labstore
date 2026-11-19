import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useProgress({ batchId, user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!batchId || !user?.id) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const page = await base44.entities.StudentProgress.filter(
      { batch: batchId },
      { sort: 'created_date', limit: 500 }
    );
    setRecords(page.items || []);
    setLoading(false);
  }, [batchId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const actor = user?.full_name || user?.email || '';

  const addMilestone = async (member, title) => {
    await base44.entities.StudentProgress.create({
      user_id: member.id,
      user_name: member.full_name || member.email || '',
      batch: member.batch || batchId,
      lab: member.lab || '',
      title,
      status: 'in_progress',
      updated_by_name: actor,
    });
    await load();
  };

  const setStatus = async (record, status) => {
    await base44.entities.StudentProgress.update(record.id, { status, updated_by_name: actor });
    await load();
  };

  const setNote = async (record, note) => {
    await base44.entities.StudentProgress.update(record.id, { note, updated_by_name: actor });
    await load();
  };

  const removeMilestone = async (record) => {
    await base44.entities.StudentProgress.delete(record.id);
    await load();
  };

  return { records, loading, reload: load, addMilestone, setStatus, setNote, removeMilestone };
}