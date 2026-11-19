import { beforeEach, describe, expect, it, vi } from "vitest";

// Actual cookie signing/validation happens inside Better Auth (needs the DB-backed session
// store, which is out of scope for unit tests). These tests pin the contract getSession()
// must keep: it forwards request headers to Better Auth, returns the session, and degrades
// every failure mode (missing/expired/malformed cookie, internal error) to null — never a throw.
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers(mockHeaders)),
}));

vi.mock("./better-auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async ({ headers }: { headers: Headers }) => {
        const cookie = headers.get("cookie") ?? "";
        if (!cookie.includes("better-auth.session_token=")) return null; // missing cookie
        if (cookie.includes("malformed")) throw new Error("bad cookie signature"); // malformed
        if (cookie.includes("expired")) return null; // expired/unresolvable session
        return { user: { id: "ba-owner" }, session: { token: "tok" } };
      }),
    },
  },
}));

import { headers } from "next/headers";
import { getSession } from "./session";

let mockHeaders: Headers;

describe("getSession", () => {
  beforeEach(() => {
    mockHeaders = new Headers();
    vi.mocked(headers).mockClear();
  });

  it("missing cookie -> null (no throw)", async () => {
    expect(await getSession()).toBeNull();
  });

  it("valid session cookie -> session with the Better Auth user id", async () => {
    mockHeaders = new Headers({ cookie: "better-auth.session_token=tok.sig" });
    const session = await getSession();
    expect(session?.user.id).toBe("ba-owner");
  });

  it("expired cookie (Better Auth returns null) -> null", async () => {
    // Better Auth resolves expired sessions to null; the mock's cookie check models the
    // no-valid-session outcome.
    mockHeaders = new Headers({ cookie: "better-auth.session_token=expired.sig" });
    expect(await getSession()).toBeNull();
  });

  it("malformed/unsigned cookie (Better Auth throws) -> null, never throws", async () => {
    mockHeaders = new Headers({ cookie: "better-auth.session_token=malformed" });
    await expect(getSession()).resolves.toBeNull();
  });

  it("headers() itself failing -> null, never throws", async () => {
    vi.mocked(headers).mockRejectedValueOnce(new Error("no request context"));
    await expect(getSession()).resolves.toBeNull();
  });
});
