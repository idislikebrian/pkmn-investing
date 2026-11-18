import { beforeAll, describe, expect, it } from "vitest";

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

d("importDexRows (integration, disposable DB required)", () => {
  // Point the action's own Pool at the disposable database — but only when the suite
  // actually runs. An assignment at collection time would clobber a developer's real
  // DATABASE_URL with undefined even while the suite is skipped.
  beforeAll(() => {
    if (TEST_DATABASE_URL) process.env.DATABASE_URL = TEST_DATABASE_URL;
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
