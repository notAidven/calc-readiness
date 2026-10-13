import { describe, expect, test } from "vitest";

/**
 * STORE-ONLY invariant, enforced at the module-graph level: the work-upload lane must
 * never import anything on the grading path, so there is structurally no route from an
 * uploaded photo to mastery / placement / scoring (doc §1, §3.5, §7).
 *
 * Uses Vite's `import.meta.glob('?raw')` (not node:fs) so it typechecks in the DOM-only
 * web project and runs under `npm run check`'s browser suite alongside the runtime
 * invariant assertions in the seam/component tests.
 */

// Raw source text of every non-test module in this lane (Vite inlines these at build).
const rawSources = import.meta.glob("./*.{ts,tsx}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

/** Import specifiers that would give this lane a path into grading. */
const FORBIDDEN_IMPORTS: readonly RegExp[] = [
  /@cr\/mastery-service/,
  /@cr\/scorer/,
  /@cr\/components/,
  /@cr\/lesson/,
  /@cr\/diagnostic(-runtime)?/,
  /answer-?checker/i,
  /checker-core/i,
  /practiceChecker/,
  /cfuChecker/,
];

function isTestFile(path: string): boolean {
  return path.includes(".test.");
}

/** Pull every module specifier out of `import ... from "x"` and `import("x")`. */
function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
    if (match[1]) {
      specifiers.push(match[1]);
    }
  }
  for (const match of source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
    if (match[1]) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

describe("work-upload store-only invariant", () => {
  test("scans the known lane source files", () => {
    const files = Object.keys(rawSources).filter((path) => !isTestFile(path));
    expect(files.length).toBeGreaterThanOrEqual(8);
    expect(files.some((path) => path.endsWith("store.ts"))).toBe(true);
    expect(files.some((path) => path.endsWith("WorkUpload.tsx"))).toBe(true);
    // The v2 reading, which is in this population for a STRONGER version of the same
    // reason the store is: an upload is inert, and a machine reading of a learner's
    // handwriting that is wrong on 37.62% of real pages is inert only while nothing here
    // can reach a scorer. A floor constrains size and not shape, so these are named.
    for (const required of ["parseTypes.ts", "parseClient.ts", "WorkParseCard.tsx"]) {
      expect(
        files.some((path) => path.endsWith(required)),
        `${required} is not in the swept population`,
      ).toBe(true);
    }
  });

  test("the reading surface exposes no way to write a verdict", () => {
    // The module-graph rule below says nothing about a method. `WorkParseClient` has one,
    // it reads, and there is deliberately no `apply`/`accept`/`grade`/`submit` beside it —
    // see `parseTypes.ts` on why a corrections channel is a design question and not a
    // fourth method.
    const types = rawSources["./parseTypes.ts"];
    expect(types).toBeDefined();
    const client = /export interface WorkParseClient \{([\s\S]*?)\n\}/.exec(
      types ?? "",
    )?.[1];
    expect(client).toBeDefined();
    const methods = [...(client ?? "").matchAll(/^\s{2}(\w+)\s*\(/gm)].map(
      (match) => match[1],
    );
    expect(methods).toEqual(["read"]);
    // And no field on the reading a scorer could consume, whatever the docblocks say.
    const parse =
      /export interface WorkParse \{([\s\S]*?)\n\}/.exec(types ?? "")?.[1] ?? "";
    const fields = [
      ...parse
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
        .matchAll(/^\s{2}(?:readonly\s+)?(\w+)\s*\??\s*:/gm),
    ].map((match) => match[1] ?? "");
    expect(fields.length).toBeGreaterThanOrEqual(8);
    for (const field of fields) {
      for (const concept of ["mastery", "score", "correct", "placement", "credit"]) {
        expect(field.toLowerCase(), `WorkParse.${field}`).not.toContain(concept);
      }
    }
    // `provisional` is a literal, so no surface can render a reading as settled.
    expect(parse).toMatch(/readonly provisional:\s*true;/);
  });

  test("never imports anything on the grading path", () => {
    const offenders: string[] = [];
    for (const [path, source] of Object.entries(rawSources)) {
      if (isTestFile(path)) {
        continue;
      }
      for (const specifier of importSpecifiers(source)) {
        if (FORBIDDEN_IMPORTS.some((pattern) => pattern.test(specifier))) {
          offenders.push(`${path} imports "${specifier}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
