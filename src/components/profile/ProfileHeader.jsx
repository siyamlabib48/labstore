import React from 'react';
import { Building2, CalendarDays, Globe, GraduationCap, Heart } from 'lucide-react';
import { Image } from '@/components/ui/image';
import LabBadge from '@/components/common/LabBadge';
import { staffRoleOf } from '@/lib/staffRoles';
import { initials } from '@/lib/format';
import { labOf } from '@/lib/labs';
import { cn } from '@/lib/utils';

export default function ProfileHeader({ profile, isMe, actions }) {
  const accent = labOf(profile.lab);
  const role = staffRoleOf(profile.staff_role);
  const joinedDate = profile.joined_date ? new Date(profile.joined_date) : null;
  const joinedLabel =
    joinedDate && !Number.isNaN(joinedDate.getTime())
      ? joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : '';
  const maritalLabel =
    profile.marital_status === 'married'
      ? 'Married'
      : profile.marital_status === 'single'
        ? 'Single'
        : '';
  // Privacy-hidden fields are absent from the profile payload entirely, so
  // each line below simply renders when its field arrived — no placeholders.
  const hasDetails =
    !!profile.current_institution || !!profile.previous_institution || !!maritalLabel || !!joinedLabel;

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-white">
      {profile.cover_photo ? (
        <div
          className="h-32 w-full bg-cover bg-center sm:h-44"
          style={{ backgroundImage: `url(${profile.cover_photo})` }}
          role="img"
          aria-label="Cover photo"
        />
      ) : (
        <div className={cn('h-1.5 w-full', accent.dot)} />
      )}

      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-foreground text-background">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || 'Member'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-bold uppercase">
                {initials(profile.full_name)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {profile.full_name || 'Member'}
              </h1>
              {isMe && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  You
                </span>
              )}
            </div>

            {profile.headline && (
              <p className="mt-1 text-sm font-medium text-foreground/80">{profile.headline}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {profile.lab && <LabBadge lab={profile.lab} />}
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', role.chip)}>
                {role.label}
              </span>
              {profile.batch_name && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {profile.batch_name}
                </span>
              )}
            </div>
          </div>

          {actions && <div className="shrink-0">{actions}</div>}
        </div>

        {profile.bio && (
          <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-foreground/75">
            {profile.bio}
          </p>
        )}

        {hasDetails && (
          <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            {profile.current_institution && (
              <p className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                {profile.current_institution}
              </p>
            )}
            {profile.previous_institution && (
              <p className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                Previously at {profile.previous_institution}
              </p>
            )}
            {maritalLabel && (
              <p className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 shrink-0" />
                {maritalLabel}
              </p>
            )}
            {joinedLabel && (
              <p className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                Joined {joinedLabel}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="font-semibold">{profile.works_count || 0} public works</span>
          <span className="text-muted-foreground">{profile.friends_count || 0} friends</span>
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
            >
              <Globe className="h-3.5 w-3.5" /> Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}