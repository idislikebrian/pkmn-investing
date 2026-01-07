"use client";

import { mockLogin } from "./actions";

export function ContinueButton() {
  return (
    <form action={mockLogin}>
      <button type="submit">
        Continue
      </button>
    </form>
  );
}
