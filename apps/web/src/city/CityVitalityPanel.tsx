import { type CityVitality, HAPPINESS_BAND_FLOOR, type HappinessBand } from "@cr/game";
import { type KeyboardEvent, useState } from "react";

import { CITY_LIFE_EXPLAINERS, type CityLifeStat } from "./cityLifeExplainers";
import { useCoachAnchor } from "./coachmarks/coachAnchorRegistry";
import { HudIcon } from "./HudIcon";

/**
 * The Happiness row's actionable alarm. It names the state and points toward activity
 * without promising the retired departure mechanic or implying that every building helps.
 */
export const UNHAPPY_WARNING = "Your people are unhappy and need things to do!";

/**
 * The livability row's own alarmed line.
 *
 * **It is not a second threshold.** It is shown when the engine's provision reading names
 * `sustenance` as the deeper shortfall, which is the same reading and the same object the
 * happiness row keys on. A row with a threshold of its own would be a second opinion about
 * one city.
 *
 * **Its second clause went the same way the happiness row's did.** It read *"…and people are
 * leaving"* until departures were ruled off; what stands there now is what raises the number,
 * because livability comes from homes and from the civic rows that feed them.
 *
 * Worth knowing before you go looking for it in a screenshot: **it is unreachable on era
 * one as shipped.** The hub's founding provision plus the free Smokehouse already cover
 * the founding crowd, and every residence adds more livability than population, so 0 of
 * 4096 mastery vectors are short. `city-provision.test.ts` asserts that count and the
 * control that proves the limb is live rather than inert.
 */
export const UNSUSTAINED_WARNING =
  "The city cannot sustain everyone living here, and wants more homes for them.";

/**
 * **WHAT A CAUGHT-UP CITY IS SHORT OF, which is the one thing its figures cannot say.**
 *
 * The team lead asked for copy naming it, off a panel that had just started congratulating a
 * learner who had done none of the work. A city the diagnostic handed over arrives full,
 * sustained and covered, because #558 seeds it the civic buildings of every age it was given
 * and the crowd now arrives with them. Every figure on this panel is therefore correct and
 * every one of them is about the CITY, while the thing that is undone is about the LEARNER:
 * not one of those skills has been practised.
 *
 * **It replaces the settled note rather than joining it**, and structurally: the count
 * behind it is `shortfalls.practice`, which is a term of `shortfalls.none`, so *"everybody
 * is sustained, and an amenity reaches all of them"* cannot be printed over an unpractised
 * city at all. That is the defect this line exists to close, and closing it with a boolean
 * the engine derives means no future surface has to remember the case.
 *
 * ## THE REGISTER IT IS WRITTEN TO
 *
 * `test/cityCopyRegister.test.ts` forbids a sentence that opens with a negation and forbids
 * em-dashes, over every learner-readable source in the app. So the shortfall is named in the
 * second clause and the first says what is true: the crowd came with the city. D-CIT13's
 * *"the wording never shames"* holds as it does everywhere else on this panel, which is why
 * this is a sentence about what the city is waiting for and not about what its owner has
 * failed to do, and INV-COS-1 holds because nothing here gates anything.
 *
 * It is a FUNCTION rather than a constant because the count is the content: *"some of its
 * skills"* would be the same sentence with the one actionable figure taken out of it.
 */
export function unpractisedCityNote(skills: number): string {
  return skills === 1
    ? "The city arrived with its crowd, and 1 of its skills is still waiting for a first practice set."
    : `The city arrived with its crowd, and ${skills} of its skills are still waiting for a first practice set.`;
}

/**
 * **THE HAPPINESS ROW'S LOW BAND, IN THE PRODUCT LEAD'S OWN WORDS.**
 *
 * *"Replace 'Needs more to do' with 'Your people are unhappy!'"*, off the intro onboarding
 * review on 2026-08-04. The string he was quoting from memory is *"Wants more to do"*, and
 * this is where it lived: the `restless` band's chip, printed on the terms line of the
 * happiness row whenever coverage is under `HAPPINESS_BAND_FLOOR.settling`.
 *
 * **WHY THE MILD VERSION HAD TO GO.** It described the CITY'S APPETITE and never said what
 * state the people were in, so the row a learner meets on a bare island read as a suggestion.
 * The audience is remedial learners and the row is the only place the shortfall is stated;
 * a euphemism there is a fact nobody receives.
 *
 * **IT IS NOT A REBUKE, and D-CIT13 is not overruled.** The sentence is about the CITY'S
 * PEOPLE and not about the learner's study, it keys off what has been BUILT (INV-ERA-3), and
 * it gates nothing (INV-COS-1). The face beside it is still a plain downturned mouth rather
 * than the scowl a verdict would need.
 *
 * **IT LEADS WITH A STATE, NOT WITH A NEGATION**, which is what `cityCopyRegister.test.ts`
 * requires of every sentence in these lanes: "Your people" is the first thing read, and the
 * unhappiness follows it.
 *
 * A constant rather than an inline string because two other surfaces now quote it: the
 * onboarding advisor's happiness moment teaches the learner to read this exact row, and
 * `onboardingScript.test.ts` holds the two together so the tutorial cannot go on quoting a
 * sentence this panel has stopped printing.
 */
