"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          const { error } = await authClient.signUp.email({ name, email, password });
          if (error) {
            setError(error.message ?? "Sign-up failed.");
            return;
          }
          // The dashboard lazily creates this account's empty collection. Existing
          // legacy collection binding remains exclusive to /claim.
          window.location.href = "/dashboard";
        } catch {
          setError("Sign-up failed.");
        } finally {
          setPending(false);
        }
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        autoComplete="name"
        required
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="new-password"
        required
      />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Creating account…" : "Sign up"}
      </button>
      {error && <p>{error}</p>}
      <p>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
