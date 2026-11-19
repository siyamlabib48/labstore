import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Users, Lock, Link2, FileText } from 'lucide-react';
import LabBadge from '@/components/common/LabBadge';
import WorkTypeBadge from '@/components/common/WorkTypeBadge';
import PrivateImage from '@/components/common/PrivateImage';
import { workTypeOf } from '@/lib/workTypes';
import { timeAgo } from '@/lib/format';

const visibilityMeta = {
  all: { icon: Eye, label: 'All students' },
  lab: { icon: Users, label: 'My lab' },
  private: { icon: Lock, label: 'Only me' },
};

export default function WorkCard({ work }) {
  const meta = workTypeOf(work.work_type);
  const Icon = meta.icon;
  const vis = visibilityMeta[work.visibility] || visibilityMeta.all;
  const VisIcon = vis.icon;

  return (
    <Link
      to={`/work/${work.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/60">
        {work.cover_file_uri ? (
          <PrivateImage
            fileUri={work.cover_file_uri}
            alt={work.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40">
            <Icon className="h-9 w-9 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <LabBadge lab={work.lab} className="shadow-sm" />
        </div>
        <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-muted-foreground shadow-sm">
          <VisIcon className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
          {work.title}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="truncate text-xs text-muted-foreground">{work.creator_name || 'Student'}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground/80">{timeAgo(work.created_date)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <WorkTypeBadge type={work.work_type} />
          {work.link && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Link2 className="h-3 w-3" /> link
            </span>
          )}
          {!work.link && (work.attachments?.length > 0) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <FileText className="h-3 w-3" /> {work.attachments.length}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}