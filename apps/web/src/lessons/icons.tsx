import type { ReactNode } from "react";

/** Decorative lightbulb for "Show hint" actions; meaning comes from the button label. */
export function HintIcon(): ReactNode {
  return (
    <svg
      className="lesson-icon lesson-icon--hint"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
    </svg>
  );
}
