import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Creating a real directory symlink requires Windows Developer Mode or elevation. The
// containment case still runs on POSIX; Windows exercises the non-symlink unsafe paths above.
const itWithDirectorySymlinks = process.platform === "win32" ? it.skip : it;

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCRIPT = join(ROOT, "scripts/export-era4-building-models.mjs");
const MODELS = join(ROOT, "apps/web/src/city/art/models");

function productionAssetHashes(): Readonly<Record<string, string>> {
  const flat = readdirSync(MODELS)
    .filter((name) =>
      /^(?:pol-(?:1|2|3|4|8)-(?:site|construction|built)|civic-classical-.+-built)\.glb$/.test(
        name,
      ),
    )
    .sort();
  const files = [
    ...flat.map((name) => [name, join(MODELS, name)] as const),
    [
      "townhall-classical-built.glb",
      join(MODELS, "townhall/townhall-classical-built.glb"),
    ] as const,
  ];
  expect(files).toHaveLength(20);
  return Object.fromEntries(
    files.map(([name, path]) => [
      name,
      createHash("sha256").update(readFileSync(path)).digest("hex"),
    ]),
  );
}

function rejected(
  args: readonly string[],
  env: Readonly<Record<string, string>> = {},
): {
  readonly status: number | null;
  readonly output: string;
} {
  const before = productionAssetHashes();
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 60_000,
  });
  const after = productionAssetHashes();
  expect(after, `rejected ${JSON.stringify(args)} changed production GLBs`).toEqual(before);
  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

function expectRejected(args: readonly string[]): void {
  const result = rejected(args);
  expect(result.status, JSON.stringify(args)).not.toBe(0);
  expect(result.output, JSON.stringify(args)).toMatch(
    /argument|flag|option|requires|cannot|unknown|unexpected/i,
  );
}

describe("Era 4 exporter CLI fails closed before writes", () => {
  it("rejects unknown flags, stage/key lookalikes, and positional arguments", () => {
    for (const args of [["--chek"], ["--stage", "built"], ["--key=senate"], ["senate"]]) {
      expectRejected(args);
    }
  });

  it("rejects missing, empty, flag-shaped, and duplicate --out values", () => {
    for (const args of [
      ["--out"],
      ["--out", ""],
      ["--out", "--all"],
      ["--out", "tmp/one", "--out", "tmp/two"],
    ]) {
      expectRejected(args);
    }
  });

  it("rejects write-risking flag combinations without touching production assets", () => {
    const temp = mkdtempSync(join(tmpdir(), "era4-exporter-invalid-"));
    const rejectedOut = join(temp, "must-not-be-created");
    try {
      for (const args of [
        ["--no-seed", "--out", rejectedOut],
        ["--all"],
        ["--check", "--all"],
        ["--check", "--out", rejectedOut],
      ]) {
        expectRejected(args);
      }
      expect(existsSync(rejectedOut), "rejected arguments wrote their --out path").toBe(
        false,
      );
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("checks a custom output path before any temp bundle, source read, or browser launch", () => {
    const source = readFileSync(SCRIPT, "utf8");
    const parse = source.indexOf("parseArgs(process.argv.slice(2))");
    const guard = source.indexOf("assertSafeCustomOut(out);", parse);
    const tempOutput = source.indexOf("mkdtempSync(", parse);
    const sourceRead = source.indexOf("readFileSync(SOURCE)", parse);
    const browserLaunch = source.indexOf("chromium.launch()", parse);
    expect(parse).toBeGreaterThan(0);
    expect(guard).toBeGreaterThan(parse);
    for (const later of [tempOutput, sourceRead, browserLaunch]) {
      expect(later).toBeGreaterThan(guard);
    }
  });

  itWithDirectorySymlinks(
    "rejects the production model tree, descendants, traversal, and symlink aliases",
    {
      timeout: 20_000,
    },
    () => {
      const temp = mkdtempSync(join(tmpdir(), "era4-exporter-containment-"));
      const alias = join(temp, "models-alias");
      const noBrowsers = join(temp, "no-playwright-browsers");
      symlinkSync(MODELS, alias, "dir");
      try {
        const unsafe = [
          MODELS,
          "apps/web/src/city/art/models",
          join(MODELS, "townhall"),
          "apps/web/src/city/art/models/../models/townhall",
          join(MODELS, "future-output"),
          alias,
          join(alias, "townhall"),
        ];
        for (const out of unsafe) {
          const result = rejected(["--all", "--out", out], {
            PLAYWRIGHT_BROWSERS_PATH: noBrowsers,
          });
          expect(result.status, out).not.toBe(0);
          expect(result.output, out).toMatch(
            /production.*model|model.*tree|inside.*models/i,
          );
        }
      } finally {
        rmSync(temp, { recursive: true, force: true });
      }
    },
  );
});
