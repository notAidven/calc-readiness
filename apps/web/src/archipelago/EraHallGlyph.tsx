import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { ReactElement, ReactNode } from "react";

import { hasAuthoredEraTownHall } from "../city/townHall";
import { islandManifestEntry } from "./islandManifest";

/**
 * One silhouette per bundled hall. Eras without bundled hall art take the
 * generic civic mark; drawing a bespoke future hall would invent an asset the product lacks.
 */
export const AUTHORED_ERA_HALL_GLYPHS: Readonly<Partial<Record<EraId, ReactNode>>> = {
  prehistoric: (
    <>
      <path d="M2 11.6h16" />
      <path
        d="M3.4 11.4V7.6h1.9v3.8ZM6.3 11.4V6.4h2v5ZM9.4 11.4V5.9h2.2v5.5ZM12.9 11.4V6.4h2v5ZM15.9 11.4V7.6h1.9v3.8Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M8.6 11.2c0-1.1 1.4-1.9 3-1.9s3 .8 3 1.9" />
    </>
  ),
  neolithic: (
    <>
      <path d="M2.6 11.6V5.4h14.8v6.2Z" fill="currentColor" stroke="none" />
      <path d="M1.6 5.4h16.8" />
      <path d="M6.4 11.6v-2.4h7.2v2.4" fill="var(--paper)" stroke="none" opacity="0.55" />
      <path d="M13.6 4.1h3v1.3h-3Z" fill="currentColor" stroke="none" />
    </>
  ),
  bronze_age: (
    <>
      <path d="M3 11.6V6.2h12.4v5.4Z" fill="currentColor" stroke="none" />
      <path d="M2 6.2h14.4l-1.6-2.1H3.6Z" fill="currentColor" stroke="none" />
      <path
        d="M5.2 11.6V7.8M8 11.6V7.8M10.8 11.6V7.8M13.6 11.6V7.8"
        stroke="var(--paper)"
        opacity="0.6"
      />
      <path d="M16.4 11.6V3.2h1.9v8.4Z" fill="currentColor" stroke="none" />
    </>
  ),
  classical: (
    <>
      <path d="M10 2.6 18.6 7H1.4Z" fill="currentColor" stroke="none" />
      <path d="M3.4 7.4V10h13.2V7.4" fill="currentColor" stroke="none" opacity="0.28" />
      <path d="M4.4 10V7.6M7.2 10V7.6M10 10V7.6M12.8 10V7.6M15.6 10V7.6" />
      <path d="M2.2 10h15.6v1.1H2.2ZM1 11.1h18v1.1H1Z" fill="currentColor" stroke="none" />
    </>
  ),
  medieval: (
    <>
      <path d="M4 11.6V6.8h12v4.8Z" fill="currentColor" stroke="none" />
      <path d="M3 6.9 10 3.1l7 3.8Z" fill="currentColor" stroke="none" />
      <path d="M7.6 11.6V2.2H12v9.4Z" fill="currentColor" stroke="none" />
      <path d="M9.8 1 12.4 2.4h-5Z" fill="currentColor" stroke="none" />
      <path
        d="M8.7 11.6V8.4c0-.7.5-1.2 1.1-1.2s1.1.5 1.1 1.2v3.2"
        fill="var(--paper)"
        stroke="none"
        opacity="0.55"
      />
    </>
  ),
  industrial: (
    <>
      <path d="M2 11.6V7.2h12.8v4.4Z" fill="currentColor" stroke="none" />
      <path d="m2 7.2 3.2-2.4 2.6 2.4 3.2-2.4 3.8 2.4Z" fill="currentColor" stroke="none" />
      <path d="M14.8 11.6V3.1h2.4v8.5Z" fill="currentColor" stroke="none" />
      <path d="M4.2 9h2.2m2 0h2.2" stroke="var(--paper)" opacity="0.6" />
      <path d="M1.2 11.6h17.6" />
    </>
  ),
  atomic_age: (
    <>
      <path d="M1.8 11.6V7.4h11.8v4.2Z" fill="currentColor" stroke="none" />
      <path
        d="M3.2 7.4V5.5h8.9v1.9M14.2 11.6V3h2.7v8.6Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M2.8 9.1h2.1m1.6 0h2.1m1.6 0h2.1" stroke="var(--paper)" opacity="0.62" />
      <path d="M1 11.6h18" />
    </>
  ),
  information_age: (
    <>
      <path
        d="M1.8 11.6V8.1h5.1v3.5Zm11.3 0V8.1h5.1v3.5Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M6.4 11.6V3.2h7.2v8.4Z" fill="currentColor" stroke="none" />
      <path d="M8 5.1h4m-4 2h4m-4 2h4" stroke="var(--paper)" opacity="0.62" />
      <path d="M1 11.6h18" />
    </>
  ),
  cyberpunk: (
    <>
      <path d="M2 11.6V7.8h14v3.8Z" fill="currentColor" stroke="none" />
      <path d="M3.4 7.8 5.2 5h8.9l1.9 2.8Z" fill="currentColor" stroke="none" />
      <path d="M12.8 11.6V2.9h2.8v8.7Z" fill="currentColor" stroke="none" />
      <path d="M14.2 2.1c-1.1-.7-.8-1.6.1-2M16.1 2.5c1-.8.8-1.7-.1-2.2" />
      <path d="M3.5 9.5h7.6" stroke="var(--paper)" opacity="0.62" />
      <path d="M1 11.6h18" />
    </>
  ),
};

