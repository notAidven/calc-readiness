/**
 * Classify the browser suite by what each of its tests actually asks a browser for, and
 * price each category in measured runtime.
 *
 * ONE-OFF MEASUREMENT TOOL for `docs/2026-08-05-browser-suite-classification.md`. It is not
 * a gate, nothing depends on it, and it adds no test — the suite growing is the problem this
 * measures, so measuring it must not grow it. It is committed so the figures in that
 * document can be re-derived rather than trusted.
 *
 * THE POPULATION IS NOT WRITTEN DOWN HERE. It comes from `vitest list --config
 * vitest.browser.config.ts --filesOnly`, i.e. from whatever Vitest itself says it will run,
 * for the reason `test/browserModeModuleMocker.test.ts` gives at length: a glob copied into
 * a script is out of date the day a project is added, and a population that goes quietly
 * empty reports a clean bill of health.
 *
 * TWO INDEPENDENT INPUTS, because a static read of the source is not evidence on its own:
 *
 *  1. a signal scan (`SIGNALS` below), where every entry names the jsdom behaviour that
 *     makes it a real browser dependency;
 *  2. `--jsdom <report.json>`: the pass/fail of actually running the same files under the
 *     jsdom harness, unedited. That is the empirical half, and it is what catches both of
 *     the scan's failure directions — a signal that turns out not to matter, and a
 *     dependency the regexes do not know about.
 *
 * Where the two disagree the disagreement is reported rather than resolved, because it is
 * the interesting output: a file with box-measurement signals that PASSES in jsdom is a file
 * whose measurement was never load-bearing.
 *
 * Usage:
 *   node scripts/classify-browser-tests.mjs \
 *     --timings browser-run.json --jsdom jsdom-trial.json [--json out.json] [--csv out.csv]
 *   node scripts/classify-browser-tests.mjs --audit <path/to/one.browser.test.tsx>
 *
 * The two report files are vitest's own `--reporter=json` output, from
 *   npx vitest run --config vitest.browser.config.ts --reporter=json --outputFile.json=...
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const repoRoot = process.cwd();

/**
 * The browser dependencies, each with the jsdom behaviour that makes it one.
 *
 * `group` is the load-bearing column, and the four values are four different arguments:
 *
 *  - `paint`   what browser mode exists for: a rendered frame, a real cascade of input, a
 *              GPU context, a shaped glyph. No jsdom equivalent exists at any price.
 *  - `box`     the box-measurement APIs. Real dependencies on a laid-out page, and per
 *              `.cursor/rules/qa-verification.mdc` a passing measurement is not evidence
 *              for the spatial claim it usually stands in for. Its own group for that
 *              reason, and the fourth category in the report is built from it.
 *  - `cascade` `getComputedStyle`. A real dependency and NOT a spatial one — half its uses
 *              here are colours — so it is neither `paint` nor `box`.
 *  - `harness` browser-context APIs that are not claims about anything: setting a viewport,
 *              awaiting the font set, writing a file through the server channel. These make
 *              a migration cost an edit; they do not make a browser load-bearing.
 *
 * `why` is printed by `--audit`, so a disagreement with any line here is a disagreement
 * with a stated reason rather than with a verdict.
 */
