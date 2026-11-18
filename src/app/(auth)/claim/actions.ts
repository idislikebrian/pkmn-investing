"use server";

import { createHash } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { getSession } from "@/lib/session";

/**
 * Explicit owner-claim redemption (COB-812, G1 #5).
 *
 * Preconditions, all mandatory:
 *  - The caller has a valid Better Auth session (signup created a NEW better_auth_user row —
 *    signup never touches the legacy `users` table).
 *  - An operator previously ran scripts/generate-owner-claim.mjs and inserted the resulting
 *    owner_claims row (only the token's SHA-256 hash is stored server-side).
 *
 * On success (single transaction): the claim row is validated (pending, unexpired, single-use,
 * target users row not already claimed), `users.better_auth_user_id` is set to the session's
 * Better Auth user id, and the claim is marked claimed. There is no path that binds a Better
 * Auth user to the legacy owner row without one of these token rows.
 */
export async function claimOwnership(token: string): Promise<{ ok: boolean; message: string }> {
  const session = await getSession();
  if (!session) {
    return { ok: false, message: "Sign in first, then redeem the claim token." };
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, message: "A claim token is required." };
  }
  const tokenHash = createHash("sha256").update(trimmed).digest("hex");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const claimRes = await client.query<{
      id: number;
      users_row_id: number;
      status: string;
      expires_at: string;
    }>(
      `SELECT id, users_row_id, status, expires_at FROM owner_claims
       WHERE token_hash = $1 FOR UPDATE`,
      [tokenHash],
    );

    const claim = claimRes.rows[0];
    if (!claim) {
      await client.query("ROLLBACK");
      return { ok: false, message: "Invalid claim token." };
    }
    if (claim.status !== "pending") {
      await client.query("ROLLBACK");
      return { ok: false, message: "This claim token was already used or expired." };
    }
    if (new Date(claim.expires_at).getTime() <= Date.now()) {
      await client.query("UPDATE owner_claims SET status = 'expired' WHERE id = $1", [claim.id]);
      await client.query("COMMIT");
      return { ok: false, message: "This claim token has expired. Ask the operator for a new one." };
    }

    const targetRes = await client.query<{ better_auth_user_id: string | null }>(
      "SELECT better_auth_user_id FROM users WHERE id = $1 FOR UPDATE",
      [claim.users_row_id],
    );
    if (targetRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, message: "Claim target user row no longer exists." };
    }
    if (targetRes.rows[0].better_auth_user_id) {
      await client.query("ROLLBACK");
      return { ok: false, message: "This owner row is already claimed." };
    }

    // Mark used BEFORE binding; if anything fails the whole transaction rolls back together.
    await client.query(
      `UPDATE owner_claims
       SET status = 'claimed', claimed_at = now(), claimed_by_better_auth_user_id = $2
       WHERE id = $1`,
      [claim.id, session.user.id],
    );
    await client.query(
      "UPDATE users SET better_auth_user_id = $2 WHERE id = $1",
      [claim.users_row_id, session.user.id],
    );

    await client.query("COMMIT");
    return { ok: true, message: "Owner account claimed. The Dex import is now scoped to you." };
  } catch (err) {
    await client.query("ROLLBACK");
    // Detailed error stays server-side only; the raw message could leak internal
    // detail (SQL text, constraint names, connection strings) to the browser.
    console.error("claimOwnership failed:", err);
    return { ok: false, message: "Claim could not be completed. Request a new claim link." };
  } finally {
    client.release();
    await pool.end();
  }
}
