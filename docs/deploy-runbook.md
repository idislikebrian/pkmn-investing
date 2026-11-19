# COB-812 Better Auth — Production Deploy Runbook

Operational sequence for deploying the Better Auth migration (`002_better_auth.sql`) and the
claim/import code to production (Vercel + Neon). Drafted for supervisor approval; nothing here
is executed automatically.

## 1. Prerequisites

Vercel project environment variables set for the Production environment:

- `BETTER_AUTH_SECRET` — dedicated secret (e.g. `openssl rand -base64 32`)
- `BETTER_AUTH_URL` — the production origin
- `DATABASE_URL` — the Neon production connection string

## 2. Backup / restore point

Before migrating production data:

- Create a Neon branch point (or new branch) from the production branch, e.g. via the Neon
  console or `neonctl branches create --name pre-cob812 --parent <production-branch>`.
- Record the branch name and timestamp. Rollback (§5) restores `DATABASE_URL` to this branch.

## 3. Deploy order: migrate → code

`002_better_auth.sql` is additive-only (`CREATE TABLE IF NOT EXISTS`,
`ADD COLUMN IF NOT EXISTS`):

- **Old code tolerates the new schema** — extra tables and the unused
  `users.better_auth_user_id` column are ignored.
- **New code requires the tables** — Better Auth fails without them.

Therefore: run the migration first, then deploy the code.

1. Run `npm run db:migrate` against the production `DATABASE_URL` (applies `002_better_auth`).
2. Deploy the new code to Vercel.

## 4. Post-deploy verification

1. App responds: load the production origin; the Better Auth handler
   (`/api/auth/*`) responds without a 500 (no dedicated healthz endpoint exists).
2. Login path works: sign up / sign in via Better Auth at the production origin and confirm
   a session is established (`GET /api/auth/get-session` returns the session).
3. Claim: operator issues the owner claim token (`node scripts/generate-owner-claim.mjs`),
   the signed-in owner redeems it, and `users.better_auth_user_id` is bound to the
   Better Auth user.
4. Import gate state: `/import` loads; an unauthenticated import attempt is denied before
   touching the DB; an authenticated, claimed-session import persists rows.

## 5. Rollback

1. **Revert code:** redeploy the previous Vercel deployment (old code tolerates the new schema,
   so no immediate DB action is required).
2. **Drop the Better Auth tables:** run the ROLLBACK section at the bottom of
   `db/migrations/002_better_auth.sql` (drops `owner_claims`, `better_auth_*` tables and the
   `users.better_auth_user_id` column), and delete the `002_better_auth` row from
   `schema_migrations` so a later re-run of the migrator re-applies it.
3. **Restore the database:** if data was mutated, point `DATABASE_URL` back at the pre-migration
   Neon branch from §2.