export const RESTLESS_LABEL = "Your people are unhappy!";

/**
 * The persistent CITY LIFE readout: population, livability, happiness.
 *
 * WHY IT IS A DOM PANEL AND NOT A CANVAS OVERLAY. The 3D canvas is `aria-hidden`, so
 * anything only depicted there is out of reach — the principle behind D-ERA9/D-ERA29
 * and the reason D-CIT13 requires the readout in text. Era one civic-buildings.md
 * section 6 states it as a rule for exactly these numbers: *"Nothing carries meaning
 * by art alone — the canvas is `aria-hidden`, so every capacity, shortfall and count
 * lives in the DOM."* Every figure here therefore carries a WORD label, the meters are
 * `progressbar`s with their values on them, and no state is signalled by colour alone.
 *
 * WHY IT IS PROMINENT. Section 7: *"The population readout must be prominent"* —
 * above `MAX_RENDERED_CITIZENS = 48` the crowd is a visual sample and the counter is
 * the source of truth, so it sits always-on beside the Town capsule rather than behind
 * a disclosure.
 *
 * COPY RULES IT IS BOUND BY. D-CIT13: the wording never shames. INV-ERA-3 (D-ERA14):
 * nothing here may key off study pace, absence, streaks, or elapsed time — every line
 * describes what was BUILT, which is what makes a shortfall a management signal rather
 * than a verdict. INV-COS-1: a shortfall gates nothing, so nothing here is phrased as
 * a lock, a warning, or a requirement.
 *
 * ── THE DESIGN RULE THIS FILE IS ORGANISED AROUND ─────────────────────────────
 *
 * LIVABILITY AND HAPPINESS ARE NOT THE SAME KIND OF NUMBER, AND MUST NOT SHARE AN
 * INSTRUMENT. Livability is a CAPACITY: a ceiling that sits above or below the crowd,
 * so its interesting value is the DISTANCE between the two and it can legitimately
 * exceed the population. Happiness is a COVERAGE FRACTION: how many of the people
 * here an amenity reaches, bounded by the population by construction. Drawn as two
 * identical fills — which is what shipped at `ab40539`, both `linear-gradient(90deg,
 * #3e7cb1, #5a9bd0)` on an 8px/99px track, measured — a full livability bar and a
 * near-empty happiness bar read as the same measure at two scores. That is not a
 * cosmetic problem: it tells the reader something false about what the city is doing.
 *
 * So a capacity gets a THRESHOLD instrument (`CapacityScale`: a fill for the provision
 * with a notch marking where the crowd falls, so headroom reads as fill past the notch
 * and a shortfall reads as notch past the fill), and a coverage fraction gets a
 * COUNTING instrument (`CoverageCells`: one cell per person). Neither can be mistaken
 * for the other at a glance, which is the whole point.
 *
 * ── ONE SOURCE FOR EVERYTHING SPOKEN ─────────────────────────────────────────
 *
 * `accessibleReadout()` below is the single source of every accessible name, meter
 * value and announced sentence. Nothing is composed a second time at the point of use,
 * so the live region and the meters cannot drift apart into two accounts of one city;
 * `CityVitalityPanel.test.tsx` pins that they agree on the figures.
 *
 * ── AND ONE SOURCE FOR EVERY EXPLANATION ─────────────────────────────────────
 *
 * Each row carries a hover/focus explainer saying what its figure means and the one
 * thing that raises it. The copy is `cityLifeExplainers.ts`'s, never written out here,
 * because every claim in it is asserted against the derivation and a second copy would
 * be a second thing to keep true. See {@link RowExplainer} for the interaction and
 * `cityLifeExplainers.test.ts` for what each line is held to.
 *
 * This panel was chosen from three candidate layouts, compared in the real HUD behind a
 * `?vitality=` hatch (`224d6b8`). Evan picked this one, so the hatch and the other two
 * are gone: it is the panel now rather than a default. The three-way sweeps their
 * comparison needed are gone with them, but every invariant those sweeps carried was
 * re-pointed at this panel rather than dropped — see the test file's own note, which
 * names each one.
 *
 * ── ⚑ THE ALARMED STATE, AND THE TWO RULINGS THAT SHAPED IT ───────────────────
 *
 * The team lead, off this exact panel: *"make the deficiencies in these screens more
 * apparent; if the people are unhappy, it should say so and indicate that people are gonna
 * start leaving. there needs to be clear consequence and indicator of discontent (and same
 * with livability)."*
 *
 * **He then withdrew the consequence and kept the indicator** — *"maybe just remove the
 * actual consequences just tell them their people are unhappy?"* — settled on 2026-08-05:
 * citizens do not leave. So this panel keeps every one of the four cues his first review
 * asked for and promises nothing about anybody going anywhere. The population row's
 * *"N have left"* line is gone with the mechanic, and there is no reduced headcount left for
 * a figure here to prefer.
 *
 * **This overrules one sentence of the styling rule above it, and only one.** The CSS
 * block for this panel says *"The error token `--brick` is likewise absent: a shortfall
 * here is a management signal, not a mistake (INV-COS-1, D-CIT13)."* That reasoning held
 * while every state of this panel was equally mild, and his ruling is that a shortfall the
 * player owes should look different from one they do not. What is NOT overruled:
 *
 *  - **INV-COS-1 still holds.** The alarmed state gates nothing. No lesson, no mastery,
 *    no trial, no era advance and no purchase is blocked by it, and nothing here is phrased
 *    as a lock or a requirement.
 *  - **D-CIT13 still holds.** The wording never shames the LEARNER. Every sentence here is
 *    about the CITY: its people are unhappy, it cannot sustain everyone, it needs provision.
 *    None of it keys off study pace, absence, streaks or elapsed time (INV-ERA-3), because
 *    the engine it reads takes no clock.
 *  - **Nothing is signalled by colour alone.** An alarmed row carries a warning TRIANGLE, a
 *    SENTENCE, and a tint, in that order of reliability.
 *
 * ── WHERE THE THRESHOLD LIVES, WHICH IS NOWHERE IN THIS FILE ──────────────────
 *
 * `vitality.provision.unmet` is the whole of the alarm decision and it is the engine's
 * (`city-provision.ts`). This panel holds no threshold, no comparison and no band of its
 * own for it — so *"the alarmed state and the band label are driven by the same threshold"*
 * is structural rather than a promise two files keep.
 * `departureThresholdIsShared.test.tsx` proves it by moving `HAPPINESS_BAND_FLOOR.settling`
 * and watching the panel's rendered state and the engine's reading move together.
 */

