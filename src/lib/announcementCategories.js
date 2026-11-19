// Announcement categories, shared by the composer (select options) and the
// card (chip). The category also drives which notification type members get
// — see the notify function's announcement action.
export const ANNOUNCEMENT_CATEGORIES = [
  { key: 'general', label: 'General', chip: 'bg-muted text-muted-foreground' },
  { key: 'homework', label: 'Homework', chip: 'bg-[#2563EB]/10 text-[#1D4ED8]' },
  { key: 'holiday', label: 'Holiday', chip: 'bg-[#16A34A]/10 text-[#15803D]' },
  { key: 'batch_update', label: 'Batch update', chip: 'bg-[#7C3AED]/10 text-[#6D28D9]' },
];

export const announcementCategoryOf = (key) =>
  ANNOUNCEMENT_CATEGORIES.find((category) => category.key === key) || ANNOUNCEMENT_CATEGORIES[0];
