import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import { basename, dirname, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parse } from "@babel/parser";

const ART_RELATIVE_ROOT = "apps/web/src/city/art";
const MODELS_RELATIVE_ROOT = `${ART_RELATIVE_ROOT}/models`;
const GENERATED_RELATIVE_PATH = `${ART_RELATIVE_ROOT}/era8To10AssetManifest.generated.ts`;
const MODULE_REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const GENERATED_ABSOLUTE_PATH = resolve(
  MODULE_REPOSITORY_ROOT,
  ...GENERATED_RELATIVE_PATH.split("/"),
);
const SOURCE_CONTRACT = Object.freeze({
  bytes: 1_928_383,
  sha256: "6ee885ef8af7b7c9d9b26cf0ec219fa2c7f5fa8a88133794714f49ef8ba37a69",
  manifestCount: 24,
  resources: Object.freeze({
    three: "b43f7ac9-8d5b-4218-9a75-39aafe705a90",
    atomic_age: "8a39b357-c12e-4bc9-a66f-530e5b51718a",
    information_age: "650d4184-f51f-45f3-a2df-bf92e1ed174e",
    cyberpunk: "b043418c-5d3e-4532-8068-28fc4155770f",
  }),
  decodedKitBytes: Object.freeze({
    atomic_age: 145_862,
    information_age: 126_461,
    cyberpunk: 112_919,
  }),
});
const REQUIRED_EXPORTS = Object.freeze([
  "ERA8_TO10_ASSET_SCHEMA",
  "ERA8_TO10_ASSET_FILES",
  "ERA8_TO10_ASSET_URLS",
  "ERA8_TO10_ASSET_CENSUS",
]);
const METADATA_KEYS = Object.freeze([
  "schema",
  "source",
  "generator",
  "bare",
  "seed",
  "orderedImages",
  "batching",
  "semanticTransport",
  "legacyEncoding",
  "census",
  "fidelity",
  "outputs",
  "aggregates",
]);
const METADATA_OUTPUT_KEYS = Object.freeze([
  "file",
  "era",
  "definition",
  "tab",
  "title",
  "target",
  "sourceFootprint",
  "ordinal",
  "kind",
  "runtimeId",
  "runtimeEra",
  "stage",
  "runtimeFootprint",
  "seedInput",
  "seed",
  "sha256",
  "bytes",
  "sourceMeshes",
  "shippedMeshes",
  "sourceTriangles",
  "shippedTriangles",
  "materialCount",
  "toonMaterialCount",
  "unlitMaterialCount",
  "baseMapCount",
  "textureCount",
  "embeddedImageCount",
  "anisotropyHistogram",
  "samplerSemanticDigest",
  "colorSpaceRoles",
  "materialSemantics",
  "toon",
  "nonDefaultRenderOrderCount",
  "semanticDigest",
  "sourceBounds",
  "shippedBounds",
]);

