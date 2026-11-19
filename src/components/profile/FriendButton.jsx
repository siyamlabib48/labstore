import React, { useState } from 'react';
import { UserPlus, Clock, Loader2, ShieldCheck } from 'lucide-react';
import { useFriendship } from '@/hooks/useFriends';
import { Button } from '@/components/ui/button';

export default function FriendButton({ me, target }) {
  const { status, loading, busy, send, cancel, accept, decline } = useFriendship(me, target);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  if (!me?.id || me.id === target?.id) return null;
  if (loading) {
    return <div className="h-9 w-28 animate-pulse rounded-full bg-muted" />;
  }

  if (status === 'friends') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-[#047857]/10 px-3 py-1.5 text-xs font-semibold text-[#047857]">
          Friends
        </span>
        <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={cancel} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Remove'}
        </Button>
      </div>
    );
  }

  if (status === 'outgoing') {
    return (
      <Button variant="outline" className="rounded-full" onClick={cancel} disabled={busy} title="Cancel request">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
        Request sent
      </Button>
    );
  }

  if (status === 'approval') {
    return (
      <span
        className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700"
        title="A teacher or coordinator needs to approve this request before it is sent"
      >
        <ShieldCheck className="mr-2 h-4 w-4" />
        Awaiting teacher approval
      </span>
    );
  }

  if (status === 'incoming') {
    return (
      <div className="flex items-center gap-2">
        <Button className="rounded-full" onClick={accept} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Accept
        </Button>
        <Button variant="outline" className="rounded-full" onClick={decline} disabled={busy}>
          Decline
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button className="rounded-full" onClick={() => setOpen(true)} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
        Add friend
      </Button>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    await send(note);
    setNote('');
    setOpen(false);
  };

  return (
    <form
      onSubmit={submit}
      className="w-64 space-y-2 rounded-2xl border border-border/70 bg-white p-3 text-left shadow-sm"
    >
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Some requests between students are checked by a teacher or coordinator first. You can add
        a short note either way.
      </p>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        maxLength={300}
        placeholder="Say hi, or mention how you know them…"
        className="flex w-full rounded-md border border-input bg-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-8 items-center justify-center rounded-full px-3 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Send request
        </button>
      </div>
    </form>
  );
}
