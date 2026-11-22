import React from 'react';
import { BYPASS_AUTH } from '@/api/supabaseClient';
import { DEMO_ROLES, getDemoRoleKey, setDemoRoleKey } from '@/lib/demoRoles';

// Floating role picker shown only in the demo (VITE_BYPASS_AUTH) build, so
// each role's view of the app can be checked without real accounts. Picking
// a role stores the preset and reloads — AuthContext then signs the demo
// user in with that role. Never rendered in a normal build.
export default function DemoRoleSwitcher() {
  if (!BYPASS_AUTH) return null;

  const current = getDemoRoleKey();

  const onChange = (event) => {
    setDemoRoleKey(event.target.value);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-xl">
      <label
        htmlFor="demo-role-select"
        className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400"
      >
        Demo role
      </label>
      <select
        id="demo-role-select"
        value={current}
        onChange={onChange}
        className="mt-1 w-40 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white"
      >
        {DEMO_ROLES.map((role) => (
          <option key={role.key} value={role.key}>
            {role.label}
          </option>
        ))}
      </select>
    </div>
  );
}
