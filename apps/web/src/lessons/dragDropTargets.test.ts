/**
 * A board that lets a learner PICK a chip up has to let them PUT it down.
 *
 * HTML5 drag-and-drop delivers a `drop` only to a target that cancels `dragover`. A board can
 * therefore be entirely correct in its own logic, mark its chips `draggable`, hold the picked
 * chip in `usePickup`, and still refuse every drag, because the refusal happens in the platform
 * before any of that code runs. That is what POL.2 and POL.4 did: both were built on
 * `svgHitTarget.tsx`, which wired `onClick` and nothing else, and both took a tap-then-tap while
 * ignoring the gesture their own chips advertise.
 *
 * ## Why this sweep is written against the BEHAVIOUR
 *
 * `widgetDropSlots.browser.test.tsx` already drives a real drag, and it was green throughout,
 * because its population is the `LabelParts` kind. Scoping a guard to the layer where a mechanic
 * is IMPLEMENTED leaves every surface that reimplements the mechanic outside it, and a bespoke
 * board carrying its own targets is exactly such a surface. So the population here is "renders a
 * chip a learner can pick up", derived from the sources, and the requirement is that its targets
 * can receive one — whether the board declares the handler itself or reaches it through a shared
 * primitive that does.
 *
 * ## What it cannot see
 *
 * Reading source proves a handler is DECLARED, not that it is attached to the element a learner
 * aims at. `svgHitTargetDrop.browser.test.tsx` drives the real gesture on the two boards this was
 * written for; this file is what stops the next bespoke board being written without one.
 */

import { describe, expect, it } from "vitest";