/**
 * A HAPPINESS BAND'S WHOLE READOUT: the words, and the face that must agree with them.
 *
 * ONE TABLE, ONE ROW PER BAND, on purpose. Evan asked for a face beside happiness that
 * tracks the level, and the way that goes wrong is the face and the words beside it
 * disagreeing — a grin over "Your people are unhappy!". Keeping the label and the mouth in
 * the same row makes that a single edit to get wrong rather than two edits to keep in sync,
 * and there is no second set of thresholds anywhere: the BAND is the input, and the
 * bands are the engine's (`HAPPINESS_BAND_FLOOR`), not this file's invention.
 *
 * WHY THERE ARE EXACTLY THREE EXPRESSIONS. Because there are exactly three named levels,
 * and they line up one-to-one with the three mouths a face has: down, level, up. Nothing
 * had to be forced or merged.
 *
 * WHY THE LOW FACE IS UNHAPPY AND NOT ANGRY. Evan's words were "an angry face" at the
 * low end. Anger is a verdict, and this panel is forbidden from passing one: D-CIT13
 * says the wording never shames and INV-COS-1 says a shortfall gates nothing. The label
 * at this band names a state the PEOPLE are in ({@link RESTLESS_LABEL}) and not a
 * judgement on the learner, and a scowl would turn the one into the other. So the low
 * face is a plain downturned mouth — dissatisfied, not cross — and the brows anger would
 * need are absent. If Evan wants the scowl anyway it is two brow strokes added to
 * `restless` below and nothing else.
 */
const BAND_READOUT: Readonly<
  Record<
    HappinessBand,
    {
      readonly label: string;
      readonly expression: "unhappy" | "neutral" | "happy";
      /**
       * The mouth, as a path in the shared 24x24 icon viewBox. The curve DIRECTION is
       * the meaning: a quadratic whose control point sits below its endpoints bows
       * downward on screen and reads as a smile, above them and it reads as a frown,
       * and a plain horizontal line reads as neither. The test asserts that direction
       * against `HAPPINESS_BAND_FLOOR`'s ordering, so a mouth wired to the wrong band
       * fails rather than merely looking odd.
       */
      readonly mouth: string;
    }
  >
> = {
  content: {
    label: "Content",
    expression: "happy",
    mouth: "M8.2 14.4Q12 17.8 15.8 14.4",
  },
  settling: {
    label: "Settling in",
    expression: "neutral",
    mouth: "M8.4 15.4H15.6",
  },
  restless: {
    label: RESTLESS_LABEL,
    expression: "unhappy",
    mouth: "M8.2 16.4Q12 13 15.8 16.4",
  },
};

/**
 * One person per cell is only legible while the crowd is small enough to count. Past
 * this the counting instrument collapses to a continuous fill and the WORDS carry the
 * count, which they do anyway.
 *
 * Deliberately a local constant and not `MAX_RENDERED_CITIZENS`: that one caps how
 * many bodies the scene instances and lives in `city/three/`, and coupling a DOM
 * legibility threshold to a render budget would make each one's value look like it
 * justified the other. Era one's fully-mastered city is 44 people, so era one is
 * countable throughout.
 */
const COUNTABLE_LIMIT = 48;

/**
 * One entry per person, in the roster's own index order, each carrying whether an
 * amenity reaches them. A person's INDEX is their identity here — the engine names them
 * `citizen-000`, `citizen-001` the same way — so the key is stable across renders and a
 * cell never swaps identity with its neighbour.
 */
function countedPeople(
  population: number,
  covered: number,
): readonly { readonly id: string; readonly reached: boolean }[] {
  return Array.from({ length: population }, (_, index) => ({
    id: `person-${index}`,
    reached: index < covered,
  }));
}

