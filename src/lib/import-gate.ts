import { getSession, type AppSession } from "./session";

/**
 * Import gate (COB-812, preserving COB-798's "stays gated until end-to-end verified").
 *
 * Chosen gate, replacing the old NODE_ENV=development switch:
 *   1. ALWAYS requires an authenticated Better Auth session (unauthenticated users are closed out).
 *   2. In development, an authenticated session is enough.
 *   3. In any other environment, import stays CLOSED until an operator sets
 *      IMPORT_E2E_VERIFIED=1 after end-to-end verification. No value is committed.
 */
export type ImportAccess =
  | { allowed: true }
  | { allowed: false; reason: "unauthenticated" | "gated-pending-verification" };

/**
 * Pass a session resolved by the caller to avoid resolving it twice per request
 * (e.g. importDexRows needs the same session for ownership). Omitted => resolved here.
 */
export async function importAccess(session?: AppSession | null): Promise<ImportAccess> {
  const s = session === undefined ? await getSession() : session;
  if (!s) return { allowed: false, reason: "unauthenticated" };
  if (process.env.NODE_ENV === "development") return { allowed: true };
  if (process.env.IMPORT_E2E_VERIFIED === "1") return { allowed: true };
  return { allowed: false, reason: "gated-pending-verification" };
}
