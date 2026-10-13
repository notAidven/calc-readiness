import { ERA_SEQUENCE, type EraId, eraNumber, getEraOrThrow } from "@cr/skill-graph";
import { type ReactElement, useState } from "react";

import { isDevEraSkipEnabled } from "../city/eraSkipGuard";
import { eraPlacementFromSeed, seedPlacingAtEra } from "./eraPlacement";

/**
 * **DEV: ENTER THE CATCH-UP AT A KNOWN PLACEMENT, AT ANY AGE'S PROMPT.**
 *
 * `WinterDevSkip.tsx`'s shape, and the same request behind it: every state worth photographing
 * sits behind a twenty-minute diagnostic and up to four foundings, and nobody can review a
 * surface they cannot reach. So this is the hatch, and it is the one I used for every frame
 * and every timing in the report.
 *
 * ## TWO ROWS, BECAUSE THEY ANSWER TWO DIFFERENT QUESTIONS
 *
 * `WinterDevSkip`'s own split, applied to this surface:
 *
 *  - **Place me at** is the design point: it seeds a placement that hands over the ages before
 *    the chosen one and starts the walk at the top, so a reviewer walks the whole catch-up as a
 *    learner would and reads each prompt as it lands. **This is the SEEDABLE entry** — the same
 *    row twice gives the same city twice, which is what a demo needs.
 *  - **Jump to age** is the accelerator: the fourth age's prompt is three foundings away and
 *    nothing about the first three is interesting when what you want is the fourth. It walks
 *    the reducer's own transitions to get there (`startCatchUpAt`), so the state it hands back
 *    is a state a learner reaches rather than one this control invented.
 *
 * ## WHAT IT DOES NOT FAKE
 *
 * **The placement.** It writes a real `placement_by_node` and hands it to the real
 * {@link eraPlacementFromSeed}, so the era decision under a dev jump is the same conjunction
 * over the same evidence as under a real pretest. A control that handed the walk a plan
 * directly could show a reviewer an age the instrument would never have handed over, which is
 * the one thing a demo of this feature must not do.
 *
 * **And it grants no evidence**, on `WinterDevSkip`'s precedent and by the same means: its
 * import list is the era registry, the dev gate and this feature's own placement reader.
 * `placement_estimate` is the only per-node field anything here writes, which is exactly what
 * a pretest writes (INV-DIAG-1), and `catchUpDevSkipGrantsNoMastery.test.tsx` reads a session
 * back after a full driven walk.
 *
 * ## THE GATE IS THE REPO'S, AND IT IS `DevEraSkip`'s RATHER THAN `WinterDevSkip`'s
 *
 * {@link isDevEraSkipEnabled} — `env.DEV && env.MODE !== "test"` — and the difference from the
 * winter's `isDevPersistenceEnabled` is deliberate and is about where this mounts.
 * `eraSkipGuard.ts` gives the reason in its own words: Vitest reports `DEV` too, *"and the
 * suite has to keep asserting what a LEARNER sees — a dev control that rendered under Vitest
 * would put two more buttons in every menu assertion in `CitySurface.test.tsx`."* This control
 * mounts inside `CitySurface`, so that is exactly the hazard, where the winter's panel mounts
 * inside a surface no learner-facing assertion counts buttons on.
 *
 * A production build additionally folds the branch away: the call site in `CitySurface.tsx` is
 * a literal `import.meta.env.DEV` conjunct, which Vite replaces statically, so this module
 * loses its importer and is tree-shaken out. The two layers are independent on purpose —
 * `eraSkipGuard.ts`'s own note — one stops the control appearing where the code is present and
 * the other stops the code being present at all.
 *
 * **Measured on a real `npm run build -w @cr/web`, because the claim is about an artefact:**
 * `Enter the catch-up`, `catchup-dev-skip`, `isDevEraSkipEnabled` and
 * `Dev only, not on the learner build` are all absent from every emitted JS chunk.
 *
 * ## ⚑ THE STYLES ARE INLINE, AND THAT IS THE WHOLE REASON THIS FILE HAS NO STYLESHEET
 *
 * They were in a `catchUpDevSkip.css` beside this file, following `winterDevSkip.css`. Measured
 * on the same build, **15 `.catchup-skip` rules shipped to the production stylesheet** while the
 * component itself did not — because **Vite emits an imported stylesheet as an asset whether or
 * not the importing module survives tree-shaking**, which is exactly the trap `DevEraSkip.tsx`
 * documents and avoids by carrying no CSS at all: *"a dev-only CSS file would ship to production
 * even when the component does not."*
 *
 * `DevEraSkip`'s own answer was to reuse existing classes, which is not available here: a dev
 * instrument has to look unlike the game (see {@link INSTRUMENT_CSS}), so there is nothing
 * existing to reuse. So the rules ride in a `<style>` element this component renders, which
 * ships when the component ships and not otherwise. It is uglier than a stylesheet and it is the
 * only shape that makes the production claim true of the CSS as well as of the JS.
 */