interface AccessibleReadout {
  /** Population, in words, singular-aware. */
  readonly populationPhrase: string;
  readonly livability: {
    readonly label: string;
    readonly valueNow: number;
    readonly valueMax: number;
    readonly valueText: string;
  };
  readonly happiness: {
    readonly label: string;
    readonly valueNow: number;
    readonly valueMax: number;
    readonly valueText: string;
  };
  /** The polite announcement: population, then both capacities, then the band. */
  readonly announcement: string;
}

/**
 * EVERY accessible string the panel exposes, derived once. See the file header: nothing
 * downstream composes a second version of any of these, which is what stops the live
 * region and the meters becoming two accounts of one city.
 */
function accessibleReadout(vitality: CityVitality): AccessibleReadout {
  const { population, livability, happiness, provision } = vitality;
  const people = population === 1 ? "person" : "people";
  const headroom = livability.sustains - population;

  return {
    populationPhrase: `${population} ${people}`,
    livability: {
      label: "People the city can sustain",
      // Clamped, because the METER's scale is the population; the surplus is on
      // `valueText` instead, where it can be said rather than implied by a full bar.
      valueNow: Math.min(livability.sustains, population),
      valueMax: population,
      valueText:
        headroom >= 0
          ? `Sustains all ${population} ${people}, with room for ${headroom} more`
          : `Sustains ${livability.sustains} of ${population} ${people}, ${-headroom} short`,
    },
    happiness: {
      label: "People the city can keep happy",
      valueNow: happiness.covered,
      valueMax: population,
      valueText: `Keeps ${happiness.covered} of ${population} ${people} happy, ${happiness.level} percent`,
    },
    // THE ARC, WHICH NO LONGER HAS A LOSS IN IT. This sentence carried
    // `N have left` between the headcount and the capacities, on D-CIT13's "announce the
    // arc, not just the state" — a screen-reader learner must not be the only person in the
    // room who cannot tell what happened to the city, and the canvas is `aria-hidden`. The
    // clause went with the mechanic, and the reason it is safe to drop rather than reword is
    // that there is now no change to the headcount for anybody to miss. What the alarmed
    // state says is still here, at the end, in the same words the row prints.
    announcement:
      `${population} ${people}. ` +
      `Livability sustains ${Math.min(livability.sustains, population)} of them` +
      `${headroom > 0 ? ` with ${headroom} to spare` : ""}. ` +
      `Happiness ${happiness.level} percent: the city can keep ${happiness.covered} happy. ` +
      `${provision.unmet ? UNHAPPY_WARNING : `${BAND_READOUT[happiness.band].label}.`}`,
  };
}

/**
 * WHY WHICH INPUT BINDS IS NOT WRITTEN OUT IN WORDS — and the question has now been
 * dissolved rather than answered.
 *
 * The first version appended "Food is the lower" whenever livability fell short under
 * `"binding"` aggregation. It was dropped as redundant against a row that showed both
 * inputs. #236 then ruled livability to be ONE POOL, so there is no lower input, no
 * binding term, and no pair of figures to compare: `capacity.ts` records the cost of its
 * own ruling in exactly these terms — *"a shortfall can no longer say 'food is your
 * binding constraint', because there is no food term left to bind."*
 *
 * Kept as history because the deletion is the interesting part. A branch that printed
 * which input bound would now be unreachable code describing a model the repo does not
 * have, and it is the kind of unreachable branch that reads as a feature to the next
 * person to open this file.
 */

/** The headroom or the gap, in words, from whichever side the capacity falls. */
function headroomPhrase(headroom: number): string {
  return headroom >= 0 ? `room for ${headroom} more` : `${-headroom} short`;
}

/**
 * Every band the engine defines, weakest first. Derived from `HAPPINESS_BAND_FLOOR`
 * rather than written down, so a band added to the model arrives here already ordered
 * and the test can hold this file to the model's own ranking.
 */
export const HAPPINESS_BANDS_BY_FLOOR: readonly HappinessBand[] = (
  Object.keys(HAPPINESS_BAND_FLOOR) as HappinessBand[]
).sort((a, b) => HAPPINESS_BAND_FLOOR[a] - HAPPINESS_BAND_FLOOR[b]);

/** The words and the face for a band. Exported so the test reads the same row the DOM does. */
export function happinessReadout(
  band: HappinessBand,
): (typeof BAND_READOUT)[HappinessBand] {
  return BAND_READOUT[band];
}

/**
 * Each row is a figure with a label and its OWN instrument, chosen for the kind of
 * quantity it is: the capacity scale for livability, the coverage cells for happiness,
 * and nothing at all for the headcount, which is a single integer and has nothing to be
 * a fraction of.
 *
 * There is no tinted callout. The version at `ab40539` said "18 of them are out of reach
 * of an amenity" directly under a line reading "Amenities reach 4 of 22" — one fact
 * twice, with the panel's most emphatic element spent on the repeat. The happiness row
 * states the coverage once; the settled state keeps its note, because at that point
 * every row reads full and the note is the only thing saying so.
 */
