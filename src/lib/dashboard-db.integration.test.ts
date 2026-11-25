import { Pool } from "@neondatabase/serverless";
import { describe, expect, it } from "vitest";
import { getDashboardData } from "./dashboard";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeIfDatabase = databaseUrl ? describe : describe.skip;

describeIfDatabase("dashboard database scoping", () => {
  it("returns only the claimed owner's cards", async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const client = await pool.connect();
    const suffix = `cob794-${Date.now()}`;
    try {
      await client.query("BEGIN");
      await client.query(`INSERT INTO better_auth_user (id, name, email) VALUES ($1, 'COB-794 Test', $2)`, [suffix, `${suffix}@synthetic.local`]);
      const user = await client.query<{ id: number }>(`INSERT INTO users (better_auth_user_id, email) VALUES ($1, $2) RETURNING id`, [suffix, `${suffix}@synthetic.local`]);
      await client.query(`INSERT INTO cards (user_id, name, set_name, quantity, current_market_price) VALUES ($1, 'Synthetic Card', 'Synthetic Set', 3, 12.50)`, [user.rows[0].id]);
      const data = await getDashboardData(client, user.rows[0].id);
      expect(data.totalQuantity).toBe(3);
      expect(data.totalValue).toBe(37.5);
      expect(data.cards).toHaveLength(1);
      expect(data.cards[0].name).toBe("Synthetic Card");
      await client.query("ROLLBACK");
    } finally {
      client.release();
      await pool.end();
    }
  });
});
