import { ThumbsUp, Heart, HandHeart } from 'lucide-react';

// Emoji-free icon set so the three reactions match the rest of the UI; the
// labels are what members read.
export const REACTIONS = [
  {
    key: 'like',
    label: 'Like',
    Icon: ThumbsUp,
    activeChip: 'bg-[#DBEAFE] text-[#1D4ED8]',
  },
  {
    key: 'love',
    label: 'Love',
    Icon: Heart,
    activeChip: 'bg-[#FCE7F3] text-[#BE185D]',
  },
  {
    key: 'care',
    label: 'Care',
    Icon: HandHeart,
    activeChip: 'bg-[#FEF3C7] text-[#B45309]',
  },
];

export const REACTION_KEYS = REACTIONS.map((reaction) => reaction.key);

export function emptyReactions() {
  return { counts: { like: 0, love: 0, care: 0 }, total: 0, mine: '', rowId: null };
}