import { getSession } from "./session";

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

export async function importAccess(): Promise<ImportAccess> {
  const session = await getSession();
  if (!session) return { allowed: false, reason: "unauthenticated" };
  if (process.env.NODE_ENV === "development") return { allowed: true };
  if (process.env.IMPORT_E2E_VERIFIED === "1") return { allowed: true };
  return { allowed: false, reason: "gated-pending-verification" };
}
