import { useEffect, useRef, useState } from "react";

import { FIRST_BUILDING_TASK as COPY } from "./onboardingScript";

import "./firstBuildingTask.css";

/**
 * **THE ONE MOMENT THAT ASKS FOR SOMETHING BACK, AND IT ASKS FOR IT ON THE REAL ISLAND.**
 *
 * The product lead, on what shipped: *"they should actually have to place the building and not
 * just drag a house into a 2d box like what is the point of that bro."* He is right, and the
 * two-tile board this replaces is deleted rather than demoted. This component draws no board
 * at all: it is a TASK LINE and a STATUS LINE beside the learner's own city, and everything
 * that happens, happens in `CitySurface`'s Build menu and on `CityScene`'s canvas.
 *
 * ## WHAT IT KNOWS, AND WHERE IT COMES FROM
 *
 * Nothing here observes the island. `CitySurface` already holds every fact this needs and
 * passes them down as {@link FirstBuildingTaskProps.stage}:
 *
 *  - **`idle`** — the Build menu is shut and no ghost is out.
 *  - **`choosing`** — `shopOpen`, so the cards are up.
 *  - **`positioning`** — `placement !== null`, so a ghost is on the grid with the confirm bar
 *    under it.
 *  - **`placed`** — `confirmPlacement` has run its session write and the island has one more
 *    building on it than it did when the tutorial opened.
 *
 * **A CANCELLED PLACEMENT IS NOT A FIFTH STAGE, it is a transition**, and that is the one bit
 * of state this component keeps: `positioning` back to `idle` with nothing placed is somebody
 * who backed out, and the line that says *"No trouble at all"* only makes sense to a learner
 * who just did. Kept in a ref rather than derived, because the two `idle`s are identical from
 * outside and only the order tells them apart.
 *
 * ## THE WAY PAST IT IS STILL THERE, AND THERE ARE NOW MORE WAYS THROUGH IT
 *
 * A real placement is a longer road than a drag between two tiles, so the escapes matter more
 * rather than less. `OnboardingAdvisor` owns Skip, Escape, Back and *"Place one for me"*; this
 * component owns the one shortcut that is about the task itself, {@link COPY.openBuild}, which
 * opens the real Build menu for a learner who cannot find the pill. Every one of them is on
 * screen from the first frame of the moment, never after a failure.
 */

/** Which part of the city's own placement flow the learner is standing in. */
export type PlacementStage = "idle" | "choosing" | "positioning" | "placed";

/** Who put the building down, which the status line is honest about. */
export type PlacedBy = "learner" | "advisor";

export interface FirstBuildingTaskProps {
  readonly stage: PlacementStage;
  /**
   * Null until a building is standing. Owned by `OnboardingAdvisor` rather than here, so
   * walking Back to this moment and forward again finds the gate still open.
   */
  readonly placedBy: PlacedBy | null;
  /**
   * Bumped by the host every time Next is pressed while the gate is shut. A counter rather
   * than a boolean so a second press re-announces, which is what somebody who did not read
   * the first nudge needs.
   */
  readonly nudge: number;
  /** Opens the real Build menu. `CitySurface`'s own `openShop`, passed through. */
  readonly onOpenBuild: () => void;
}

export function FirstBuildingTask({
  stage,
  placedBy,
  nudge,
  onOpenBuild,
}: FirstBuildingTaskProps) {
  const placed = placedBy !== null;
  /** True once a ghost has been out and gone away again with nothing placed. */
  const [backedOut, setBackedOut] = useState(false);
  const wasPositioning = useRef(false);
  const [nudged, setNudged] = useState(0);
  const openRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (stage === "positioning") {
      wasPositioning.current = true;
      setBackedOut(false);
      return;
    }
    if (stage === "idle" && wasPositioning.current) {
      wasPositioning.current = false;
      setBackedOut(true);
    }
  }, [stage]);

  // A gated Next: say what is still owed, and put the keyboard on the control that gets it
  // done. `nudged` is compared against the host's counter rather than read from it, so the
  // reason clears itself the moment the learner moves on.
  useEffect(() => {
    if (nudge > 0 && !placed) {
      setNudged(nudge);
      openRef.current?.focus();
    }
  }, [nudge, placed]);

  const status = statusFor({ stage, placedBy, backedOut, nudged, nudge });

  return (
    <div className="ob-task" data-testid="ob-task" data-stage={stage} data-placed={placed}>
      {/* THE TASK LINE IS THE FIRST CHILD (`interactive-visuals` R24): the imperative and
          what will be true when it is done, above the control that does it, and never on the
          status line, which the next state overwrites. */}
      <p className="ob-task__line">{COPY.task}</p>

      {/* ONLY WHILE NOTHING IS UNDER WAY. Once the menu is open or a ghost is on the grid the
          learner is already past this shortcut, and a button offering to do the thing they
          are doing is one more control to read on a screen that is now busy. */}
      {stage === "idle" && (
        <button
          type="button"
          className="city-action city-action-primary ob-task__open"
          data-testid="ob-task-open-build"
          ref={openRef}
          onClick={onOpenBuild}
        >
          {COPY.openBuild}
        </button>
      )}

      <p
        className="ob-task__status"
        data-state={status.state}
        data-testid="ob-task-status"
        aria-live="polite"
      >
        {status.text}
      </p>
    </div>
  );
}

/**
 * The one sentence on screen, and the order the cases are tried in IS the design.
 *
 * A finished placement outranks everything, because a learner who has just watched a building
 * land must not be read a nudge; the nudge outranks the flow states, because it is the answer
 * to a press that has just happened; and `backedOut` sits under both, because it describes an
 * `idle` that arrived from somewhere rather than an `idle` that was always there.
 */
function statusFor({
  stage,
  placedBy,
  backedOut,
  nudged,
  nudge,
}: {
  stage: PlacementStage;
  placedBy: PlacedBy | null;
  backedOut: boolean;
  nudged: number;
  nudge: number;
}): { readonly text: string; readonly state: string } {
  if (placedBy === "learner") {
    return { text: COPY.done, state: "solved" };
  }
  if (placedBy === "advisor") {
    return { text: COPY.doneForYou, state: "solved" };
  }
  if (nudge > 0 && nudged === nudge && stage === "idle") {
    return { text: COPY.nudge, state: "wrong" };
  }
  if (stage === "positioning") {
    return { text: COPY.positioning, state: "holding" };
  }
  if (stage === "choosing") {
    return { text: COPY.choosing, state: "holding" };
  }
  if (backedOut) {
    return { text: COPY.cancelled, state: "prompt" };
  }
  return { text: COPY.prompt, state: "prompt" };
}