const LESSON_SOURCES = import.meta.glob(["./*.tsx", "./interactive/**/*.tsx"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const SOURCES = Object.entries(LESSON_SOURCES).filter(([path]) => !path.includes(".test."));

/**
 * `draggable` written as a JSX PROP, bare or with a value, rather than the word appearing in a
 * sentence. Two widget files discuss dragging in their header prose without offering an HTML5
 * drag, and a substring match would put both in the population and neither in the tree.
 */
const DRAGGABLE_PROP = /(^|\n)\s*draggable(=\{[^}]*\})?\s*(\n|$)/;

/** Anything at all saying the word, which is the set every file below has to be classified out of. */
const MENTIONS_DRAGGING = SOURCES.filter(([, source]) => /\bdraggable\b/.test(source));

const OFFERS_A_DRAG = MENTIONS_DRAGGING.filter(([, source]) => DRAGGABLE_PROP.test(source));

/**
 * The files that say "draggable" and offer no drag, each with the reason it is not one.
 *
 * Declared rather than quietly filtered out by a regex that happens to skip them: a file that
 * discusses dragging and a file that forgot to wire it read the same from outside the sweep, and
 * the assertions below fail in both directions — an entry that stops mentioning the word at all
 * is stale, and an entry that starts offering a real drag has to leave the list and take the
 * requirement with it.
 */
const NOT_HTML5_DRAG: ReadonlyMap<string, string> = new Map([
  [
    // TRG.5: the phase handle is moved with POINTER events on an SVG element, which is a
    // different mechanic with a different failure mode — there is no `dragover` to cancel, and
    // nothing here would say anything true about it.
    "./interactive/TrigPhaseDrag.tsx",
    "drags with pointer events on an SVG handle, not HTML5 drag-and-drop",
  ],
  [
    // TRG.8: the word appears once, in the header prose, describing a chip on ANOTHER slide.
    "./interactive/TrigReferenceTable.tsx",
    "mentions a draggable chip in its header prose; the board itself is a table",
  ],
]);

/** A module that can RECEIVE a drop: it cancels `dragover`, which is the platform's condition. */
function isDropCapable(source: string): boolean {
  return /onDragOver=/.test(source) && /preventDefault\(\)/.test(source);
}

/** `./x` and `../x` resolved against the importing file, in the keys `import.meta.glob` returns. */
function resolveLocal(importer: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const parts = importer.split("/").slice(0, -1);
  for (const segment of specifier.split("/")) {
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  const base = parts.join("/");
  return `${base}.tsx` in LESSON_SOURCES ? `${base}.tsx` : null;
}

/** The local modules a file imports, as source. */
function importedSources(path: string, source: string): { path: string; source: string }[] {
  const found: { path: string; source: string }[] = [];
  for (const match of source.matchAll(/from\s+"([^"]+)"/g)) {
    const resolved = resolveLocal(path, match[1] ?? "");
    if (resolved) {
      found.push({ path: resolved, source: LESSON_SOURCES[resolved] ?? "" });
    }
  }
  return found;
}

/** How a board's targets can take a drop: itself, or a shared primitive it routes them through. */
function dropRoute(path: string, source: string): string | null {
  if (isDropCapable(source)) {
    return path;
  }
  const via = importedSources(path, source).find((dep) => isDropCapable(dep.source));
  return via ? via.path : null;
}

/**
 * The floor. Twelve boards offer a drag today: three shared kinds and nine bespoke widgets.
 *
 * Not a count to maintain. It is the assertion that the sweep is sweeping something, so a glob
 * that stops resolving, or a `draggable` attribute spelt some new way, fails here rather than
 * passing vacuously over an empty population.
 */
const DRAG_FLOOR = 12;

/** And of those, the ones that are nobody's shared kind: the layer the old guard could not see. */
const BESPOKE_FLOOR = DRAG_FLOOR - 3;

describe("every board a learner can pick a chip up on can be dropped on", () => {
  it("the sweep found the boards that offer a drag", () => {
    expect(
      OFFERS_A_DRAG.length,
      "the derived population is shorter than the boards known to offer a drag",
    ).toBeGreaterThanOrEqual(DRAG_FLOOR);
    // And it reaches past the shared kinds, which is the whole point: a floor alone would be
    // satisfied by three kinds plus nine of anything, including nine more kinds.
    expect(
      OFFERS_A_DRAG.filter(([path]) => !path.includes("/kinds/")).length,
      "no bespoke board is in the population, so this is a kinds-only sweep again",
    ).toBeGreaterThanOrEqual(BESPOKE_FLOOR);
  });

  it.each(OFFERS_A_DRAG.map(([path]) => path))(
    "%s gives its chips somewhere the platform will let them land",
    (path) => {
      const route = dropRoute(path, LESSON_SOURCES[path] ?? "");
      expect(
        route,
        `${path} marks chips draggable, but neither it nor anything it imports cancels ` +
          `dragover, so no browser will deliver a drop to its targets`,
      ).not.toBeNull();
    },
  );

  it("at least one board reaches its drop handling through a shared primitive", () => {
    // The route that was missing. If every board declared its own handler this claim would be
    // vacuous, and it is here so that the primitive route stays a route rather than becoming an
    // untested branch of the check above.
    // `route !== path` alone would count a board with NO route at all, since `null` is not its
    // own path either: written that way this stayed green through the injection that took the
    // primitive's handler away, which is the assertion asserting nothing.
    const viaPrimitive = OFFERS_A_DRAG.filter(([path]) => {
      const route = dropRoute(path, LESSON_SOURCES[path] ?? "");
      return route !== null && route !== path;
    });
    expect(viaPrimitive.length).toBeGreaterThanOrEqual(2);
  });

  it.each([...NOT_HTML5_DRAG.keys()])(
    "%s is a declared exception that still exists and still mentions dragging",
    (path) => {
      expect(MENTIONS_DRAGGING.map(([known]) => known)).toContain(path);
    },
  );

  it.each([...NOT_HTML5_DRAG.keys()])(
    "%s has not quietly started offering a real drag",
    (path) => {
      // The other direction: a file that adopts HTML5 dragging has to leave the list, and then
      // it owes a drop-capable target like everything else.
      expect(DRAGGABLE_PROP.test(LESSON_SOURCES[path] ?? "")).toBe(false);
    },
  );

  it("every file that says draggable is either in the population or declared out of it", () => {
    const classified = new Set([
      ...OFFERS_A_DRAG.map(([path]) => path),
      ...NOT_HTML5_DRAG.keys(),
    ]);
    expect(
      MENTIONS_DRAGGING.map(([path]) => path).filter((path) => !classified.has(path)),
      "a file mentions dragging and is neither swept nor excused",
    ).toEqual([]);
  });
});
