import React, { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommentVoteButtons({ vote, onVote }) {
  const [busy, setBusy] = useState(false);
  const score = vote?.score || 0;
  const mine = vote?.mine || 0;

  const cast = async (value) => {
    if (busy) return;
    setBusy(true);
    try {
      await onVote(value);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => cast(1)}
        title="Upvote"
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
          mine === 1 ? 'text-[#B45309]' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <ArrowUp className="h-3 w-3" />
      </button>
      <span
        className={cn(
          'min-w-[0.85rem] text-center text-[10px] font-bold tabular-nums',
          score > 0 && 'text-[#B45309]',
          score < 0 && 'text-[#4338CA]',
          score === 0 && 'text-muted-foreground'
        )}
      >
        {score}
      </span>
      <button
        type="button"
        onClick={() => cast(-1)}
        title="Downvote"
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
          mine === -1 ? 'text-[#4338CA]' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <ArrowDown className="h-3 w-3" />
      </button>
    </span>
  );
}