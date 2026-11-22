import React, { useState } from 'react';
import { ImagePlus, Loader2, Send, X, AlertCircle } from 'lucide-react';
import { db } from '@/api/dataClient';
import { initials } from '@/lib/format';
import { Button } from '@/components/ui/button';
import VisibilityPicker from '@/components/feed/VisibilityPicker';
import { DEFAULT_VISIBILITY } from '@/lib/postVisibility';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function PostComposer({ user, onCreate }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const pickImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Checked before the upload starts, so a huge file never leaves the device.
    if (file.size > MAX_IMAGE_BYTES) {
      setError(
        `That image is ${(file.size / (1024 * 1024)).toFixed(1)} MB — the limit is 5 MB. Pick a smaller one.`
      );
      event.target.value = '';
      return;
    }
    setError('');
    setImage({ file, preview: URL.createObjectURL(file) });
  };

  const clearImage = () => {
    if (image?.preview) URL.revokeObjectURL(image.preview);
    setImage(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim() && !image) {
      setError('Write something or attach an image first.');
      return;
    }
    setPosting(true);
    setError('');
    try {
      let image_uri = '';
      if (image) {
        const { file_uri } = await db.integrations.Core.UploadPrivateFile({
          file: image.file,
        });
        image_uri = file_uri;
      }
      await onCreate({ content: content.trim(), image_uri, visibility });
      setContent('');
      clearImage();
      setVisibility(DEFAULT_VISIBILITY);
    } catch (err) {
      setError(err.message || 'Could not publish your post');
    }
    setPosting(false);
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-border/70 bg-white p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold uppercase text-background">
          {initials(user?.full_name || user?.email)}
        </span>
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setError('');
          }}
          rows={3}
          maxLength={1000}
          placeholder="Share a story, a rumour, or a small win…"
          className="min-h-[72px] w-full resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
        />
      </div>

      {image && (
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-border/70">
          <img src={image.preview} alt="Selected attachment" className="h-52 w-full object-cover" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute right-2 top-2 rounded-full bg-foreground/80 p-1.5 text-background transition-colors hover:bg-foreground"
            title="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-3">
        <VisibilityPicker value={visibility} onChange={setVisibility} disabled={posting} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ImagePlus className="h-3.5 w-3.5" /> Photo
          <input type="file" accept="image/*" className="hidden" onChange={pickImage} disabled={posting} />
        </label>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">{content.length}/1000</span>
          <Button type="submit" size="sm" className="rounded-full px-4" disabled={posting}>
            {posting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Post
          </Button>
        </div>
      </div>
    </form>
  );
}