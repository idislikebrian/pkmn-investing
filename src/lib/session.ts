import { headers } from "next/headers";
import { auth } from "./better-auth";

/** The `{ user, session }` payload Better Auth's getSession API returns. */
export type AppSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/**
 * Resolves the current Better Auth session from the request cookies.
 * Single code path for every caller. Missing, malformed, expired or otherwise
 * invalid cookies resolve to null — this never throws.
 */
export async function getSession(): Promise<AppSession | null> {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    return session ?? null;
  } catch {
    // Malformed/unsigned cookie or any internal failure must read as "no session".
    return null;
  }
}
