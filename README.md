# Labstore

Labstore is the shared project cloud for the academy's labs — members upload
their work, share it with their lab, their batch or the whole academy, chat,
and climb the leaderboard. The academy is organised as batches, each batch
has labs, and staff (coordinators, teachers, CRs, ACRs and lab leaders)
manage members, announcements and approvals.

## Stack

- **Frontend:** React 18 + Vite, Tailwind CSS, shadcn/Radix UI, React
  Router, React Query.
- **Backend:** Supabase — Postgres with row-level security for data, Supabase
  Auth (email + Google, TOTP MFA) for accounts, Storage for files, Realtime
  for chat, and Edge Functions (Deno) in `supabase/functions/` for the
  privileged operations (member management, friend approvals, work quotas,
  notifications, leaderboard, profiles, batch seeding).

## Run locally

```bash
npm install
npm run dev
```

The frontend talks to the hosted Supabase project directly, so no local
backend is needed. Configuration lives in `.env.local` (never committed):

- `VITE_SUPABASE_URL` — the Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — the project's publishable key
- `VITE_BASE_PATH` — optional; `/labstore/` for the GitHub Pages build
- `VITE_BYPASS_AUTH` — optional demo switch; leave unset for normal use

## Checks

```bash
npm run lint
npm run build
```

## Backend changes

- Schema and policies live as SQL in the migration notes kept with the
  project (tables, RLS policies, storage buckets, realtime publication).
- Edge Functions deploy with the Supabase CLI:

```bash
npx supabase functions deploy --project-ref <project-ref>
```

## Publishing the frontend

The public demo is served from GitHub Pages. Pages does not auto-deploy:
build with `VITE_BASE_PATH=/labstore/` and the Supabase env values, then
push the contents of `dist/` to the `gh-pages` branch.
