export const BATCH_STATUS = {
  active: { label: 'Active', chip: 'bg-[#047857]/10 text-[#047857]' },
  upcoming: { label: 'Upcoming', chip: 'bg-[#1D4ED8]/10 text-[#1D4ED8]' },
  archived: { label: 'Archived', chip: 'bg-muted text-muted-foreground' },
};

export const batchStatusOf = (key) => BATCH_STATUS[key] || BATCH_STATUS.active;

export const batchLabs = (batch) => (batch?.labs?.length ? batch.labs : ['A']);

export const shortBatchName = (batch) => {
  if (!batch?.name) return 'No batch';
  const parts = batch.name.split('—');
  return (parts[1] || parts[0]).trim();
};