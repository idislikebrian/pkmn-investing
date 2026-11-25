import { describe, expect, it } from "vitest";
import { Pool } from "@neondatabase/serverless";
import { getOwnerUserId } from "./owner";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)("lazy owner provisioning database contract", () => {
  it("creates one isolated row and never adopts an unclaimed legacy row", async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    const client = await pool.connect();
    const suffix = `cob831-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      await client.query("BEGIN");
      const legacy = await client.query<{ id: number }>(
        "INSERT INTO users (email) VALUES ($1) RETURNING id",
        [`${suffix}-legacy@example.test`],
      );
      const first = await getOwnerUserId(client, `${suffix}-auth`, `${suffix}@example.test`);
      const second = await getOwnerUserId(client, `${suffix}-auth`, `${suffix}@example.test`);
      expect(first).toBe(second);
      expect(first).not.toBe(legacy.rows[0].id);

      const rows = await client.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM users WHERE email LIKE $1",
        [`${suffix}%`],
      );
      expect(rows.rows[0].count).toBe(2);
      await client.query("ROLLBACK");
    } finally {
      client.release();
      await pool.end();
    }
  });
});
