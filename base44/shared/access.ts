// Single server-side source of truth for LabLink's permission model.
// Every backend function imports these helpers instead of re-deriving roles,
// so the RBAC matrix can never drift between endpoints.

export const MANAGER_ROLES = ['coordinator', 'teacher'];

export const isOwner = (user) => user?.role === 'admin';

// Only an owner or an explicitly approved member gets in. A missing status is
// pending, so a freshly registered account can never act until staff approve it.
export const isApproved = (user) =>
  !!user && (isOwner(user) || user.approval_status === 'approved');

export const roleKeyOf = (user) => (isOwner(user) ? 'owner' : user?.staff_role || 'member');

export const sameBatch = (user, batchId) =>
  !!batchId && !!user?.batch && user.batch === batchId;

// Owner sees every batch; everyone else only their own.
export const inBatchScope = (user, batchId) => isOwner(user) || sameBatch(user, batchId);

export const canManageBatch = (user) => isOwner(user) || MANAGER_ROLES.includes(user?.staff_role);

export const canCoordinate = (user) => isOwner(user) || user?.staff_role === 'coordinator';

// Owner, coordinator, teacher, the CR, and the ACR (own lab only).
export const canPublishAnnouncements = (user) =>
  canManageBatch(user) || ['cr', 'acr'].includes(user?.staff_role);

// Who a member's notice reaches: the ACR only writes to their own lab,
// everyone else with the capability writes to the whole batch.
export const announcementScope = (user) =>
  user?.staff_role === 'acr' ? 'lab' : 'batch';

export const canModerateContent = (user) => canManageBatch(user);

export const canCreateChatRooms = (user) => canPublishAnnouncements(user);

export const canApproveSignups = (user) => canCoordinate(user);

// Friend requests between students are held for staff approval first (always
// on, no toggle). Staff are exempt — the safeguard exists for students only,
// and CR, ACR or lab-leader flags do not exempt a student.
export const isFriendApprovalStaff = (user) =>
  isOwner(user) || ['owner', 'teacher', 'coordinator'].includes(user?.staff_role);

// Approval is needed only when both sides are students and their genders
// differ — or either gender is unknown, in which case a match cannot be
// proven, so the request is held.
export const friendApprovalNeeded = (requester, recipient) => {
  if (!requester || !recipient) return false;
  if (isFriendApprovalStaff(requester) || isFriendApprovalStaff(recipient)) return false;
  if (!requester.gender || !recipient.gender) return true;
  return requester.gender !== recipient.gender;
};

// Who decides a held request: the owner anywhere, the coordinator of the
// requester's batch, or a teacher of the requester's lab in that batch.
export const canDecideFriendApproval = (user, approval) => {
  if (!user || !approval) return false;
  if (isOwner(user)) return true;
  if (!sameBatch(user, approval.batch)) return false;
  if (user.staff_role === 'coordinator') return true;
  return user.staff_role === 'teacher' && !!user.lab && !!approval.lab && user.lab === approval.lab;
};

export const canChangeRoles = (user) => isOwner(user);

// Placing a member in a lab: owner anywhere, teacher/coordinator inside their
// own batch only. Lab leaders, CRs and ACRs cannot manage members.
export const canPlaceMembers = (user) => canManageBatch(user);

// Removing a member is stricter: only a coordinator for their own batch, or the
// owner as an explicit override.
export const canRemoveMembers = (user) => canCoordinate(user);

// Academic oversight of a work: owner anywhere, staff inside the work's batch,
// lab leader for their own lab.
export const canReviewWork = (user, work) => {
  if (!user || !work) return false;
  if (isOwner(user)) return true;
  if (!sameBatch(user, work.batch)) return false;
  if (canManageBatch(user)) return true;
  return !!user.is_lab_leader && !!user.lab && user.lab === work.lab;
};

export const canDeleteWork = (user, work) => {
  if (!user || !work) return false;
  if (work.created_by_id === user.id) return true;
  return canReviewWork(user, work);
};

// Mirrors the Post entity's read RLS in code. RLS cannot join, so PostComment
// reads stay batch-scoped; a backend endpoint that returns posts together with
// their comments should filter comments through this helper.
export const canReadPost = (user, post) => {
  if (!user || !post) return false;
  if (isOwner(user)) return true;
  if (post.created_by_id === user.id) return true;
  if (!isApproved(user)) return false;
  const visibility = post.visibility || 'batch';
  if (visibility === 'private') return false;
  if (visibility === 'academy') return true;
  if (!sameBatch(user, post.batch)) return false;
  if (visibility === 'batch') return true;
  return !!user.lab && user.lab === post.author_lab;
};

export const forbidden = () => Response.json({ error: 'Forbidden' }, { status: 403 });

export const pendingApproval = () =>
  Response.json({ error: 'Your account is waiting for approval.' }, { status: 403 });