import { type EraId, getEraOrThrow } from "@cr/skill-graph";
import { type ReactElement, useId, useState } from "react";
import {
  conceptLine,
  DISCLOSURE_LABEL,
  eraSkillCount,
  KEEP_GOING_LABEL,
  keepGoingNote,
  LESSONS_STAY_OPEN,
  ordinalLineFor,
  STOP_HERE_COPY,
  skillsHeading,
  skillTitles,
  stopHereNote,
  summaryProse,
  walkFraming,
} from "./catchUpStrings";
import type { CatchUpBuildMode, CatchUpChoice } from "./catchUpWalk";

import "./catchUp.css";

/**
 * THE STOP PROMPT — one age, two roads, and no question.
 *
 * Authority: **§10.25** of
 * `docs/superpowers/specs/2026-08-01-test-out-experience-review.md` for the layout and the
 * two tiers, **§10.19** for the two roads and every string on them, **§10.14** for the walk
 * this sits inside and **§10.10** for the build mode being stated rather than asked.
 * `catchUpStrings.ts` holds every word and carries the reasoning for each; this file is the
 * drawing of them.
 *
 * ## ⚑ IT WAS THREE ROADS AND THEY DID NOT READ AS THREE
 *
 * The lead, off a running build: *"this UI looks terrible; clean it up. it makes no sense to
 * the user."* `catchUpStrings.ts` has his seven observations against the record, each marked
 * as drift or as the ruling reading badly. **The layout answer to the first four is one
 * change**: the roads are two, they stack, and each carries its own consequence.
 *
 * **Two filled buttons across plus one outlined button beneath was a sentence about
 * importance, and it was the wrong sentence.** It said *"two options, plus an escape hatch"*
 * where *"stop here"* is the only road that changes what the learner will be asked to learn.
 * Neither is preselected and neither is louder (§10.5); what distinguishes them is the line
 * under each, which is where the trade now lives instead of in a footnote.
 *
 * ## WHAT THE LEARNER IS STANDING IN WHEN THEY READ THIS
 *
 * The age itself. §10.14's one genuine argument for the lead's shape, and it is not one
 * anybody made while the upfront dial was on the table: *"the learner is standing IN the age
 * they are deciding about, with its ground, its hall and its dressing already turned. The
 * dial asked them to judge an age they had not seen; the walk shows it to them first."* So
 * this is a transparent layer over the live island rather than a card over a scrim, on
 * `EraAdvanceCeremony`'s precedent — *"no panel, no scrim, the island keeps its own light."*
 *
 * ## THERE IS NOTHING TO DISMISS TO, WHICH IS WHY THERE IS NO DEFAULT
 *
 * §10.5: *"the choice is the founding's own opening surface, not a modal over something
 * else. There is nothing behind it to dismiss to, so there is no doing nothing. Three roads,
 * all of which go forward, is a fork rather than a wall."* So no button is preselected, there
 * is no close affordance, and `Escape` does nothing. The tone bans are on pressure rather
 * than on being asked: nothing here flashes, nags, shames or induces urgency, and there is no
 * timer, so `Game_Visual_Design_Brief.md:69-70`'s pass-or-fail-timer ban is not approached.
 *
 * ## AND NO CONFIRMATION, WHICH IS §10.6 RATHER THAN AN OMISSION
 *
 * *"Are you sure?"* is a second prompt and a second prompt is worse than a first; it also
 * reads as the product doubting the learner. What replaces it is a fact — the lessons stay
 * open on every road, by INV-COS-1 and D-ERA19's shipped layer 3 — so the thing a
 * confirmation would have guarded is guarded by something true instead.
 *
 * ## THE DISCLOSURE OPENS IN PLACE AND SCROLLS FROM THE DAY IT SHIPS
 *
 * §10.22 measures tier one at **192px against the 289px well with 97px spare** at 1024x580,
 * and tier two fitting *"only because the two NINE-node eras have no titles yet"* — once D6
 * and D9 land, the Atomic Age and Cyberpunk overflow by **47 to 95px**. **O-TX22**: build it
 * with a scroll or buy a defect that arrives with somebody else's PR. So
 * `.catchup-disclosure__body` has `overflow-y: auto` and a max height from the start, and
 * `catchUpPromptShots.browser.test.tsx` photographs it at that viewport.
 */

