/**
 * A widget that judges an answer has to say so with the shared success badge.
 *
 * `useWidgetSuccess` is a no-op outside its host and costs one line to add, which is
 * exactly why it gets forgotten: a widget missing it looks and behaves fine, it just
 * never confirms a correct step, and the learner gets silence where every other widget
 * pops a checkmark. So this reads the sources rather than a written-down list of ids.
 *
 * A widget passes by calling the hook, or by delegating to a `kinds/` archetype that
 * calls it internally. The exceptions are the widgets with no correct-or-wrong moment at
 * all, and they are pinned here by name with the reason, so adding one is a deliberate
 * edit to this file rather than something a new widget can drift into.
 *
 * ## The property is the badge FIRING, and for a year it was the hook being NAMED
 *
 * This read `/\buseWidgetSuccess\b/` over the whole file, which an
 * `import { ..., useWidgetSuccess, ... } from "../widgetMechanics"` line satisfies on its
 * own. So the guarantee behind roughly 180 widgets was that somebody had typed the
 * identifier once — and the paragraph above says why that is not the claim: a widget missing
 * the badge "looks and behaves fine, it just never confirms a correct step". Holding the hook
 * and never calling it produces exactly that silence, and it produced it green. Measured at
 * `3fbe5fcb`: replace `RationalizeExplore`'s one `success();` with `void success;` — hook
 * still held, lint-clean — and this file reported `292 passed`.
 *
 * So the predicate is the hook's RETURN VALUE INVOKED. Every one of the 159 sources that
 * names the hook binds it the same way, `const success = useWidgetSuccess()`, so the shape is
 * readable from source: find the binding, then find a call on the name it bound. A regex is
 * still a regex, which is why `PREDICATE_CASES` below drives it over both halves of the
 * defect — a bare import must read as NOT firing, and a held-and-never-called binding must
 * read as NOT firing — rather than leaving "the predicate measures the right thing" as an
 * argument in a comment.
 *
 * ## And the population is every judging surface, not every path under `interactive/`
 *
 * `cfu.tsx` is the end-of-lesson check. It grades a typed answer through the real checker and
 * it fires the badge today, and nothing required it to: it is not under `interactive/`,
 * because it is not a board. `revealReAsk.test.ts` had already pulled the same file into its
 * own glob for the same reason, and this one had not, so stripping `cfu.tsx`'s badge also
 * reported `292 passed`. The sibling browser guard does not cover the gap either —
 * `widgetSuccessDomains.browser.test.tsx` drives the badge for real, and it drives three
 * widgets.
 */

import { describe, expect, it } from "vitest";