const GENERIC_HALL_GLYPH = (
  <>
    <path d="M4.4 11.4V6.6h11.2v4.8Z" fill="currentColor" stroke="none" opacity="0.85" />
    <path d="M3.2 6.7 10 3.4l6.8 3.3Z" fill="currentColor" stroke="none" opacity="0.85" />
    <path d="M2.4 11.4h15.2v1.2H2.4Z" fill="currentColor" stroke="none" opacity="0.85" />
  </>
);

export function eraHallGlyph(eraId: EraId): {
  readonly node: ReactNode;
  readonly authored: boolean;
} {
  const authored = hasAuthoredEraTownHall(eraId);
  const node = authored ? AUTHORED_ERA_HALL_GLYPHS[eraId] : undefined;
  return node === undefined
    ? { node: GENERIC_HALL_GLYPH, authored: false }
    : { node, authored: true };
}

/** Hall silhouette only, for an SVG that already owns its island ground. */
export function EraHallGlyph({
  eraId,
  className = "",
}: {
  readonly eraId: EraId;
  readonly className?: string;
}): ReactElement {
  const glyph = eraHallGlyph(eraId);
  return (
    <g
      className={className}
      data-era-hall-glyph={eraId}
      data-hall-art={glyph.authored ? "authored" : "generic"}
    >
      {glyph.node}
    </g>
  );
}

function svgColor(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

/** Flat island medallion used by one route option; no canvas or network request. */
export function EraHallMedallion({ eraId }: { readonly eraId: EraId }): ReactElement {
  const tones = islandManifestEntry(eraId).palette.tones;
  return (
    <svg
      className="archipelago-route-option__medallion"
      viewBox="0 0 38 24"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="19" cy="14.4" rx="18" ry="9" fill={svgColor(tones.ground)} />
      <ellipse
        cx="19"
        cy="12.8"
        rx="14.6"
        ry="7"
        fill={svgColor(tones.groundPale)}
        opacity="0.28"
      />
      <g
        transform="translate(9 1.2)"
        color={svgColor(tones.trunk)}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <EraHallGlyph eraId={eraId} />
      </g>
    </svg>
  );
}

/** The population a census guard reads without copying the table. */
export const ERA_HALL_GLYPH_ERAS = ERA_SEQUENCE.map((era) => era.id).filter((eraId) =>
  hasAuthoredEraTownHall(eraId),
);