export interface EraCatchUpPromptProps {
  /** The age being decided about. */
  readonly eraId: EraId;
  /** `Age N of the M you tested out of`, 1-based. */
  readonly position: number;
  readonly total: number;
  /** The ages a stop here would forfeit (§10.9). Empty at the last handed age. */
  readonly forfeited: readonly EraId[];
  /**
   * Who seats this age's buildings if the learner keeps going. **Stated on the accept road
   * rather than asked**, per D-ERA18 and §10.10, and computed by `catchUpBuildMode` from the
   * age's position so this surface holds no era literal.
   */
  readonly buildMode: CatchUpBuildMode;
  /** The age the walk moves on to if they keep going, or `null` at the last handed age. */
  readonly nextEra: EraId | null;
  readonly onChoose: (choice: CatchUpChoice) => void;
  /**
   * **Buildings the island had no room for, in words, or `null` while everything fits.**
   *
   * `catchUpStrings.waitingLine`. It rides every surface of the walk rather than one, because
   * the shortfall it reports is about the CITY and not about the age in hand: a learner who
   * pressed the auto-layout road two ages ago and is now looking at a prompt still has those
   * buildings waiting for them, and the note vanishing with the age that produced it is how the
   * defect this fixes went unnoticed in the first place.
   */
  readonly waiting?: string | null;
  /** Test seam: opens the disclosure without a click, so a still can photograph tier two. */
  readonly disclosureOpen?: boolean;
}