/**
 * THE PANEL'S OWN LOOK, and it is deliberately not the game's.
 *
 * Dark, mono, square corners, against a surface that is pale, rounded and set in Nunito. A
 * deliberate mismatch: this must never read as a feature, and a reviewer glancing at a frame
 * should be able to tell in one look that the panel is not part of the product. It is a second
 * channel on the same claim the eyebrow makes in words, and it matters more here than in the
 * winter, because the frames this control was built to take are the frames that go in the report.
 *
 * **Where it sits, measured against the surface it must not cover.** Top-LEFT, where the
 * winter's is top-right. The catch-up's own well is bottom-anchored (`.catchup-stage` is
 * `place-items: end center`), so the top edge is free either way; what is not free is the right,
 * where the city's HUD chip lane runs. Left keeps both clear at 1024x580, and
 * `catchUpShots.browser.test.tsx` asserts the panel's bottom edge stays in the top half.
 *
 * **Five columns rather than four**, because ten eras split evenly into two rows of five where
 * four would give a ragged 4/4/2. The era NUMBER sits over the era NAME rather than beside it:
 * the name is the vocabulary a reviewer writing a caption needs, so it may not be the thing
 * dropped for width, and the number is what makes the ordering readable at a glance.
 *
 * `pointer-events` is load-bearing rather than tidy, and it took a defect to get it right. This
 * renders inside the city surface, and several of the layers it can sit under are
 * `pointer-events: none` so the island keeps its drag and its zoom — so the BUTTONS have to opt
 * back in or every one of them is inert. That was read as "put `auto` on the container", which
 * bought the buttons at the price of the whole 268px box: measured at 1024x580, **78 of 78
 * background points inside this panel swallowed a click aimed at the island**.
 *
 * `styles.css` states the rule at `.economy-hud` and states it as the hard one: *"the city relies
 * on map clicks/drags for placing, moving, and selecting buildings, so this overlay must NEVER
 * intercept pointer events over the 3D map. The container is `pointer-events: none` and ONLY the
 * compact interactive bar opts back in."* Both halves are needed, and only the second was here.
 * `city/devPanelsPassClicksToTheIsland.browser.test.tsx` measures both.
 */
const INSTRUMENT_CSS = `
.catchup-skip {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 65;
  box-sizing: border-box;
  width: 268px;
  padding: 6px 9px 7px;
  border: 1px solid #f0b429;
  border-radius: 4px;
  background: rgba(16, 22, 30, 0.96);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.42);
  color: #e8eef4;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 10.5px;
  line-height: 1.3;
  text-align: left;
  pointer-events: none;
}
/* The only parts that take a click. Matched on what a control IS rather than by class, because
   the era rows are generated from ERA_SEQUENCE: a rule naming today's classes would make the
   next control anybody adds silently inert. The __note is a readout and stays pass-through. */
.catchup-skip :is(button, a[href], input, select, textarea) {
  pointer-events: auto;
}
.catchup-skip__eyebrow {
  margin: 0;
  color: #f0b429;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.catchup-skip__title {
  display: flex;
  gap: 6px;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  margin: 1px 0 5px;
  padding: 0;
  border: 0;
  background: none;
  color: #e8eef4;
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}
.catchup-skip__title:hover { color: #ffd77a; }
.catchup-skip__fold { color: #9fb0c0; font-size: 9px; font-weight: 400; }
.catchup-skip__group { min-width: 0; margin: 0; padding: 0; border: 0; }
.catchup-skip__legend { padding: 0; color: #9fb0c0; font-size: 9.5px; }
.catchup-skip__row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 3px;
  margin: 3px 0 6px;
}
.catchup-skip__rung {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  padding: 3px;
  border: 1px solid #46586a;
  border-radius: 3px;
  background: #1d2833;
  color: #e8eef4;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.catchup-skip__rung:hover:not(:disabled) { border-color: #f0b429; background: #2a3946; }
.catchup-skip__rung[data-selected="true"] { border-color: #f0b429; background: #33414f; }
.catchup-skip__rung:disabled {
  border-color: #2b3742;
  background: #161f28;
  opacity: 0.34;
  cursor: not-allowed;
}
.catchup-skip__score { font-size: 10px; font-weight: 700; letter-spacing: -0.02em; }
.catchup-skip__tier {
  overflow-wrap: anywhere;
  color: #7fc4f0;
  font-size: 8px;
  letter-spacing: 0;
  text-transform: uppercase;
}
.catchup-skip__note {
  overflow-y: auto;
  max-height: 46px;
  margin: 0;
  color: #9fb0c0;
  font-size: 9.5px;
}
`;

export interface CatchUpDevSkipProps {
  /**
   * Enter the catch-up with this placement seed, at this position in the walk.
   *
   * The host does the seeding, because seeding a city is a session write and this control does
   * not hold a session — the same division `CrisisSeedControl` keeps.
   */
  readonly onEnter: (input: {
    readonly placementByNode: Readonly<Record<string, number>>;
    readonly startAt: number;
  }) => void;
  /**
   * Defaults to {@link isDevEraSkipEnabled} over Vite's env, mirroring `WinterDevSkip`'s own
   * option of the same name. Tests of the SHIPPED gate drive the default through the real
   * environment (`vi.stubEnv`) rather than through this, because *"it is behind a flag"* and
   * *"the flag works"* are two claims. A browser shot that wants the panel in frame passes it
   * explicitly, because `MODE` is `"test"` there too.
   */
  readonly enabled?: boolean;
}

