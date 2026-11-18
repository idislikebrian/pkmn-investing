"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
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
          const { error } = await authClient.signIn.email({ email, password });
          if (error) {
            setError(error.message ?? "Sign-in failed.");
            return;
          }
          window.location.href = "/dashboard";
        } catch {
          setError("Sign-in failed.");
        } finally {
          setPending(false);
        }
      }}
    >
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
        autoComplete="current-password"
        required
      />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {error && <p>{error}</p>}
      <p>
        No account yet? <Link href="/sign-up">Sign up</Link>
      </p>
    </form>
  );
}
