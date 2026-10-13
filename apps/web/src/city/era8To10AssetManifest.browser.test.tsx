import { expect, test } from "vitest";

import metadataSource from "./art/building-sources/era-08-10-gridwork-export-metadata.json?raw";
import * as manifest from "./art/era8To10AssetManifest.generated";

test("the browser manifest exposes exactly four exports and all 87 production URLs", () => {
  const metadata = JSON.parse(metadataSource) as {
    readonly outputs: readonly { readonly file: string }[];
  };
  expect(Object.keys(manifest).sort()).toEqual([
    "ERA8_TO10_ASSET_CENSUS",
    "ERA8_TO10_ASSET_FILES",
    "ERA8_TO10_ASSET_SCHEMA",
    "ERA8_TO10_ASSET_URLS",
  ]);
  expect(manifest.ERA8_TO10_ASSET_SCHEMA).toBe(1);
  expect(manifest.ERA8_TO10_ASSET_CENSUS).toBe(87);

  const files = [...manifest.ERA8_TO10_ASSET_FILES];
  const urls = manifest.ERA8_TO10_ASSET_URLS;
  expect(files).toHaveLength(87);
  expect(new Set(files).size).toBe(87);
  expect(files).toEqual([...files].sort());
  expect(Object.keys(urls)).toEqual(files);
  expect(metadata.outputs.map((row) => row.file)).toEqual(files);

  for (const file of files) {
    expect(urls[file], `${file} has a transformed Vite URL`).toMatch(/\.glb(?:\?|$)/);
  }
});