const SOURCES = import.meta.glob(
  // `cfu.tsx` is here for the reason `revealReAsk.test.ts` gives for the same inclusion: the
  // failure mode belongs to the surface that judges an answer, and the end-of-lesson check
  // judges one. It is not under `interactive/` because it is not a board, which is exactly
  // how a path-shaped sweep loses a surface.
  ["./interactive/*.tsx", "./interactive/kinds/*.tsx", "./visuals.tsx", "./cfu.tsx"],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

/**
 * Modules under `interactive/` that are not widgets at all: they draw a control or a
 * coordinate plane for the widgets that import them, and never judge anything.
 */
const SHARED_PRIMITIVES = new Set([
  "DirectionPad.tsx", // the four arrow keys, shared by the stepper widgets
  "RationalGaugePlane.tsx", // axes, curve and tick primitives for the D5 gauge widgets
]);

/**
 * Widgets with nothing to judge. Every one of them is either an animation the learner
 * only plays, or a reveal where every tap is correct by construction, so a badge would
 * celebrate pressing a button.
 */
const UNJUDGED: Record<string, string> = {
  // Play / Pause / Step / Back / Replay animations: no answer is ever given.
  "LinearModelWalkthrough.tsx": "animation only",
  "LinearSystemWalkthrough.tsx": "animation only",
  "RationalAddWalkthrough.tsx": "animation only",
  "RationalClearMeasureWalkthrough.tsx": "animation only",
  "RationalInterceptWalkthrough.tsx": "animation only",
  "RationalReciprocalWalkthrough.tsx": "animation only",
  // Tap-to-reveal and free exploration: every tap is valid by construction.
  "CommutativeAssociativePlay.tsx": "every regrouping shown is a correct one",
  "EquivalentFractionPlay.tsx": "every scaling shown is a correct one",
  // `SubtractAsAddPlay` left this list on 2026-08-04. It stopped revealing the same
  // difference two ways and started asking the learner to pick the rewrite and then the
  // sum, so both halves are now judged and both fire the badge.
};

/**
 * The binding every judged widget makes: `const success = useWidgetSuccess()`.
 *
 * The name is captured rather than assumed. All 159 sources holding the hook today spell it
 * `success`, and pinning that spelling would make a rename read as a missing badge, which is
 * a false red in the one direction this file cannot afford one — a widget renaming its
 * binding is doing nothing wrong.
 */
const BINDS_HOOK = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useWidgetSuccess\s*\(\s*\)/;

/** Delegating to an archetype counts: the archetype fires the badge itself. */
const USES_ARCHETYPE = /from "\.\/kinds\//;

/**
 * Does this source actually FIRE the badge, as opposed to naming the hook that returns it?
 *
 * Two steps, because the defect lives between them: bind the hook, then call what it bound.
 * The binding line itself cannot be mistaken for a call — in `= useWidgetSuccess()` the
 * character before `success` is a word character, so the lookbehind refuses it — and neither
 * can `props.success()` or `undone()` under a binding named `done`. `PREDICATE_CASES` drives
 * all of those.
 */
function firesBadge(source: string): boolean {
  const bound = BINDS_HOOK.exec(source);
  if (bound === null) {
    return false;
  }
  const name = bound[1] as string;
  return new RegExp(`(?<![\\w$.])${name}\\s*\\(`).test(source);
}

/**
 * THE FLOOR UNDER THE PREDICATE, and the reason this file is not the guard it replaced.
 *
 * Everything below is one boolean over a string, and a boolean that is always true reports
 * a green sweep over a tree in which nothing fires anything. The two `false` cases are the
 * measured defect written down as a case: the first is the import line that satisfied the
 * old `/\buseWidgetSuccess\b/`, the second is the held-and-never-called binding that
 * `RationalizeExplore` was injected with. Neither may ever read as a badge again.
 */
const PREDICATE_CASES: ReadonlyArray<{ what: string; source: string; fires: boolean }> = [
  {
    what: "an import line naming the hook and nothing else",
    source: 'import { useRevealFill, useWidgetSuccess } from "../widgetMechanics";\n',
    fires: false,
  },
  {
    what: "the hook held and never called",
    source:
      'import { useWidgetSuccess } from "../widgetMechanics";\n' +
      "const success = useWidgetSuccess();\nvoid success;\n",
    fires: false,
  },
  {
    what: "the hook held and called",
    source: "const success = useWidgetSuccess();\nif (right) {\n  success();\n}\n",
    fires: true,
  },
  {
    what: "the hook bound under some other name and called",
    source: "const markCorrect = useWidgetSuccess();\nmarkCorrect();\n",
    fires: true,
  },
  {
    what: "a longer identifier that merely ENDS with the bound name",
    source: "const done = useWidgetSuccess();\nundone();\n",
    fires: false,
  },
  {
    what: "a same-named method on something else",
    source: "const success = useWidgetSuccess();\nprops.success();\n",
    fires: false,
  },
];

const WIDGETS = Object.entries(SOURCES)
  .filter(([path]) => !path.includes(".test."))
  .filter(([path]) => !SHARED_PRIMITIVES.has(basename(path)));

/**
 * The judging surfaces that are NOT boards, as a census rather than a floor.
 *
 * The composition claim beside the count below, and the one the count cannot make: a glob
 * quietly narrowed back to `interactive/` loses `cfu.tsx` and stays comfortably above any
 * floor, because 160-odd boards swamp the two surfaces that are not boards. So they are named.
 * It fails the other way too — a third non-board judging surface appearing here is a surface
 * nobody has reviewed against this rule, and it should be read before it is added.
 */
const OFF_BOARD_JUDGES = WIDGETS.map(([path]) => path)
  .filter((path) => !path.startsWith("./interactive/"))
  .sort();

/** The sources that fire the badge in their own body, rather than delegating to an archetype. */
const FIRES_ITS_OWN = WIDGETS.filter(([, source]) => firesBadge(source));

describe("every judged widget fires the shared success badge", () => {
  it.each(PREDICATE_CASES.map((c) => [c.what, c] as const))(
    "the predicate reads %s correctly",
    (_what, testCase) => {
      expect(
        firesBadge(testCase.source),
        `the predicate reads ${testCase.what} as ${firesBadge(testCase.source) ? "firing" : "not firing"}, ` +
          "so every reading it gives below is worth nothing. Fix firesBadge; do not weaken this case",
      ).toBe(testCase.fires);
    },
  );

  it("the sweep found the widget sources", () => {
    // A floor, not a census. The sweep below is derived from the glob, so a new widget is
    // covered the day it lands and this number never needed to move for that; all it can do
    // as an equality is fail on growth it has no opinion about. What it is FOR is the case
    // where the glob resolves to nothing or the tree shrinks, because `it.each` over an empty
    // list reports no tests and passes. 94 widgets under `interactive/`, the seven shared
    // interaction kinds and `visuals.tsx` (which hosts the two inline PEMDAS solvers) is
    // where it stood when the floor was set.
    expect(
      WIDGETS.length,
      "the source sweep found fewer widget files than the tree is known to hold",
    ).toBeGreaterThanOrEqual(102);

    // COMPOSITION, beside the floor, because a floor constrains size and not shape. See
    // `OFF_BOARD_JUDGES`: the two surfaces here are 2 of 190-odd, so losing one of them is
    // invisible to any count this file could carry.
    expect(
      OFF_BOARD_JUDGES,
      "the population's non-board judging surfaces have changed. Losing one means the glob " +
        "has narrowed back to a path shape and a surface that grades an answer is no longer " +
        "swept; gaining one means a new judging surface owes a read against this rule",
    ).toEqual(["./cfu.tsx", "./visuals.tsx"]);

    // And the sweep passes on its own predicate rather than on the archetype escape hatch.
    // `USES_ARCHETYPE` is a substring test over an import line, which is the shape this file
    // was just corrected for, so if the population ever came to clear the bar mostly through
    // that, the badge claim would be resting on the weaker half again. Stated as a share of
    // the population rather than a count, so growth needs no edit here.
    expect(
      FIRES_ITS_OWN.length,
      "fewer than half the judged sources fire the badge in their own body, so this file is " +
        "mostly asserting that widgets import from ./kinds/",
    ).toBeGreaterThan(WIDGETS.length / 2);
  });

  it.each(WIDGETS.map(([path]) => path))("%s judges or is listed as unjudged", (path) => {
    const source = SOURCES[path] ?? "";
    const wired = firesBadge(source) || USES_ARCHETYPE.test(source);
    const excused = basename(path) in UNJUDGED;
    // Spelled out rather than asserted as a bare boolean, so a failure names the file
    // and says which of the two ways out it is missing.
    expect(
      wired || excused,
      `${basename(path)} neither fires the badge nor is listed as unjudged`,
    ).toBe(true);
  });

  it.each(Object.keys(UNJUDGED))(
    "%s is excused because it really judges nothing",
    (name) => {
      // This used to be `expect(Object.keys(UNJUDGED).length).toBe(9)` under the title "the
      // unjudged list is exactly the widgets with no correct answer", which counted the list
      // against a literal in the same file: the only edit it could ever fail on was an edit to
      // the list, and it had no opinion about whether an excused widget was still unjudged. A
      // widget that GAINED a correct answer, and the badge with it, would stay excused, and the
      // sweep above lets an excused widget through without looking. So the claim is made about
      // the source instead: an excuse and a badge together mean the excuse is stale.
      const source =
        Object.entries(SOURCES).find(([path]) => basename(path) === name)?.[1] ?? "";
      expect(
        source.length,
        `${name} is excused but its source was not read`,
      ).toBeGreaterThan(0);
      expect(
        firesBadge(source) || USES_ARCHETYPE.test(source),
        `${name} judges an answer now, so drop it from the unjudged list`,
      ).toBe(false);
    },
  );

  it("the unjudged list is not empty, so the check above is not vacuous", () => {
    // 9 until `SubtractAsAddPlay` started judging and left the list on 2026-08-04. What this
    // floor is for is the list being emptied, which would report the sweep above as green over
    // nothing; it is not a claim that any particular widget belongs on it, and a member that
    // gains a badge is caught by the source read above rather than by a count here.
    expect(Object.keys(UNJUDGED).length).toBeGreaterThanOrEqual(8);
  });

  it.each([...Object.keys(UNJUDGED), ...SHARED_PRIMITIVES])(
    "%s named in an exception list still exists",
    (name) => {
      const found = Object.keys(SOURCES).some((path) => basename(path) === name);
      expect(
        found,
        `${name} is excused but no longer exists; drop or rename the entry`,
      ).toBe(true);
    },
  );

  it.each([...SHARED_PRIMITIVES])("%s is still a primitive and judges nothing", (name) => {
    // `SHARED_PRIMITIVES` had only the direction above: it was checked for still existing,
    // and never for still being a primitive. So a control that grew a judged interaction —
    // which is the ordinary way one of these evolves — would leave the sweep entirely by
    // sitting in a list that claims it "never judges anything". `UNJUDGED` has carried this
    // pair since `#191`; this is the same pair for the other list.
    const source =
      Object.entries(SOURCES).find(([path]) => basename(path) === name)?.[1] ?? "";
    expect(source.length, `${name} is excused but its source was not read`).toBeGreaterThan(
      0,
    );
    expect(
      firesBadge(source),
      `${name} fires the success badge, so it judges an answer and is a widget rather than a ` +
        "shared primitive. Drop it from SHARED_PRIMITIVES and let the sweep above cover it",
    ).toBe(false);
  });
});

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}
