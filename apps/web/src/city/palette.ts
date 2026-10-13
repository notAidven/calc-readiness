import type { ConstructionState } from "@cr/game";
import type { DomainId } from "@cr/skill-graph";

/**
 * The warm "parchment city" palette LUT (pure, framework-free).
 *
 * This is the single source of truth for every color the isometric city draws:
 * a calm parchment/sage/slate base, one low-saturation hue family per district,
 * a reserved reward/UI-accent gold, and a dark HUD anchor. It is structured as a runtime
 * look-up table so alternate lighting environments — a warm dusk `night` and a
 * `colorblind`-safe deuteranopia-friendly set — are switchable from one place
 * without touching the renderer. Colors are `0xRRGGBB` numbers, which three.js
 * accepts directly; `hexString` renders any of them for the DOM.
 *
 * Lighting model (fixed, variant-independent): every building face is one of
 * three tones of a single hue — top light, left mid, right dark — so the whole
 * city reads as lit by one soft key light. See `docs/superpowers/specs/City_Art_Bible.md`.
 */

export type PaletteVariant = "day" | "night" | "colorblind";

export const PALETTE_VARIANTS: readonly PaletteVariant[] = ["day", "night", "colorblind"];

/* -------------------------------------------------------------------------- */
/* Color math (small, dependency-free)                                        */
/* -------------------------------------------------------------------------- */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function toRgb(hex: number): Rgb {
  return { r: (hex >> 16) & 0xff, g: (hex >> 8) & 0xff, b: hex & 0xff };
}

function toHex({ r, g, b }: Rgb): number {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
}

/** Mix two colors; `t=0` → `a`, `t=1` → `b`. */
export function mix(a: number, b: number, t: number): number {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t,
  });
}

const WHITE = 0xffffff;
const BLACK = 0x000000;

export function lighten(color: number, t: number): number {
  return mix(color, WHITE, t);
}

export function darken(color: number, t: number): number {
  return mix(color, BLACK, t);
}

