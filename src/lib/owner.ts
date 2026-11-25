import type { PoolClient } from "@neondatabase/serverless";

/**
 * Explicit, session-derived ownership resolution (COB-812).
 *
 * `betterAuthUserId` is the id of the signed-in Better Auth user (from getSession()).
 * The legacy `users.id` is returned only when that Better Auth user has been EXPLICITLY bound
 * to a `users` row via `users.better_auth_user_id` — which only the claim flow
 * (src/app/(auth)/claim) can do, and only with an operator-issued claim token.
 *
 * A session without a bound row gets a fresh row. Existing unclaimed legacy rows are never
 * adopted; the INSERT only binds the new row to this Better Auth identity.
 * Throwing contract: resolves with the session's users.id, or throws OwnershipNotClaimedError
 * when there is no authenticated identity or a concurrent insert cannot be read back.
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
  email?: string | null,
): Promise<number> {
  if (!betterAuthUserId) throw new OwnershipNotClaimedError();

  const existing = await client.query<{ id: number }>(
    "SELECT id FROM users WHERE better_auth_user_id = $1",
    [betterAuthUserId],
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const inserted = await client.query<{ id: number }>(
    `INSERT INTO users (better_auth_user_id, email)
     VALUES ($1, $2)
     ON CONFLICT (better_auth_user_id) DO NOTHING
     RETURNING id`,
    [betterAuthUserId, email ?? null],
  );
  if (inserted.rows.length > 0) return inserted.rows[0].id;

  const raced = await client.query<{ id: number }>(
    "SELECT id FROM users WHERE better_auth_user_id = $1",
    [betterAuthUserId],
  );
  if (raced.rows.length > 0) return raced.rows[0].id;
  throw new OwnershipNotClaimedError();
}