export function CityVitalityPanel({ vitality }: { vitality: CityVitality }) {
  const readout = accessibleReadout(vitality);
  const { population, livability, happiness, shortfalls, provision } = vitality;
  const headroom = livability.sustains - population;
  /*
    THE TWO ALARMED ROWS, AND NEITHER IS THIS FILE'S DECISION.

    `provision.unmet` is the engine's one boolean for "the city is short of something its
    people need, and the player is the one who owes it". Which ROW carries it is
    `provision.cause`, the same object's account of which shortfall is the deeper one, so the
    panel cannot light up a row the reading is not about. There is no threshold, no
    comparison and no band here.
  */
  const unhappy = provision.unmet && provision.cause === "amenities";
  const unsustained = provision.unmet && provision.cause === "sustenance";
  const explainers = useRowExplainers();
  const cityLifeAnchor = useCoachAnchor("cityLife");
  const anchors = useRowAnchors();

  return (
    <section
      className="hud-vitality"
      ref={cityLifeAnchor}
      data-testid="city-vitality"
      data-alarm={provision.unmet ? "true" : "false"}
      aria-labelledby="city-vitality-heading"
    >
      {/* 2026-08-22: "doesnt need to be a separate 'city life' indicator" -- the heading
          stays for its accessible name (the section's `aria-labelledby` and
          `CityVitalityPanel.test.tsx`'s "City life" region both read it), but it no longer
          takes a visible line off a panel three rows are already tight for. */}
      <h3 className="hud-kicker visually-hidden" id="city-vitality-heading">
        City life
      </h3>

      <dl className="hud-vitality-rows">
        <div
          className="hud-vitality-row"
          data-testid="vitality-population"
          data-alarm="false"
          ref={anchors.population}
          {...explainers.rowProps("population")}
        >
          <dt>
            <HudIcon name="building" />
            Population
            <ExplainerTrigger stat="population" open={explainers.openStat} />
          </dt>
          <dd>
            {/* ⚑ THE FIGURE IS THE HEADCOUNT LEARNING BROUGHT, AND THERE IS NO OTHER ONE.
                This read `departures.remaining` and carried an alarmed terms line saying
                `N people have left`, from the day the departure mechanic shipped to the day
                it was ruled off (2026-08-05, "citizens do not leave"). Both are gone, and
                the row is `data-alarm="false"` unconditionally rather than keyed on a
                reduced count that no longer exists: this row is the one number on the panel
                nothing can take away from, which is what the ruling amounts to on screen. */}
            <Figure
              value={String(population)}
              unit={population === 1 ? "person" : "people"}
            />
          </dd>
          <RowExplainer stat="population" open={explainers.openStat} />
        </div>

        <div
          className="hud-vitality-row"
          data-testid="vitality-livability"
          data-alarm={unsustained ? "true" : "false"}
          ref={anchors.livability}
          {...explainers.rowProps("livability")}
        >
          <dt>
            <HudIcon name="home" />
            Livability
            <ExplainerTrigger stat="livability" open={explainers.openStat} />
          </dt>
          <dd>
            <Figure value={String(livability.sustains)} unit="sustained" />
          </dd>
          <span
            role="progressbar"
            aria-label={readout.livability.label}
            aria-valuemin={0}
            aria-valuemax={readout.livability.valueMax}
            aria-valuenow={readout.livability.valueNow}
            aria-valuetext={readout.livability.valueText}
          >
            <CapacityScale population={population} sustains={livability.sustains} />
          </span>
          {/* The headroom rides on the terms line rather than beside the figure, so
              the label and the figure can share one line. */}
          {unsustained ? (
            <AlarmLine
              testId="vitality-livability-terms"
              figure={headroomPhrase(headroom)}
              text={UNSUSTAINED_WARNING}
            />
          ) : (
            <TermsLine tail={headroomPhrase(headroom)} />
          )}
          <RowExplainer stat="livability" open={explainers.openStat} />
        </div>

        <div
          className="hud-vitality-row"
          data-testid="vitality-happiness"
          data-alarm={unhappy ? "true" : "false"}
          ref={anchors.happiness}
          {...explainers.rowProps("happiness")}
        >
          <dt>
            <HappinessFace band={happiness.band} testId="vitality-happiness-face" />
            Happiness
            <ExplainerTrigger stat="happiness" open={explainers.openStat} />
          </dt>
          <dd data-band={happiness.band}>
            {/* Count alone in the display figure — "27 of 44" as one glyph wraps mid-
                phrase once roads push coverage to two digits (measured on ?mock&paths).
                "of N" is the unit, same shape as Population / Livability. */}
            <Figure value={String(happiness.covered)} unit={`of ${population}`} />
          </dd>
          <span
            role="progressbar"
            aria-label={readout.happiness.label}
            aria-valuemin={0}
            aria-valuemax={readout.happiness.valueMax}
            aria-valuenow={readout.happiness.valueNow}
            aria-valuetext={readout.happiness.valueText}
          >
            <CoverageCells population={population} covered={happiness.covered} />
          </span>
          {unhappy ? (
            <AlarmLine
              testId="vitality-happiness-terms"
              figure={
                happiness.fromPaths > 0
                  ? `Roads add ${happiness.fromPaths} Happiness`
                  : undefined
              }
              text={UNHAPPY_WARNING}
            />
          ) : (
            <p className="hud-vitality-terms" data-testid="vitality-happiness-terms">
              {BAND_READOUT[happiness.band].label}
              {happiness.fromPaths > 0
                ? ` · Roads add ${happiness.fromPaths} Happiness`
                : ""}
            </p>
          )}
          <RowExplainer stat="happiness" open={explainers.openStat} />
        </div>
      </dl>

      {shortfalls.none && (
        <p className="hud-vitality-note" data-testid="vitality-settled">
          Everybody is sustained, and the city can keep all of them happy.
        </p>
      )}

      {shortfalls.practice > 0 && (
        <p className="hud-vitality-note" data-testid="vitality-unpractised">
          {unpractisedCityNote(shortfalls.practice)}
        </p>
      )}

      {/* The arc, not just the state (D-CIT13): a change to any of the three is
          announced once, politely, without moving focus. */}
      <p className="visually-hidden" aria-live="polite" data-testid="vitality-live">
        {readout.announcement}
      </p>
    </section>
  );
}

