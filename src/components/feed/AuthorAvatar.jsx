import React from 'react';
import { Image } from '@/components/ui/image';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

// One batched author lookup per page feeds this; initials are the fallback when
// the member has no profile photo.
export default function AuthorAvatar({ name, avatarUrl, className }) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground text-[11px] font-bold uppercase text-background',
        className
      )}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name || 'Member'} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}