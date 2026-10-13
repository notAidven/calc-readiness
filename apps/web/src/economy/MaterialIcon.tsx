import type { MaterialId } from "@cr/economy";
import type { ReactNode } from "react";

/**
 * Literal one-ink stockpile marks keyed by the economy vocabulary. Each silhouette
 * depicts the material in the form a city holds it; the adjacent visible word remains
 * the accessible and non-colour-only source of truth.
 */
const MATERIAL_PATHS: Record<MaterialId, ReactNode> = {
  stone: (
    <>
      <path d="M4.2 14.6 7 9.4l5 1.1-1.2 5.6-4.4 1.3Z" />
      <path d="m12 10.5 3.4-4 4.4 2.2-1 4.9-4.6 1.2Z" />
      <path d="M7.4 17.4 12 16.2l4.2 1.1-2 2.9H9.2Z" />
    </>
  ),
  grain: (
    <>
      <path d="M12 21V8" />
      <path
        d="M12 7.4c0-2.4 1.6-4 4-4 0 2.4-1.6 4-4 4Z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M12 7.4c0-2.4-1.6-4-4-4 0 2.4 1.6 4 4 4Z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M12 12.2c0-2.4 1.6-4 4-4 0 2.4-1.6 4-4 4Z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M12 12.2c0-2.4-1.6-4-4-4 0 2.4 1.6 4 4 4Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M12 17c0-2.4 1.6-4 4-4 0 2.4-1.6 4-4 4Z" fill="currentColor" stroke="none" />
      <path d="M12 17c0-2.4-1.6-4-4-4 0 2.4 1.6 4 4 4Z" fill="currentColor" stroke="none" />
    </>
  ),
  bronze: (
    <>
      <path d="M4.4 16.6 6.8 11h10.4l2.4 5.6Z" />
      <path d="M6.8 11 8.9 8.4h6.2L17.2 11" />
    </>
  ),
  silver: (
    <>
      <ellipse cx="8.4" cy="15.6" rx="5.2" ry="2.4" />
      <ellipse cx="11.4" cy="12" rx="5.2" ry="2.4" />
      <ellipse cx="14.4" cy="8.4" rx="5.2" ry="2.4" />
    </>
  ),
  gold: (
    <>
      <path d="M2.8 18 5 12.8h8.4l2.2 5.2Z" />
      <path d="M5 12.8 6.9 10.4h4.8l2 2.4" />
      <ellipse cx="17.6" cy="7.6" rx="4" ry="1.9" />
      <path d="M13.6 7.6v3.1c0 1 1.8 1.9 4 1.9s4-.9 4-1.9V7.6" />
      <path d="M13.6 9.5c0 1 1.8 1.9 4 1.9s4-.9 4-1.9" />
    </>
  ),
  gems: (
    <>
      <path d="M7 4.6h10l2.6 5.1L12 19.4 4.4 9.7Z" />
      <path d="M4.4 9.7h15.2" />
      <path d="M9.6 4.6 8.1 9.7 12 19.4" />
      <path d="m14.4 4.6 1.5 5.1L12 19.4" />
    </>
  ),
  coal: (
    <>
      <path d="M2.4 19.2c1.3-3 2.7-4.2 4.2-4.5.7-2.5 2.2-3.8 4-3.3 1-2.7 2.9-3.9 4.7-2.8 2.1-1 4 .7 4.5 3 2.1 1 3.4 3.4 3.6 7.6Z" />
      <path d="M8.8 19.2c.6-2.3 1.7-3.6 3.2-3.9M15 19.2c-.3-2.7-1.3-4.4-2.9-5" />
    </>
  ),
  electricity: (
    <>
      <path d="M4.6 6.2h3.2M4.6 17.8h3.2M16.2 6.2h3.2M16.2 17.8h3.2" />
      <path
        d="M13.4 3.6 8.2 12.4h4.1l-1.7 8 5.2-8.8h-4.1Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  silicon: (
    <>
      <path d="M12 3.8a8.2 8.2 0 1 1-5 14.7" />
      <path d="M4.6 12.8 9.9 4.5" />
      <path d="M9.2 8.6h6.4v6.4H9.2Z" />
      <path d="M12.4 8.6v6.4M9.2 11.8h6.4" />
    </>
  ),
  data: (
    <>
      <ellipse cx="12" cy="6.6" rx="6.8" ry="2.6" />
      <path d="M5.2 6.6v10.8c0 1.4 3 2.6 6.8 2.6s6.8-1.2 6.8-2.6V6.6" />
      <path d="M5.2 12c0 1.4 3 2.6 6.8 2.6s6.8-1.2 6.8-2.6" />
    </>
  ),
};

const UNKNOWN_MATERIAL = (
  <>
    <path d="M4.2 9.4h15.6v9.4H4.2Z" />
    <path d="M4.2 9.4 6.6 5.2h10.8l2.4 4.2" />
    <path d="M12 5.2v4.2M4.2 13.6h15.6" />
  </>
);

export function MaterialIcon({ material }: { material: MaterialId | null }) {
  return (
    <svg
      className="material-icon"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-material-id={material ?? "unknown"}
      data-testid="economy-material-icon"
    >
      {material === null ? UNKNOWN_MATERIAL : MATERIAL_PATHS[material]}
    </svg>
  );
}
