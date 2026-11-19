export const LAB_KEYS = ['A', 'B', 'C', 'Ai'];

export const LABS = {
  A: {
    key: 'A',
    label: 'Lab A',
    hex: '#6366F1',
    chip: 'bg-[#6366F1]/10 text-[#4338CA]',
    dot: 'bg-[#6366F1]',
    solid: 'bg-[#6366F1]',
    border: 'border-[#6366F1]',
    bar: 'bg-[#6366F1]',
  },
  B: {
    key: 'B',
    label: 'Lab B',
    hex: '#0D9488',
    chip: 'bg-[#0D9488]/10 text-[#0F766E]',
    dot: 'bg-[#0D9488]',
    solid: 'bg-[#0D9488]',
    border: 'border-[#0D9488]',
    bar: 'bg-[#0D9488]',
  },
  C: {
    key: 'C',
    label: 'Lab C',
    hex: '#E1861B',
    chip: 'bg-[#E1861B]/10 text-[#B45309]',
    dot: 'bg-[#E1861B]',
    solid: 'bg-[#E1861B]',
    border: 'border-[#E1861B]',
    bar: 'bg-[#E1861B]',
  },
  Ai: {
    key: 'Ai',
    label: 'Lab Ai',
    hex: '#DB2777',
    chip: 'bg-[#DB2777]/10 text-[#BE185D]',
    dot: 'bg-[#DB2777]',
    solid: 'bg-[#DB2777]',
    border: 'border-[#DB2777]',
    bar: 'bg-[#DB2777]',
  },
};

export const NEUTRAL_LAB = {
  key: null,
  label: 'No lab',
  hex: '#94A3B8',
  chip: 'bg-slate-100 text-slate-600',
  dot: 'bg-slate-400',
  solid: 'bg-slate-400',
  border: 'border-slate-300',
  bar: 'bg-slate-400',
};

export const labOf = (key) => LABS[key] || NEUTRAL_LAB;