function stableJson(value) {
  return JSON.stringify(value);
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function exactObjectKeys(value, expected, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    stableJson(sorted(Object.keys(value))) !== stableJson(sorted(expected))
  ) {
    throw new Error(`${label} keys do not describe complete validated metadata`);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizedReleaseGlbPath(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\\") ||
    posix.isAbsolute(value) ||
    posix.normalize(value) !== value ||
    value
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..") ||
    !value.startsWith(`${MODELS_RELATIVE_ROOT}/`) ||
    !value.endsWith(".glb")
  ) {
    throw new Error(`${label} must be a normalized POSIX release GLB path`);
  }
  return value;
}

function expectedGlbPaths(jobs) {
  if (!Array.isArray(jobs) || jobs.length !== 87) {
    throw new Error("release-owned path population must contain exactly 87 jobs");
  }
  const paths = jobs.map((job, index) =>
    normalizedReleaseGlbPath(job?.relativeFile, `release job ${index}`),
  );
  if (new Set(paths).size !== 87) {
    throw new Error("release-owned path population contains duplicate GLBs");
  }
  return sorted(paths);
}

function assertMetadata(metadata, jobs) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("complete validated metadata is required");
  }
  exactObjectKeys(metadata, METADATA_KEYS, "metadata");
  exactObjectKeys(
    metadata.source,
    [
      "repositoryPath",
      "bytes",
      "sha256",
      "manifestCount",
      "resources",
      "decodedKitBytes",
      "directRandomCalls",
    ],
    "metadata source",
  );
  if (
    metadata.schema !== 1 ||
    metadata.generator !== "scripts/export-era8-10-building-models.mjs" ||
    metadata.bare !== true ||
    metadata.source?.repositoryPath !==
      "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html" ||
    metadata.source?.bytes !== SOURCE_CONTRACT.bytes ||
    metadata.source?.sha256 !== SOURCE_CONTRACT.sha256 ||
    metadata.source?.manifestCount !== SOURCE_CONTRACT.manifestCount ||
    stableJson(metadata.source?.resources) !== stableJson(SOURCE_CONTRACT.resources) ||
    stableJson(metadata.source?.decodedKitBytes) !==
      stableJson(SOURCE_CONTRACT.decodedKitBytes) ||
    stableJson(metadata.source?.directRandomCalls) !==
      stableJson({ atomic_age: 21, information_age: 29, cyberpunk: 5 }) ||
    stableJson(metadata.seed) !==
      stableJson({
        hash: "fnv1a32",
        generator: "mulberry32",
        input: "output basename without .glb",
      })
  ) {
    throw new Error("metadata source/schema contract is not complete and validated");
  }
  if (
    metadata.census?.definitions !== 39 ||
    metadata.census?.outputs !== 87 ||
    metadata.census?.byEra?.atomic_age?.outputs !== 32 ||
    metadata.census?.byEra?.information_age?.outputs !== 23 ||
    metadata.census?.byEra?.cyberpunk?.outputs !== 32 ||
    metadata.census?.byKind?.skill !== 72 ||
    metadata.census?.byKind?.civic !== 12 ||
    metadata.census?.byKind?.townhall !== 3 ||
    metadata.fidelity?.files !== 87 ||
    metadata.fidelity?.alphaMismatches !== 0
  ) {
    throw new Error("metadata census must describe the exact validated 39/87 release");
  }
  if (!Array.isArray(metadata.outputs) || metadata.outputs.length !== 87) {
    throw new Error("metadata must contain exactly 87 output rows");
  }

  const expected = expectedGlbPaths(jobs);
  const paths = metadata.outputs.map((row, index) =>
    normalizedReleaseGlbPath(row?.file, `metadata output ${index}`),
  );
  if (new Set(paths).size !== paths.length) {
    throw new Error("metadata output paths contain a duplicate");
  }
  if (stableJson(paths) !== stableJson(sorted(paths))) {
    throw new Error("metadata output paths must be sorted");
  }
  if (stableJson(paths) !== stableJson(expected)) {
    const missing = expected.filter((path) => !paths.includes(path));
    const extra = paths.filter((path) => !expected.includes(path));
    throw new Error(
      `metadata output path mismatch; missing: ${missing.join(", ") || "none"}; extra: ${
        extra.join(", ") || "none"
      }`,
    );
  }

  const jobsByPath = new Map(jobs.map((job) => [job.relativeFile, job]));
  for (const [index, row] of metadata.outputs.entries()) {
    exactObjectKeys(row, METADATA_OUTPUT_KEYS, `metadata output ${index}`);
    const job = jobsByPath.get(row.file);
    if (
      !job ||
      row.era !== job.era ||
      row.definition !== job.definition ||
      row.tab !== job.tab ||
      row.title !== job.title ||
      row.target !== job.target ||
      row.sourceFootprint !== job.sourceFootprint ||
      row.ordinal !== job.ordinal ||
      row.kind !== job.kind ||
      row.runtimeId !== job.runtimeId ||
      row.runtimeEra !== job.runtimeEra ||
      row.stage !== job.stage ||
      row.runtimeFootprint?.w !== job.runtimeFootprint.w ||
      row.runtimeFootprint?.d !== job.runtimeFootprint.d ||
      row.seedInput !== job.seedInput ||
      row.seed !== job.seed ||
      !/^[a-f0-9]{64}$/.test(row.sha256 ?? "") ||
      !Number.isSafeInteger(row.bytes) ||
      row.bytes <= 0
    ) {
      throw new Error(`metadata output identity/hash mismatch at row ${index}`);
    }
  }
  return expected;
}

