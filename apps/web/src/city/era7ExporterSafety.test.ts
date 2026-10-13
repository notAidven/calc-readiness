import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = process.cwd();
const EXPORTER = join(ROOT, "scripts/export-era7-building-models.mjs");
const MODELS = join(ROOT, "apps/web/src/city/art/models");
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/era-07-industrial-all-buildings.dc.html",
);
const SHIPPING = [
  ...["fun-1", "fun-2", "fun-3", "fun-7", "fun-8", "pol-5"].flatMap((node) =>
    ["site", "construction", "built"].map((stage) => `${node}-${stage}.glb`),
  ),
  "civic-industrial-cold-store-built.glb",
  "civic-industrial-workers-houses-built.glb",
  "civic-industrial-public-baths-built.glb",
  "civic-industrial-library-built.glb",
] as const;

const OWNED_TEMP_CLEANUPS: Array<() => void> = [];

afterEach(() => {
  let firstFailure: unknown = null;
  for (const dispose of OWNED_TEMP_CLEANUPS.splice(0).reverse()) {
    try {
      dispose();
    } catch (error) {
      firstFailure ??= error;
    }
  }
  if (firstFailure !== null) throw firstFailure;
});

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
  const runTempRoot = mkdtempSync(join(tmpdir(), "era7-exporter-run-"));
  try {
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts/export-era7-building-models.mjs"), ...args],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          TMPDIR: runTempRoot,
          NODE_ENV: "test",
          ...(options.injection ? { ERA7_EXPORTER_TEST_INJECTION: options.injection } : {}),
        },
      },
    );
    expect(
      readdirSync(runTempRoot).sort(),
      `${args.join(" ") || "production export"} leaked exporter temp roots`,
    ).toEqual([]);
    return result;
  } finally {
    rmSync(runTempRoot, { recursive: true, force: true });
    expect(existsSync(runTempRoot), "the per-run temp parent survived cleanup").toBe(false);
  }
}

function exporterHarness(
  options: {
    readonly unexpectedOmitted?: boolean;
    readonly omitDigest?: boolean;
    readonly tamperSource?: boolean;
  } = {},
): {
  readonly root: string;
  readonly models: string;
  readonly townHall: string;
} {
  const scratch = mkdtempSync(join(tmpdir(), "era7-exporter-harness-"));
  OWNED_TEMP_CLEANUPS.push(() => {
    rmSync(scratch, { recursive: true, force: true });
    expect(existsSync(scratch), `${scratch} survived test cleanup`).toBe(false);
  });
  const models = join(scratch, "apps/web/src/city/art/models");
  const townHall = join(models, "townhall");
  mkdirSync(join(scratch, "scripts"), { recursive: true });
  mkdirSync(join(scratch, "apps/web/src/city/art/building-sources"), { recursive: true });
  mkdirSync(townHall, { recursive: true });
  const exporter = readFileSync(EXPORTER, "utf8");
  const digestEntry =
    `  "civic-industrial-cold-store-site.glb":\n` +
    `    "631221339b003fb0fc3586ec4c9dbaf6d5d9ac8cebdec422a28d0a805a8ed95b",\n`;
  expect(exporter.includes(digestEntry)).toBe(true);
  writeFileSync(
    join(scratch, "scripts/export-era7-building-models.mjs"),
    options.omitDigest ? exporter.replace(digestEntry, "") : exporter,
  );
  writeFileSync(
    join(
      scratch,
      "apps/web/src/city/art/building-sources/era-07-industrial-all-buildings.dc.html",
    ),
    options.tamperSource
      ? Buffer.concat([readFileSync(SOURCE), Buffer.from("\n")])
      : readFileSync(SOURCE),
  );
  for (const file of SHIPPING) {
    writeFileSync(join(models, file), readFileSync(join(MODELS, file)));
  }
  if (options.unexpectedOmitted) {
    writeFileSync(
      join(models, "civic-industrial-cold-store-site.glb"),
      readFileSync(join(MODELS, "civic-industrial-cold-store-built.glb")),
    );
  }
  writeFileSync(
    join(townHall, "townhall-industrial-built.glb"),
    readFileSync(join(MODELS, "townhall/townhall-industrial-built.glb")),
  );
  symlinkSync(join(ROOT, "node_modules"), join(scratch, "node_modules"), "dir");
  return { root: scratch, models, townHall };
}

function promotionResidue(directory: string): string[] {
  return filesUnder(directory)
    .map((path) => path.split("/").pop() as string)
    .filter((name) => /\.era7-(?:next|rollback)-/.test(name))
    .sort();
}

