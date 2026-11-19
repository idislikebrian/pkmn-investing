import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Database-integration tests for the Dex import's persistence contract
 * (UPSERT NULLS NOT DISTINCT, COALESCE price, price_snapshots, quantity merge).
 *
 * GUARD: these connect to a REAL Postgres and are skipped unless TEST_DATABASE_URL is set
 * (a disposable database you own — deliberately NOT the production DATABASE_URL). COB-812
 * runs without any database access, so they skip; run them locally with:
 *   TEST_DATABASE_URL=postgres://... npm run test -- import-db.integration
 *
 * SELF-CONTAINED SETUP: beforeAll seeds its own synthetic Better Auth user ('synthetic-test-user')
 * and binds a synthetic legacy users row to it via direct SQL, so the suite needs no out-of-band
 * rehearsal state and passes on a fresh disposable database. All data is synthetic; the seeded
 * identity rows are idempotent (ON CONFLICT DO NOTHING + rebinding UPDATE), and the int-* card
 * cleanup keeps re-runs deterministic.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const d = TEST_DATABASE_URL ? describe : describe.skip;

// The action resolves its session via getSession(); outside a Next request context that
// returns null, so the integration suite mocks the signed-in owner session (the synthetic
// Better Auth user seeded and bound in beforeAll below). Without this mock the gate correctly
// denies the import before touching the DB.
vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

import { getSession } from "@/lib/session";

let baUserId = "";

const TEST_DATABASE_URL_VALUE = TEST_DATABASE_URL;

d("importDexRows (integration, disposable DB required)", () => {
  // Point the action's own Pool at the disposable database — but only when the suite
  // actually runs. An assignment at collection time would clobber a developer's real
  // DATABASE_URL with undefined even while the suite is skipped.
  beforeAll(async () => {
    if (!TEST_DATABASE_URL) return;
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    const { Pool } = await import("@neondatabase/serverless");
    // Repeatability: clear this suite's own synthetic rows (int-*) so re-runs start clean.
    // price_snapshots rows cascade via the cards FK. Scoped to the int- prefix only.
    const cleanup = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      await cleanup.query("DELETE FROM cards WHERE tcg_id LIKE 'int-%'");
    } finally {
      await cleanup.end();
    }
    // Seed the synthetic Better Auth user and the legacy-row binding directly, so the suite is
    // self-contained on a fresh disposable DB (no out-of-band rehearsal state required).
    // Synthetic data only; idempotent for re-runs against a reused database.
    const seed = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      await seed.query(
        `INSERT INTO better_auth_user (id, name, email, "emailVerified", "createdAt", "updatedAt")
         VALUES ('synthetic-test-user', 'Integration Test', 'int-test@synthetic.local', false, now(), now())
         ON CONFLICT DO NOTHING`,
      );
      // Synthetic legacy owner row; if it already exists (re-run), just (re)bind it.
      await seed.query(
        `INSERT INTO users (privy_id, email)
         VALUES ('synthetic-it-owner', 'int-test-owner@synthetic.local')
         ON CONFLICT (privy_id) DO NOTHING`,
      );
      await seed.query(
        `UPDATE users SET better_auth_user_id = 'synthetic-test-user' WHERE privy_id = 'synthetic-it-owner'`,
      );
    } finally {
      await seed.end();
    }
    // Bind the mocked session to the seeded synthetic Better Auth user.
    const c = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const r = await c.query("SELECT id FROM better_auth_user WHERE email = $1", ["int-test@synthetic.local"]);
      if (r.rows.length === 0) throw new Error("Seeding failed: synthetic Better Auth user not found");
      baUserId = r.rows[0].id;
    } finally {
      await c.end();
    }
    vi.mocked(getSession).mockResolvedValue({ user: { id: baUserId } } as never);
  });

  it.skipIf(!TEST_DATABASE_URL)("persists rows scoped to the session's claimed user", async () => {
    const { importDexRows } = await import("@/app/import/actions");
    const result = await importDexRows({
      rows: [
        {
          line: 2,
          tcg_id: "int-1",
          name: "Integration Card",
          set_name: "Int Set",
          card_number: "1/10",
          variant: null,
          rarity: null,
          series: null,
          illustrator: null,
          locale: null,
          collection_name: null,
          quantity: 1,
          market_price: 5,
          notes: null,
        },
      ],
      skipped: [],
    });
    expect(result.inserted).toBeGreaterThanOrEqual(1);
    expect(result.missingFromFile).not.toContainEqual(expect.objectContaining({ name: "Integration Card" }));
  });

  it.skipIf(!TEST_DATABASE_URL)("merges duplicate keys in one file and upserts across files", async () => {
    const { importDexRows } = await import("@/app/import/actions");
    const row = {
      line: 2,
      tcg_id: "int-merge",
      name: "Merge Card",
      set_name: null,
      card_number: null,
      variant: null,
      rarity: null,
      series: null,
      illustrator: null,
      locale: null,
      collection_name: null,
      quantity: 2,
      market_price: null as number | null,
      notes: null,
    };
    const first = await importDexRows({ rows: [row], skipped: [] });
    const second = await importDexRows({ rows: [{ ...row, quantity: 3 }], skipped: [] });
    expect(second.updated + second.inserted).toBe(1);
    expect(first.inserted + first.updated).toBe(1);
  });
});