function importLiteralFor(path) {
  const normalized = normalizedReleaseGlbPath(path, "browser manifest path");
  const fromArt = posix.relative(ART_RELATIVE_ROOT, normalized);
  if (fromArt.startsWith("../") || !fromArt.startsWith("models/")) {
    throw new Error(`browser manifest path escapes ${ART_RELATIVE_ROOT}: ${path}`);
  }
  return `./${fromArt}?url`;
}

function pathForImportLiteral(value) {
  if (
    typeof value !== "string" ||
    !/^\.\/models\/(?:[^/?#]+\/)*[^/?#]+\.glb\?url$/.test(value)
  ) {
    throw new Error(
      `generated manifest value import is not a static literal relative GLB URL: ${String(value)}`,
    );
  }
  return normalizedReleaseGlbPath(
    `${ART_RELATIVE_ROOT}/${value.slice(2, -"?url".length)}`,
    "generated manifest import",
  );
}

export function generateEra8To10AssetManifest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("browser asset manifest input is required");
  }
  const files = assertMetadata(input.metadata, input.jobs);
  const urls = Object.fromEntries(files.map((path) => [path, importLiteralFor(path)]));
  return deepFreeze({
    schema: 1,
    files: [...files],
    urls,
    census: 87,
  });
}

export function renderEra8To10AssetManifest(input) {
  const manifest = generateEra8To10AssetManifest(input);
  const imports = manifest.files
    .map(
      (path, index) => `import asset${index} from ${JSON.stringify(manifest.urls[path])};`,
    )
    .join("\n");
  const files = manifest.files.map((path) => `  ${JSON.stringify(path)},`).join("\n");
  const urls = manifest.files
    .map((path, index) => `  ${JSON.stringify(path)}: asset${index},`)
    .join("\n");
  return `${imports}
export const ERA8_TO10_ASSET_SCHEMA = 1 as const;
export const ERA8_TO10_ASSET_FILES = [
${files}
] as const;
export const ERA8_TO10_ASSET_URLS = {
${urls}
} as const satisfies Record<(typeof ERA8_TO10_ASSET_FILES)[number], string>;
export const ERA8_TO10_ASSET_CENSUS = 87 as const;
`;
}

function unwrapExpression(value) {
  let expression = value;
  while (
    expression?.type === "TSAsExpression" ||
    expression?.type === "TSSatisfiesExpression"
  ) {
    expression = expression.expression;
  }
  return expression;
}

