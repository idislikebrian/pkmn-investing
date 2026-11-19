import { describe, expect, it } from "vitest";
import { auth } from "./better-auth";

/**
 * Instance sanity: the Better Auth server object wires its handler and core APIs without
 * needing a database connection at construction time (Pool creation is lazy; no query runs).
 * Actual sign-in/session round-trips require a live database — covered by the guarded
 * integration tests and manual verification.
 */
describe("better-auth instance", () => {
  it("exposes the request handler and core email/password + session APIs", () => {
    expect(typeof auth.handler).toBe("function");
    expect(typeof auth.api.signInEmail).toBe("function");
    expect(typeof auth.api.signUpEmail).toBe("function");
    expect(typeof auth.api.signOut).toBe("function");
    expect(typeof auth.api.getSession).toBe("function");
  });
});
