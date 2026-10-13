import { type EraId, eraNumber } from "@cr/skill-graph";
import type { ReactElement } from "react";

import { eraIslandDesign } from "../city/islandDesign";
import { islandGroundLadder } from "../city/islandGround";
import { EraHallGlyph } from "./EraHallGlyph";
import { islandManifestEntry } from "./islandManifest";

interface Point {
  readonly x: number;
  readonly y: number;
}

function svgColor(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

function silhouette(eraId: EraId, scale = 1): readonly Point[] {
  const number = eraNumber(eraId);
  const cx = 400;
  const cy = 192;
  const rx = (248 + ((number * 17) % 29)) * scale;
  const ry = (86 + ((number * 13) % 17)) * scale;
  return Array.from({ length: 20 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 20;
    const irregularity =
      1 +
      Math.sin(angle * (2 + (number % 3)) + number * 0.73) * 0.045 +
      Math.cos(angle * 5 - number) * 0.025;
    return {
      x: cx + Math.cos(angle) * rx * irregularity,
      y: cy + Math.sin(angle) * ry * irregularity,
    };
  });
}

function points(value: readonly Point[], yOffset = 0): string {
  return value
    .map((point) => `${point.x.toFixed(1)},${(point.y + yOffset).toFixed(1)}`)
    .join(" ");
}

function GroundMarks({
  eraId,
  clipId,
  color,
}: {
  readonly eraId: EraId;
  readonly clipId: string;
  readonly color: string;
}): ReactElement {
  const design = eraIslandDesign(eraId);
  const pattern = design?.groundPattern ?? (eraNumber(eraId) <= 2 ? "field" : "deck");

  return (
    <g
      className="archipelago-fallback-island__ground-marks"
      clipPath={`url(#${clipId})`}
      stroke={color}
    >
      {pattern === "terraced-earth" && (
        <>
          <path d="M165 174Q285 124 414 160T650 160" />
          <path d="M150 198Q285 150 418 185T665 184" />
          <path d="M172 222Q292 180 420 210T642 209" />
        </>
      )}
      {pattern === "regular-stone-bond" && (
        <>
          <path d="M140 162H660M130 183H670M135 204H665M155 225H645" />
          <path d="M205 151v22m80 0v21m85-42v21m80 0v21m90-42v21M240 194v21m88-21v21m86-21v21m88-21v21m82-21v21" />
        </>
      )}
      {pattern === "broken-paving" && (
        <>
          <path d="m142 169 74-7 68 12 77-9 71 11 75-13 74 9 78-6" />
          <path d="m137 194 64 8 77-13 72 11 82-8 65 13 79-10 83 6" />
          <path d="m165 219 73-11 66 13 87-10 62 9 79-11 99 8" />
        </>
      )}
      {pattern === "surveyed-geometry" && (
        <>
          <ellipse cx="400" cy="192" rx="78" ry="34" />
          <ellipse cx="400" cy="192" rx="142" ry="57" />
          <path d="M400 112v160M185 192h430M245 132l310 120M245 252l310-120" />
        </>
      )}
      {pattern === "industrial-setts" && (
        <>
          <path d="M130 165H670M130 181H670M130 197H670M140 213H660M165 229H635" />
          <path d="M190 150v78m35-78v78m35-78v78m35-78v78m35-78v78m35-78v78m35-78v78m35-78v78m35-78v78m35-78v78m35-78v78m35-78v78m35-78v78" />
          <path
            className="archipelago-fallback-island__rail"
            d="m250 126 48 132m204-132 48 132"
          />
        </>
      )}
      {pattern === "field" && (
        <>
          <path d="M156 167Q260 145 365 169T646 164M145 194Q270 171 389 195T660 190M175 220Q280 198 392 220T625 217" />
          {eraId === "neolithic" && (
            <path d="m286 145 30 82m18-91 31 96m19-93 28 98m22-96 26 89m22-82 23 73" />
          )}
        </>
      )}
      {pattern === "deck" && (
        <>
          <path d="M140 168H660M135 194H665M155 220H645" />
          <path d="m220 142 42 97m50-110 37 125m56-130 28 135m61-127 20 117m61-100 10 83" />
        </>
      )}
    </g>
  );
}

export function ArchipelagoFallbackIsland({
  eraId,
  mode,
  placedCount,
  hasTownHall,
}: {
  readonly eraId: EraId;
  readonly mode: "standing" | "prior" | "future" | "diagnostic" | "ceremony";
  readonly placedCount: number;
  readonly hasTownHall: boolean;
}): ReactElement {
  const manifest = islandManifestEntry(eraId);
  const tones = manifest.palette.tones;
  const top = silhouette(eraId);
  const inner = silhouette(eraId, 0.9);
  const clipId = `fallback-island-${eraId}`;
  const built = mode === "standing" || mode === "prior";
  const buildingMarks = built ? Math.min(5, Math.max(placedCount, 1)) : 0;

  return (
    <div
      className="archipelago-fallback-island"
      data-testid="archipelago-island-fallback"
      data-era={eraId}
      data-mode={mode}
      data-ground={islandGroundLadder(eraId).ground}
    >
      <svg
        viewBox="0 0 800 360"
        role="img"
        aria-label={`${manifest.name} illustrated island view`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id={clipId}>
            <polygon points={points(inner)} />
          </clipPath>
          <radialGradient id={`${clipId}-water`} cx="50%" cy="47%" r="48%">
            <stop offset="0" stopColor={svgColor(tones.shallows)} stopOpacity="0.76" />
            <stop offset="1" stopColor={svgColor(tones.deepWater)} stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse
          className="archipelago-fallback-island__lagoon"
          cx="400"
          cy="210"
          rx="350"
          ry="136"
          fill={`url(#${clipId}-water)`}
        />
        <path
          className="archipelago-fallback-island__wake-line"
          d="M74 270Q188 242 277 263M523 263Q612 242 726 270"
        />

        <polygon points={points(top, 31)} fill={svgColor(tones.earthDeep)} />
        {top.slice(0, 10).map((point, index) => {
          const next = top[(index + 1) % top.length] as Point;
          return (
            <polygon
              key={`${point.x}:${point.y}`}
              points={`${point.x},${point.y} ${next.x},${next.y} ${next.x},${
                next.y + 31
              } ${point.x},${point.y + 31}`}
              fill={svgColor(index % 2 === 0 ? tones.earth : tones.earthWorn)}
            />
          );
        })}
        <polygon
          points={points(top)}
          fill={svgColor(tones.coarseSand)}
          stroke={svgColor(tones.gravelWet)}
          strokeWidth="3"
        />
        <polygon points={points(inner)} fill={svgColor(tones.ground)} />
        <path
          d="M192 180Q280 110 398 128t215 49Q555 247 402 258T192 180Z"
          fill={svgColor(tones.groundPale)}
          opacity="0.34"
          clipPath={`url(#${clipId})`}
        />
        <GroundMarks eraId={eraId} clipId={clipId} color={tones.gridLine} />

        <g className="archipelago-fallback-island__terrain-props">
          {[220, 266, 535, 580].map((x, index) => (
            <g key={x} transform={`translate(${x} ${index % 2 === 0 ? 182 : 214})`}>
              <path
                d="m0-22-17 27h34Z"
                fill={svgColor(tones.foliage[index % tones.foliage.length] ?? tones.scrub)}
              />
              <path d="M-3 3h6v18h-6Z" fill={svgColor(tones.trunk)} />
            </g>
          ))}
          <ellipse
            cx="310"
            cy="225"
            rx="16"
            ry="8"
            fill={svgColor(tones.rockTones[0] ?? tones.gravel)}
          />
          <ellipse
            cx="500"
            cy="154"
            rx="13"
            ry="7"
            fill={svgColor(tones.rockTones[2] ?? tones.gravel)}
          />
        </g>

        {Array.from({ length: buildingMarks }, (_, index) => {
          const x = 318 + (index % 3) * 74;
          const y = 180 + Math.floor(index / 3) * 45 + (index % 2) * 8;
          return (
            <g
              className="archipelago-fallback-island__building"
              key={`${x}:${y}`}
              transform={`translate(${x} ${y})`}
            >
              <path d="m-15 3 15-10 15 10v22h-30Z" fill={svgColor(tones.earthWorn)} />
              <path d="m-20 5 20-15L20 5 14 12 0 1l-14 11Z" fill={svgColor(tones.trunk)} />
            </g>
          );
        })}
        {hasTownHall && (
          <g
            className="archipelago-fallback-island__hall"
            transform="translate(360 145) scale(4)"
            color={svgColor(tones.trunk)}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <EraHallGlyph eraId={eraId} />
          </g>
        )}
      </svg>
    </div>
  );
}
