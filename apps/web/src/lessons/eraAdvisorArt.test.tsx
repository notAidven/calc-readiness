/**
 * EVERY ERA'S ADVISOR ACTUALLY DRAWS SOMEBODY, AND ERA TWO DRAWS ITS OWN (D-ERA28).
 *
 * ## The behaviour, and why the population is all ten eras
 *
 * The advisor narrates on the LEARNING SURFACE, and `AdvisorLesson` derives the era from the
 * lesson's own node (`getEraOfNode`), so the era that narrates is a function of what is being
 * taught. Any era with a lesson pack can therefore put its advisor on screen, and three eras
 * besides the first two already have packs. So the population here is **every era in
 * `ERA_SEQUENCE`**, derived, never a written-down list of two — the defect being guarded is "a
 * learner is shown an empty figure where their advisor should be", and that is possible in any
 * era whose row resolves to a drawing nothing renders.
 *
 * Scoped by the behaviour rather than by the implementation, per `.cursor/rules/qa-verification.mdc`:
 * the question is not "which eras import a character component" (none of them do; `AdvisorNpc`
 * dispatches) but "which eras can reach the surface where a blank figure would show".
 *
 * ## What is NOT here
 *
 * This harness runs `css: false`, so it cannot see the cascade. **Pose VISIBILITY and motion
 * are CSS** — `.maka-advisor[data-mood="squint"] .maka-advisor__eyes-open { display: none }`
 * and friends — and are evidenced by the Playwright pose screenshots in
 * `output/era2-advisor/`, not by anything below. What this file proves is the chain from a
 * lesson beat to a mounted drawing carrying the right `data-mood`, with a floor under every
 * count so no assertion here can hold over an empty table.
 *
 * The TYPE-level half of D-ERA28 is not testable at runtime at all and is not attempted: a
 * dropped beat and a pose a drawing cannot strike are compile errors, demonstrated by
 * injection in `eraAdvisor.ts`' header.
 */

import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdvisorNpc } from "./AdvisorNpc";
import {
  ADVISOR_MOODS,
  type AdvisorArt,
  advisorNameForEra,
  advisorPosesForEra,
} from "./eraAdvisor";
import { MakaAdvisorCharacter, type MakaMood } from "./MakaAdvisorCharacter";
import { OruAdvisorCharacter, type OruMood } from "./OruAdvisorCharacter";

/** Every era id in play order, derived from the authored sequence. */
const ERA_IDS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

/**
 * The CSS class each drawing roots itself at, and the pose vocabulary it offers.
 *
 * Keyed by the `AdvisorArt` token so a new drawing that is added to that union without a row
 * here fails to compile — `Record`, not `Partial`, for `eraAdvisor.ts`' own reason.
 */
const DRAWINGS: Readonly<
  Record<AdvisorArt, { readonly rootClass: string; readonly poses: readonly string[] }>
> = {
  oru: {
    rootClass: "oru-advisor",
    poses: ["idle", "talk", "point", "squint"] satisfies readonly OruMood[],
  },
  maka: {
    rootClass: "maka-advisor",
    poses: ["idle", "talk", "point", "squint"] satisfies readonly MakaMood[],
  },
};

/**
 * THE ERAS THAT BORROW ANOTHER ERA'S DRAWING — the named exception to "an era draws its own
 * advisor", each with the reason it does not owe one yet.
 *
 * These eight genuinely do not owe their own art: no advisor character has been authored for
 * any of them, and `eras/README.md` records the drawing as owed per era. An era that does not
 * owe its own drawing and an era that FORGOT to wire one look identical from outside this
 * guard, so they are named here rather than filtered away — and the list is asserted BOTH ways
 * below, so neither direction can rot:
 *
 *   - an era on this list that has acquired its own drawing FAILS, so a newly-drawn era cannot
 *     sit here being silently excused (this is the direction era two just crossed);
 *   - an era NOT on this list must own its drawing, so the list is the only way out of that
 *     requirement and it is visible.
 *
 * **The reasons below cite the eras README by description and not by filename, on purpose.**
 * `test/ciScopeFilter.test.ts` sweeps every markdown NAME written in executable code — string
 * literals included, comments stripped — and requires each one to be a path the CI scope
 * filter bills the full gate set for, because a source that names a markdown file might be
 * parsing it. Five of these reasons said `eras/README.md`, so this file was read as a reader
 * of that document and CI failed asking for it to be reclassified as code. It is not a
 * reader: it opens no markdown at all. Reclassifying would also have contradicted that same
 * guard's own `PROSE_SAMPLE`, which pins `docs/superpowers/specs/eras/README.md` as prose
 * that must stay cheap. The citation lives in this docblock instead, where it is a comment,
 * which is what it always was.
 */
