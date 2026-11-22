import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { isOwner as isOwnerOf } from '@/lib/staffRoles';

const STORE_KEY = 'labstore.activeBatchId';
const BatchContext = createContext(null);

export function BatchProvider({ children }) {
  const { user } = useAuth();
  const isOwner = isOwnerOf(user);
  const [batches, setBatches] = useState([]);
  const [activeId, setActiveId] = useState(() => localStorage.getItem(STORE_KEY) || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    db.entities.Batch
      .list({ sort: 'created_date', limit: 100 })
      .then((page) => {
        if (!alive) return;
        setBatches(page.items || []);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const available = useMemo(() => {
    if (!user) return [];
    if (isOwner) return batches.filter((batch) => batch.status !== 'archived');
    return batches.filter((batch) => batch.id === user.batch);
  }, [batches, user, isOwner]);

  const activeBatch = available.find((batch) => batch.id === activeId) || available[0] || null;

  const setActiveBatchId = (id) => {
    setActiveId(id);
    localStorage.setItem(STORE_KEY, id);
  };

  const value = {
    batches,
    available,
    activeBatch,
    setActiveBatchId,
    loading,
    isOwner,
    refresh: () => db.entities.Batch.list({ sort: 'created_date', limit: 100 }).then((p) => setBatches(p.items || [])),
  };

  return <BatchContext.Provider value={value}>{children}</BatchContext.Provider>;
}

export function useBatch() {
  const ctx = useContext(BatchContext);
  if (!ctx) throw new Error('useBatch must be used inside BatchProvider');
  return ctx;
}