const SIGNALS = [
  // ---- paint ----------------------------------------------------------------------
  {
    group: "paint",
    id: "screenshot",
    pattern: /\btoMatchScreenshot\b|\bpage\s*\.\s*screenshot\s*\(|\bcdp\s*\(/,
    why: "a screenshot is a rendered frame; jsdom paints nothing, and the CDP session that captures it does not exist there",
  },
  {
    group: "paint",
    id: "real-input",
    pattern:
      /\buserEvent\s*\.\s*(hover|unhover|dragAndDrop|fill|selectOptions|upload|tab|click|dblClick|tripleClick|keyboard)\b/,
    why: "driven through Playwright: real hit-testing, focus and pointer routing rather than a synthesised event",
  },
  {
    group: "paint",
    id: "webgl",
    pattern:
      /@react-three\/fiber|\bfrom\s+"three"|\bWebGL|\bgetContext\s*\(\s*$|\bgetContext\s*\(/,
    why: "WebGL/canvas: jsdom ships no context at all, and apps/web/src/test/setup.ts stubs getContext to null so the app fails closed to its DOM mirror",
  },
  {
    group: "paint",
    id: "font-metrics",
    pattern:
      /\bmeasureText\s*\(|document\s*\.\s*fonts\s*\.\s*(size|status|check|values|forEach)\b/,
    why: "font metrics and the loaded face set come from a real text shaper",
  },
  {
    group: "paint",
    id: "animation",
    pattern: /\bgetAnimations\s*\(|\.\s*animate\s*\(/,
    why: "the Web Animations API is not implemented in jsdom",
  },
  {
    group: "paint",
    id: "hit-test",
    pattern: /\belementsFromPoint\s*\(|\belementFromPoint\s*\(/,
    why: "hit-testing needs a laid-out page; jsdom does not implement it",
  },
  {
    group: "paint",
    id: "scrolling",
    pattern: /\bscrollIntoView\s*\(|\bwindow\s*\.\s*scrollTo\s*\(|\bscrollBy\s*\(/,
    why: "jsdom implements no scrolling, and apps/web/src/test/setup.ts stubs scrollTo to a no-op",
  },
  {
    group: "paint",
    id: "media-query",
    pattern: /\bmatchMedia\s*\(|\bprefers-reduced-motion\b/,
    why: "jsdom does not implement matchMedia, so a media query resolves to nothing",
  },
  {
    group: "paint",
    id: "observers",
    pattern: /\bnew\s+IntersectionObserver\b|\bnew\s+ResizeObserver\b/,
    why: "neither observer exists in jsdom, and both are driven by layout",
  },
  {
    group: "paint",
    id: "svg-geometry",
    pattern:
      /\bgetBBox\s*\(|\bgetTotalLength\s*\(|\bgetPointAtLength\s*\(|\bgetScreenCTM\s*\(|\bgetCTM\s*\(/,
    why: "SVG geometry interfaces are unimplemented in jsdom",
  },

  // ---- box: real, and per qa-verification.mdc not evidence for the claim ----------
  {
    group: "box",
    id: "bounding-rect",
    pattern: /\bgetBoundingClientRect\s*\(|\bgetClientRects\s*\(/,
    why: "jsdom returns an all-zero rect from getBoundingClientRect",
  },
  {
    group: "box",
    id: "offset-box",
    pattern: /\.\s*(offsetWidth|offsetHeight|offsetTop|offsetLeft|offsetParent)\b/,
    why: "jsdom reports 0 for every offset box",
  },
  {
    group: "box",
    id: "client-box",
    pattern: /\.\s*(clientWidth|clientHeight|clientTop|clientLeft)\b/,
    why: "jsdom reports 0 for every client box",
  },
  {
    group: "box",
    id: "scroll-box",
    pattern: /\.\s*(scrollWidth|scrollHeight|scrollTop|scrollLeft)\b/,
    why: "jsdom reports 0 for every scroll box",
  },

  // ---- cascade -------------------------------------------------------------------
  {
    group: "cascade",
    id: "computed-style",
    pattern: /\bgetComputedStyle\s*\(/,
    why: "jsdom resolves no cascade from a stylesheet and apps/web/vitest.config.ts sets css:false, so a computed value there is the inline one or nothing",
  },

  // ---- gated: the file's expensive half does not run in CI at all -----------------
  {
    group: "gated",
    id: "env-gated",
    pattern: /\b(?:test|it|describe)\s*\.\s*(?:runIf|skipIf)\s*\(/,
    why: "some of this file's tests are behind a VITE_*_SHOTS flag that CI does not set, so what a CI run executes is not what the file is for: a jsdom verdict on the ungated remainder says nothing about the gated majority",
  },

  // ---- harness: an edit to migrate, not a reason to stay --------------------------
  {
    group: "harness",
    id: "viewport",
    pattern: /\bpage\s*\.\s*viewport\s*\(/,
    why: "vitest/browser API with no jsdom equivalent, but on its own it only sizes a window: whether that matters depends on what is then asserted",
  },
  {
    group: "harness",
    id: "fonts-ready",
    pattern: /document\s*\.\s*fonts\s*\.\s*ready\b/,
    why: "a settle-before-measuring idiom copied across the lane, not an assertion about fonts",
  },
  {
    group: "harness",
    id: "server-commands",
    pattern: /\bcommands\s*\.\s*[a-zA-Z]/,
    why: "the vitest/browser server channel; in a node environment the same write is node:fs",
  },
];

const SIGNAL_GROUP = new Map(SIGNALS.map((s) => [s.id, s.group]));
/** Groups that make a browser genuinely load-bearing for an assertion. */
const BLOCKING = new Set(["paint", "box", "cascade"]);

/** The population, from Vitest rather than from a glob written down here. */
function collectedBrowserFiles() {
  const require = createRequire(import.meta.url);
  const vitestCli = join(dirname(require.resolve("vitest/package.json")), "vitest.mjs");
  const stdout = execFileSync(
    process.execPath,
    [vitestCli, "list", "--config", "vitest.browser.config.ts", "--filesOnly"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    },
  );
  const files = [];
  for (const line of stdout.split("\n")) {
    const match = /^\[([^\]]+)\]\s+(\S.*?)\s*$/.exec(line);
    if (match) files.push({ project: match[1], file: match[2] });
  }
  return files;
}

/**
 * Strip comments and string/template literals before matching.
 *
 * Without this, a header comment explaining that a widget must not scroll counts as a
 * scrolling dependency and a failure message quoting `getBoundingClientRect` counts as a
 * measurement. Both occur in this tree: the first draft of this script, matching raw
 * source, put 73 files in the font-metrics group, of which the real number is 4 — the rest
 * were prose and `await document.fonts.ready`.
 */
function stripInert(source) {
  let out = "";
  let i = 0;
  let state = "code";
  let quote = "";
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (state === "code") {
      if (c === "/" && next === "/") {
        state = "line";
        i += 2;
        out += "  ";
        continue;
      }
      if (c === "/" && next === "*") {
        state = "block";
        i += 2;
        out += "  ";
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        state = "string";
        quote = c;
        out += " ";
        i += 1;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    if (state === "line") {
      if (c === "\n") {
        state = "code";
        out += "\n";
      } else out += " ";
      i += 1;
      continue;
    }
    if (state === "block") {
      if (c === "*" && next === "/") {
        state = "code";
        out += "  ";
        i += 2;
        continue;
      }
      out += c === "\n" ? "\n" : " ";
      i += 1;
      continue;
    }
    if (c === "\\") {
      out += "  ";
      i += 2;
      continue;
    }
    if (c === quote) {
      state = "code";
      out += " ";
      i += 1;
      continue;
    }
    out += c === "\n" ? "\n" : " ";
    i += 1;
  }
  return out;
}

/**
 * Slice a source into its `it(`/`test(` bodies by matching parentheses from the call.
 *
 * Anything outside every body is file-level — imports, module constants, helpers,
 * `beforeEach` — and a signal there is attributed to the FILE, because it reaches every
 * test in it and so cannot be split off by moving a minority of tests.
 */
function testRanges(code) {
  const ranges = [];
  const call =
    /\b(?:it|test)\s*(?:\.\s*(?:each|skip|only|todo|concurrent|sequential|fails|for|runIf|skipIf)\s*)*(?:\(|`)/g;
  let match = call.exec(code);
  for (; match !== null; match = call.exec(code)) {
    let i = match.index + match[0].length - 1;
    if (code[i] === "`") {
      i = code.indexOf("(", i);
      if (i < 0) continue;
    }
    let depth = 0;
    let j = i;
    for (; j < code.length; j += 1) {
      if (code[j] === "(") depth += 1;
      else if (code[j] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (j >= code.length) continue;
    ranges.push({ start: match.index, end: j + 1 });
    call.lastIndex = j + 1;
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function testName(source, range) {
  const head = source.slice(range.start, Math.min(range.start + 300, range.end));
  const quoted = /["'`]([^"'`]{3,})["'`]/.exec(head);
  return quoted ? quoted[1] : head.split("\n")[0].trim();
}

const signalsIn = (text) => SIGNALS.filter((s) => s.pattern.test(text)).map((s) => s.id);

function classifyFile(file) {
  const source = readFileSync(join(repoRoot, file), "utf8");
  const code = stripInert(source);
  const ranges = testRanges(code);

  const tests = ranges.map((r) => ({
    name: testName(source, r),
    signals: signalsIn(code.slice(r.start, r.end)),
  }));

  let outside = "";
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) outside += code.slice(cursor, r.start);
    cursor = Math.max(cursor, r.end);
  }
  outside += code.slice(cursor);
  const fileSignals = signalsIn(outside);

  const all = [...new Set([...fileSignals, ...tests.flatMap((t) => t.signals)])];
  const groups = [...new Set(all.map((id) => SIGNAL_GROUP.get(id)))];
  const blockingFile = fileSignals.filter((id) => BLOCKING.has(SIGNAL_GROUP.get(id)));
  const blockingTests = tests.filter((t) =>
    t.signals.some((id) => BLOCKING.has(SIGNAL_GROUP.get(id))),
  );

  let category;
  if (blockingFile.length === 0 && blockingTests.length === 0) {
    // Nothing in the file asks a browser for anything it could not get from jsdom. It may
    // still call a harness API, which is an edit rather than a reason.
    category = 2;
  } else if (blockingFile.length > 0) {
    // A file-level dependency reaches every test, so there is no minority to split out.
    category = 1;
  } else if (blockingTests.length === tests.length) {
    category = 1;
  } else {
    category = 3;
  }

  return {
    file,
    category,
    tests: tests.length,
    blockingTests: blockingTests.length,
    fileSignals,
    signals: all,
    groups,
    /** True when every blocking signal in the file is box measurement. The fourth category. */
    boxOnly: all.length > 0 && groups.filter((g) => BLOCKING.has(g)).join() === "box",
    detail: tests,
  };
}

// ---------------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const auditTarget = flag("--audit");
if (auditTarget) {
  const r = classifyFile(auditTarget);
  console.log(`${auditTarget}\n  category ${r.category}, ${r.tests} authored tests`);
  console.log(`  file-level signals: ${r.fileSignals.join(", ") || "(none)"}`);
  for (const t of r.detail) console.log(`  [${t.signals.join(",") || "-"}] ${t.name}`);
  for (const id of r.signals) {
    console.log(
      `  why ${id} (${SIGNAL_GROUP.get(id)}): ${SIGNALS.find((s) => s.id === id).why}`,
    );
  }
  process.exit(0);
}

/**
 * Per-file and per-test figures from a vitest json report.
 *
 * `ms` is the file's own wall clock (`endTime - startTime`); `tests` maps each test's
 * `fullName` to its status and its own duration, which is what lets a mixed file be split by
 * TIME rather than by test count. A file of 200 cheap DOM assertions and one screenshot is
 * not 0.5% browser-bound.
 */
function readReport(path) {
  if (!path) return new Map();
  const report = JSON.parse(readFileSync(path, "utf8"));
  const byFile = new Map();
  for (const f of report.testResults) {
    const relative = f.name.startsWith(`${repoRoot}/`)
      ? f.name.slice(repoRoot.length + 1)
      : f.name;
    const tests = new Map();
    for (const a of f.assertionResults) {
      tests.set(a.fullName, { status: a.status, ms: a.duration ?? 0 });
    }
    byFile.set(relative, {
      ms: f.endTime - f.startTime,
      runtimeTests: f.assertionResults.length,
      failed: f.assertionResults.filter((a) => a.status === "failed").length,
      passed: f.assertionResults.filter((a) => a.status === "passed").length,
      tests,
      message: f.message ?? "",
    });
  }
  return byFile;
}

/**
 * The empirical verdict for one file: what happened when it ran, unedited, in jsdom.
 *
 *  - `pass`   every test that ran passed, so nothing in it observably needed a browser;
 *  - `mixed`  some passed and some failed, so the browser is load-bearing for a MINORITY;
 *  - `fail`   everything that ran failed;
 *  - `error`  nothing ran, so the run says nothing and the static scan has to answer.
 *
 * `pass` is NECESSARY AND NOT SUFFICIENT for "could be jsdom", and the document says so at
 * length: a test can pass in jsdom while asserting nothing there. The only evidence that
 * settles it is an injected defect, which is why the sample migration exists.
 */
function jsdomVerdict(entry) {
  if (!entry) return null;
  const ran = entry.failed + entry.passed;
  if (ran === 0) return "error";
  if (entry.failed === 0) return "pass";
  if (entry.passed === 0) return "fail";
  return "mixed";
}

const timings = readReport(flag("--timings"));
const jsdom = readReport(flag("--jsdom"));

const population = collectedBrowserFiles();
const results = [...new Set(population.map((p) => p.file))].sort().map((file) => {
  const scan = classifyFile(file);
  const browserRun = timings.get(file);
  const jsdomRun = jsdom.get(file);
  const verdict = jsdomVerdict(jsdomRun);

  /**
   * The browser time inside this file that a browser is load-bearing for, split by matching
   * each test's `fullName` between the two runs. A test that failed in jsdom needs the
   * browser; one that passed there does not (subject to the caveat on `jsdomVerdict`).
   */
  let browserBoundMs = null;
  let jsdomCapableMs = null;
  let unmatched = 0;
  if (browserRun && jsdomRun) {
    browserBoundMs = 0;
    jsdomCapableMs = 0;
    for (const [name, test] of browserRun.tests) {
      const twin = jsdomRun.tests.get(name);
      if (!twin || twin.status === "skipped") {
        unmatched += 1;
        browserBoundMs += test.ms;
        continue;
      }
      if (twin.status === "failed") browserBoundMs += test.ms;
      else jsdomCapableMs += test.ms;
    }
  }

  /**
   * The empirical run decides where it spoke; the scan decides where it could not.
   *
   * ONE OVERRIDE, and it is not a fudge. A file whose expensive tests are behind a
   * `VITE_*_SHOTS` flag runs almost nothing in CI, so a jsdom pass over the ungated
   * remainder is a verdict on the wrong population: 37 files here are in that shape and the
   * gated half is screenshots to a man. Such a file is category 1 or 3 by what it is FOR,
   * never 2, and the report counts them on their own line so the override is visible.
   */
  const gated = scan.signals.includes("env-gated");
  const fromRun =
    verdict === "pass"
      ? 2
      : verdict === "mixed"
        ? 3
        : verdict === "fail"
          ? 1
          : scan.category;
  const category = gated && fromRun === 2 ? 1 : fromRun;

  return {
    ...scan,
    scanCategory: scan.category,
    category,
    gated,
    categoryFrom:
      gated && fromRun === 2
        ? "env gate"
        : verdict === null || verdict === "error"
          ? "scan"
          : "jsdom run",
    ms: browserRun?.ms ?? null,
    runtimeTests: browserRun?.runtimeTests ?? null,
    jsdom: verdict,
    jsdomMs: jsdomRun?.ms ?? null,
    jsdomFailed: jsdomRun?.failed ?? null,
    browserBoundMs,
    jsdomCapableMs,
    unmatchedTests: unmatched,
  };
});

const outJson = flag("--json");
if (outJson) writeFileSync(outJson, JSON.stringify(results, null, 2));

const outCsv = flag("--csv");
if (outCsv) {
  const rows = [
    "file,category,authored_tests,runtime_tests,browser_ms,jsdom,jsdom_ms,box_only,signals",
    ...results.map((r) =>
      [
        r.file,
        r.category,
        r.tests,
        r.runtimeTests ?? "",
        r.ms ?? "",
        r.jsdom ?? "",
        r.jsdomMs ?? "",
        r.boxOnly ? "yes" : "",
        r.signals.join(" "),
      ].join(","),
    ),
  ];
  writeFileSync(outCsv, `${rows.join("\n")}\n`);
}

const sum = (list, key) => list.reduce((a, r) => a + (r[key] ?? 0), 0);
const totalMs = sum(results, "ms");
const pct = (n) => (totalMs ? `${((n / totalMs) * 100).toFixed(1)}%` : "n/a");

console.log(
  `population ${results.length} files, ${sum(results, "tests")} authored test blocks, ` +
    `${sum(results, "runtimeTests")} runtime tests, ${(totalMs / 1000).toFixed(0)}s of measured file time\n`,
);

const LABELS = [
  [1, "1  needs a browser"],
  [3, "3  mixed"],
  [2, "2  could be jsdom"],
];
console.log(
  "category                  files   tests      seconds     share   browser-bound s",
);
for (const [category, label] of LABELS) {
  const group = results.filter((r) => r.category === category);
  console.log(
    `${label.padEnd(24)} ${String(group.length).padStart(5)} ${String(sum(group, "runtimeTests")).padStart(7)} ` +
      `${(sum(group, "ms") / 1000).toFixed(0).padStart(12)} ${pct(sum(group, "ms")).padStart(9)} ` +
      `${(sum(group, "browserBoundMs") / 1000).toFixed(0).padStart(17)}`,
  );
}
const decided = results.filter((r) => r.categoryFrom === "scan");
console.log(
  `\n${decided.length} of ${results.length} files were categorised from the static scan rather than the run, ` +
    `because nothing ran in jsdom (${(sum(decided, "ms") / 1000).toFixed(0)}s, ${pct(sum(decided, "ms"))}):`,
);
for (const r of decided) {
  console.log(`  cat ${r.category}  ${(r.ms / 1000).toFixed(1).padStart(6)}s  ${r.file}`);
}

const gatedFiles = results.filter((r) => r.gated);
const gatedOverridden = results.filter((r) => r.categoryFrom === "env gate");
const browserRunReport = flag("--timings") ? readReport(flag("--timings")) : new Map();
let skippedInCi = 0;
for (const entry of browserRunReport.values()) {
  for (const test of entry.tests.values()) if (test.status === "skipped") skippedInCi += 1;
}
console.log(
  `\nthe env gate: ${gatedFiles.length} files hold tests behind a VITE_* flag CI never sets, ` +
    `so ${skippedInCi} of the suite's ${sum(results, "runtimeTests")} tests do not run on any CI run.\n` +
    `  ${gatedOverridden.length} of them passed in jsdom on their ungated remainder and were moved OUT of category 2 for it.`,
);

console.log(
  "\ncategory 3 in detail: how much of a mixed file's browser time is browser-bound",
);
const mixed = results.filter((r) => r.category === 3).sort((a, b) => b.ms - a.ms);
console.log(
  `  ${mixed.length} files, ${(sum(mixed, "ms") / 1000).toFixed(0)}s total, of which ` +
    `${(sum(mixed, "browserBoundMs") / 1000).toFixed(0)}s is browser-bound and ` +
    `${(sum(mixed, "jsdomCapableMs") / 1000).toFixed(0)}s could be jsdom ` +
    `(${((sum(mixed, "jsdomCapableMs") / sum(mixed, "ms")) * 100).toFixed(0)}% of the mixed files' time)`,
);
for (const r of mixed.slice(0, 15)) {
  console.log(
    `    ${(r.ms / 1000).toFixed(1).padStart(6)}s  browser-bound ${(r.browserBoundMs / 1000).toFixed(1).padStart(6)}s  ` +
      `${String(r.jsdomFailed).padStart(3)}/${String(r.runtimeTests).padEnd(4)} tests  ${r.file}`,
  );
}

console.log(
  "\nfourth category: every blocking signal is box measurement, and no frame is taken",
);
const boxOnly = results.filter((r) => r.boxOnly);
console.log(
  `  ${boxOnly.length} files, ${sum(boxOnly, "runtimeTests")} tests, ` +
    `${(sum(boxOnly, "ms") / 1000).toFixed(0)}s, ${pct(sum(boxOnly, "ms"))} of browser time`,
);
const boxAny = results.filter((r) => r.groups.includes("box"));
const boxNoFrame = boxAny.filter((r) => !r.signals.includes("screenshot"));
console.log(
  `  for scale: ${boxAny.length} files measure a box at all (${(sum(boxAny, "ms") / 1000).toFixed(0)}s, ${pct(sum(boxAny, "ms"))}), ` +
    `of which ${boxNoFrame.length} capture no frame beside the measurement ` +
    `(${(sum(boxNoFrame, "ms") / 1000).toFixed(0)}s, ${pct(sum(boxNoFrame, "ms"))})`,
);
// The vacuity check, which is the one that decides whether the fourth category is really
// free. A box measurement that PASSES in jsdom, where every box reads zero, was never
// load-bearing on the box being real. Env-gated files are reported apart, because their
// measurement did not run in either harness and so passed nothing.
const vacuous = boxAny.filter((r) => r.jsdom === "pass");
const vacuousLive = vacuous.filter((r) => !r.gated);
console.log(
  `  vacuity: ${vacuousLive.length} of the ${boxAny.length} box-measuring files pass in jsdom on tests CI actually runs, ` +
    `so that many box measurements are not load-bearing on the box being real.\n` +
    `  (${vacuous.length - vacuousLive.length} more appear to pass, but every one is env-gated: its measurement ran in neither harness.)`,
);

console.log("\nby signal: files, and the seconds those files account for");
const perSignal = new Map();
for (const r of results) {
  for (const id of r.signals) {
    const e = perSignal.get(id) ?? { files: 0, ms: 0 };
    e.files += 1;
    e.ms += r.ms ?? 0;
    perSignal.set(id, e);
  }
}
for (const [id, e] of [...perSignal].sort((a, b) => b[1].files - a[1].files)) {
  console.log(
    `  ${String(e.files).padStart(4)} files  ${(e.ms / 1000).toFixed(0).padStart(5)}s  ` +
      `${id} (${SIGNAL_GROUP.get(id)})`,
  );
}

if (jsdom.size) {
  console.log("\nis jsdom actually cheaper? the same files, both harnesses, same box");
  const both = results.filter((r) => r.ms !== null && r.jsdomMs !== null);
  const clean = both.filter((r) => r.jsdom === "pass");
  console.log(
    `  all ${both.length} files:            browser ${(sum(both, "ms") / 1000).toFixed(0)}s   ` +
      `jsdom ${(sum(both, "jsdomMs") / 1000).toFixed(0)}s   ` +
      `ratio ${(sum(both, "jsdomMs") / sum(both, "ms")).toFixed(2)}x`,
  );
  console.log(
    `  the ${clean.length} that pass in jsdom:  browser ${(sum(clean, "ms") / 1000).toFixed(0)}s   ` +
      `jsdom ${(sum(clean, "jsdomMs") / 1000).toFixed(0)}s   ` +
      `ratio ${(sum(clean, "jsdomMs") / sum(clean, "ms")).toFixed(2)}x`,
  );
  console.log(
    "  (a failing test often short-circuits, so the all-files jsdom figure is a FLOOR; the second row is the like-for-like one)",
  );

  console.log(
    "\nwhere the static scan and the run disagree, which is the interesting output",
  );
  for (const r of results) {
    if (r.jsdom === null || r.jsdom === "error") continue;
    const scanSaid = r.scanCategory;
    if (scanSaid === r.category) continue;
    console.log(
      `  scan said ${scanSaid}, run said ${r.category}  ${(r.ms / 1000).toFixed(1).padStart(6)}s  ` +
        `${r.file}  [${r.signals.join(",") || "no signal"}]`,
    );
  }
}