export function CatchUpDevSkip({
  onEnter,
  enabled = isDevEraSkipEnabled(import.meta.env),
}: CatchUpDevSkipProps): ReactElement | null {
  /**
   * WHAT THE LAST PRESS DID, and nothing else. Everything a jump changes is on the island and
   * on the prompt; what neither can say is which placement it was seeded from, and that is the
   * one thing a reviewer writing a frame's caption needs.
   */
  const [said, setSaid] = useState<string | null>(null);
  /**
   * The age the walk is being seeded for. Held here rather than derived from the city, because
   * the point of the control is to ask for a placement the city does not have yet.
   */
  const [placedEra, setPlacedEra] = useState<EraId>(
    () => (ERA_SEQUENCE[4]?.id ?? ERA_SEQUENCE[0]?.id) as EraId,
  );
  /** Open by default, on `WinterDevSkip`'s trade: a control that has to be unfolded first has
      put a press in front of the press. Folding exists for photographing the island under it. */
  const [open, setOpen] = useState(true);

  if (!enabled) {
    return null;
  }

  const handed = eraNumber(placedEra) - 1;

  function enterAt(startAt: number): void {
    const placementByNode = seedPlacingAtEra(placedEra);
    const placement = eraPlacementFromSeed(placementByNode);
    if (placement.skipped.length === 0) {
      setSaid(
        `A learner placed in the ${getEraOrThrow(placedEra).name} is handed nothing, so ` +
          `there is no catch-up to walk. Pick a later age.`,
      );
      return;
    }
    const clamped = Math.min(startAt, placement.skipped.length - 1);
    const standing = placement.skipped[clamped] as EraId;
    setSaid(
      `Placed in the ${getEraOrThrow(placedEra).name}, ${placement.skipped.length} ages ` +
        `handed over, standing at age ${clamped + 1} (${getEraOrThrow(standing).name}).`,
    );
    onEnter({ placementByNode, startAt: clamped });
  }

  return (
    <aside
      className="catchup-skip"
      aria-labelledby="catchup-skip-title"
      data-testid="catchup-dev-skip"
    >
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a module constant of CSS, and the
          reason it is not a stylesheet is measured in this file's header — an imported one ships
          to production even when the component is tree-shaken out. */}
      <style dangerouslySetInnerHTML={{ __html: INSTRUMENT_CSS }} />
      <p className="catchup-skip__eyebrow">Dev only, not on the learner build</p>
      <button
        type="button"
        id="catchup-skip-title"
        className="catchup-skip__title"
        aria-expanded={open}
        data-testid="catchup-dev-skip-fold"
        onClick={() => setOpen(!open)}
      >
        Enter the catch-up
        <span className="catchup-skip__fold" aria-hidden="true">
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <>
          <fieldset className="catchup-skip__group">
            <legend className="catchup-skip__legend">Place me at</legend>
            <div className="catchup-skip__row">
              {/* Every era, derived from `ERA_SEQUENCE` rather than listed, so a reviewer can
                  reach any placement the sequence admits and an eleventh era needs no edit
                  here. Era one is present and deliberately reports "handed nothing", because
                  that is a real state and a control that hid it would hide the answer today's
                  D1-only diagnostic gives almost everybody. */}
              {ERA_SEQUENCE.map((era) => (
                <button
                  key={era.id}
                  type="button"
                  className="catchup-skip__rung"
                  data-selected={era.id === placedEra}
                  data-testid={`catchup-dev-skip-era-${era.id}`}
                  aria-pressed={era.id === placedEra}
                  onClick={() => setPlacedEra(era.id)}
                >
                  <span className="catchup-skip__score">{eraNumber(era.id)}</span>
                  <span className="catchup-skip__tier">{era.name}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="catchup-skip__group">
            <legend className="catchup-skip__legend">
              {handed === 0
                ? "That placement hands nothing over"
                : `Start the walk at age (${handed} handed over)`}
            </legend>
            <div className="catchup-skip__row">
              {ERA_SEQUENCE.slice(0, Math.max(1, handed)).map((era, index) => (
                <button
                  key={era.id}
                  type="button"
                  className="catchup-skip__rung"
                  disabled={handed === 0}
                  data-testid={`catchup-dev-skip-at-${index}`}
                  aria-label={`Enter the catch-up standing in the ${era.name}`}
                  onClick={() => enterAt(index)}
                >
                  <span className="catchup-skip__score">{index + 1}</span>
                  <span className="catchup-skip__tier">{era.name}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* `aria-live`, because the note is the one thing here a screen reader could
              otherwise miss: every other consequence of a press is on a canvas that is
              `aria-hidden`. */}
          <p
            className="catchup-skip__note"
            aria-live="polite"
            data-testid="catchup-dev-skip-note"
          >
            {said ??
              "Mastery is untouched either way: this writes placement_estimate and nothing else."}
          </p>
        </>
      )}
    </aside>
  );
}
