import React, { useState } from 'react';
import { Users } from 'lucide-react';
import LabBadge from '@/components/common/LabBadge';
import DirectoryFilters from '@/components/admin/DirectoryFilters';
import MemberRow from '@/components/admin/MemberRow';

export default function MemberDirectory({
  members,
  batch,
  isOwner,
  canRemove,
  canSetLeader,
  onChangeLab,
  onChangeRole,
  onToggleLeader,
  onRemove,
  busyId,
}) {
  const [query, setQuery] = useState('');
  const [labFilter, setLabFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const labs = batch?.labs || [];

  if (!batch) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-white/60 px-4 py-8 text-center text-xs text-muted-foreground">
        Pick a batch to see its members.
      </p>
    );
  }

  const term = query.trim().toLowerCase();
  const filtered = members.filter((member) => {
    if (term && !`${member.full_name || ''} ${member.email || ''}`.toLowerCase().includes(term)) {
      return false;
    }
    if (labFilter === 'none') {
      if (member.lab) return false;
    } else if (labFilter !== 'all' && member.lab !== labFilter) {
      return false;
    }
    if (roleFilter === 'staff' && (!member.staff_role || member.staff_role === 'member')) {
      return false;
    }
    if (roleFilter === 'leader' && !member.is_lab_leader) {
      return false;
    }
    return true;
  });

  const groups = labs.map((key) => ({
    key,
    people: filtered.filter((member) => member.lab === key),
  }));
  const unassigned = filtered.filter((member) => !member.lab);
  if (unassigned.length > 0) groups.push({ key: '', people: unassigned });

  return (
    <div className="space-y-3">
      <DirectoryFilters
        query={query}
        onQuery={setQuery}
        lab={labFilter}
        onLab={setLabFilter}
        role={roleFilter}
        onRole={setRoleFilter}
        labs={labs}
        total={members.length}
        shown={filtered.length}
      />

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-white/60 px-4 py-10 text-center">
          <Users className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-xs font-semibold">No member matches those filters</p>
          <p className="mx-auto mt-1 max-w-xs text-[11px] text-muted-foreground">
            Try another name, or clear the lab and role filters.
          </p>
        </div>
      )}

      {groups.map(({ key, people }) => {
        if (labFilter !== 'all' && (labFilter === 'none' ? key !== '' : labFilter !== key)) {
          return null;
        }
        return (
          <div key={key || 'none'} className="rounded-2xl border border-border/70 bg-white p-4">
            <div className="flex items-center justify-between">
              <LabBadge lab={key} />
              <span className="text-[11px] font-semibold text-muted-foreground">
                {people.length} member{people.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-2.5 space-y-1.5">
              {people.length === 0 ? (
                <p className="rounded-lg bg-muted/50 px-2.5 py-3 text-center text-[11px] text-muted-foreground">
                  Nobody here yet.
                </p>
              ) : (
                people.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    labs={labs}
                    isOwner={isOwner}
                    canRemove={canRemove}
                    canSetLeader={canSetLeader}
                    onChangeLab={onChangeLab}
                    onChangeRole={onChangeRole}
                    onToggleLeader={onToggleLeader}
                    onRemove={onRemove}
                    busyId={busyId}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}