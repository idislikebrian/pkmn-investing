import type { PoolClient } from "@neondatabase/serverless";

/**
 * Returns the id of the user that owns imported cards.
 *
 * There is no auth yet, so this is the single row in `users` (created with defaults if the
 * table is empty). When Privy lands, replace this with a lookup by the session's privy_id;
 * callers only depend on the returned id.
 */
export async function getOwnerUserId(client: PoolClient): Promise<number> {
  const existing = await client.query<{ id: number }>("SELECT id FROM users ORDER BY id LIMIT 1");
  if (existing.rows.length > 0) return existing.rows[0].id;
  const created = await client.query<{ id: number }>("INSERT INTO users DEFAULT VALUES RETURNING id");
  return created.rows[0].id;
}