/* ========================================================================== */
/* The row explainers                                                          */
/* ========================================================================== */

/**
 * The three rows, registered as spotlight anchors so the onboarding advisor can put a
 * ring round the one he is talking about.
 *
 * `App` mounts this panel inside `CitySurface` and the tutorial is a sibling of both, so
 * threading three refs up and back down would put tutorial plumbing in two signatures that
 * have nothing to do with the tutorial. Each row volunteers itself instead, which is what
 * `coachAnchorRegistry` exists for and what the Sound chip and the stockpile already do.
 *
 * Written out rather than looped because these are hooks: three unconditional calls in a
 * fixed order is the shape React requires, and `CITY_LIFE_STATS.map` is not.
 */
function useRowAnchors(): Readonly<Record<CityLifeStat, (el: HTMLElement | null) => void>> {
  return {
    population: useCoachAnchor("population"),
    livability: useCoachAnchor("livability"),
    happiness: useCoachAnchor("happiness"),
  };
}

/** The DOM id the trigger describes itself by, and the bubble answers to. */
function explainerTextId(stat: CityLifeStat): string {
  return `city-life-${stat}-explainer`;
}

/**
 * WHICH ROW IS EXPLAINING ITSELF, from the two ways a person asks.
 *
 * TWO SOURCES RATHER THAN ONE FLAG, because hover and focus can disagree and the
 * one-flag version loses: a learner who tabs to the trigger and then moves the mouse off
 * the row has the bubble taken away mid-read. `focused ?? hovered` keeps whichever is
 * the more deliberate, and neither has to know about the other.
 *
 * `dismissed` is the Escape key, which the APG's tooltip pattern requires to hide a
 * tooltip WITHOUT moving focus. Blurring the trigger instead would have been one line
 * and would have thrown a keyboard user back to the top of the document, so the state
 * is kept here and cleared the next time the row is deliberately entered.
 */
function useRowExplainers() {
  const [hovered, setHovered] = useState<CityLifeStat | null>(null);
  const [focused, setFocused] = useState<CityLifeStat | null>(null);
  const [dismissed, setDismissed] = useState<CityLifeStat | null>(null);

  const asked = focused ?? hovered;
  const openStat = asked === dismissed ? null : asked;

  return {
    openStat,
    /**
     * THE WHOLE ROW IS THE TARGET, not the 15px trigger inside it. The lead asked for
     * something *"users can hover over"*, and a hit area the width of the label, the
     * figure and the meter is what makes that true on a 230px panel; the trigger is
     * there to say the explanation EXISTS and to be the keyboard's way in.
     */
    rowProps(stat: CityLifeStat) {
      return {
        "data-stat": stat,
        onPointerEnter: () => {
          setDismissed(null);
          setHovered(stat);
        },
        onPointerLeave: () => setHovered((current) => (current === stat ? null : current)),
        onFocus: () => {
          setDismissed(null);
          setFocused(stat);
        },
        onBlur: () => setFocused((current) => (current === stat ? null : current)),
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setDismissed(asked);
          }
        },
      };
    },
  };
}

/**
 * The affordance: a small circled question mark after the row's label.
 *
 * IT IS A REAL BUTTON, which is the whole of "keyboard-reachable". A `title` attribute or
 * a CSS-only `:hover` rule would have been fewer lines and would have shipped an
 * explanation a keyboard user cannot reach and a touch user cannot open, which is the
 * failure mode this panel exists to avoid: the 3D canvas is `aria-hidden`, so anything
 * only a mouse can get at does not exist for half the people who need it.
 *
 * ITS GLYPH IS AN SVG AND NOT THE CHARACTER "?", deliberately. A text question mark would
 * land in `.hud-vitality-row`'s `textContent` between the label and the figure, where
 * three shipped assertions read `Population 8 people` off the row as one string.
 *
 * `aria-describedby` points at the bubble, which is in the DOM whether or not it is
 * drawn (see {@link RowExplainer}), so the description resolves on focus rather than
 * depending on a screen reader's handling of a hidden target.
 */
function ExplainerTrigger({
  stat,
  open,
}: {
  stat: CityLifeStat;
  open: CityLifeStat | null;
}) {
  const { label } = CITY_LIFE_EXPLAINERS[stat];
  return (
    <button
      type="button"
      className="hud-vitality-help"
      data-testid={`vitality-${stat}-help`}
      data-open={open === stat}
      aria-label={`About ${label}`}
      aria-describedby={explainerTextId(stat)}
      onClick={(event) => {
        // Touch has no hover and gives a tap both a pointerenter and a click, so the
        // click must not immediately undo what the pointerenter just opened. Focus does
        // the opening on tap; this only keeps the button from submitting anything.
        event.preventDefault();
      }}
    >
      <HudIcon name="help" />
    </button>
  );
}

