import React, { useState } from 'react';
import { Loader2, Inbox, Send, Users2, Check, X } from 'lucide-react';
import { db } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { useFriendLists, notifyFriendsChanged, otherParty } from '@/hooks/useFriends';
import FriendRow from '@/components/friends/FriendRow';
import FriendApprovalsQueue from '@/components/friends/FriendApprovalsQueue';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function SectionTitle({ icon: Icon, label, count }) {
  return (
    <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {label}
      {count > 0 && (
        <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-bold leading-none text-background">
          {count}
        </span>
      )}
    </h2>
  );
}

export default function Friends() {
  const { user } = useAuth();
  const { incoming, outgoing, friends, loading, reload } = useFriendLists(user);
  const [busyId, setBusyId] = useState(null);

  const act = async (id, action) => {
    setBusyId(id);
    await action();
    await reload();
    notifyFriendsChanged();
    setBusyId(null);
  };

  const accept = (row) =>
    act(row.id, async () => {
      await db.entities.Friendship.update(row.id, { status: 'accepted' });
      await db.functions
        .invoke('notify', { action: 'friend_accept', friendship_id: row.id })
        .catch(() => {});
    });
  const remove = (row) => act(row.id, () => db.entities.Friendship.delete(row.id));
  // Declining an incoming request keeps the row as 'rejected' rather than
  // deleting it; cancelling your own request and unfriending still delete.
  const decline = (row) =>
    act(row.id, () => db.entities.Friendship.update(row.id, { status: 'rejected' }));

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Your circle
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          Friends
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Connect with batchmates across labs and batches. Open a profile from the leaderboard or a
          friend's page to send a request.
        </p>
      </div>

      <FriendApprovalsQueue me={user} />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-2.5">
            <SectionTitle icon={Inbox} label="Requests" count={incoming.length} />
            {incoming.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-white/60 px-4 py-8 text-center text-xs text-muted-foreground">
                No pending requests.
              </p>
            ) : (
              incoming.map((row) => {
                const person = otherParty(row, user);
                return (
                  <FriendRow
                    key={row.id}
                    name={person.name}
                    lab={person.lab}
                    userId={person.id}
                    note={row.note ? `“${row.note}”` : 'wants to connect'}
                    actions={
                      <>
                        <Button
                          size="sm"
                          className="h-8 rounded-full px-3 text-[11px]"
                          onClick={() => accept(row)}
                          disabled={busyId === row.id}
                        >
                          {busyId === row.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full px-3 text-[11px]"
                          onClick={() => decline(row)}
                          disabled={busyId === row.id}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    }
                  />
                );
              })
            )}

            <div className="pt-3">
              <SectionTitle icon={Send} label="Sent" count={outgoing.length} />
            </div>
            {outgoing.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-white/60 px-4 py-6 text-center text-xs text-muted-foreground">
                No requests waiting on a reply.
              </p>
            ) : (
              outgoing.map((row) => {
                const person = otherParty(row, user);
                return (
                  <FriendRow
                    key={row.id}
                    name={person.name}
                    lab={person.lab}
                    userId={person.id}
                    note="request sent"
                    actions={
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-full px-3 text-[11px]"
                        onClick={() => remove(row)}
                        disabled={busyId === row.id}
                      >
                        {busyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cancel'}
                      </Button>
                    }
                  />
                );
              })
            )}
          </section>

          <section className="space-y-2.5">
            <SectionTitle icon={Users2} label="Your friends" count={friends.length} />
            {friends.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-white/60 px-4 py-12 text-center">
                <p className="text-sm font-semibold">No friends yet</p>
                <p className="mx-auto mt-1 max-w-[16rem] text-xs text-muted-foreground">
                  Visit a profile from the leaderboard and send your first request.
                </p>
              </div>
            ) : (
              <div className={cn('space-y-2.5')}>
                {friends.map((row) => {
                  const person = otherParty(row, user);
                  return (
                    <FriendRow
                      key={row.id}
                      name={person.name}
                      lab={person.lab}
                      userId={person.id}
                      actions={
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-full px-3 text-[11px]"
                          onClick={() => remove(row)}
                          disabled={busyId === row.id}
                        >
                          {busyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Remove'}
                        </Button>
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}