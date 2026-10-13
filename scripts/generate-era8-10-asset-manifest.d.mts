import type { ExportJob, MetadataDocument } from "./export-era8-10-building-models.mjs";

export interface BrowserAssetManifestInput {
  readonly metadata: MetadataDocument;
  readonly jobs: readonly ExportJob[];
}

export interface BrowserAssetManifest {
  readonly schema: 1;
  readonly files: readonly string[];
  readonly urls: Readonly<Record<string, string>>;
  readonly census: 87;
}

export function generateEra8To10AssetManifest(
  input: BrowserAssetManifestInput,
): BrowserAssetManifest;
export function renderEra8To10AssetManifest(input: BrowserAssetManifestInput): string;
export function parseEra8To10AssetManifestSource(sourceText: string): BrowserAssetManifest;
export function writeEra8To10AssetManifest(
  input: BrowserAssetManifestInput,
  outputPath: string,
): Promise<void>;
