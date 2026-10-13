/**
 * Which visuals belong to a shared interaction kind, READ OFF THE SOURCES.
 *
 * Fixing a `kinds/` archetype fixes every widget built on it at once, which is the whole
 * argument for having the archetypes, and it is what makes a per-kind sweep the right shape
 * for a test. The sweeps kept their population as a written-down list of visual ids, though,
 * and a list is the thing a new widget gets left off: `spotTheErrorPalette.browser.test.tsx`
 * swept two of the five widgets built on `SpotTheError` for as long as it took somebody to
 * notice, with a green `expect(list.length).toBe(2)` underneath asserting that the two WERE
 * the family. A number somebody has to remember to bump is the defect, and bumping it only
 * restarts the clock.
 *
 * So the population comes from here instead, the way `revealReAsk.test.ts` finds the widgets
 * that offer a reveal. Callers still declare a FLOOR, because a sweep over an empty list
 * passes without asserting anything and that is indistinguishable from a sweep that worked.
 * A floor catches the glob resolving to nothing, a widget being deleted and a registry entry
 * renamed out from under the lookup; it is deliberately not a ceiling, so growth is swept
 * without an edit anywhere.
 *
 * Test-only, and a sibling of `testHarness.ts` for the same reason: `import.meta.glob` paths
 * resolve against THIS file, so it has to live beside `interactive/` and `visuals.tsx`.
 */

import type { LessonVisualId } from "./visuals";

// The options have to be written out at each call: Vite's glob transform reads them at build
// time and rejects anything but a literal object, so a shared constant is not available here.
const WIDGET_SOURCES = import.meta.glob("./interactive/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const KIND_SOURCES = import.meta.glob("./interactive/kinds/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const REGISTRY_SOURCE =
  (
    import.meta.glob(["./visuals.tsx"], {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>
  )["./visuals.tsx"] ?? "";

/** One widget source in a kind's family, kept with the ids it is registered under. */
export interface KindWidget {
  /** The widget source, as the glob names it. */
  path: string;
  /** The component the registry renders it by, or `null` if the file exports none. */
  component: string | null;
  /**
   * Every registered visual id rendering that component. Plural because one component can be
   * registered twice, and EMPTY rather than dropped when the lookup finds nothing, so a
   * rename on either side of the registry is something a caller can fail on rather than a
   * widget that quietly leaves the sweep.
   */
  ids: LessonVisualId[];
}

/** The bare names of the shared interaction kinds, e.g. `SpotTheError`. */
export function interactionKinds(): string[] {
  return Object.keys(KIND_SOURCES).map(fileStem).sort();
}

/**
 * The kinds whose own source matches `marker` — the derived population for a claim about
 * "every kind that does X", where X is a shared hook or component the archetype opts into.
 */
export function kindsMatching(marker: RegExp): string[] {
  return Object.entries(KIND_SOURCES)
    .filter(([, source]) => marker.test(source))
    .map(([path]) => fileStem(path))
    .sort();
}

/** Every widget source that renders `kind`, whether or not the registry knows it. */
export function widgetsBuiltOn(kind: string): KindWidget[] {
  const imports = new RegExp(`from\\s+"\\./kinds/${kind}"`);
  return sourcesMatching(imports);
}

/** Every registered visual id whose widget is built on `kind`. */
export function visualsBuiltOn(kind: string): LessonVisualId[] {
  return widgetsBuiltOn(kind).flatMap((widget) => widget.ids);
}

/**
 * Every widget whose source matches `marker`, whether it owns the code or inherits it.
 *
 * The derived population for a claim about "every widget that does X" where X is NOT a shared
 * kind. Most of this tree is bespoke, so a mechanic can be adopted by four unrelated widgets
 * with no archetype between them and `widgetsBuiltOn` finds none of them.
 *
 * A kind that matches brings its whole family with it, because a widget built on one inherits
 * the mechanic without the marker appearing in its own file.
 */
export function widgetsMatching(marker: RegExp): KindWidget[] {
  const direct = sourcesMatching(marker);
  const inherited = kindsMatching(marker).flatMap((kind) => widgetsBuiltOn(kind));
  const byPath = new Map(
    [...direct, ...inherited].map((widget) => [widget.path, widget] as const),
  );
  return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
}

/** Every registered visual id whose widget source matches `marker`. */
export function visualsMatching(marker: RegExp): LessonVisualId[] {
  return widgetsMatching(marker).flatMap((widget) => widget.ids);
}

/**
 * Every widget whose OWN source matches `marker`, as opposed to inheriting the mechanic from
 * a kind it is built on.
 *
 * The population for a claim that has to be made once per WIDGET. `widgetsMatching` above is
 * the population for "who exhibits this behaviour", and it deliberately pulls a matching
 * kind's whole family in with it, because fixing the archetype fixes every widget on it and
 * one instance of it is enough to drive. A bespoke reimplementation is the opposite case:
 * nothing that tests the archetype touches a widget holding its own copy of the mechanic, so
 * every one of those owes its own evidence.
 */
export function widgetsOwningCopy(marker: RegExp): KindWidget[] {
  return sourcesMatching(marker);
}

/** The widget sources matching `pattern`, resolved to the ids the registry renders them by. */
function sourcesMatching(pattern: RegExp): KindWidget[] {
  return Object.entries(WIDGET_SOURCES)
    .filter(([path]) => !path.includes(".test."))
    .filter(([, source]) => pattern.test(source))
    .map(([path, source]) => {
      const component = /export function (\w+)\(/.exec(source)?.[1] ?? null;
      return { path, component, ids: component === null ? [] : registeredIds(component) };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Every id the visual registry renders `component` under. */
function registeredIds(component: string): LessonVisualId[] {
  const entry = new RegExp(`"([a-z0-9-]+)":\\s*\\{\\s*Svg:\\s*${component}\\s*[,}]`, "g");
  return Array.from(REGISTRY_SOURCE.matchAll(entry)).map(
    (match) => match[1] as LessonVisualId,
  );
}

function fileStem(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.tsx$/, "");
}
