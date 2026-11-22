import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlaskConical, Loader2, MessageCircle, Users } from 'lucide-react';
import { db } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { useBatch } from '@/lib/BatchContext';
import { labOf } from '@/lib/labs';
import { canManageBatch } from '@/lib/staffRoles';
import { cn } from '@/lib/utils';
import ChatRoom from '@/components/chat/ChatRoom';

// One read-state row per member per room, keyed the same way the page picks
// rooms: '<batchId>:batch' for the batch room, '<batchId>:lab:<labKey>' for
// a lab room.
const roomKeyFor = (batchId, scope, lab) =>
  scope === 'lab' ? `${batchId}:lab:${lab}` : `${batchId}:batch`;

export default function Chat() {
  const { user } = useAuth();
  const { activeBatch, loading: batchLoading } = useBatch();
  const [room, setRoom] = useState('batch');
  const [unread, setUnread] = useState({});
  const readMapRef = useRef({});

  useEffect(() => {
    setRoom('batch');
  }, [activeBatch?.id]);

  const ownLab = user?.lab || '';
  const staff = canManageBatch(user);
  const labKeys = staff ? activeBatch?.labs || [] : ownLab ? [ownLab] : [];

  const isLab = room.startsWith('lab:');
  const activeLab = isLab ? room.slice(4) : '';
  const activeLabMeta = labOf(activeLab);
  const activeRoomKey = activeBatch
    ? roomKeyFor(activeBatch.id, isLab ? 'lab' : 'batch', activeLab)
    : '';

  // Counts unread messages per room from each room's latest page: anything
  // newer than the member's read marker that they did not write themselves.
  const loadUnread = useCallback(async () => {
    if (!user?.id || !activeBatch) return;
    const page = await db.entities.ChatReadState.filter(
      { user_id: user.id },
      { limit: 100 }
    ).catch(() => ({ items: [] }));
    const map = {};
    (page.items || []).forEach((row) => {
      map[row.room_key] = row;
    });
    readMapRef.current = map;

    const rooms = [
      { scope: 'batch', lab: '', key: roomKeyFor(activeBatch.id, 'batch', '') },
      ...labKeys.map((key) => ({
        scope: 'lab',
        lab: key,
        key: roomKeyFor(activeBatch.id, 'lab', key),
      })),
    ];
    const counts = {};
    await Promise.all(
      rooms.map(async (entry) => {
        const query = { batch: activeBatch.id, scope: entry.scope };
        if (entry.scope === 'lab') query.lab = entry.lab;
        const messages = await db.entities.ChatMessage.filter(query, {
          sort: '-created_date',
          limit: 80,
        }).catch(() => ({ items: [] }));
        const since = map[entry.key]?.last_read_at || '';
        counts[entry.key] = (messages.items || []).filter(
          (message) => message.created_by_id !== user.id && message.created_date > since
        ).length;
      })
    );
    setUnread(counts);
    // labKeys is derived from user/activeBatch, both covered below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeBatch?.id, staff, ownLab]);

  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  const markRead = useCallback(
    async (roomKey, at) => {
      if (!user?.id || !roomKey) return;
      const atIso = at || new Date().toISOString();
      const existing = readMapRef.current[roomKey];
      if (existing?.last_read_at && existing.last_read_at >= atIso) return;
      setUnread((prev) => ({ ...prev, [roomKey]: 0 }));
      try {
        if (existing?.id) {
          await db.entities.ChatReadState.update(existing.id, { last_read_at: atIso });
          readMapRef.current = {
            ...readMapRef.current,
            [roomKey]: { ...existing, last_read_at: atIso },
          };
        } else {
          const row = await db.entities.ChatReadState.create({
            user_id: user.id,
            room_key: roomKey,
            last_read_at: atIso,
          });
          readMapRef.current = { ...readMapRef.current, [roomKey]: row };
        }
      } catch {
        // Read markers are best-effort: a failed write only means the badge
        // comes back on the next visit.
      }
    },
    [user?.id]
  );

  // Opening a room marks it read up to now; messages arriving while it is
  // open advance the marker via ChatRoom's onSeen.
  useEffect(() => {
    if (activeRoomKey) markRead(activeRoomKey);
  }, [activeRoomKey, markRead]);

  const badge = (key) => {
    const count = unread[key] || 0;
    if (!count) return null;
    return (
      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DB2777] px-1 text-[9px] font-bold text-white">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

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
          Batch &amp; lab rooms
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          Chats
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          One room for your whole batch, and a private room per lab. Messages arrive live while the
          room is open.
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-3">
        {!activeBatch ? (
          <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
            <MessageCircle className="mx-auto h-7 w-7 text-muted-foreground" />
            <h2 className="mt-3 font-heading text-xl font-bold tracking-tight">No room yet</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Chats unlock once you are placed in a batch.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRoom('batch')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors',
                  room === 'batch'
                    ? 'bg-foreground text-background'
                    : 'border border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <Users className="h-3.5 w-3.5" />
                Batch chat
                {badge(roomKeyFor(activeBatch.id, 'batch', ''))}
              </button>

              {labKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoom(`lab:${key}`)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors',
                    activeLab === key
                      ? 'bg-foreground text-background'
                      : 'border border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  {labOf(key).label}
                  {badge(roomKeyFor(activeBatch.id, 'lab', key))}
                </button>
              ))}

              {!staff && !ownLab && (
                <span className="rounded-full border border-dashed border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground">
                  No lab room — you have no lab yet
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              {isLab
                ? `${activeLabMeta.label} · only ${activeLabMeta.label} members of ${activeBatch.name}`
                : `${activeBatch.name} · every member of this batch`}
            </p>

            <ChatRoom
              key={`${activeBatch.id}-${isLab ? `lab-${activeLab}` : 'batch'}-${user?.id}`}
              batchId={activeBatch.id}
              scope={isLab ? 'lab' : 'batch'}
              lab={activeLab}
              user={user}
              showLab={!isLab}
              onSeen={(latestAt) => markRead(activeRoomKey, latestAt)}
              placeholder={
                isLab ? `Message the ${activeLabMeta.label} lab…` : 'Message your batch…'
              }
              emptyTitle={
                isLab ? `${activeLabMeta.label} is quiet` : 'No messages in this batch yet'
              }
              emptyHint={
                isLab
                  ? 'Kick things off with a question or a resource for your labmates.'
                  : 'Say hello, ask a question or share a quick update.'
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
