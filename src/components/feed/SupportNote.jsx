import React, { useState } from 'react';
import { HandHeart, X } from 'lucide-react';

// A quiet, dismissible reminder at the top of the wall: this is a peer
// community that listens — and it is not a substitute for professional help.
export default function SupportNote() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="relative rounded-3xl border border-border/70 bg-muted/40 px-4 py-3.5 pr-10">
      <p className="flex items-start gap-2 text-xs leading-relaxed text-foreground/80">
        <HandHeart className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]" />
        <span>
          Sharing something difficult? You are among classmates here — this wall is a place to be
          heard and supported, never judged. Golpo-Gujob is a peer community, not professional or
          medical help, so if you are struggling, please reach out to a trusted person or a
          qualified professional as well.
        </span>
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        title="Dismiss"
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
