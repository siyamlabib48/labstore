export const PROGRESS_STATUS = {
  not_started: {
    key: 'not_started',
    label: 'Not started',
    chip: 'bg-muted text-muted-foreground',
    bar: 'bg-slate-400',
  },
  in_progress: {
    key: 'in_progress',
    label: 'In progress',
    chip: 'bg-[#FEF3C7] text-[#B45309]',
    bar: 'bg-[#E1861B]',
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    chip: 'bg-[#DCFCE7] text-[#15803D]',
    bar: 'bg-[#15803D]',
  },
};

export const PROGRESS_ORDER = ['not_started', 'in_progress', 'completed'];

export const progressStatusOf = (key) => PROGRESS_STATUS[key] || PROGRESS_STATUS.not_started;

export const percentOf = (rows) => {
  if (!rows || rows.length === 0) return 0;
  const done = rows.filter((row) => row.status === 'completed').length;
  return Math.round((done / rows.length) * 100);
};