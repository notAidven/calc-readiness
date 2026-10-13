import type * as THREE from "three";

declare const legacyBrand: unique symbol;

export type LegacySrgbToken = { readonly [legacyBrand]: true };
export type LegacyTexture = THREE.Texture & { encoding?: LegacySrgbToken };
export type PageThree = typeof THREE & { readonly sRGBEncoding: LegacySrgbToken };
export type SourceRosterTuple = readonly [
  definition: string,
  tab: string,
  title: string,
  target: string,
  footprint: string,
  ordinal: number,
];

export interface GridworkKit {
  bare: boolean;
  roster(): readonly SourceRosterTuple[];
  builtOnly(): readonly string[];
  defs(): Readonly<Record<string, unknown>>;
}

export type GridworkKitConstructor = new () => GridworkKit;

export interface ExportRealm {
  THREE: PageThree;
  Era8Kit?: GridworkKitConstructor;
  Era9Kit?: GridworkKitConstructor;
  Era10Kit?: GridworkKitConstructor;
  __gridworkBuildContext?: string;
}

export type LateEraId = "atomic_age" | "information_age" | "cyberpunk";
export type ExportStage = "site" | "construction" | "built";

export interface LateEraPlanRow {
  readonly definition: string;
  readonly tab: string;
  readonly title: string;
  readonly target: string;
  readonly sourceFootprint: string;
  readonly ordinal: number;
  readonly kind: "skill" | "civic" | "townhall";
  readonly runtimeId: string;
  readonly runtimeEra: LateEraId;
  readonly runtimeFootprint: Readonly<{ w: number; d: number }>;
  readonly outputDirectory: string;
  readonly outputBasename: string;
  readonly outputPath: string;
  readonly stages: readonly ExportStage[];
}

export interface SourceInspection {
  readonly roster: readonly SourceRosterTuple[];
  readonly builtOnly: readonly string[];
  readonly definitions: readonly string[];
  readonly bare: boolean;
  readonly directRandomCalls: number;
  readonly useBeforeBaseError: string | null;
}
