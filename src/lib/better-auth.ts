import { betterAuth } from "better-auth";
import { Pool } from "@neondatabase/serverless";

/**
 * Better Auth server instance (COB-812).
 *
 * Environment (never commit values):
 * - DATABASE_URL            — Neon Postgres connection string (read at pool creation, not committed).
 * - BETTER_AUTH_SECRET      — signing secret for sessions/cookies. Required in production.
 * - BETTER_AUTH_URL         — base URL of the app (e.g. https://<deployment>.vercel.app). Optional
 *                             locally; Better Auth can infer it from the request in dev.
 *
 * Architecture note (G1 decision #1): exactly one authorized owner account exists at launch
 * (see the explicit claim flow in `src/app/(auth)/claim` + `db/migrations/002_better_auth.sql`),
 * but nothing here is single-user: Better Auth manages its own user set
 * (better_auth_user/better_auth_session/better_auth_account/better_auth_verification) and the
 * legacy `users` row is bound to a Better Auth user only via `users.better_auth_user_id`.
 *
 * Adapter note: Better Auth's built-in Postgres support takes a `PostgresPool`. We pass the
 * `@neondatabase/serverless` Pool (same query/connect surface as pg). Runtime compatibility is
 * flagged UNKNOWN in the COB-812 spike notes — it was not exercised against a live database in
 * this run by design (no DB connections allowed). If it proves incompatible, swap in a standard
 * `pg` Pool here; nothing else changes.
 */
export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    modelName: "better_auth_session",
  },
  user: {
    modelName: "better_auth_user",
  },
  account: {
    modelName: "better_auth_account",
  },
  verification: {
    modelName: "better_auth_verification",
  },
});