export function parseEra8To10AssetManifestSource(sourceText) {
  if (typeof sourceText !== "string") {
    throw new Error("generated manifest source text must be a string");
  }
  let program;
  try {
    program = parse(sourceText, {
      sourceType: "module",
      plugins: ["typescript"],
    }).program;
  } catch (error) {
    throw new Error(`generated manifest TypeScript parse failed: ${String(error)}`);
  }

  const importsByBinding = new Map();
  const importPaths = new Set();
  const exportsByName = new Map();
  for (const statement of program.body) {
    if (statement.type === "ImportDeclaration") {
      if (
        statement.importKind === "type" ||
        statement.specifiers.length !== 1 ||
        statement.specifiers[0].type !== "ImportDefaultSpecifier" ||
        statement.specifiers[0].importKind === "type"
      ) {
        throw new Error(
          "generated manifest permits only one default value binding per static literal import",
        );
      }
      const binding = statement.specifiers[0].local.name;
      const literal = statement.source.value;
      const path = pathForImportLiteral(literal);
      if (importsByBinding.has(binding) || importPaths.has(path)) {
        throw new Error("generated manifest contains a duplicate import binding or path");
      }
      importsByBinding.set(binding, { literal, path });
      importPaths.add(path);
      continue;
    }
    if (
      statement.type === "ExportNamedDeclaration" &&
      statement.exportKind !== "type" &&
      statement.declaration?.type === "VariableDeclaration" &&
      statement.declaration.kind === "const" &&
      statement.declaration.declarations.length === 1 &&
      statement.declaration.declarations[0].id.type === "Identifier"
    ) {
      const declaration = statement.declaration.declarations[0];
      const name = declaration.id.name;
      if (!REQUIRED_EXPORTS.includes(name)) {
        throw new Error(`generated manifest has unexpected export ${name}`);
      }
      if (exportsByName.has(name)) {
        throw new Error(`generated manifest exports ${name} more than once`);
      }
      exportsByName.set(name, unwrapExpression(declaration.init));
      continue;
    }
    throw new Error(
      "generated manifest permits only static literal imports and the four named exports",
    );
  }
  if (
    exportsByName.size !== REQUIRED_EXPORTS.length ||
    REQUIRED_EXPORTS.some((name) => !exportsByName.has(name))
  ) {
    throw new Error("generated manifest must contain exactly four required exports");
  }

  const schema = exportsByName.get("ERA8_TO10_ASSET_SCHEMA");
  if (schema?.type !== "NumericLiteral" || schema.value !== 1) {
    throw new Error("generated manifest ERA8_TO10_ASSET_SCHEMA must be literal 1");
  }
  const census = exportsByName.get("ERA8_TO10_ASSET_CENSUS");
  if (census?.type !== "NumericLiteral" || census.value !== 87) {
    throw new Error("generated manifest ERA8_TO10_ASSET_CENSUS must be literal 87");
  }
  const fileArray = exportsByName.get("ERA8_TO10_ASSET_FILES");
  if (
    fileArray?.type !== "ArrayExpression" ||
    fileArray.elements.length !== 87 ||
    fileArray.elements.some((element) => element?.type !== "StringLiteral")
  ) {
    throw new Error(
      "generated manifest ERA8_TO10_ASSET_FILES must contain 87 literal paths",
    );
  }
  const files = fileArray.elements.map((element, index) =>
    normalizedReleaseGlbPath(element.value, `generated manifest file ${index}`),
  );
  if (new Set(files).size !== 87) {
    throw new Error("generated manifest ERA8_TO10_ASSET_FILES contains duplicate paths");
  }
  if (stableJson(files) !== stableJson(sorted(files))) {
    throw new Error("generated manifest ERA8_TO10_ASSET_FILES must be sorted");
  }

  const urlObject = exportsByName.get("ERA8_TO10_ASSET_URLS");
  if (urlObject?.type !== "ObjectExpression") {
    throw new Error("generated manifest ERA8_TO10_ASSET_URLS must be an object literal");
  }
  const urls = {};
  const objectPaths = [];
  const usedBindings = new Set();
  for (const property of urlObject.properties) {
    if (
      property.type !== "ObjectProperty" ||
      property.computed ||
      property.key.type !== "StringLiteral" ||
      property.value.type !== "Identifier"
    ) {
      throw new Error(
        "generated manifest URL mappings require literal paths and imported bindings",
      );
    }
    const path = normalizedReleaseGlbPath(property.key.value, "generated manifest URL key");
    const binding = property.value.name;
    const imported = importsByBinding.get(binding);
    if (!imported) {
      throw new Error(`generated manifest URL mapping uses missing binding ${binding}`);
    }
    if (path !== imported.path) {
      throw new Error(`generated manifest URL mapping ${path} does not match ${binding}`);
    }
    if (Object.hasOwn(urls, path) || usedBindings.has(binding)) {
      throw new Error(
        "generated manifest URL mapping contains a duplicate path or binding",
      );
    }
    urls[path] = imported.literal;
    objectPaths.push(path);
    usedBindings.add(binding);
  }
  if (
    objectPaths.length !== 87 ||
    stableJson(objectPaths) !== stableJson(files) ||
    importsByBinding.size !== 87 ||
    usedBindings.size !== importsByBinding.size
  ) {
    throw new Error(
      "generated manifest URL mapping/import census does not match its file census",
    );
  }
  return deepFreeze({ schema: 1, files, urls, census: 87 });
}

async function optionalLstat(path) {
  try {
    return await lstat(path, { bigint: true });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return null;
    throw error;
  }
}

async function assertRealDirectory(path, label) {
  const stat = await lstat(path, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`${label} is a symlink or not a real directory: ${path}`);
  }
  const physical = resolve(await realpath(path));
  if (physical !== resolve(path)) {
    throw new Error(`${label} resolves through a symbolic link: ${path}`);
  }
  return stat;
}

