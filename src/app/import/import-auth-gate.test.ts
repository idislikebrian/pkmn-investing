import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unauthorized-import denial + session wiring for importDexRows (COB-812).
 * The Dex contract itself is covered by src/lib/import/dex.test.ts; here we pin that the
 * action (a) denies unauthenticated calls before ANY database object is constructed,
 * (b) stays closed when gated pending verification, (c) resolves ownership explicitly
 * from the session (no auto-bind), and (d) rolls back when the session is unclaimed.
 */
vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

vi.mock("@neondatabase/serverless", () => ({
  Pool: vi.fn(),
  // keep the PoolClient type import resolvable
}));

import { Pool } from "@neondatabase/serverless";
import { getSession } from "@/lib/session";
import { importDexRows } from "./actions";
import { OwnershipNotClaimedError } from "@/lib/owner";

const ROWS = [
  {
    line: 2,
    tcg_id: "fake1-7",
    name: "Pixelpup",
    set_name: "Imaginary Set",
    card_number: "7/50",
    variant: "Holo",
    rarity: "Rare Holo",
    series: "Fake Series",
    illustrator: "A. Painter",
    locale: "International",
    collection_name: "Test Binder",
    quantity: 2,
    market_price: 12.5,
    notes: null,
  },
];

function sessionOf(id: string) {
  // Full Better Auth session shape (AppSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>);
  // a partial mock previously tripped tsc TS2345 in the three mockResolvedValue calls below.
  const now = new Date();
  return {
    user: {
      id,
      name: "x",
      email: "x@example.com",
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: `sess-${id}`,
      userId: id,
      token: "tok",
      expiresAt: new Date(now.getTime() + 86_400_000),
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: null,
    },
  };
}

function makeFakeClient(boundUserId: number | null) {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const client = {
    released: false,
    ended: false,
    release: () => {
      client.released = true;
    },
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT id FROM users WHERE better_auth_user_id")) {
        return { rows: boundUserId === null ? [] : [{ id: boundUserId }], rowCount: boundUserId === null ? 0 : 1 };
      }
      if (sql.includes("INSERT INTO cards")) {
        return { rows: [{ id: 101, inserted: true }], rowCount: 1 };
      }
      if (sql.startsWith("INSERT INTO price_snapshots")) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("FROM cards WHERE user_id")) {
        // Owner's existing cards: one matching the file, one absent from it.
        return {
          rows: [
            { id: 101, tcg_id: "fake1-7", name: "Pixelpup", set_name: "Imaginary Set", card_number: "7/50", variant: "Holo", condition: null, grading_company: null, grade: null, quantity: 2 },
            { id: 102, tcg_id: "old-1", name: "Old Card", set_name: null, card_number: null, variant: null, condition: null, grading_company: null, grade: null, quantity: 1 },
          ],
          rowCount: 2,
        };
      }
      return { rows: [], rowCount: 0 }; // BEGIN/COMMIT/ROLLBACK
    }),
  };
  return { client, calls };
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(getSession).mockReset();
  vi.mocked(Pool).mockReset();
});

describe("importDexRows authentication gate", () => {
  it("denies unauthenticated imports before any Pool is constructed", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    vi.mocked(Pool).mockImplementation(() => {
      throw new Error("Pool must never be constructed for an unauthorized import");
    });

    await expect(importDexRows({ rows: ROWS, skipped: [] })).rejects.toThrow("Sign in to import.");
    expect(Pool).not.toHaveBeenCalled();
  });

  it("stays closed for authenticated users outside development until e2e verification (COB-798)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.IMPORT_E2E_VERIFIED;
    vi.mocked(getSession).mockResolvedValue(sessionOf("ba-owner"));
    vi.mocked(Pool).mockImplementation(() => {
      throw new Error("Pool must never be constructed while the import is gated");
    });

    await expect(importDexRows({ rows: ROWS, skipped: [] })).rejects.toThrow(
      "Import is closed until end-to-end verification.",
    );
    expect(Pool).not.toHaveBeenCalled();
  });

  it("uses the session's Better Auth id for explicit ownership resolution", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.mocked(getSession).mockResolvedValue(sessionOf("ba-owner"));
    const fake = makeFakeClient(1);
    vi.mocked(Pool).mockImplementation(
      () =>
        ({
          connect: async () => {
            return fake.client;
          },
          end: async () => {
            fake.client.ended = true;
          },
        }) as never,
    );

    const result = await importDexRows({ rows: ROWS, skipped: [] });

    const ownerLookup = fake.calls.find((c) => c.sql.startsWith("SELECT id FROM users WHERE better_auth_user_id"));
    expect(ownerLookup?.params?.[0]).toBe("ba-owner"); // session-derived, explicit
    const upsert = fake.calls.find((c) => c.sql.includes("INSERT INTO cards"));
    expect(upsert?.params?.[0]).toBe(1); // legacy users.id, resolved via the bridge column
    expect(result.inserted).toBe(1);
    expect(result.missingFromFile.map((m) => m.id)).toEqual([102]); // computed inside the tx
    expect(fake.client.released).toBe(true);
    expect(fake.client.ended).toBe(true);
  });

  it("unclaimed session -> ownership error, rolled back, no card writes", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.mocked(getSession).mockResolvedValue(sessionOf("ba-nobody"));
    const fake = makeFakeClient(null);
    vi.mocked(Pool).mockImplementation(
      () =>
        ({
          connect: async () => fake.client,
          end: async () => {
            fake.client.ended = true;
          },
        }) as never,
    );

    await expect(importDexRows({ rows: ROWS, skipped: [] })).rejects.toBeInstanceOf(
      OwnershipNotClaimedError,
    );
    expect(fake.calls.some((c) => c.sql === "ROLLBACK")).toBe(true);
    expect(fake.calls.some((c) => c.sql.includes("INSERT INTO cards"))).toBe(false);
  });
});
