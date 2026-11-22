import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Eye, Users, Lock, Trash2, HardDrive, Check } from 'lucide-react';
import { db } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import { notifyWorksChanged } from '@/hooks/useMyWorks';
import PrivateImage from '@/components/common/PrivateImage';
import LabBadge from '@/components/common/LabBadge';
import WorkTypeBadge from '@/components/common/WorkTypeBadge';
import AttachmentRow from '@/components/work/AttachmentRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatBytes, timeAgo } from '@/lib/format';
import { workTypeOf } from '@/lib/workTypes';
import { canReviewWork } from '@/lib/staffRoles';

const visibilityMeta = {
  all: { icon: Eye, label: 'All students' },
  lab: { icon: Users, label: 'My lab only' },
  private: { icon: Lock, label: 'Only me' },
};

export default function WorkDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [score, setScore] = useState('');
  const [note, setNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setMissing(false);
    db.entities.Work.get(id)
      .then((record) => {
        if (!alive) return;
        setWork(record);
        setScore(record.leader_score ?? '');
        setNote(record.leader_note || '');
      })
      .catch(() => {
        if (alive) setMissing(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="aspect-video animate-pulse rounded-3xl bg-muted" />
          <div className="h-64 animate-pulse rounded-3xl bg-muted" />
        </div>
      </div>
    );
  }

  if (missing || !work) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-white/60 px-6 py-20 text-center">
        <h2 className="font-heading text-xl font-bold tracking-tight">This work isn't available</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          It may be private, deleted, or shared with another lab.
        </p>
        <Button asChild className="mt-5 rounded-full">
          <Link to="/">Back to gallery</Link>
        </Button>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isOwner = work.created_by_id === user?.id;
  const canManage = isAdmin || isOwner;
  const canReview = canReviewWork(user, work);
  const vis = visibilityMeta[work.visibility] || visibilityMeta.all;
  const VisIcon = vis.icon;
  const typeMeta = workTypeOf(work.work_type);
  const linkHref = work.link
    ? /^https?:\/\//i.test(work.link)
      ? work.link
      : `https://${work.link}`
    : null;

  const remove = async () => {
    if (!window.confirm('Delete this work? Its files are removed and your storage frees up.')) return;
    // Deletion goes through the managed path so quota and permissions are
    // re-checked on the server.
    await db.functions.invoke('manageWork', { action: 'delete', work_id: work.id });
    notifyWorksChanged();
    navigate(isOwner ? '/gallery?view=mine' : '/');
  };

  const saveReview = async () => {
    setSavingReview(true);
    setReviewSaved(false);
    await db.entities.Work.update(work.id, {
      leader_score: score === '' ? null : Number(score),
      leader_note: note.trim(),
    });
    setSavingReview(false);
    setReviewSaved(true);
  };

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Gallery
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-white">
            {work.cover_file_uri ? (
              <PrivateImage
                fileUri={work.cover_file_uri}
                alt={work.title}
                className="h-full w-full object-cover"
                fittingType="fit"
              />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-muted to-muted/40">
                <typeMeta.icon className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {work.description && (
            <div className="rounded-2xl border border-border/70 bg-white p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                About this work
              </h3>
              <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {work.description}
              </p>
            </div>
          )}

          {work.attachments?.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Files
              </h3>
              {work.attachments.map((attachment, i) => (
                <AttachmentRow key={`${attachment.file_uri}-${i}`} attachment={attachment} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-8">
          <div className="rounded-2xl border border-border/70 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <LabBadge lab={work.lab} />
              <WorkTypeBadge type={work.work_type} />
            </div>
            <h1 className="mt-3 font-heading text-2xl font-bold leading-tight tracking-tight">
              {work.title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              by {work.creator_name || 'Student'} · {timeAgo(work.created_date)}
            </p>

            <dl className="mt-4 space-y-2.5 border-t border-border/70 pt-4 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <VisIcon className="h-3.5 w-3.5" /> Visible to
                </dt>
                <dd className="font-semibold text-foreground">{vis.label}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <HardDrive className="h-3.5 w-3.5" /> Storage
                </dt>
                <dd className="font-semibold text-foreground">{formatBytes(work.file_size_bytes)}</dd>
              </div>
            </dl>

            {linkHref && (
              <a
                href={linkHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Open link <ExternalLink className="h-4 w-4" />
              </a>
            )}

            {canManage && (
              <Button variant="outline" className="mt-2 w-full text-[#BE185D]" onClick={remove}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete work
              </Button>
            )}
          </div>

          {canReview && (
            <div className="rounded-2xl border border-border/70 bg-white p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Leader review
              </h3>
              <div className="mt-3 flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="Score / 10"
                  className="w-28"
                />
                <span className="text-xs text-muted-foreground">out of 10</span>
              </div>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Short feedback for this student…"
                className="mt-2.5"
              />
              <Button className="mt-2.5 w-full" onClick={saveReview} disabled={savingReview}>
                {reviewSaved ? <Check className="mr-2 h-4 w-4" /> : null}
                {savingReview ? 'Saving…' : reviewSaved ? 'Saved' : 'Save review'}
              </Button>
            </div>
          )}

          {!canReview && work.leader_score != null && (
            <div className="rounded-2xl border border-border/70 bg-white p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Leader score
              </h3>
              <p className="mt-2 font-heading text-3xl font-bold tracking-tight">
                {work.leader_score}
                <span className="text-base font-medium text-muted-foreground"> / 10</span>
              </p>
              {work.leader_note && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{work.leader_note}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}