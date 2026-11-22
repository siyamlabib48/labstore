# AGENTS.md

## Project Context

This is the Labstore app repository — user-owned application code. Keep
changes focused on the user's request, and preserve existing project
conventions.

Start with `README.md` for local setup, environment variables, and the
publish workflow.

## Stack

- Frontend: React 18 + Vite + Tailwind CSS + shadcn/Radix UI, React
  Router, React Query.
- Backend: Supabase — Postgres with row-level security, Supabase Auth,
  Storage buckets, Realtime, and Deno Edge Functions under
  `supabase/functions/`.

## Key Files

- `src/`: frontend application source.
- `src/api/supabaseClient.js`: Supabase client, session profile mapping.
- `src/api/dataClient.js`: the data adapter the app code calls (`db`).
- `supabase/functions/`: Edge Functions; the shared permission model
  lives in `supabase/functions/_shared/access.ts`.
- `vite.config.js`: Vite config (React plugin; base path from
  `VITE_BASE_PATH`).
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `npm run dev` for local development — the frontend talks to the
  hosted Supabase project directly; there is no local backend to run.
- Reuse the existing data adapter and Edge Function patterns before
  adding new integration paths. Permission rules belong in the shared
  access model and in RLS policies, not re-derived per page.
- Deploy Edge Functions with the Supabase CLI:
  `npx supabase functions deploy --project-ref <project-ref>`.
- Run the relevant checks from `package.json` before finishing code
  changes.