/** A CSS `#rrggbb` string for the DOM mirror / finishing overlays. */
export function hexString(color: number): string {
  return `#${(color & 0xffffff).toString(16).padStart(6, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Base palette (day) — the locked warm parchment identity                    */
/* -------------------------------------------------------------------------- */

/** Calm base (60/30/10) + reserved meaning colors. Numbers mirror the art bible. */
export const BASE = {
  parchment: 0xece4d3, // ground / terrain
  parchmentDeep: 0xd9ccb2, // tile shade
  sage: 0xb9c4a9, // parks / plazas
  slate: 0x8fa9b8, // roads / water
  ink: 0x14202e, // dark HUD anchor
  gold: 0xffb703, // reserved: reward / UI accent (Build button, readiness)
  goldSoft: 0xf4a261, // secondary warm accent
  success: 0x2dc653, // sparing positive feedback
  timber: 0xb08968, // scaffold / construction
} as const;

/**
 * One low-saturation hue family per in-product district. D1 (terracotta) is the
 * only built neighborhood at MVP; the rest are authored so a future district
 * renders in its own family with no renderer change. Hues walk warm → cool.
 */
const DISTRICT_HUES: Readonly<Record<DomainId, number>> = {
  D1: 0xc98a5e, // Real Numbers — terracotta
  D2: 0xc9a15e, // Exponents & Radicals — clay
  D3: 0xb0a45e, // Linear Equations — ochre
  D4: 0x8fa97e, // Polynomials — sage-green
  D5: 0x6fa091, // Rational Expressions — teal-sage
  D6: 0x7e9c8b, // Functions — eucalyptus
  D7: 0x7e93a9, // Linear Functions — dusty blue
  D8: 0x8483a8, // Exponential & Log — muted indigo
  D9: 0x9585a8, // Trigonometry — muted violet
  // PLACEHOLDER (D10 Geometry island): needs Evan to finalize theme/hue/buildings
  D10: 0x9a9a9a, // Geometry — neutral gray placeholder hue (reuse a real hue once owned)
};

/** Archetype accent TOKENS (framework-free, from `@cr/game`) → warm trim colors. */
const ACCENT_FALLBACK = 0x6c7a88; // slate — generic / unknown token
const ACCENT_TOKENS: Readonly<Record<string, number>> = {
  azure: 0x4e7c8a, // numeric — deep teal
  violet: 0x7e5a7a, // multiple_choice — plum
  amber: 0xcc7a3b, // constructed_response — burnt amber
  slate: ACCENT_FALLBACK, // generic — slate
};

/* -------------------------------------------------------------------------- */
/* Variant environment transforms                                             */
/* -------------------------------------------------------------------------- */

/**
 * Push a base color through a variant environment. `day` is identity; `night`
 * mixes toward a warm dusk indigo and slightly dims; `colorblind` lifts lightness
 * so hue is never the only cue (shape + word labels still carry meaning too).
 */
function env(color: number, variant: PaletteVariant): number {
  switch (variant) {
    case "night":
      return darken(mix(color, 0x1b2740, 0.42), 0.06);
    case "colorblind":
      return lighten(color, 0.05);
    default:
      return color;
  }
}

/* -------------------------------------------------------------------------- */
/* Resolved palette                                                           */
/* -------------------------------------------------------------------------- */

/** A single hue rendered as three fixed faces (top light / left mid / right dark). */
export interface FaceTones {
  readonly top: number;
  readonly left: number;
  readonly right: number;
}

/** The fixed 3-tone lighting model: one hue → top light, left mid, right dark. */
export function faceTones(base: number): FaceTones {
  return {
    top: lighten(base, 0.26),
    left: base,
    right: darken(base, 0.28),
  };
}

export interface CityPalette {
  readonly variant: PaletteVariant;
  readonly skyTop: number;
  readonly skyBottom: number;
  readonly ground: number;
  readonly groundShade: number;
  readonly gridLine: number;
  readonly grass: number;
  readonly road: number;
  readonly roadLine: number;
  readonly hudAnchor: number;
  readonly shadow: number; // contact shadow (scene applies alpha)
  readonly scaffold: number;
  readonly selection: number; // warm ember focus
  readonly gold: number;
  readonly goldSoft: number;
  readonly goldGlow: number;
  readonly success: number;
  readonly windowLit: number; // warm lit windows (comes alive at night)
  readonly cloud: number;
  readonly districtLabel: number;
  readonly districtScenery: number;
}

/** Build the full concrete palette for a variant. Called once per (re)mount. */
export function buildPalette(variant: PaletteVariant): CityPalette {
  const night = variant === "night";
  return {
    variant,
    skyTop: night ? 0x2a2140 : variant === "colorblind" ? 0xdfe7ee : 0xf3ead6,
    skyBottom: night ? 0x141a30 : variant === "colorblind" ? 0xbcc9d6 : 0xe7c9a0,
    ground: env(BASE.parchment, variant),
    groundShade: env(BASE.parchmentDeep, variant),
    gridLine: night ? 0x3a4a63 : mix(BASE.parchmentDeep, BASE.slate, 0.4),
    grass: env(BASE.sage, variant),
    road: env(mix(BASE.slate, BASE.parchmentDeep, 0.25), variant),
    roadLine: night ? 0x6f88a4 : env(lighten(BASE.slate, 0.2), variant),
    hudAnchor: BASE.ink,
    shadow: night ? 0x0b1220 : 0x5b4a38,
    scaffold: env(BASE.timber, variant),
    selection: variant === "colorblind" ? 0xff8f2e : BASE.goldSoft,
    gold: BASE.gold,
    goldSoft: BASE.goldSoft,
    goldGlow: night ? 0xffd15e : 0xffdf9a,
    success: variant === "colorblind" ? 0x1f9ed6 : BASE.success,
    windowLit: night ? 0xffd98a : 0xfff1cf,
    cloud: night ? 0x2c3552 : 0xfbf5ea,
    districtLabel: night ? 0x93a6c4 : 0x7a6a54,
    districtScenery: env(mix(BASE.slate, BASE.parchmentDeep, 0.5), variant),
  };
}

/* -------------------------------------------------------------------------- */
/* Building color resolution (district hue × construction stage × variant)    */
/* -------------------------------------------------------------------------- */

/** The resolved hue family for a district (warm, low-saturation), per variant. */
export function districtHue(domain: DomainId, variant: PaletteVariant): number {
  return env(DISTRICT_HUES[domain] ?? DISTRICT_HUES.D1, variant);
}

/** The warm accent (trim / marker) for an archetype token, per variant. */
export function archetypeAccentColor(token: string, variant: PaletteVariant): number {
  return env(ACCENT_TOKENS[token] ?? ACCENT_FALLBACK, variant);
}

/**
 * The milestone build stages the renderer draws. The 3-step progression uses three
 * of them — `site` (Foundation), `construction` (Construction), `built` (Complete).
 * `advanced` is legacy (kept in the model map) and no longer derived, since the
 * built variants collapse into a single Complete stage with MasteryStars on top.
 */
export type BuildStage = "site" | "construction" | "built" | "advanced";

/**
 * Map the engine's construction state to a milestone build stage (3-step
 * progression): Foundation `site` (not_started / teaching / preview), Construction
 * `construction` (practice), Complete `built` (complete + the legacy gold/unfinished
 * variants). Full mastery renders the same finished `built` model; quality shows as
 * MasteryStars, never a gold building.
 */
export function buildStageFor(state: ConstructionState): BuildStage {
  switch (state) {
    case "complete":
    case "gold":
    case "unfinished":
      return "built";
    case "practice":
      return "construction";
    default:
      // Foundation: not_started / teaching (mid-lesson) / preview all stay a site.
      return "site";
  }
}

/**
 * The body hue a building is drawn from, given its district and milestone stage.
 * Under-construction desaturates toward timber/parchment; built shows the full
 * district hue; advanced (full mastery included) deepens it slightly. No stage is
 * ever tinted gold — mastery is not shown as a gold building.
 */
export function bodyHueFor(
  domain: DomainId,
  state: ConstructionState,
  variant: PaletteVariant,
): number {
  const hue = districtHue(domain, variant);
  switch (buildStageFor(state)) {
    case "advanced":
      return darken(hue, 0.06);
    case "built":
      return hue;
    case "construction":
      return mix(hue, env(BASE.timber, variant), 0.5);
    default:
      return mix(hue, buildPalette(variant).groundShade, 0.7);
  }
}

/** Faces for a building, resolved from district hue × stage × variant. */
export function buildingFaces(
  domain: DomainId,
  state: ConstructionState,
  variant: PaletteVariant,
): FaceTones {
  return faceTones(bodyHueFor(domain, state, variant));
}
