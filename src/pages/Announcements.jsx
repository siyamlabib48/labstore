import React, { useEffect, useState } from 'react';
import { Loader2, Megaphone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useBatch } from '@/lib/BatchContext';
import {
  announcementScopeOf,
  canDeleteAnnouncement,
  canManageBatch,
  canPostAnnouncements,
  isOwner,
} from '@/lib/staffRoles';
import AnnouncementForm from '@/components/announcements/AnnouncementForm';
import AnnouncementCard from '@/components/announcements/AnnouncementCard';

export default function Announcements() {
  const { user } = useAuth();
  const { activeBatch, loading: batchLoading } = useBatch();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  // Snapshot of announcements that were unread when this page loaded. The
  // "New" markers come from the snapshot, so they stay visible during this
  // visit even though viewing the list is what marks them read.
  const [newIds, setNewIds] = useState(() => new Set());
  const [readCounts, setReadCounts] = useState({});
  const [countsLive, setCountsLive] = useState(false);
  const canPost = canPostAnnouncements(user);
  // An ACR writes to their own lab; staff write to the whole batch.
  const postScope = announcementScopeOf(user);

  // A lab-targeted notice (an ACR writes to their own lab only) is for that
  // lab, not the whole batch: members see batch-wide notices plus their own
  // lab's. Batch staff, the owner and the author still see every notice in
  // the batch, so nothing posted is invisible to the people running it.
  const seesAll = isOwner(user) || canManageBatch(user);
  const visibleOf = (rows) =>
    rows.filter(
      (item) =>
        !item.lab || seesAll || item.lab === user?.lab || item.created_by_id === user?.id
    );

  const load = async () => {
    if (!activeBatch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const page = await base44.entities.Announcement.filter(
      { batch: activeBatch.id },
      { sort: '-created_date', limit: 30 }
    );
    const rows = page.items || [];
    setItems(rows);
    setLoading(false);

    if (!user?.id) return;
    const visible = visibleOf(rows);

    // Read tracking: one AnnouncementRead row per member per announcement.
    // The duplicate guard is the fetched set itself (Phase 0 pattern) —
    // only announcements with no row yet get one created.
    const myReads = await base44.entities.AnnouncementRead.filter(
      { user_id: user.id },
      { limit: 200 }
    ).catch(() => ({ items: [] }));
    const readSet = new Set((myReads.items || []).map((row) => row.announcement_id));

    setNewIds(
      new Set(
        visible
          .filter((item) => !readSet.has(item.id) && item.created_by_id !== user.id)
          .map((item) => item.id)
      )
    );

    const toMark = visible.filter(
      (item) => !readSet.has(item.id) && item.created_by_id !== user.id
    );
    if (toMark.length) {
      await Promise.allSettled(
        toMark.map((item) =>
          base44.entities.AnnouncementRead.create({
            announcement_id: item.id,
            user_id: user.id,
            batch: activeBatch.id,
            announcement_author_id: item.created_by_id || '',
          })
        )
      );
    }

    // Read counts are for the people running the batch and for authors.
    // RLS decides which rows come back: staff see the whole batch's rows,
    // an author sees the rows for their own announcements.
    const iAuthored = visible.some((item) => item.created_by_id === user.id);
    if (seesAll || iAuthored) {
      const batchReads = await base44.entities.AnnouncementRead.filter(
        { batch: activeBatch.id },
        { limit: 500 }
      ).catch(() => ({ items: [] }));
      const counts = {};
      (batchReads.items || []).forEach((row) => {
        counts[row.announcement_id] = (counts[row.announcement_id] || 0) + 1;
      });
      setReadCounts(counts);
      setCountsLive(true);
    } else {
      setReadCounts({});
      setCountsLive(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBatch?.id]);

  const publish = async ({ title, body, priority, category, event_at, attachments }) => {
    const row = await base44.entities.Announcement.create({
      title,
      body,
      priority,
      category: category || 'general',
      event_at: event_at || '',
      attachments: attachments || [],
      batch: activeBatch.id,
      lab: postScope === 'lab' ? user.lab || '' : '',
      author_name: user.full_name || user.email || '',
      author_role: user.role === 'admin' ? 'owner' : user.staff_role || 'member',
    });
    setItems((prev) => [row, ...prev]);
    await base44.functions
      .invoke('notify', { action: 'announcement', announcement_id: row.id })
      .catch(() => {});
  };

  const remove = async (id) => {
    await base44.entities.Announcement.delete(id);
    setItems((prev) => prev.filter((row) => row.id !== id));
  };

  const visibleItems = visibleOf(items);

  if (batchLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Batch announcements
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          Notices
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          {activeBatch
            ? `Everything your coordinators and teachers post for ${activeBatch.name}.`
            : 'Announcements appear here once you are placed in a batch.'}
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-4">
        {canPost && activeBatch && (
          <AnnouncementForm onPublish={publish} scopeLab={postScope === 'lab' ? user.lab : ''} />
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
            <Megaphone className="mx-auto h-7 w-7 text-muted-foreground" />
            <h2 className="mt-3 font-heading text-xl font-bold tracking-tight">No notices yet</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              {canPost
                ? 'Post the first announcement for your batch.'
                : 'Your coordinator has not posted anything yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item) => (
              <AnnouncementCard
                key={item.id}
                item={item}
                canDelete={canDeleteAnnouncement(user, item)}
                onDelete={remove}
                isNew={newIds.has(item.id)}
                readCount={
                  countsLive && (seesAll || item.created_by_id === user?.id)
                    ? readCounts[item.id] || 0
                    : null
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