describe("Era 7 exporter refuses unsafe invocations before writes", () => {
  it("rejects invalid and contradictory flags without changing production model bytes", () => {
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
        args: ["--check", "--out", join(tmpdir(), "era7-check-out")],
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

  it("rejects direct, lexical, and directory-symlink traversal into production", () => {
    const before = modelHashes();
    const lexical = join(MODELS, "..", "models", "era7-unsafe-output");
    expect(existsSync(lexical)).toBe(false);
    for (const unsafe of [MODELS, join(MODELS, "townhall"), lexical]) {
      const result = run(["--all", "--out", unsafe]);
      expect(result.status, unsafe).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`, unsafe).toContain(
        "Custom --out cannot resolve inside the production model tree",
      );
    }
    expect(existsSync(lexical)).toBe(false);

    const outside = mkdtempSync(join(tmpdir(), "era7-exporter-safety-"));
    OWNED_TEMP_CLEANUPS.push(() => {
      rmSync(outside, { recursive: true, force: true });
      expect(existsSync(outside), `${outside} survived test cleanup`).toBe(false);
    });
    const link = join(outside, "model-link");
    symlinkSync(MODELS, link, "dir");
    const throughLink = join(link, "era7-unsafe-output");
    const symlinkResult = run(["--all", "--out", throughLink]);
    expect(symlinkResult.status).not.toBe(0);
    expect(`${symlinkResult.stdout}\n${symlinkResult.stderr}`).toContain(
      "Custom --out cannot resolve inside the production model tree",
    );
    expect(existsSync(throughLink)).toBe(false);
    expect(modelHashes()).toEqual(before);
  });

  it("rejects existing and dangling destination-file symlinks before following either", () => {
    const harness = exporterHarness();
    const outside = mkdtempSync(join(tmpdir(), "era7-safe-custom-out-"));
    OWNED_TEMP_CLEANUPS.push(() => {
      rmSync(outside, { recursive: true, force: true });
      expect(existsSync(outside), `${outside} survived test cleanup`).toBe(false);
    });
    const production = join(harness.models, "fun-1-built.glb");
    const before = createHash("sha256").update(readFileSync(production)).digest("hex");
    symlinkSync(production, join(outside, "fun-1-built.glb"));
    symlinkSync(
      join(outside, "target-that-does-not-exist.glb"),
      join(outside, "fun-2-built.glb"),
    );

    const result = run(["--all", "--out", outside], { root: harness.root });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "Refusing symlinked exporter destination file",
    );
    expect(createHash("sha256").update(readFileSync(production)).digest("hex")).toBe(
      before,
    );
    expect(readdirSync(outside).sort()).toEqual(["fun-1-built.glb", "fun-2-built.glb"]);
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
  });

  it("fails when a declared omitted stage appears, without changing any existing byte", () => {
    const harness = exporterHarness({ unexpectedOmitted: true });
    const before = modelHashes(harness.models);
    const result = run(["--check"], { root: harness.root });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "civic-industrial-cold-store-site.glb is PRESENT in the tree but declared uncommitted",
    );
    expect(modelHashes(harness.models)).toEqual(before);
    expect(promotionResidue(harness.models)).toEqual([]);
  }, 90_000);

  it("fails when one genuinely omitted stage loses its named digest exception", () => {
    const harness = exporterHarness({ omitDigest: true });
    const before = modelHashes(harness.models);

    const result = run([], { root: harness.root });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "uncommitted digest population does not match the ten civic/hub early phases",
    );
    expect(modelHashes(harness.models)).toEqual(before);
    expect(promotionResidue(harness.models)).toEqual([]);
  });

  it("keeps a complete 33-file custom export deterministic when image callbacks race", () => {
    const before = modelHashes();
    const outsideRoot = mkdtempSync(join(tmpdir(), "era7-custom-output-"));
    OWNED_TEMP_CLEANUPS.push(() => {
      rmSync(outsideRoot, { recursive: true, force: true });
      expect(existsSync(outsideRoot), `${outsideRoot} survived test cleanup`).toBe(false);
    });
    const outside = join(outsideRoot, "all");
    const result = run(["--all", "--out", outside], {
      injection: "reverse-image-completion",
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(readdirSync(outside)).toHaveLength(33);
    expect(modelHashes()).toEqual(before);
  }, 90_000);

  it.each(["mid-run-error", "post-run-warning", "post-run-error"] as const)(
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
      expect(
        promotionResidue(harness.models),
        `${injection} left promotion residue`,
      ).toEqual([]);
    },
    90_000,
  );

  it("rolls back every prior rename after the seventh promotion and leaves no residue", () => {
    const harness = exporterHarness();
    const before = modelHashes(harness.models);
    const result = run([], {
      root: harness.root,
      injection: "mid-promotion-error:7",
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("mid-promotion-error:7");
    expect(modelHashes(harness.models)).toEqual(before);
    expect(promotionResidue(harness.models)).toEqual([]);
  }, 90_000);

  it("rejects a changed canonical source before promotion and preserves every hash", () => {
    const harness = exporterHarness({ tamperSource: true });
    const before = modelHashes(harness.models);
    const result = run([], { root: harness.root });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "Era 7 source is not the canonical attachment",
    );
    expect(modelHashes(harness.models)).toEqual(before);
    expect(promotionResidue(harness.models)).toEqual([]);
  });
});
