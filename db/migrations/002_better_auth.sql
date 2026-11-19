-- 002_better_auth: Better Auth core tables (FILE ONLY — NOT executed in COB-812; run via
-- `npm run db:migrate` when authorized), the ownership bridge column on `users`, and the
-- owner-claim support table for the explicit account-claim procedure (COB-812, G1 #5).
--
-- Table names are distinctly prefixed (better_auth_*) so they can never collide with the
-- legacy `users` table. Existing user IDs, card ownership and privy_id are untouched.
--
-- Column naming: Better Auth's Postgres (Kysely) path maps model fields to camelCase columns
-- (verified against getAuthTables() for better-auth 1.7.26), so identifiers are quoted.

CREATE TABLE IF NOT EXISTS better_auth_user (
  id            TEXT PRIMARY KEY,                -- Better Auth generated id (not the legacy users.id)
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  image         TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS better_auth_session (
  id            TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES better_auth_user(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  "expiresAt"   TIMESTAMP NOT NULL,
  "ipAddress"   TEXT,
  "userAgent"   TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS better_auth_account (
  id                       TEXT PRIMARY KEY,
  "userId"                 TEXT NOT NULL REFERENCES better_auth_user(id) ON DELETE CASCADE,
  "accountId"              TEXT NOT NULL,        -- provider-side id; for email/password = the user id
  "providerId"             TEXT NOT NULL,        -- 'credential' for email/password
  "accessToken"            TEXT,
  "refreshToken"           TEXT,
  "idToken"                TEXT,
  "accessTokenExpiresAt"   TIMESTAMP,
  "refreshTokenExpiresAt"  TIMESTAMP,
  scope                    TEXT,
  password                 TEXT,                 -- scrypt hash managed by Better Auth
  "createdAt"              TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"              TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS better_auth_verification (
  id            TEXT PRIMARY KEY,
  identifier    TEXT NOT NULL UNIQUE,
  value         TEXT NOT NULL,
  "expiresAt"   TIMESTAMP NOT NULL,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT now()
);

-- Bridge column (G1 decision #2): a Better Auth user id may be explicitly bound to exactly one
-- legacy user row. NULL = unclaimed. privy_id and all existing ids/ownership are preserved.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS better_auth_user_id TEXT UNIQUE;

-- Account-recovery / claim support (G1 decision #3 + #5).
-- A claim is issued out-of-band by the operator (scripts/generate-owner-claim.mjs prints the
-- one-time token; only its SHA-256 hash is stored here) and redeemed by a signed-in Better
-- Auth user. Nothing auto-binds: a claim can never happen without a token row created by the
-- operator, and redemption requires an authenticated session.
CREATE TABLE IF NOT EXISTS owner_claims (
  id                              SERIAL PRIMARY KEY,
  users_row_id                    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash                      TEXT NOT NULL UNIQUE,   -- SHA-256 hex of the one-time token
  status                          TEXT NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'claimed', 'expired')),
  claimed_by_better_auth_user_id  TEXT REFERENCES better_auth_user(id),  -- set on redemption
  requested_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                      TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  claimed_at                      TIMESTAMPTZ
);

-- Recovery plan (minimal, documented deferral of anything fancier):
-- - Password reset: email sending infrastructure is not wired yet, so self-serve email reset is
--   DEFERRED. Interim recovery = operator runs scripts/generate-owner-claim.mjs to hand the
--   owner a fresh single-use claim token; the owner can then re-sign-up with a new password and
--   re-claim the legacy row (the old claim is invalidated by rotating the token row).
-- - Losing access to the owner's email entirely: the operator deletes the stale
--   better_auth_user/better_auth_account rows (operator-side SQL). NOTE: users.better_auth_user_id
--   is TEXT UNIQUE with NO foreign key, so deleting the Better Auth rows does NOT clear the
--   binding — the stale value survives on the users row, and a re-claim against it fails closed
--   with "This owner row is already claimed". The operator MUST clear it explicitly before
--   issuing the new claim token:
--       UPDATE users SET better_auth_user_id = NULL WHERE id = <row_id>;
--   Then issue a new claim token (scripts/generate-owner-claim.mjs) and the fresh signup
--   re-claims users.better_auth_user_id.

-- ---- ROLLBACK (uncomment to revert manually; schema_migrations row for this file must also
-- ---- be deleted or the migrator will consider it applied):
-- DROP TABLE IF EXISTS owner_claims;
-- DROP TABLE IF EXISTS better_auth_verification;
-- DROP TABLE IF EXISTS better_auth_account;
-- DROP TABLE IF EXISTS better_auth_session;
-- DROP TABLE IF EXISTS better_auth_user;
-- ALTER TABLE users DROP COLUMN IF EXISTS better_auth_user_id;
