import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOwnerUserId, OwnershipNotClaimedError } from "./owner";

type OwnerClient = Parameters<typeof getOwnerUserId>[0];

/**
 * Two-user fixture (COB-812 G1 #1: multi-user-ready). `users` rows:
 *   id 1 <- better_auth_user_id 'ba-owner'   (claimed legacy owner)
 *   id 2 <- better_auth_user_id 'ba-second'  (claimed second user)
 * Unbound Better Auth users (e.g. 'ba-intruder') match no row.
 */
const USERS_BY_BA_ID: Record<string, number> = {
  "ba-owner": 1,
  "ba-second": 2,
};

function makeMockClient() {
  const queries: { sql: string; params?: unknown[] }[] = [];
  const client = {
    queries,
    released: false,
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      queries.push({ sql, params });
      if (sql.startsWith("SELECT id FROM users WHERE better_auth_user_id")) {
        const id = USERS_BY_BA_ID[params![0] as string];
        return { rows: id ? [{ id }] : [], rowCount: id ? 1 : 0 };
      }
      return { rows: [], rowCount: 0 };
    }),
  };
  return client;
}

describe("getOwnerUserId (session-derived ownership)", () => {
  let client: ReturnType<typeof makeMockClient>;

  beforeEach(() => {
    client = makeMockClient();
  });

  it("maps a claimed session to its own users.id", async () => {
    await expect(getOwnerUserId(client as unknown as OwnerClient, "ba-owner")).resolves.toBe(1);
    await expect(getOwnerUserId(client as unknown as OwnerClient, "ba-second")).resolves.toBe(2);
  });

  it("never auto-inserts or auto-binds (no INSERT ever issued)", async () => {
    await getOwnerUserId(client as unknown as OwnerClient, "ba-owner");
    for (const q of client.queries) {
      expect(q.sql).not.toMatch(/INSERT/i);
    }
  });

  it("cross-user denial: an unclaimed session user gets no row and no id", async () => {
    await expect(getOwnerUserId(client as unknown as OwnerClient, "ba-intruder")).rejects.toBeInstanceOf(
      OwnershipNotClaimedError,
    );
  });

  it("no session at all -> OwnershipNotClaimedError without touching the database", async () => {
    await expect(getOwnerUserId(client as unknown as OwnerClient, null)).rejects.toBeInstanceOf(OwnershipNotClaimedError);
    expect(client.query).not.toHaveBeenCalled();
  });
});
