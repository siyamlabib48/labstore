import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X, Loader2, Eye, Users, Lock, AlertCircle } from 'lucide-react';
import { db } from '@/api/dataClient';
import { useAuth } from '@/lib/AuthContext';
import useMyWorks from '@/hooks/useMyWorks';
import { WORK_TYPES } from '@/lib/workTypes';
import { LABS } from '@/lib/labs';
import { useBatch } from '@/lib/BatchContext';
import { batchLabs } from '@/lib/batches';
import { formatBytes, QUOTA_BYTES } from '@/lib/format';
import { uploadPrivateFile } from '@/lib/privateFiles';
import { notifyWorksChanged } from '@/hooks/useMyWorks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import QuotaMeter from '@/components/account/QuotaMeter';
import { cn } from '@/lib/utils';

// The server counts the cover and the attachments together (manageWork
// MAX_FILES) — the form enforces the same combined cap before uploading.
const MAX_FILES = 10;

const VISIBILITY = [
  { key: 'all', label: 'All students', hint: 'Anyone in every lab can see it', icon: Eye },
  { key: 'lab', label: 'My lab only', hint: 'Only students in your lab', icon: Users },
  { key: 'private', label: 'Only me', hint: 'Just your personal archive', icon: Lock },
];

export default function UploadWork() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { usedBytes } = useMyWorks(user?.id);
  const { activeBatch } = useBatch();
  const labKeys = batchLabs(activeBatch);

  const [type, setType] = useState('social_post');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [lab, setLab] = useState(
    user?.lab && labKeys.includes(user.lab) ? user.lab : labKeys[0] || 'A'
  );
  const [coverFile, setCoverFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const coverInput = useRef(null);
  const filesInput = useRef(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (labKeys.length && !labKeys.includes(lab)) setLab(labKeys[0]);
  }, [activeBatch?.id]);

  const coverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile]
  );

  const totalSize = (coverFile?.size || 0) + files.reduce((sum, file) => sum + file.size, 0);
  const remaining = QUOTA_BYTES - usedBytes;
  const fileCount = (coverFile ? 1 : 0) + files.length;

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!activeBatch) {
      setError('You need a batch before uploading. Ask your coordinator to place you in one.');
      return;
    }
    if (!title.trim()) {
      setError('Give your work a title.');
      return;
    }
    if (fileCount > MAX_FILES) {
      setError(`Attach up to ${MAX_FILES} files per work, including the cover.`);
      return;
    }
    if (totalSize > remaining) {
      setError(
        `This upload is ${formatBytes(totalSize)} but you only have ${formatBytes(
          Math.max(remaining, 0)
        )} free. Delete a work or upload a smaller file.`
      );
      return;
    }

    setSaving(true);
    try {
      const coverUri = coverFile ? await uploadPrivateFile(coverFile) : '';
      const attachments = await Promise.all(
        files.map(async (file) => ({
          file_uri: await uploadPrivateFile(file),
          name: file.name,
          size_bytes: file.size,
        }))
      );

      // The server measures the stored bytes, checks the 500 MB quota and pins
      // the record to this member's batch and lab before it is saved.
      const res = await db.functions.invoke('manageWork', {
        action: 'create',
        title: title.trim(),
        description: description.trim(),
        work_type: type,
        batch_id: activeBatch.id,
        lab,
        link: link.trim(),
        cover_file_uri: coverUri,
        attachments: attachments.map((file) => ({
          file_uri: file.file_uri,
          name: file.name,
          size_bytes: file.size_bytes,
        })),
        visibility,
      });

      const created = res.data?.work;
      if (!created?.id) throw new Error('Upload failed. Please try again.');

      notifyWorksChanged();
      navigate(`/work/${created.id}`);
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || 'Upload failed. Please try again.'
      );
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          New submission
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          Upload a work
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Shared with all students by default — change it any time.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <section className="rounded-2xl border border-border/70 bg-white p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              1 · Type of work
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {WORK_TYPES.map((item) => {
                const Icon = item.icon;
                const active = type === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setType(item.key)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
                      active
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border/80 bg-white text-foreground hover:border-foreground/25'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-semibold leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {WORK_TYPES.find((item) => item.key === type)?.hint}
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-border/70 bg-white p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              2 · Details
            </h2>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title — e.g. Ramadan campaign post"
              maxLength={120}
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you make? Tools used, brief, anything worth knowing."
              rows={4}
            />
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link to the post or live site (optional)"
            />
          </section>

          <section className="space-y-3 rounded-2xl border border-border/70 bg-white p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              3 · Files
            </h2>

            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const next = e.target.files?.[0] || null;
                // A cover on top of a full attachment list would push the
                // combined count past the server's cap — refuse it here.
                if (next && !coverFile && files.length >= MAX_FILES) {
                  setError(`Attach up to ${MAX_FILES} files per work, including the cover. Remove a file first.`);
                  e.target.value = '';
                  return;
                }
                setCoverFile(next);
              }}
            />
            <input
              ref={filesInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files || []);
                const room = MAX_FILES - (coverFile ? 1 : 0);
                if (picked.length > room) {
                  setError(`Attach up to ${MAX_FILES} files per work, including the cover.`);
                }
                setFiles(picked.slice(0, Math.max(room, 0)));
              }}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover preview" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[11px] font-semibold">Cover / screenshot</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => filesInput.current?.click()}
                className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/40 px-3 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-[11px] font-semibold">Attach files</span>
                <span className="text-[10px]">docx, xlsx, .ai, any file</span>
              </button>
            </div>

            {(coverFile || files.length > 0) && (
              <div className="space-y-1.5 pt-1">
                {coverFile && (
                  <FileLine name={coverFile.name} size={coverFile.size} onRemove={() => setCoverFile(null)} />
                )}
                {files.map((file, index) => (
                  <FileLine
                    key={`${file.name}-${index}`}
                    name={file.name}
                    size={file.size}
                    onRemove={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                  />
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Up to {MAX_FILES} files per work, including the cover. Files are stored
              privately — only people your visibility allows can open them.
            </p>
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-8">
          <section className="rounded-2xl border border-border/70 bg-white p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              4 · Who can see it
            </h2>
            <div className="mt-3 space-y-2">
              {VISIBILITY.map((option) => {
                const Icon = option.icon;
                const active = visibility === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setVisibility(option.key)}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-all',
                      active
                        ? 'border-foreground bg-muted/60'
                        : 'border-border/80 bg-white hover:border-foreground/20'
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="block text-xs font-semibold">{option.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {(isAdmin || !user?.lab) && labKeys.length > 1 && (
              <div className="mt-4 border-t border-border/70 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Lab
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {labKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLab(key)}
                      className={cn(
                        'rounded-full px-3 py-1 text-[11px] font-semibold transition-all',
                        lab === key ? `${LABS[key].solid} text-white` : LABS[key].chip
                      )}
                    >
                      {LABS[key].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border/70 bg-white p-5">
            <QuotaMeter usedBytes={usedBytes} compact />
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">This upload</span>
              <span className="font-semibold text-foreground">{formatBytes(totalSize)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Free after</span>
              <span
                className={cn(
                  'font-semibold',
                  totalSize > remaining ? 'text-[#BE185D]' : 'text-foreground'
                )}
              >
                {formatBytes(Math.max(remaining - totalSize, 0))}
              </span>
            </div>
          </section>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-[#DB2777]/30 bg-[#DB2777]/5 p-3 text-xs text-[#BE185D]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full rounded-full" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? 'Uploading…' : 'Publish work'}
          </Button>
        </div>
      </div>
    </form>
  );
}

function FileLine({ name, size, onRemove }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5">
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">{name}</span>
      <span className="text-[10px] text-muted-foreground">{formatBytes(size)}</span>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-[#BE185D]">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}