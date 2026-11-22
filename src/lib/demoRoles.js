// Demo role presets for the BYPASS_AUTH build (see supabaseClient.js).
// The switcher in the corner of the screen stores the chosen key in
// localStorage; AuthContext builds the demo user from the preset so every
// role-gated screen can be reviewed without real accounts. UI preview
// only — there is still no session, so the backend rejects data calls
// exactly as before, whatever role is picked here.

const STORAGE_KEY = 'labstore-demo-role';

// The seeded Freelancing batch, so batch-scoped screens light up for the
// staff and student presets instead of showing the no-batch state.
const DEMO_BATCH = '2adb6e55-b4a7-4d28-9186-7964f9ccf2f3';

const base = {
  id: 'demo-user',
  email: 'demo@labstore.local',
  role: 'user',
  is_admin: false,
  approval_status: 'approved',
  staff_role: 'member',
  is_lab_leader: false,
  batch: DEMO_BATCH,
  lab: 'A',
};

export const DEMO_ROLES = [
  {
    key: 'owner',
    label: 'Owner',
    user: { role: 'admin', is_admin: true, staff_role: 'owner', batch: null, lab: null },
  },
  { key: 'coordinator', label: 'Coordinator', user: { staff_role: 'coordinator', lab: null } },
  { key: 'teacher', label: 'Teacher', user: { staff_role: 'teacher' } },
  { key: 'cr', label: 'CR', user: { staff_role: 'cr' } },
  { key: 'acr', label: 'ACR', user: { staff_role: 'acr' } },
  { key: 'lab_leader', label: 'Lab Leader', user: { staff_role: 'member', is_lab_leader: true } },
  { key: 'student', label: 'Student', user: { staff_role: 'member' } },
  {
    key: 'pending',
    label: 'Pending student',
    user: { staff_role: 'member', approval_status: 'pending', batch: null, lab: null },
  },
];

export const getDemoRoleKey = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return DEMO_ROLES.some((role) => role.key === stored) ? stored : 'owner';
  } catch {
    return 'owner';
  }
};

export const setDemoRoleKey = (key) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Storage unavailable (private mode etc.) — the switcher just reloads
    // back to the owner preset.
  }
};

export const getDemoUser = () => {
  const preset = DEMO_ROLES.find((role) => role.key === getDemoRoleKey()) || DEMO_ROLES[0];
  return {
    ...base,
    ...preset.user,
    full_name: `Demo ${preset.label}`,
  };
};
