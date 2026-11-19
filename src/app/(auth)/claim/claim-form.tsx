"use client";

import { useState } from "react";
import { claimOwnership } from "./actions";

/**
 * Explicit owner-claim page (COB-812, G1 #5).
 * Signing up NEVER binds to the legacy owner row. The operator issues a one-time
 * claim token (scripts/generate-owner-claim.mjs); the signed-in new user redeems it here.
 */
export function ClaimForm() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setResult(null);
        try {
          const res = await claimOwnership(token);
          setResult(res.message);
        } finally {
          setPending(false);
        }
      }}
    >
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="One-time claim token"
        autoComplete="off"
      />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Claiming…" : "Claim owner account"}
      </button>
      {result && <p>{result}</p>}
    </form>
  );
}
