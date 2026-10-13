import type { BuildEnv } from "../devPersistence/devServerReset";

/**
 * DEV-ONLY: whether the era-skip control may exist in the process reading this.
 *
 * WHAT IT IS FOR. The only way to advance an era before this existed was to finish the
 * ceremony, which is twelve real graded questions in era one and eighteen in a nine-node
 * era. That is the right price for a learner and the wrong price for whoever is looking at
 * what era two's island does to the roads. `?era=<slug>` is not the same thing: it sets the
 * era the city STARTS in, so it teleports past the transition instead of exercising it,
 * and it cannot show a city moving from one age to the next at all.
 *
 * WHY IT IS THE ADVANCE AND NOT THE CEREMONY THAT IS SKIPPED. Both readings of "skip it"
 * were open. Skipping the ceremony's animation buys a few seconds and leaves the twelve
 * questions in place, which is the part that costs minutes; advancing the era directly
 * costs one click and lands the city in exactly the state a finished ceremony lands it in,
 * because `advanceCityEra` is the same call the ceremony's completion makes. So this is the
 * advance. The ceremony is still reachable, unchanged, one row above it.
 *
 * DEV ONLY, TWO INDEPENDENT LAYERS, and they are the two `devServerReset.ts` uses rather
 * than a third pattern:
 *
 *  1. This predicate, over an injected `{ DEV, MODE }`. It excludes `MODE === "test"`
 *     because Vitest reports `DEV` too, and the suite has to keep asserting what a LEARNER
 *     sees — a dev control that rendered under Vitest would put two more buttons in every
 *     menu assertion in `CitySurface.test.tsx`.
 *  2. A literal `if`/`&&` on `import.meta.env.DEV` at the CALL SITE, in
 *     `EraAdvanceDoor.tsx`. Vite replaces that statically, so a production build folds the
 *     branch away, `DevEraSkip` loses its importer and the module is tree-shaken out.
 *     `output/era-skip-prod-guard-check.mjs` builds the door three ways and checks the
 *     emitted code.
 *
 * The layers are independent on purpose: (1) is what stops the control appearing where the
 * code is present, and (2) is what stops the code being present at all.
 */

/**
 * ## WHY THIS FILE IS NOT CALLED `devEraSkip.ts`
 *
 * `DevEraSkip.tsx` is the component, and on a case-insensitive filesystem `./DevEraSkip`
 * resolves to `devEraSkip.ts` first, because `.ts` is tried before `.tsx`. Measured, not
 * guessed: with the predicate under that name `tsc --build` reported *"'./DevEraSkip' has no
 * exported member 'DevEraSkip'"* and *"Already included file name … differs from file name …
 * only in casing"*. It is the same collision `output/dev-reset-prod-guard-check.mjs` records
 * for `MathPreview`/`mathPreview`, so this one is named apart rather than added to the list.
 */

/**
 * Prefix on every line the control logs. Greppable in a console, and one of the string
 * markers the production-bundle check looks for.
 */
export const DEV_ERA_SKIP_LOG_TAG = "[cr:dev-era-skip]";

/**
 * Whether the era-skip control may render.
 *
 * `BuildEnv` is imported rather than re-declared: `devServerReset.ts` and `audioPrefs.ts`
 * already agree on the shape, and a third copy of `{ DEV, MODE }` is a third thing to keep
 * in step with `import.meta.env`.
 */
export function isDevEraSkipEnabled(env: BuildEnv): boolean {
  return env.DEV && env.MODE !== "test";
}
