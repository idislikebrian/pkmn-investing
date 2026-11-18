import type { PoolClient } from "@neondatabase/serverless";

/**
 * Explicit, session-derived ownership resolution (COB-812).
 *
 * `betterAuthUserId` is the id of the signed-in Better Auth user (from getSession()).
 * The legacy `users.id` is returned only when that Better Auth user has been EXPLICITLY bound
 * to a `users` row via `users.better_auth_user_id` — which only the claim flow
 * (src/app/(auth)/claim) can do, and only with an operator-issued claim token.
 *
 * Never auto-inserts, never auto-binds: an unclaimed or unknown session user is rejected.
 * Throwing contract: resolves with the claimed users.id, or throws OwnershipNotClaimedError
 * (never resolves to null).
 */
export class OwnershipNotClaimedError extends Error {
  constructor() {
    super(
      "No users row is claimed by this session. Claim the owner account first (claim token required).",
    );
    this.name = "OwnershipNotClaimedError";
  }
}

export async function getOwnerUserId(
  client: Pick<PoolClient, "query">,
  betterAuthUserId: string | null,
): Promise<number> {
  // Throws OwnershipNotClaimedError instead of returning null (see contract above).
  if (!betterAuthUserId) throw new OwnershipNotClaimedError();

  const res = await client.query<{ id: number }>(
    "SELECT id FROM users WHERE better_auth_user_id = $1",
    [betterAuthUserId],
  );
  if (res.rows.length === 0) throw new OwnershipNotClaimedError();
  return res.rows[0].id;
}
