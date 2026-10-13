import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const EXPORTER = join(ROOT, "scripts/export-era5-building-models.mjs");
const MODELS = join(ROOT, "apps/web/src/city/art/models");
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/era-05-medieval-all-buildings.dc.html",
);
const SYSTEM_CHROMIUM_EXECUTABLE = [
  process.env.ERA5_EXPORTER_TEST_CHROMIUM_EXECUTABLE,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find(
  (candidate): candidate is string => candidate !== undefined && existsSync(candidate),
);

const SHIPPING = [
  ...["1", "2", "3", "4", "6"].flatMap((node) =>
    ["site", "construction", "built"].map((stage) => `rat-${node}-${stage}.glb`),
  ),
  "civic-medieval-great-barn-built.glb",
  "civic-medieval-cottages-built.glb",
  "civic-medieval-market-square-built.glb",
  "civic-medieval-chapel-built.glb",
] as const;

function filesUnder(directory: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (lstatSync(path).isDirectory()) {
      files.push(...filesUnder(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

function modelHashes(directory = MODELS): Readonly<Record<string, string>> {
  return Object.fromEntries(
    filesUnder(directory)
      .sort()
      .map((path) => [
        relative(directory, path),
        createHash("sha256").update(readFileSync(path)).digest("hex"),
      ]),
  );
}

function run(
  args: readonly string[],
  options: { readonly root?: string; readonly injection?: string } = {},
) {
  const root = options.root ?? ROOT;
  return spawnSync(
    process.execPath,
    [join(root, "scripts/export-era5-building-models.mjs"), ...args],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        ...(options.injection ? { ERA5_EXPORTER_TEST_INJECTION: options.injection } : {}),
        ...(SYSTEM_CHROMIUM_EXECUTABLE
          ? { ERA5_EXPORTER_TEST_CHROMIUM_EXECUTABLE: SYSTEM_CHROMIUM_EXECUTABLE }
          : {}),
      },
    },
  );
}

function exporterHarness(): {
  readonly root: string;
  readonly models: string;
  readonly townHall: string;
} {
  const scratch = mkdtempSync(join(tmpdir(), "era5-exporter-harness-"));
  const models = join(scratch, "apps/web/src/city/art/models");
  const townHall = join(models, "townhall");
  mkdirSync(join(scratch, "scripts"), { recursive: true });
  mkdirSync(join(scratch, "apps/web/src/city/art/building-sources"), { recursive: true });
  mkdirSync(join(scratch, "apps/web/src/city/art/models/townhall"), { recursive: true });
  writeFileSync(
    join(scratch, "scripts/export-era5-building-models.mjs"),
    readFileSync(EXPORTER),
  );
  writeFileSync(
    join(
      scratch,
      "apps/web/src/city/art/building-sources/era-05-medieval-all-buildings.dc.html",
    ),
    readFileSync(SOURCE),
  );
  for (const file of SHIPPING) {
    writeFileSync(
      join(scratch, "apps/web/src/city/art/models", file),
      readFileSync(join(MODELS, file)),
    );
  }
  writeFileSync(
    join(scratch, "apps/web/src/city/art/models/townhall/townhall-medieval-built.glb"),
    readFileSync(join(MODELS, "townhall/townhall-medieval-built.glb")),
  );
  // Directory junctions exercise the same resolved-path boundary without requiring Windows
  // Developer Mode. POSIX keeps a real directory symlink here.
  symlinkSync(
    join(ROOT, "node_modules"),
    join(scratch, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  return { root: scratch, models, townHall };
}

describe("Era 5 exporter refuses unsafe invocations before writes", () => {
  it("rejects invalid and contradictory flags without changing one production model byte", () => {
    const before = modelHashes();
    const cases = [
      { args: ["positional"], message: "Unknown exporter argument" },
      { args: ["--unknown"], message: "Unknown exporter argument" },
      { args: ["--check", "--check"], message: "Duplicate exporter flag" },
      { args: ["--out"], message: "--out requires one non-empty path value" },
      { args: ["--out", "--all"], message: "--out requires one non-empty path value" },
      { args: ["--all"], message: "--all requires --out" },
      { args: ["--no-seed"], message: "--no-seed requires --check" },
      { args: ["--check", "--all"], message: "cannot be combined with --all" },
      {
        args: ["--check", "--out", join(tmpdir(), "era5-check-out")],
        message: "cannot be combined with --out",
      },
    ] as const;

    for (const testCase of cases) {
      const result = run(testCase.args);
      expect(result.status, testCase.args.join(" ")).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`, testCase.args.join(" ")).toContain(
        testCase.message,
      );
      expect(
        modelHashes(),
        `${testCase.args.join(" ")} preserved production hashes`,
      ).toEqual(before);
    }
  });

  it("rejects lexical and symlink traversal into production before creating output", () => {
    const before = modelHashes();
    const lexical = join(MODELS, "..", "models", "era5-unsafe-output");
    expect(existsSync(lexical)).toBe(false);
    const lexicalResult = run(["--all", "--out", lexical]);
    expect(lexicalResult.status).not.toBe(0);
    expect(`${lexicalResult.stdout}\n${lexicalResult.stderr}`).toContain(
      "Custom --out cannot resolve inside the production model tree",
    );
    expect(existsSync(lexical)).toBe(false);

    const outside = mkdtempSync(join(tmpdir(), "era5-exporter-safety-"));
    const link = join(outside, "model-link");
    symlinkSync(MODELS, link, process.platform === "win32" ? "junction" : "dir");
    const throughLink = join(link, "era5-unsafe-output");
    const symlinkResult = run(["--all", "--out", throughLink]);
    expect(symlinkResult.status).not.toBe(0);
    expect(`${symlinkResult.stdout}\n${symlinkResult.stderr}`).toContain(
      "Custom --out cannot resolve inside the production model tree",
    );
    expect(existsSync(throughLink)).toBe(false);
    expect(modelHashes()).toEqual(before);
  });

  it("keeps argument and containment validation ahead of every write primitive", () => {
    const source = readFileSync(EXPORTER, "utf8");
    const main = source.slice(source.indexOf("async function main()"));
    expect(main.indexOf("parseArgs(")).toBeGreaterThanOrEqual(0);
    expect(main.indexOf("assertSafeCustomOut(")).toBeGreaterThan(
      main.indexOf("parseArgs("),
    );
    expect(main.indexOf("writeFileSync(")).toBeGreaterThan(
      main.indexOf("assertSafeCustomOut("),
    );
    expect(dirname(EXPORTER)).toBe(join(ROOT, "scripts"));
  });

  it("waits for the injected page error instead of racing it against a sleep", () => {
    const source = readFileSync(EXPORTER, "utf8");
    const injection = source.slice(
      source.indexOf('if (injection === "post-run-error")'),
      source.indexOf("} finally", source.indexOf('if (injection === "post-run-error")')),
    );
    expect(injection).toContain('page.waitForEvent("pageerror")');
    expect(injection).not.toContain("page.waitForTimeout");
  });

  const itWithFileSymlinks = process.platform === "win32" ? it.skip : it;
  const itWithPosixBinLinks = process.platform === "win32" ? it.skip : it;

  itWithFileSymlinks(
    "rejects a planned filename symlink before following it into the model tree",
    () => {
      const harness = exporterHarness();
      const outside = mkdtempSync(join(tmpdir(), "era5-safe-custom-out-"));
      const production = join(harness.models, "rat-1-built.glb");
      const before = createHash("sha256").update(readFileSync(production)).digest("hex");
      symlinkSync(production, join(outside, "rat-1-built.glb"));

      const result = run(["--all", "--out", outside], { root: harness.root });
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toContain(
        "Refusing symlinked exporter destination file",
      );
      expect(createHash("sha256").update(readFileSync(production)).digest("hex")).toBe(
        before,
      );
      expect(readdirSync(outside)).toEqual(["rat-1-built.glb"]);
    },
  );

  // The fixture invokes the extensionless `node_modules/.bin/esbuild` POSIX shim. Windows
  // installs `esbuild.cmd`; Linux remains authoritative for these injected browser failures.
  itWithPosixBinLinks.each([
    "mid-run-error",
    "post-run-warning",
    "post-run-error",
  ] as const)(
    "keeps all production hashes unchanged after %s",
    (injection) => {
      const harness = exporterHarness();
      const before = modelHashes(harness.models);
      const result = run([], { root: harness.root, injection });
      expect(result.status, injection).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`, injection).toContain(injection);
      expect(modelHashes(harness.models), `${injection} left a partial promotion`).toEqual(
        before,
      );
    },
    60_000,
  );
});