/**
 * The bubble, and it is ALWAYS IN THE DOM.
 *
 * Closed it is `visually-hidden` rather than absent, so the explanation is part of the
 * panel a screen reader browses AND a resolvable `aria-describedby` target the moment the
 * trigger takes focus. Rendering it only while open would have made both of those
 * conditional on a pointer, which is exactly the half of "it has to work as an
 * interaction" that gets skipped.
 *
 * WHERE IT SITS IS A LAYOUT QUESTION AND IS ANSWERED IN CSS, but the DOM order is part of
 * the answer: it is the row's LAST child, after the figure and the terms line. Put in the
 * `dt` beside the trigger it would read between the label and the number, and
 * `Population 8 people` is asserted as one string in three places.
 */
function RowExplainer({ stat, open }: { stat: CityLifeStat; open: CityLifeStat | null }) {
  return (
    <p
      className="hud-vitality-explainer"
      id={explainerTextId(stat)}
      role="tooltip"
      data-open={open === stat}
      data-testid={`vitality-${stat}-explainer`}
    >
      {CITY_LIFE_EXPLAINERS[stat].text}
    </p>
  );
}

/* ========================================================================== */
/* The instruments                                                            */
/* ========================================================================== */

/**
 * A figure and its unit as two SEPARATE elements. The version at `ab40539` set numbers
 * as `<strong>` inside a running phrase — "sustains **all 22**", "**18%** Wants more to
 * do" — which put an 18.4px/700 figure inside 12.8px prose and made every row read as
 * a sentence interrupted by a number (measured). Here the weight change happens BETWEEN
 * elements and never inside a phrase, so a row is a figure with a label and reads as one.
 */
function Figure({ value, unit }: { value: string; unit: string }) {
  return (
    <>
      <span className="hud-vitality-figure" data-wrap={value.length >= 6 || undefined}>
        {value}
      </span>{" "}
      <span className="hud-vitality-unit">{unit}</span>
    </>
  );
}

/**
 * The happiness face: the sun glyph that used to label this row, replaced by a face
 * whose mouth tracks the band. Drawn in the panel's own icon language — a line glyph on
 * the shared 24x24 viewBox, inheriting `currentColor` and the row's stroke weight — and
 * NOT as an emoji character, which would render as a different picture on every OS,
 * ignore that stroke weight, and sit as a foreign object beside the house and building
 * glyphs. Swapping to a literal emoji is one line: return the character from
 * `BAND_READOUT` instead of the path and drop the `<svg>`.
 *
 * EXPORTED SO THE BUILD MENU WEARS THE SAME FACE, which is the whole of what the lead
 * asked a civic card's happiness clause for: *"it should have some kind of emoticon so
 * that its more obvious."* The point of the icon on the card is the TIE — a learner
 * looking at "10 Happiness" should know which row of this panel is about to move — and a
 * tie made by drawing a second, similar face in `CitySurface.tsx` would be two glyphs
 * free to drift apart on the next edit to either. One component, one mouth table, so the
 * card and the row cannot disagree about what happiness looks like. The card passes a
 * FIXED band (`content`) because it is quoting a quantity rather than reporting a state;
 * see `CivicBuildCard`.
 *
 * DECORATIVE, AND `aria-hidden`. This is the same contract every `HudIcon` in the HUD
 * has, and it is right here for a specific reason rather than by habit: the band is
 * already text twice over — visibly in `vitality-happiness-terms`, and in the announced
 * sentence — so the face adds no meaning a screen reader lacks. Left announceable it
 * would only add noise ("slightly frowning face") to the one surface that carries this
 * city's state, since the canvas is `aria-hidden`.
 *
 * NO COLOUR AXIS, DELIBERATELY. The face is ink, exactly like the building and home
 * glyphs beside it, so it reads as a member of the same set. A green-to-red face would
 * put the panel's meaning on the one axis red/green colour blindness erases, and this
 * panel's whole premise is that nothing is signalled by colour alone; it would also have
 * to borrow a gold, and both golds are spoken for (`#FFB703` is mastery's, `--game-gold`
 * is reward's). The EXPRESSION carries it, which is a shape and needs no hue.
 *
 * NOTHING ANIMATES. An SVG `d` cannot be transitioned in CSS, so a band change swaps the
 * mouth instantly and there is no motion to make reduced-motion-safe. That is a choice
 * as much as a consequence: a morphing face would be decoration on a readout, and the
 * band changes so rarely that nobody would be present to watch it move.
 */
