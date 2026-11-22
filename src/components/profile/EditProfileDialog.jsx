import React, { useState } from 'react';
import { Pencil, Loader2, Camera, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { Image } from '@/components/ui/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const AUDIENCE_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'batch', label: 'My batch' },
  { value: 'friends', label: 'Friends' },
  { value: 'only_me', label: 'Only me' },
];

// Compact audience picker shown next to each privacy-controlled field. A
// native select, like the gender picker below, so the dialog adds no new
// ui-component usages.
function PrivacySelect({ id, value, onChange }) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      title="Who can see this on your profile"
      className="h-7 w-[7.25rem] shrink-0 rounded-md border border-input bg-white px-1.5 text-xs"
    >
      {AUDIENCE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const textInputClass =
  'flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export default function EditProfileDialog({ user, onSaved }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    headline: user?.headline || '',
    bio: user?.bio || '',
    website: user?.website || '',
    avatar_url: user?.avatar_url || '',
    cover_photo: user?.cover_photo || '',
    gender: user?.gender || '',
    current_institution: user?.current_institution || '',
    previous_institution: user?.previous_institution || '',
    marital_status: user?.marital_status || '',
    website_privacy: user?.website_privacy || 'batch',
    gender_privacy: user?.gender_privacy || 'batch',
    current_institution_privacy: user?.current_institution_privacy || 'batch',
    previous_institution_privacy: user?.previous_institution_privacy || 'batch',
    marital_status_privacy: user?.marital_status_privacy || 'only_me',
  });

  const change = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  // One shared upload path for both profile photos.
  const uploadPublic = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
    return file_url;
  };

  const pickAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const file_url = await uploadPublic(file);
      setForm((prev) => ({ ...prev, avatar_url: file_url }));
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  const pickCover = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError('');
    try {
      const file_url = await uploadPublic(file);
      setForm((prev) => ({ ...prev, cover_photo: file_url }));
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
    setUploadingCover(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    let website = form.website.trim();
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

    setSaving(true);
    setError('');
    try {
      const patch = {
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        website,
        avatar_url: form.avatar_url,
        cover_photo: form.cover_photo,
        current_institution: form.current_institution.trim(),
        previous_institution: form.previous_institution.trim(),
        website_privacy: form.website_privacy,
        gender_privacy: form.gender_privacy,
        current_institution_privacy: form.current_institution_privacy,
        previous_institution_privacy: form.previous_institution_privacy,
        marital_status_privacy: form.marital_status_privacy,
      };
      // full_name rides the same profile update as every other field; only a
      // non-empty name is sent, so the field can never be blanked by accident.
      if (form.full_name.trim()) patch.full_name = form.full_name.trim();
      // Gender and marital status are enums on the User entity — only send a
      // real value, never an empty string, so an unset value stays unset.
      if (form.gender === 'male' || form.gender === 'female') patch.gender = form.gender;
      if (form.marital_status === 'single' || form.marital_status === 'married') {
        patch.marital_status = form.marital_status;
      }
      // Profile fields live on the member's own profiles row; RLS and the
      // staff-field guard keep role/placement fields out of this update.
      const { error: saveError } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id);
      if (saveError) throw saveError;
      await onSaved();
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Could not save your profile');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Pencil className="mr-2 h-4 w-4" /> Edit profile
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit your profile</DialogTitle>
          <DialogDescription>This is what your batchmates see on your profile.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <div className="h-24 w-full overflow-hidden rounded-2xl bg-muted">
              {form.cover_photo ? (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${form.cover_photo})` }}
                  role="img"
                  aria-label="Cover photo"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] font-medium text-muted-foreground">
                  No cover photo
                </div>
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted">
              {uploadingCover ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {form.cover_photo ? 'Change cover' : 'Upload cover'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={pickCover}
                disabled={uploadingCover}
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-muted">
              {form.avatar_url ? (
                <Image
                  src={form.avatar_url}
                  alt="Profile photo"
                  fittingType="fill"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-muted-foreground">
                  No photo
                </div>
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {form.avatar_url ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" className="hidden" onChange={pickAvatar} disabled={uploading} />
            </label>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="full_name" className="text-sm font-medium leading-none">
              Full name
            </label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={change('full_name')}
              maxLength={80}
              placeholder="Your full name"
              className={textInputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={form.headline}
              onChange={change('headline')}
              maxLength={90}
              placeholder="Design student · WordPress tinkerer"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">About you</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={change('bio')}
              rows={4}
              maxLength={500}
              placeholder="What you're learning, what you like to build…"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="gender" className="text-sm font-medium leading-none">
                Gender
              </label>
              <PrivacySelect
                id="gender_privacy"
                value={form.gender_privacy}
                onChange={change('gender_privacy')}
              />
            </div>
            <select
              id="gender"
              value={form.gender}
              onChange={change('gender')}
              className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm"
            >
              <option value="">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Used only for the friend-request safeguard: some student requests are checked by a
              teacher first.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="website">Website or social link</Label>
              <PrivacySelect
                id="website_privacy"
                value={form.website_privacy}
                onChange={change('website_privacy')}
              />
            </div>
            <Input
              id="website"
              value={form.website}
              onChange={change('website')}
              placeholder="behance.net/yourname"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="current_institution" className="text-sm font-medium leading-none">
                Current institution
              </label>
              <PrivacySelect
                id="current_institution_privacy"
                value={form.current_institution_privacy}
                onChange={change('current_institution_privacy')}
              />
            </div>
            <input
              id="current_institution"
              value={form.current_institution}
              onChange={change('current_institution')}
              maxLength={120}
              placeholder="University, college or workplace"
              className={textInputClass}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="previous_institution" className="text-sm font-medium leading-none">
                Previous institution
              </label>
              <PrivacySelect
                id="previous_institution_privacy"
                value={form.previous_institution_privacy}
                onChange={change('previous_institution_privacy')}
              />
            </div>
            <input
              id="previous_institution"
              value={form.previous_institution}
              onChange={change('previous_institution')}
              maxLength={120}
              placeholder="Where you studied or worked before"
              className={textInputClass}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="marital_status" className="text-sm font-medium leading-none">
                Marital status
              </label>
              <PrivacySelect
                id="marital_status_privacy"
                value={form.marital_status_privacy}
                onChange={change('marital_status_privacy')}
              />
            </div>
            <select
              id="marital_status"
              value={form.marital_status}
              onChange={change('marital_status')}
              className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm"
            >
              <option value="">Not set</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Hidden from everyone but you unless you widen its audience above.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={saving || uploading || uploadingCover}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}