export function EraCatchUpPrompt({
  eraId,
  position,
  total,
  forfeited,
  buildMode,
  nextEra,
  waiting,
  onChoose,
  disclosureOpen,
}: EraCatchUpPromptProps): ReactElement {
  const era = getEraOrThrow(eraId);
  const titleId = useId();
  const bodyId = useId();
  const keepId = useId();
  const stopId = useId();
  const [open, setOpen] = useState(disclosureOpen ?? false);
  const shown = disclosureOpen ?? open;

  const titles = skillTitles(eraId);
  const heading = skillsHeading(titles.length);

  return (
    <div
      className="catchup-stage"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="catchup-prompt"
      data-era={eraId}
      data-position={position}
      data-total={total}
      data-forfeits={forfeited.length}
      data-build-mode={buildMode}
    >
      {/* `data-disclosure` so the well can be TALLER while tier two is open. It is opt-in and
          momentary, so a learner who asked for the information may have more of the screen for
          it; the closed state is the one that has to leave the island visible. Measured at
          1024x580 in `docs/design-refs/catch-up/`: closed leaves about 212px of island above
          the well, open about 80px. That is a real trade and this attribute is what makes it
          explicit rather than hiding it inside one max-height. */}
      <div className="catchup-well" data-disclosure={shown ? "open" : "closed"}>
        <p className="catchup-ordinal">{ordinalLineFor(position, total)}</p>
        <h2 className="catchup-title" id={titleId} data-testid="catchup-era-name">
          {era.name}
        </h2>
        <p className="catchup-concept" data-testid="catchup-concept">
          {conceptLine(eraId)}
        </p>
        {/* THE REFERENT FOR "STOP". One sentence, above the roads rather than below them,
            because a consequence a learner reads after pressing is not a consequence they
            were offered. `catchUpStrings.ts` has the lead's observation this answers. */}
        <p className="catchup-framing" data-testid="catchup-framing">
          {walkFraming(total)}
        </p>

        {/* TIER ONE IS ABOVE; THIS IS THE DOOR TO TIER TWO. A real `<button>` with
            `aria-expanded` and `aria-controls`, so the control is a disclosure to a screen
            reader rather than a div that happens to toggle something. Closed it carries no
            count badge and no icon, per §10.23: the learner who never opens it has done
            nothing wrong. */}
        <button
          type="button"
          className="catchup-disclosure__toggle"
          aria-expanded={shown}
          aria-controls={bodyId}
          data-testid="catchup-disclosure-toggle"
          onClick={() => setOpen(!shown)}
        >
          {DISCLOSURE_LABEL}
          <span className="catchup-disclosure__mark" aria-hidden="true" data-open={shown} />
        </button>

        {shown && (
          <div
            className="catchup-disclosure__body"
            id={bodyId}
            data-testid="catchup-disclosure"
          >
            {/* THE SUMMARY LEADS (§10.21), on three reasons and the third decides it: it is
                compile-enforced total where the titles are absent for two whole eras, its own
                docblock names this reader, and the titles are lesson HEADINGS rather than
                learner descriptions. */}
            <p className="catchup-summary" data-testid="catchup-summary">
              {summaryProse(eraId)}
            </p>
            {heading !== null && (
              <>
                <p className="catchup-skills__heading">{heading}</p>
                <ul className="catchup-skills" data-testid="catchup-skills">
                  {titles.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* THE TWO ROADS. Both go forward, neither is preselected, and neither is louder:
            what tells them apart is the sentence under each, which is the trade the button
            makes. Stacked rather than across, because two labels with a consequence line
            apiece do not read side by side at 1024px and because the pair is one question
            with two answers rather than a primary and an escape. */}
        <div className="catchup-roads" data-testid="catchup-roads">
          <div className="catchup-road">
            <button
              type="button"
              className="city-action city-action-road"
              data-testid="catchup-choose-keep_going"
              aria-describedby={keepId}
              onClick={() => onChoose("keep_going")}
            >
              {KEEP_GOING_LABEL}
            </button>
            {/* `aria-describedby` rather than a bare paragraph: the consequence is the half
                of the road that decides it, and a screen-reader user tabbing the buttons
                would otherwise hear two labels and neither trade. */}
            <p className="catchup-road__note" id={keepId} data-testid="catchup-keep-note">
              {keepGoingNote(eraId, buildMode, nextEra)}
            </p>
          </div>
          <div className="catchup-road">
            <button
              type="button"
              className="city-action city-action-road"
              data-testid="catchup-choose-stop_here"
              aria-describedby={stopId}
              onClick={() => onChoose("stop_here")}
            >
              {STOP_HERE_COPY.label}
            </button>
            {/* §10.19's forfeit, moved out of the footer and under the road it belongs to.
                It takes no warning colour and no icon: it is the same register as its
                sibling, because taking this road is not an error. */}
            <p className="catchup-road__note" id={stopId} data-testid="catchup-stop-note">
              {stopHereNote(eraId, forfeited)}
            </p>
          </div>
        </div>

        {/* §10.6's clause, still under both roads because it is the one thing true of both.
            This is what stands in for a confirmation prompt. D-TH9's movability clause has
            left it and now rides on the city-places sentence, which is the sentence it makes
            safe. */}
        <p className="catchup-foot" data-testid="catchup-foot">
          {LESSONS_STAY_OPEN}
        </p>
        {/* The shortfall notice stays in the FOOTER while §10.19's forfeit moved up under the
            road it belongs to, and the two are not the same kind of sentence: a forfeit is a
            consequence of one road, so it belongs beside that road, where this is true of the
            city whichever road is taken and belongs where the clause above it is. */}
        {waiting ? (
          <p className="catchup-foot catchup-foot--waiting" data-testid="catchup-waiting">
            {waiting}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * WHAT THE LEARNER READS WHEN THEY STOP, and where the walk ends.
 *
 * §10.19's own screen. **This is where the advisor speaks for the first time** (§10.17), and
 * that line is deliberately not written here: §10.19 leaves it to the ceremony-copy owner
 * because *"it is the first thing a character says to this learner and it wants the same care
 * D-END5's line got."* **O-TX19.** So this screen states the fact and hands over, and the
 * character's line is a slot with an owner rather than a guess with a byline.
 */
export function CatchUpStopped({
  eraId,
  foundedCount,
  headline,
  standing,
  waiting,
  onEnter,
}: {
  readonly eraId: EraId;
  readonly foundedCount: number;
  readonly headline: string;
  readonly standing: string;
  /** See {@link EraCatchUpPromptProps.waiting}. This is the last screen that can say it. */
  readonly waiting?: string | null;
  readonly onEnter: () => void;
}): ReactElement {
  const titleId = useId();
  return (
    <div
      className="catchup-stage"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="catchup-stopped"
      data-era={eraId}
      data-founded={foundedCount}
    >
      <div className="catchup-well">
        <h2 className="catchup-title" id={titleId}>
          {headline}
        </h2>
        <p className="catchup-concept">{conceptLine(eraId)}</p>

        <p className="catchup-standing" data-testid="catchup-standing">
          {standing}
        </p>
        {waiting ? (
          <p className="catchup-foot catchup-foot--waiting" data-testid="catchup-waiting">
            {waiting}
          </p>
        ) : null}
        <div className="catchup-roads">
          <button
            type="button"
            className="city-action city-action-primary"
            data-testid="catchup-stopped-enter"
            onClick={onEnter}
          >
            Open the first lesson
          </button>
        </div>
        <p className="catchup-foot">{LESSONS_STAY_OPEN}</p>
      </div>
    </div>
  );
}

/** The count of buildings an age hands over, re-exported so a caller need not reach past this. */
export { eraSkillCount };
