export const STAFF_ROLES = {
  owner: { key: 'owner', label: 'Owner', short: 'Owner', chip: 'bg-[#312E81]/10 text-[#312E81]' },
  coordinator: {
    key: 'coordinator',
    label: 'Batch Coordinator',
    short: 'Coordinator',
    chip: 'bg-[#1D4ED8]/10 text-[#1D4ED8]',
  },
  teacher: { key: 'teacher', label: 'Teacher', short: 'Teacher', chip: 'bg-[#047857]/10 text-[#047857]' },
  cr: {
    key: 'cr',
    label: 'Class Representative',
    short: 'CR',
    chip: 'bg-[#B45309]/10 text-[#B45309]',
  },
  acr: {
    key: 'acr',
    label: 'Assistant CR',
    short: 'ACR',
    chip: 'bg-[#BE185D]/10 text-[#BE185D]',
  },
  lab_leader: {
    key: 'lab_leader',
    label: 'Lab Leader',
    short: 'Lab Leader',
    chip: 'bg-[#B45309]/10 text-[#B45309]',
  },
  member: { key: 'member', label: 'Student', short: 'Student', chip: 'bg-muted text-muted-foreground' },
};

// These are the staff_role values the owner can set. Lab Leader is a flag on the
// member (set per lab), so it is read through roleKeyOf, not written here.
export const ASSIGNABLE_ROLES = ['coordinator', 'teacher', 'cr', 'acr', 'member'];

export const staffRoleOf = (key) => STAFF_ROLES[key] || STAFF_ROLES.member;

export const isOwner = (user) => user?.role === 'admin';

export const isLabLeader = (user) => !!user?.is_lab_leader;

// The single effective role of a member, used for display and capability checks.
// A lab leader is a first-class role everywhere the app shows or filters roles.
export const roleKeyOf = (user) => {
  if (isOwner(user)) return 'owner';
  const staffRole = user?.staff_role || 'member';
  if (staffRole === 'member' && isLabLeader(user)) return 'lab_leader';
  return staffRole;
};

export const roleOf = (user) => staffRoleOf(roleKeyOf(user));

export const isStaffManager = (user) =>
  !isOwner(user) && ['coordinator', 'teacher'].includes(user?.staff_role);

export const canManageBatch = (user) => isOwner(user) || isStaffManager(user);

// Removal: a coordinator inside their own batch, or the owner as an override.
export const canRemoveMembers = (user) =>
  isOwner(user) || user?.staff_role === 'coordinator';

// The owner removing a member is an override and is confirmed as such.
export const removeNeedsOverride = (user) => isOwner(user);

// Only the owner and batch coordinators may appoint a lab leader.
export const canSetLabLeader = (user) =>
  isOwner(user) || user?.staff_role === 'coordinator';

// Only the owner may change another member's staff role.
export const canChangeRoles = (user) => isOwner(user);

// Staff, the CR, and the ACR (own lab only) may publish notices.
export const canPostAnnouncements = (user) =>
  canManageBatch(user) || ['cr', 'acr'].includes(user?.staff_role);

// Who a posted notice reaches.
export const announcementScopeOf = (user) =>
  user?.staff_role === 'acr' ? 'lab' : 'batch';

// A notice can be removed by its author, or by the staff who run that batch.
export const canDeleteAnnouncement = (user, item) => {
  if (!user || !item) return false;
  if (isOwner(user)) return true;
  if (item.created_by_id === user.id) return true;
  return isStaffManager(user) && (!item.batch || item.batch === user.batch);
};

// Approving a sign-up is an owner or coordination decision.
export const canApproveSignups = (user) => isOwner(user) || user?.staff_role === 'coordinator';

// Reviewing a work follows the same rules the Work entity enforces: owner/staff
// inside the work's batch, or the lab leader of that lab.
export const canReviewWork = (user, work) => {
  if (!user || !work) return false;
  if (isOwner(user)) return true;
  if (!work.batch || user.batch !== work.batch) return false;
  if (isStaffManager(user)) return true;
  return !!user.is_lab_leader && !!user.lab && user.lab === work.lab;
};

// Progress tracking is a staff + lab-leader capability.
export const canTrackProgress = (user) => canManageBatch(user) || !!user?.is_lab_leader;

// Member emails are only exposed to the people managing that batch.
export const canViewMemberEmails = (user) => canTrackProgress(user);

// Content moderation (removing posts and replies) inside the member's own batch.
export const canModerateContent = (user) => canManageBatch(user);

// Chat rooms exist for the batch; CRs may open lab rooms for their batch.
export const canCreateChatRooms = (user) => canPostAnnouncements(user);

// An account only reaches the app once an owner or coordinator approves it.
// A missing status counts as pending — never as approved.
export const isApproved = (user) =>
  !!user && (isOwner(user) || user.approval_status === 'approved');

// Submitting work requires an approved account placed in a batch.
export const canSubmitWork = (user) => isApproved(user) && !!user?.batch;