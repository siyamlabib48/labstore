export const VISIBILITY_OPTIONS = [
  { key: 'academy', emoji: '🌐', label: 'Academy', hint: 'Anyone in the academy' },
  { key: 'batch', emoji: '👥', label: 'My Batch', hint: 'Everyone in my batch' },
  { key: 'lab', emoji: '🔬', label: 'My Lab', hint: 'My lab only' },
  { key: 'private', emoji: '🔒', label: 'Only Me', hint: 'Just me' },
];

export const DEFAULT_VISIBILITY = 'batch';

export const visibilityOf = (key) =>
  VISIBILITY_OPTIONS.find((option) => option.key === key) ||
  VISIBILITY_OPTIONS.find((option) => option.key === DEFAULT_VISIBILITY);