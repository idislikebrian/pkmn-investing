"use client";

import { mockLogin } from "./actions";

export function ContinueButton() {
  return (
    <form action={mockLogin}>
      <button type="submit" className="button">
        Continue
      </button>
    </form>
  );
}
