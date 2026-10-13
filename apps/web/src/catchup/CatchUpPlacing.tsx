import { type EraId, getEraOrThrow } from "@cr/skill-graph";
import type { ReactElement } from "react";

import { conceptFragment, ordinalLine } from "./catchUpStrings";
import { eraRosterNodeIds } from "./catchUpWalk";

import "./catchUp.css";

/**
 * **THE FIRST AGE, SEATED BY HAND** — the surface that gets out of the learner's way while
 * they do it.
 *
 * D-ERA18: *"every student places era one by hand; later eras auto-fill during the montage"*,
 * because *"the agency and the teaching both land the first time; repeating them is
 * repetition rather than learning."* That is the whole of the lead's own constraint — *"we
 * dont want them to just skip over everything without any agency in how their city is
 * structured"* — spent where it buys the most, and `catchUpWalk.ts` records why it stopped
 * being a per-age question. So this is a strip rather than a panel. The build menu, the
 * ghost, the grid and the confirm are all the city's own placement path, untouched: this
 * surface adds no placement affordance of its own, because a second one would be a second set
 * of bugs and would not be the thing the learner already knows how to use.
 *
 * ## WHY IT COUNTS RATHER THAN GATES
 *
 * The strip shows how many of the age's buildings are standing and offers one action to carry
 * on. **It does not require all of them**, and that is a decision rather than an oversight:
 * a learner who seats four of five and wants the ceremony can have it, and the fifth building
 * is still theirs to place afterwards, because a handed-over building is `complete` from the
 * placement (`docs/Contracts.md` §1.1) and its card stays in the build menu for the whole life
 * of the city. **A gate here would be the only place in the game where a layout choice blocks
 * progression**, which is exactly the shape INV-COS-1 exists to forbid — *"a shortfall gates
 * nothing"* — and layout is even further from evidence than a material balance is.
 *
 * What the count IS for is telling the learner the road is finite, which is the same job
 * §10.19 gives the ordinal on the stop prompt: *"it tells the learner the walk is finite,
 * which is what stops a four-prompt sequence reading as a nag."*
 */

export interface CatchUpPlacingProps {
  readonly eraId: EraId;
  readonly position: number;
  readonly total: number;
  /** Which nodes have a building standing, so the count is the city's own answer. */
  readonly placedNodeIds: ReadonlySet<string>;
  /**
   * Buildings the island had no room for, in words, or `null`. See
   * {@link EraCatchUpPromptProps.waiting} — on THIS road it is the sentence that tells a learner
   * why the build menu still holds cards for an age the city has finished.
   */
  readonly waiting?: string | null;
  /** Carry on to this age's founding. */
  readonly onDone: () => void;
}

export function CatchUpPlacing({
  eraId,
  position,
  total,
  placedNodeIds,
  waiting,
  onDone,
}: CatchUpPlacingProps): ReactElement {
  const era = getEraOrThrow(eraId);
  const roster = eraRosterNodeIds(eraId);
  const standing = roster.filter((nodeId) => placedNodeIds.has(nodeId)).length;
  const left = roster.length - standing;

  return (
    <div
      className="catchup-founding"
      data-testid="catchup-placing"
      data-era={eraId}
      data-standing={standing}
      data-roster={roster.length}
    >
      <div className="catchup-founding__caption">
        <p className="catchup-founding__era">
          {ordinalLine(position, total)} · {era.name}
        </p>
        <p className="catchup-founding__beat" data-testid="catchup-placing-count">
          {left === 0
            ? "Every building is standing."
            : `${standing} of ${roster.length} standing. Open the build menu to place the rest.`}
        </p>
        {/* The concept again, because the learner has been in the build menu and the strip
            is the only thing on screen still naming the age they are furnishing. The bare
            fragment rather than the prompt's full sentence: this line is set in the HUD's
            small caps and a sentence there is a shout. */}
        <p className="catchup-founding__era">{conceptFragment(eraId)}</p>
        <button
          type="button"
          className="city-action city-action-primary"
          data-testid="catchup-placing-done"
          onClick={onDone}
        >
          {left === 0 ? "The age is ready" : "Carry on from here"}
        </button>
        {waiting ? (
          <p className="catchup-founding__waiting" data-testid="catchup-waiting">
            {waiting}
          </p>
        ) : null}
      </div>
    </div>
  );
}
