"use client";

export function ContinueButton() {
  return (
    <button
      onClick={() => {
        window.location.href = "/dashboard";
      }}
    >
      Continue
    </button>
  );
}