async function assertGeneratedOutputPath(outputPath) {
  if (typeof outputPath !== "string" || outputPath.length === 0) {
    throw new Error("manifest output path is required");
  }
  const requested = resolve(outputPath);
  if (requested !== GENERATED_ABSOLUTE_PATH) {
    throw new Error(
      `generator only writes the canonical ${GENERATED_RELATIVE_PATH} under its module repository root`,
    );
  }
  const parent = dirname(GENERATED_ABSOLUTE_PATH);
  const fromRoot = relative(MODULE_REPOSITORY_ROOT, parent);
  if (
    fromRoot === "" ||
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    resolve(MODULE_REPOSITORY_ROOT, fromRoot) !== parent
  ) {
    throw new Error("canonical manifest parent escapes the module repository root");
  }
  await assertRealDirectory(MODULE_REPOSITORY_ROOT, "module repository root");
  let ancestor = MODULE_REPOSITORY_ROOT;
  for (const segment of fromRoot.split(sep)) {
    ancestor = resolve(ancestor, segment);
    await assertRealDirectory(ancestor, "canonical manifest ancestor");
  }
  if (resolve(await realpath(parent)) !== parent) {
    throw new Error("canonical manifest parent resolves through a symbolic link");
  }
  const outputStat = await optionalLstat(GENERATED_ABSOLUTE_PATH);
  if (outputStat !== null && (!outputStat.isFile() || outputStat.isSymbolicLink())) {
    throw new Error("canonical manifest output is a symlink or not a regular file");
  }
  return Object.freeze({ path: GENERATED_ABSOLUTE_PATH, parent });
}

async function fsyncDirectory(path) {
  // Windows does not support fsync on a directory handle (Node reports EPERM). The file itself
  // is synced before rename; POSIX additionally syncs the containing directory for durability.
  if (process.platform === "win32") {
    return;
  }
  const handle = await open(path, constants.O_RDONLY);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function writeEra8To10AssetManifest(input, outputPath) {
  const output = await assertGeneratedOutputPath(outputPath);
  const source = renderEra8To10AssetManifest(input);
  const temporaryPath = resolve(
    output.parent,
    `.${basename(output.path)}.era8-10-${randomBytes(16).toString("hex")}.tmp`,
  );
  let handle = null;
  let temporaryIdentity = null;
  let renamed = false;
  try {
    handle = await open(
      temporaryPath,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        (constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || opened.isSymbolicLink()) {
      throw new Error("created manifest temporary is not a regular file");
    }
    temporaryIdentity = { device: opened.dev, inode: opened.ino };
    await handle.writeFile(source, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;

    const written = await lstat(temporaryPath, { bigint: true });
    if (
      !written.isFile() ||
      written.isSymbolicLink() ||
      written.dev !== temporaryIdentity.device ||
      written.ino !== temporaryIdentity.inode
    ) {
      throw new Error("manifest temporary identity changed before publication");
    }
    await assertGeneratedOutputPath(output.path);
    await rename(temporaryPath, output.path);
    renamed = true;
    const published = await lstat(output.path, { bigint: true });
    if (
      !published.isFile() ||
      published.isSymbolicLink() ||
      published.dev !== temporaryIdentity.device ||
      published.ino !== temporaryIdentity.inode
    ) {
      throw new Error("published manifest identity changed during rename");
    }
    await fsyncDirectory(output.parent);
  } finally {
    if (handle !== null) await handle.close();
    if (!renamed) {
      const temporary = await optionalLstat(temporaryPath);
      if (
        temporaryIdentity !== null &&
        temporary?.isFile() &&
        !temporary.isSymbolicLink() &&
        temporary.dev === temporaryIdentity.device &&
        temporary.ino === temporaryIdentity.inode
      ) {
        await unlink(temporaryPath);
        await fsyncDirectory(output.parent);
      }
    }
  }
}

function parseCliArgs(argv) {
  if (
    argv.length !== 4 ||
    argv[0] !== "--metadata" ||
    argv[2] !== "--out" ||
    !argv[1] ||
    !argv[3]
  ) {
    throw new Error(
      "usage: node scripts/generate-era8-10-asset-manifest.mjs --metadata <path> --out <path>",
    );
  }
  return { metadataPath: argv[1], outputPath: argv[3] };
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const { metadataPath, outputPath } = parseCliArgs(process.argv.slice(2));
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  const { deriveExportJobs } = await import("./export-era8-10-building-models.mjs");
  await writeEra8To10AssetManifest({ metadata, jobs: deriveExportJobs() }, outputPath);
}