export function HappinessFace({
  band,
  testId,
}: {
  band: HappinessBand;
  /**
   * Optional, and absent on the build menu's cards on purpose. The panel's face is a
   * READING that four suites and a shot script address by name; a card's is a label. With
   * the id baked in, one open build menu put five elements behind the panel's own hook and
   * every `getByTestId` for it became ambiguous (measured — that is how this prop arrived).
   */
  testId?: string;
}) {
  const { expression, mouth } = BAND_READOUT[band];
  return (
    <svg
      className="hud-icon hud-vitality-face"
      data-expression={expression}
      data-testid={testId}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9.4" />
      {/* Eyes as short vertical ticks rather than dots: a round-capped dot is one
          stroke-width across and vanishes at this size, where a tick survives. */}
      <path d="M8.9 9.3v1.7" />
      <path d="M15.1 9.3v1.7" />
      <path d={mouth} />
    </svg>
  );
}

/**
 * The capacity instrument: a fill for what the city PROVIDES, and a notch at where the
 * CROWD falls. The two readings are the same glyph — fill past the notch is headroom,
 * notch past the fill is the shortfall — which is what makes it a ceiling rather than
 * a score. The axis spans whichever of the two is larger, so a surplus is drawn
 * instead of being clamped away.
 *
 * `aria-hidden`, because the `progressbar` around it carries the value in text.
 */
function CapacityScale({ population, sustains }: { population: number; sustains: number }) {
  const axis = Math.max(population, sustains, 1);
  return (
    <span
      className="hud-vitality-scale"
      data-state={sustains >= population ? "room" : "short"}
      aria-hidden="true"
      style={{
        // Percentages of the shared axis, so the two are directly comparable.
        ["--provision" as string]: `${(Math.min(sustains, axis) / axis) * 100}%`,
        ["--crowd" as string]: `${(Math.min(population, axis) / axis) * 100}%`,
      }}
    >
      <span className="hud-vitality-scale-fill" />
      <span className="hud-vitality-scale-notch" />
    </span>
  );
}

/**
 * The coverage instrument: one cell per person, filled for the people an amenity
 * reaches. Segmented rather than continuous because the quantity IS a count of
 * individuals, and because a segmented row cannot be mistaken for the capacity scale
 * above it at a glance — which is the misinformation this redesign exists to fix.
 *
 * Above `COUNTABLE_LIMIT` the cells stop being countable, so it degrades to one
 * continuous fill. The words never degrade.
 */
function CoverageCells({ population, covered }: { population: number; covered: number }) {
  if (population === 0 || population > COUNTABLE_LIMIT) {
    const pct = population === 0 ? 0 : (covered / population) * 100;
    return (
      <span className="hud-vitality-cells" data-mode="continuous" aria-hidden="true">
        <span className="hud-vitality-cells-fill" style={{ width: `${pct}%` }} />
      </span>
    );
  }

  return (
    <span className="hud-vitality-cells" data-mode="counted" aria-hidden="true">
      {countedPeople(population, covered).map((person) => (
        <span
          key={person.id}
          className="hud-vitality-cell"
          data-reached={person.reached ? "true" : "false"}
        />
      ))}
    </span>
  );
}

/**
 * The livability line beneath the figure.
 *
 * **IT NAMES NO INPUTS, and that is #236 reaching the DOM.** This read
 * `Housing {n} · Food {n}` on the reasoning that showing both terms said which one set
 * the ceiling more directly than a sentence about it would. That reasoning was sound
 * under two terms and is void under one: livability is a single pool and housing and food
 * are not tracked separately, so a panel printing two figures would be putting numbers in
 * front of a learner that the model does not have and that no row of the catalogue
 * declares. There is nothing left to name.
 *
 * WHAT SURVIVES IS THE HEADROOM, which is the half a learner can act on and the half the
 * two shortfall tests read. It keeps its own element and its own `data-testid` so that
 * "a shortfall is stated in words and figures, never left to the shape of a bar" is still
 * asserted on a surface that exists.
 */
function TermsLine({ tail }: { tail?: string }) {
  return (
    <p className="hud-vitality-terms" data-testid="vitality-livability-terms">
      {tail ?? ""}
    </p>
  );
}

/**
 * A row's distressed line: the warning triangle, then the sentence.
 *
 * THE TRIANGLE IS THE POINT. The lead asked for a panel that looks wrong at a glance, and
 * a glance is pre-verbal — so the state has to be carried by a SHAPE before it is carried
 * by a sentence, and by a shape rather than a hue because this panel's own rule is that
 * nothing is signalled by colour alone (D-CIT13) and red is the axis colour blindness
 * erases. The tint on the row is the third cue, not the first.
 *
 * `aria-hidden` on the glyph, because the sentence beside it already says everything the
 * triangle does and a screen reader announcing "alert" before it would be noise.
 */
function AlarmLine({
  testId,
  figure,
  text,
}: {
  testId: string;
  /**
   * The row's own FIGURE, kept ahead of the sentence.
   *
   * It is not optional decoration. *"A shortfall is stated in words AND figures, never
   * left to the shape of a bar"* is an assertion this panel already carries, and the first
   * draft of the distressed state broke it by replacing the terms line wholesale — the
   * livability row lost its "14 short" to a sentence that said the same thing less
   * precisely. The alarm is an ADDITION to the row's reading, never a substitution for it.
   */
  figure?: string;
  text: string;
}) {
  return (
    <p className="hud-vitality-terms hud-vitality-alarm" data-testid={testId}>
      <HudIcon name="alert" />
      {figure ? ` ${figure} · ${text}` : ` ${text}`}
    </p>
  );
}
