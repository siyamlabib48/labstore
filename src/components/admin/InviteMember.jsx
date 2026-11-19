import React, { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { LABS } from '@/lib/labs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function InviteMember({ batch, onInvite, busy }) {
  const [email, setEmail] = useState('');
  const [lab, setLab] = useState('');

  const effectiveLab = lab || (batch?.labs || [])[0] || '';

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !batch) return;
    await onInvite({ email: email.trim(), lab: effectiveLab });
    setEmail('');
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-dashed border-border bg-white/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Add a member to {batch?.name || 'this batch'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="student@email.com"
          className="h-9 min-w-[200px] flex-1"
        />
        <select
          value={effectiveLab}
          onChange={(event) => setLab(event.target.value)}
          className="h-9 rounded-md border border-input bg-white px-2 text-sm"
        >
          {(batch?.labs || []).map((key) => (
            <option key={key} value={key}>
              {LABS[key]?.label || key}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" className="h-9 rounded-full px-4" disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
          Add
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        An invite email is sent. If they already signed up, their account moves into this batch right away.
        Someone brand new appears under “Waiting for a batch” once they sign up — place them in a batch and lab there.
      </p>
    </form>
  );
}