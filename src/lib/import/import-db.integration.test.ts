import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Database-integration tests for the Dex import's persistence contract
 * (UPSERT NULLS NOT DISTINCT, COALESCE price, price_snapshots, quantity merge).
 *
 * GUARD: these connect to a REAL Postgres and are skipped unless TEST_DATABASE_URL is set
 * (a disposable database you own — deliberately NOT the production DATABASE_URL). COB-812
 * runs without any database access, so they skip; run them locally with:
 *   TEST_DATABASE_URL=postgres://... npm run test -- import-db.integration
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const d = TEST_DATABASE_URL ? describe : describe.skip;

// The action resolves its session via getSession(); outside a Next request context that
// returns null, so the integration suite mocks the signed-in owner session (the synthetic
// Better Auth user bound to the legacy owner row during COB-812 verification). Without
// this mock the gate correctly denies the import before touching the DB.
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
    // Bind the mocked session to the synthetic Better Auth user claimed against the
    // legacy owner row during COB-812 verification.
    const c = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const r = await c.query("SELECT id FROM better_auth_user WHERE email = $1", ["synthetic-owner+it@example.com"]);
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
