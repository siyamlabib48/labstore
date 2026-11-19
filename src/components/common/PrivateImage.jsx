import React, { useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';
import { getSignedUrl } from '@/lib/privateFiles';
import { cn } from '@/lib/utils';

export default function PrivateImage({ fileUri, alt = '', className, fittingType = 'fill' }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    getSignedUrl(fileUri).then((signed) => {
      if (alive) setUrl(signed);
    });
    return () => {
      alive = false;
    };
  }, [fileUri]);

  if (!url) {
    return <div className={cn('animate-pulse bg-muted', className)} aria-label={alt} />;
  }

  return <Image src={url} alt={alt} className={className} fittingType={fittingType} />;
}