import { type KeyboardEvent, type ReactElement, useEffect, useRef } from "react";

import type { ArchipelagoIsland } from "./archipelagoView";

/**
 * **WHAT AN ISLAND OPENS: a card — and on an island behind you, the card is the door.**
 *
 * Authority: `docs/superpowers/specs/2026-08-04-archipelago-design.md` §7, as corrected —
 * *"In stage 1 a past island opens a **card** — its name, its skills, its mastery, its unspent
 * material — and the only island you enter is the one you are on. Entry arrives with stage 3,
 * and the affordance should arrive with it."*
 *
 * ## THE AFFORDANCE HAS ARRIVED, WHICH IS THE ONE THING THIS FILE USED TO REFUSE
 *
 * The refusal was right for as long as there was nothing behind it: *"a greyed-out control is
 * a promise with a date on it"*, and this card carried no action rather than an action that
 * apologised. Stage 3 is built (`islandState.ts`, `archipelagoSession.ts`), so the card now
 * carries **one** action and it works: **Sail to this island**.
 *
 * ⚑ **IT IS STILL ABSENT WHERE THERE IS NOTHING TO GO TO**, and that is the part of the old
 * ruling that survives unchanged. An island AHEAD of the learner has no city on it and no
 * record in the bay, so its card has no door and says nothing about when it will — no "soon",
 * no "not yet", no disabled button. `archipelagoCopy.test.tsx` sweeps every card the surface
 * can open for that whole family of promises, and it is unchanged by this.
 *
 * The learner's own island has no door either, for the plainest reason: they are on it.
 *
 * ## WHAT IT DOES SAY IS §8.5's FRAMING, AND THAT IS LOAD-BEARING
 *
 * *"A completed island reads **80 stone here** — a place that still holds something. Not '80
 * stone unspent' and not '80 stone you did not spend': the same fact, and the second and
 * third are reproaches. This is the one line of the overview that turns a finished island into
 * somewhere worth going back to (§8.3), so the framing is load-bearing rather than
 * decorative."*
 *
 * The sentence itself is composed in `archipelagoView.ts` (`storesOn`), so the map's row and
 * this card cannot word the same fact two ways.
 */
export function IslandCard({
  island,
  onClose,
  onSail,
}: {
  readonly island: ArchipelagoIsland;
  readonly onClose: () => void;
  /**
   * Sail to this island. Rendered only where {@link ArchipelagoIsland.revisitable} says there
   * is somewhere to go, so an omitted handler on a revisitable island is a wiring mistake
   * rather than a supported state — `archipelagoOverview.test.tsx` drives the real one.
   */
  readonly onSail?: (eraId: ArchipelagoIsland["eraId"]) => void;
  readonly onReset?: (eraId: ArchipelagoIsland["eraId"]) => void | Promise<void>;
}): ReactElement {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = `island-card-${island.eraId}`;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="island-card-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="island-card"
      data-era={island.eraId}
      onKeyDown={handleKeyDown}
    >
      <div className="island-card">
        <button
          type="button"
          className="archipelago-close"
          aria-label="Close"
          ref={closeRef}
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M7 7l10 10M17 7L7 17"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </button>

        <header className="island-card-head">
          <span className="micro-label">{`Island ${island.number}`}</span>
          <h3 id={titleId}>{island.name}</h3>
          <p className="island-card-concept">{island.concept}</p>
        </header>

        <div className="island-card-body">
          <p className="island-card-skills" data-testid="island-card-skills">
            {island.masteredCount >= island.nodeCount
              ? `All ${island.nodeCount} skills mastered.`
              : `${island.masteredCount} of ${island.nodeCount} skills mastered.`}
          </p>
          {island.stores ? (
            <p className="island-card-stores" data-testid="island-card-stores">
              {/* §8.5's sentence, composed once in `archipelagoView.ts`. The second clause is
                  the same fact said as a place rather than as a shortfall. */}
              {`${island.stores.line}. The stores you earned stayed in the town that earned them.`}
            </p>
          ) : (
            <p className="island-card-stores" data-testid="island-card-stores">
              {/* An island whose material was all spent is a city that was BUILT, which is the
                  reading that keeps the empty state from being a reproach. */}
              This island's stores all went into what stands on it.
            </p>
          )}
        </div>

        {/* THE DOOR. Present exactly where there is an island to go to, which is what
            `revisitable` means, and absent everywhere else with nothing said about why —
            see the header for the half of §7's ruling that survives stage 3 unchanged. */}
        {island.revisitable && onSail && (
          <button
            type="button"
            className="city-action island-card-sail"
            data-testid="island-card-sail"
            onClick={() => onSail(island.eraId)}
          >
            {`Sail to ${island.name}`}
          </button>
        )}
      </div>
    </div>
  );
}