const ERAS_BORROWING_ART: Readonly<Record<string, string>> = {
  bronze_age: "no advisor character authored; drawing owed per the eras README",
  classical: "no advisor character authored; drawing owed per the eras README",
  medieval: "D5 lessons exist, advisor art does not; drawing owed",
  renaissance: "no advisor character authored; drawing owed per the eras README",
  industrial: "no advisor character authored; drawing owed per the eras README",
  atomic_age: "D7 lessons exist, advisor art does not; drawing owed",
  information_age: "D8 lessons exist, advisor art does not; drawing owed",
  cyberpunk: "no advisor character authored; drawing owed per the eras README",
};

/** The eras held to "draws its own advisor" — everything not excused above. */
const ART_OWNING_ERAS: readonly EraId[] = ERA_IDS.filter(
  (eraId) => !(eraId in ERAS_BORROWING_ART),
);

/* -------------------------------------------------------------------------- */
/* 1. No era renders an empty figure, at any beat                              */
/* -------------------------------------------------------------------------- */

describe("every era draws a real advisor at every lesson beat", () => {
  it("mounts a drawing with real parts for all ten eras x every beat", () => {
    let rendered = 0;
    let thinnest = Number.POSITIVE_INFINITY;

    for (const eraId of ERA_IDS) {
      const row = advisorPosesForEra(eraId);
      const drawing = DRAWINGS[row.art];
      for (const mood of ADVISOR_MOODS) {
        const { container, unmount } = render(
          <AdvisorNpc line="A teaching line." mood={mood} eraId={eraId} />,
        );

        const figure = container.querySelector(`.${drawing.rootClass}`);
        expect(figure, `${eraId}/${mood} rendered no advisor figure`).not.toBeNull();
        // Not merely a mounted root: an empty box would satisfy that. The drawing is made
        // of absolutely-positioned parts, so count them.
        const parts = figure?.querySelectorAll(`.${drawing.rootClass}__part`).length ?? 0;
        expect(parts, `${eraId}/${mood} rendered an empty figure`).toBeGreaterThan(30);
        thinnest = Math.min(thinnest, parts);

        // The beat reached the drawing: the character carries the pose its era's row maps
        // this beat to, not the beat name and not a default.
        expect(figure?.getAttribute("data-mood"), `${eraId}/${mood} lost its pose`).toBe(
          row.moodPose[mood],
        );
        rendered += 1;
        unmount();
      }
    }

    // FLOORS. Without these, every line above holds vacuously over an empty era sequence or
    // an empty mood list — "the advisor renders" passing over nothing is the exact failure
    // mode this file is written against.
    expect(rendered).toBe(ERA_IDS.length * ADVISOR_MOODS.length);
    expect(ERA_IDS.length).toBeGreaterThanOrEqual(10);
    expect(ADVISOR_MOODS.length).toBeGreaterThanOrEqual(3);
    expect(rendered).toBeGreaterThanOrEqual(30);
    expect(thinnest).toBeGreaterThan(30);
  });

  it("never renders the advisor slot empty, whichever era narrates", () => {
    for (const eraId of ERA_IDS) {
      const { container, unmount } = render(
        <AdvisorNpc line="A teaching line." eraId={eraId} />,
      );
      const slot = container.querySelector(".advisor-npc__character");
      expect(slot, `${eraId} has no character slot`).not.toBeNull();
      expect(slot?.children.length, `${eraId} draws nothing at all`).toBeGreaterThan(0);
      unmount();
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Era two draws its OWN advisor — the new behaviour                        */
/* -------------------------------------------------------------------------- */

describe("era two's advisor is its own drawing, not era one's", () => {
  it("renders era two's character on an era-two lesson beat, and era one's on era one's", () => {
    for (const mood of ADVISOR_MOODS) {
      const two = render(<AdvisorNpc line="Grain." mood={mood} eraId="neolithic" />);
      expect(
        two.container.querySelector(".maka-advisor"),
        `era two at ${mood} does not draw its own advisor`,
      ).not.toBeNull();
      // And it is NOT era one's drawing standing in — the state this replaced.
      expect(
        two.container.querySelector(".oru-advisor"),
        `era two at ${mood} is still borrowing era one's drawing`,
      ).toBeNull();
      two.unmount();

      const one = render(<AdvisorNpc line="Stone." mood={mood} eraId="prehistoric" />);
      expect(
        one.container.querySelector(".oru-advisor"),
        `era one at ${mood} lost its own advisor`,
      ).not.toBeNull();
      expect(
        one.container.querySelector(".maka-advisor"),
        `era one at ${mood} drew era two's advisor`,
      ).toBeNull();
      one.unmount();
    }
    expect(ADVISOR_MOODS.length).toBeGreaterThanOrEqual(3);
  });

  it("declares the drawing in data, so a borrow cannot pass for a finished character", () => {
    expect(advisorPosesForEra("neolithic").art).toBe("maka");
    expect(advisorPosesForEra("neolithic").artIsOwn).toBe(true);
    expect(advisorPosesForEra("prehistoric").art).toBe("oru");
    expect(advisorPosesForEra("prehistoric").artIsOwn).toBe(true);
  });

  it("takes no position on the advisor's NAME, which is a different kind of name", () => {
    // The spoken name comes from `ERA_ADVISORS` and is whatever that table says; this module
    // owns the drawing. Era two's name was contested three ways until Evan settled it on
    // 2026-07-31 (*"oru redressed"* — D-ET9's answer: Oru re-dressed as a grain keeper), and
    // the file the drawing was ported from keeps its delivered name, `MakaAdvisor.dc.html`.
    //
    // So the independence below is PERMANENT rather than a symptom of the dispute, and it is
    // asserted rather than argued: the drawing token and the spoken name must differ, and
    // this line fails if somebody ties them together — which is how the art would start
    // quietly deciding the name. Under D-ET9 one advisor wears ten costumes, so a drawing
    // token that equalled the person's name could not stay unique across the run.
    const name = advisorNameForEra("neolithic");
    expect(name.length).toBeGreaterThan(0);
    expect(name).not.toBe(advisorPosesForEra("neolithic").art);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Each drawing renders every pose in its own vocabulary                    */
/* -------------------------------------------------------------------------- */

describe("each drawing renders every pose it claims to offer", () => {
  it("mounts era one's four and era two's four, each carrying its own data-mood", () => {
    let mounted = 0;

    for (const pose of DRAWINGS.oru.poses as readonly OruMood[]) {
      const { container, unmount } = render(<OruAdvisorCharacter mood={pose} />);
      const root = container.querySelector(".oru-advisor");
      expect(root, `Oru at ${pose}`).not.toBeNull();
      expect(root?.getAttribute("data-mood")).toBe(pose);
      mounted += 1;
      unmount();
    }

    for (const pose of DRAWINGS.maka.poses as readonly MakaMood[]) {
      const { container, unmount } = render(<MakaAdvisorCharacter mood={pose} />);
      const root = container.querySelector(".maka-advisor");
      expect(root, `era two's advisor at ${pose}`).not.toBeNull();
      expect(root?.getAttribute("data-mood")).toBe(pose);
      // The mood-dependent parts are ALL present at EVERY pose — the port is static markup
      // and CSS decides which shows, which is what makes swapping poses free of a re-mount.
      for (const part of [
        "maka-advisor__arm",
        "maka-advisor__eyes-open",
        "maka-advisor__eyes-narrow",
        "maka-advisor__mouth-line",
        "maka-advisor__mouth-talk",
        "maka-advisor__wheel",
      ]) {
        expect(container.querySelectorAll(`.${part}`).length, part).toBeGreaterThan(0);
      }
      mounted += 1;
      unmount();
    }

    // Floors on size AND shape: two drawings of four poses each, and the second drawing
    // contributes a real four of its own rather than the loop running twice over era one's.
    expect(mounted).toBe(8);
    expect(DRAWINGS.maka.poses.length).toBe(4);
    expect(new Set(DRAWINGS.maka.poses).size).toBe(4);
  });
});

/* -------------------------------------------------------------------------- */
/* 4. The borrow list fails both ways, so an era with no advisor degrades       */
/*    legibly rather than silently                                             */
/* -------------------------------------------------------------------------- */

describe("the borrowed-art exception list fails both ways", () => {
  it("names only eras that exist in the authored sequence", () => {
    for (const eraId of Object.keys(ERAS_BORROWING_ART)) {
      expect(ERA_IDS, `${eraId} is a declared exception for an era that is gone`).toContain(
        eraId,
      );
    }
  });

  it("does not excuse an era that has quietly acquired its own drawing", () => {
    for (const [eraId, reason] of Object.entries(ERAS_BORROWING_ART)) {
      expect(reason.length, `${eraId} is excused with no reason`).toBeGreaterThan(20);
      expect(
        advisorPosesForEra(eraId as EraId).artIsOwn,
        `${eraId} now draws its own advisor and must leave the exception list`,
      ).toBe(false);
    }
  });

  it("holds every unexcused era to drawing its own advisor", () => {
    for (const eraId of ART_OWNING_ERAS) {
      expect(
        advisorPosesForEra(eraId).artIsOwn,
        `${eraId} is not excused, so it must draw its own advisor`,
      ).toBe(true);
    }
    // Disjointness, then floors on BOTH size and composition. The composition claim is the
    // one that matters: era one alone would satisfy a floor of one, so requiring two is what
    // records that a second era has crossed out of the borrow list.
    expect(ART_OWNING_ERAS.filter((eraId) => eraId in ERAS_BORROWING_ART)).toEqual([]);
    expect(ART_OWNING_ERAS.length).toBeGreaterThanOrEqual(2);
    expect(ART_OWNING_ERAS.filter((eraId) => eraId !== "prehistoric").length).toBe(1);
    expect(Object.keys(ERAS_BORROWING_ART).length).toBe(ERA_IDS.length - 2);
  });

  it("degrades legibly: a borrowing era still draws somebody and still has a name", () => {
    let borrowing = 0;
    for (const eraId of Object.keys(ERAS_BORROWING_ART) as EraId[]) {
      const { container, unmount } = render(
        <AdvisorNpc line="A teaching line." eraId={eraId} />,
      );
      // A real drawing, not a blank figure: the fallback is legible by rendering a shipped
      // character rather than by leaving the slot empty.
      const figure = container.querySelector(
        `.${DRAWINGS[advisorPosesForEra(eraId).art].rootClass}`,
      );
      expect(figure, `${eraId} draws nothing`).not.toBeNull();
      // And it still labels the figure with a name rather than an empty attribute.
      expect(
        advisorNameForEra(eraId).length,
        `${eraId} has no advisor name`,
      ).toBeGreaterThan(0);
      borrowing += 1;
      unmount();
    }
    expect(borrowing).toBe(8);
  });
});

/* -------------------------------------------------------------------------- */
/* 5. Accessibility: the words are announced, the figure carries nothing        */
/* -------------------------------------------------------------------------- */

describe("the dialogue is announced and the figure is decorative", () => {
  it("announces the line politely and hides the drawing from assistive tech", () => {
    let checked = 0;
    for (const eraId of ERA_IDS) {
      const { container, unmount } = render(
        <AdvisorNpc line="Seed that multiplies." mood="neutral" eraId={eraId} />,
      );

      const bubble = container.querySelector(".advisor-npc__bubble");
      expect(bubble?.getAttribute("aria-live"), `${eraId}'s bubble is not announced`).toBe(
        "polite",
      );
      // The words are in the announced region, so the figure is never their only carrier.
      expect(bubble?.textContent).toContain("Seed that multiplies");

      const slot = container.querySelector(".advisor-npc__character");
      expect(slot?.getAttribute("aria-hidden"), `${eraId}'s figure is not hidden`).toBe(
        "true",
      );
      const row = advisorPosesForEra(eraId);
      const figure = container.querySelector(`.${DRAWINGS[row.art].rootClass}`);
      // Hidden at the drawing's own root too, so the port cannot become announceable by
      // being mounted somewhere other than that slot.
      expect(figure?.getAttribute("aria-hidden"), `${eraId}'s drawing is not hidden`).toBe(
        "true",
      );
      // And it carries no text of its own for a reader to reach.
      expect(figure?.textContent, `${eraId}'s drawing carries words`).toBe("");
      checked += 1;
      unmount();
    }
    expect(checked).toBeGreaterThanOrEqual(10);
  });
});
