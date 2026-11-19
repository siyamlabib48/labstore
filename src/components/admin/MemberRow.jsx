import React from 'react';
import { Crown, X, Loader2 } from 'lucide-react';
import { ASSIGNABLE_ROLES, roleOf, staffRoleOf } from '@/lib/staffRoles';
import { labOf } from '@/lib/labs';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function MemberRow({
  member,
  labs,
  isOwner,
  canRemove,
  canSetLeader,
  onChangeLab,
  onChangeRole,
  onToggleLeader,
  onRemove,
  busyId,
}) {
  // A lab leader reads as its own role, not as a plain student.
  const role = roleOf(member);
  const isBusy = busyId === member.id;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/40">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold uppercase text-background">
        {initials(member.full_name || member.email)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">
          {member.full_name || member.email}
          {member.is_lab_leader && (
            <span className="ml-1.5 rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[9px] font-bold text-[#B45309]">
              Lab leader
            </span>
          )}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">{member.email}</p>
      </div>

      {isOwner ? (
        <select
          value={member.staff_role || 'member'}
          onChange={(event) => onChangeRole(member, event.target.value)}
          className={cn('h-7 rounded-md border border-border px-1.5 text-[10px] font-semibold', role.chip)}
        >
          {ASSIGNABLE_ROLES.map((key) => (
            <option key={key} value={key}>
              {staffRoleOf(key).short}
            </option>
          ))}
        </select>
      ) : (
        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', role.chip)}>
          {role.short}
        </span>
      )}

      <select
        value={member.lab || ''}
        onChange={(event) => onChangeLab(member, event.target.value)}
        className="h-7 rounded-md border border-border bg-white px-1.5 text-[10px] font-medium"
      >
        {labs.map((key) => (
          <option key={key} value={key}>
            {labOf(key).label}
          </option>
        ))}
      </select>

      {canSetLeader && (
        <button
          type="button"
          onClick={() => onToggleLeader(member)}
          disabled={isBusy}
          title={member.is_lab_leader ? 'Remove lab leader' : 'Make lab leader'}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            member.is_lab_leader
              ? 'bg-[#FEF3C7] text-[#B45309]'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Crown className="h-3.5 w-3.5" />
        </button>
      )}

      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(member)}
          disabled={isBusy}
          title="Remove from batch"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-[#DB2777]/10 hover:text-[#BE185D]"
        >
          {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}