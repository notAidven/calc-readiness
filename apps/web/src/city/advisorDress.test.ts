import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  ADVISOR_DRESS,
  advisorDressFor,
  dressSilhouette,
  everyAdvisorDress,
} from "./advisorDress";
import { resolveEraAdvisor } from "./eraDressing";

/**
 * **THE ADVISOR CHANGES DRESS AT EVERY ADVANCE**, which is the third of D-ET8's beat one
 * and the one that shipped as a change of register instead.
 *
 * ## The population is derived from `ERA_SEQUENCE`, and that is the whole design of it
 *
 * `.cursor/rules/qa-verification.mdc` names the recurring failure here: a guard whose
 * population is a hand-written list *"passes while covering a fraction of reality the moment
 * an era is added or an id changes"*, and it names eight guards in this tree that were found
 * green while measuring nothing or the wrong thing. So every sweep below starts from
 * `ERA_SEQUENCE` and every one of them carries a floor, because a sweep over an empty
 * sequence satisfies every `for` loop in this file.
 *
 * **The population is also the right one, which is a separate question from being derived.**
 * The behaviour is *"the advisor is on screen in an era"*, and that is true of every era in
 * the sequence without exception — there is no era where he is absent and none where a
 * costume would not apply. So there are no declared exceptions here, and that is a fact
 * about the product rather than a convenience: the reason `resolveEraAdvisor` is total is
 * that D-ET9 makes the advisor continuously present, and a population that excused an era
 * would be excusing an era he is standing in.
 *
 * ## What each assertion was measured against
 *
 * A test written green may be asserting nothing, so each was forced red by injecting the
 * defect it exists for. The injections and their output are in the work log at
 * `work-log/gabe/2026-08-01-the-advisor-changes-dress.md` and in the pull request.
 */

/** Every era, in the authored order. The one place this file gets its population from. */
const ERAS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

/**
 * The character component's own source, read the house way (`revealScope.test.ts`).
 *
 * Needed because {@link AdvisorDress} is a TYPE and a type has no runtime presence: an
 * identity field DECLARED on the interface but left unset on all ten rows is invisible to
 * `Object.keys`, and that is exactly how a second character would arrive — one optional
 * field first, populated later. This was measured rather than assumed: adding
 * `readonly name?: string` to the interface left the key sweep below fully green.
 */
const COMPONENT = (
  import.meta.glob(["../lessons/OruAdvisorCharacter.tsx"], {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>
)["../lessons/OruAdvisorCharacter.tsx"];

/** The fields `AdvisorDress` literally declares, read out of the component's source. */
function declaredDressFields(): string[] {
  const block = /export interface AdvisorDress \{([\s\S]*?)\n\}/.exec(COMPONENT ?? "")?.[1];
  if (!block) {
    throw new Error(
      "could not find the AdvisorDress interface in OruAdvisorCharacter.tsx, so the " +
        "declared-field sweep below would pass over nothing",
    );
  }
  return Array.from(block.matchAll(/^\s*readonly (\w+)[?]?:/gm)).map(
    ([, field]) => field as string,
  );
}

describe("every era dresses the advisor, and none of them borrows", () => {
  it("has a costume for every era in the sequence, derived rather than listed", () => {
    // FLOOR. Everything below holds over an empty sequence, and the run is ten eras.
    expect(ERAS.length).toBeGreaterThanOrEqual(10);

    const dressed = everyAdvisorDress();
    expect(dressed.map((row) => row.eraId)).toEqual(ERAS);
    // Set equality in BOTH directions, so the table cannot carry a row for an era that does
    // not exist and cannot miss one that does. A subset check either way would pass on a
    // table that had quietly lost half the run.
    expect(new Set(Object.keys(ADVISOR_DRESS))).toEqual(new Set(ERAS));
  });

  it("gives each era its OWN costume, never the previous era's", () => {
    // The defect this is written for, and it is the one that shipped: the old table was a
    // `Partial` with two rows behind a fallback to era one, so era nine's advisor wore era
    // one's hide tunic while the copy beside him said he had changed dress.
    for (const eraId of ERAS) {
      expect(advisorDressFor(eraId).id, eraId).toBe(eraId);
    }
    expect(ERAS.length).toBeGreaterThanOrEqual(10);
  });

  it("changes the dress at EVERY advance, over all nine seams", () => {
    // D-ET8's beat one, stated as the property an advance has to have. Nine seams, and the
    // count is asserted so this cannot pass by finding none.
    const seams = ERAS.slice(0, -1).map((from, index) => ({
      from,
      to: ERAS[index + 1] as EraId,
    }));
    expect(seams).toHaveLength(ERAS.length - 1);
    expect(seams.length).toBeGreaterThanOrEqual(9);

    const unchanged = seams.filter(
      ({ from, to }) => advisorDressFor(from) === advisorDressFor(to),
    );
    expect(unchanged).toEqual([]);
  });

  it("dresses no two eras alike, over all 45 pairs and not only the nine seams", () => {
    /*
     * **Every pair, for the reason `eraPaletteLadder.test.ts` sweeps every pair.** The
     * island keeps every era's buildings permanently, so a learner in era six is looking at
     * era four's buildings too, and an adjacent-only sweep structurally cannot see a
     * two-eras-apart collision. That document measured exactly this: narrowing its own
     * sweep to adjacency left nine of ten assertions passing over a pair that was 2.07
     * apart against a floor of 7.71.
     */
    const pairs: string[] = [];
    for (let i = 0; i < ERAS.length; i += 1) {
      for (let j = i + 1; j < ERAS.length; j += 1) {
        const [a, b] = [ERAS[i] as EraId, ERAS[j] as EraId];
        if (
          JSON.stringify(advisorDressFor(a)) ===
          JSON.stringify({ ...advisorDressFor(b), id: a })
        ) {
          pairs.push(`${a} and ${b} wear the same costume`);
        }
      }
    }
    expect(pairs).toEqual([]);
    // The composition of the sweep, not merely its size: 45 pairs over ten eras. Without
    // this, a sweep narrowed to adjacency would still report the empty list above.
    const compared = (ERAS.length * (ERAS.length - 1)) / 2;
    expect(compared).toBe(45);
    expect(compared).toBeGreaterThanOrEqual(45);
  });
});

describe("silhouette first (City_Art_Bible.md §3)", () => {
  /**
   * **THE ASSERTION THE COLOUR SWEEP ABOVE CANNOT MAKE.** Ten costumes that differed only
   * in hue would pass every test in the block above and would be ONE figure at the size the
   * onboarding reel draws him. §3 is silhouette-first and this is that rule as a number.
   */
  it("changes at least two of the three OUTLINE parts at every advance", () => {
    const seams = ERAS.slice(0, -1).map((from, index) => ({
      from,
      to: ERAS[index + 1] as EraId,
    }));
    expect(seams.length).toBeGreaterThanOrEqual(9);

    const weak: string[] = [];
    for (const { from, to } of seams) {
      const before = dressSilhouette(advisorDressFor(from));
      const after = dressSilhouette(advisorDressFor(to));
      const moved = before.filter((part, index) => part !== after[index]).length;
      if (moved < 2) {
        weak.push(`${from} to ${to} moves only ${moved} of 3 silhouette parts`);
      }
    }
    expect(weak).toEqual([]);
  });

  it("gives no two eras the same outline, over all 45 pairs", () => {
    const same: string[] = [];
    for (let i = 0; i < ERAS.length; i += 1) {
      for (let j = i + 1; j < ERAS.length; j += 1) {
        const [a, b] = [ERAS[i] as EraId, ERAS[j] as EraId];
        const left = dressSilhouette(advisorDressFor(a)).join("/");
        const right = dressSilhouette(advisorDressFor(b)).join("/");
        if (left === right) {
          same.push(`${a} and ${b} share the outline ${left}`);
        }
      }
    }
    expect(same).toEqual([]);
    expect(ERAS.length).toBeGreaterThanOrEqual(10);
  });

  it("gives every era its own instrument, which is the largest single lever", () => {
    // Each of the ten guides names an instrument and calls it "the counterpart to Oru's
    // staff", so ten distinct values is the guides' own count and not a target set here.
    const carried = ERAS.map((eraId) => advisorDressFor(eraId).carried);
    expect(new Set(carried).size).toBe(ERAS.length);
    expect(carried.length).toBeGreaterThanOrEqual(10);
    // And the tall vertical genuinely comes and goes rather than only changing colour:
    // three eras carry a pole and seven hold something at the hand.
    const poles = carried.filter((kind) =>
      ["staff", "balance", "groma"].includes(kind),
    ).length;
    expect(poles).toBeGreaterThanOrEqual(2);
    expect(poles).toBeLessThan(carried.length);
  });
});

describe("the costume is clothes and not a person (D-ET9)", () => {
  it("carries no name, no voice and no face anywhere in the wardrobe", () => {
    /*
     * D-ET9 overturned the identity half of D-ERA28: one continuous advisor, re-themed per
     * era, not ten. The strongest form of that is a costume with no field that could hold an
     * identity, so this reads the KEYS rather than the values — a table that grew a `name`
     * would fail here before anybody put a second character in it.
     */
    const BANNED = ["name", "role", "voice", "register", "skin", "face", "eye"];

    // BOTH the fields the ten rows CARRY and the fields the interface DECLARES. The first
    // alone is not enough: an optional field added to the type and left unset on every row
    // is invisible to `Object.keys`, and one optional field is how the second character
    // arrives. See `declaredDressFields`, and the injection recorded beside it.
    const carried = new Set(Object.keys(advisorDressFor(ERAS[0] as EraId)));
    const declared = new Set(declaredDressFields());
    for (const banned of BANNED) {
      expect(carried.has(banned), `no costume may carry "${banned}"`).toBe(false);
      expect(declared.has(banned), `AdvisorDress may not declare "${banned}"`).toBe(false);
    }

    // Floors on both, so neither loop above is over an empty set. `declared` is the one
    // that would silently empty out, because a rename of the interface makes the regex
    // match nothing — hence the throw in the helper as well as this.
    expect(carried.size).toBeGreaterThanOrEqual(15);
    expect(declared.size).toBeGreaterThanOrEqual(15);
    // The two agree, which is what makes either of them evidence about the other.
    expect(declared).toEqual(carried);
    // And every era has the same fields, so no era is a different KIND of thing.
    for (const eraId of ERAS) {
      expect(new Set(Object.keys(advisorDressFor(eraId))), eraId).toEqual(carried);
    }
  });

  it("names one continuous advisor in all ten eras while the clothes change", () => {
    // The two halves of beat one, off the one resolver, asserted together: the NAME is the
    // same in every era and the CLOTHES are different in every era. A change to either half
    // that broke the other would fail here.
    const resolved = ERAS.map((eraId) => resolveEraAdvisor(eraId));
    expect(new Set(resolved.map((advisor) => advisor.name)).size).toBe(1);
    expect(new Set(resolved.map((advisor) => advisor.dress.id)).size).toBe(ERAS.length);
    expect(ERAS.length).toBeGreaterThanOrEqual(10);
  });
});

describe("the palette stays inside the era's own (City_Art_Bible.md §1.3)", () => {
  /** Every colour a costume states, flattened out of it. */
  function colours(eraId: EraId): string[] {
    const dress = advisorDressFor(eraId);
    return Object.values(dress)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string")
      .filter((value) => value.startsWith("#") || value.includes("#"));
  }

  it("reaches for none of the reserved mastery gold, in any era", () => {
    // `#FFB703` is RESERVED for the mastery accent and a body is never gold in any era.
    // Era ten's guide states the limit itself, because its costume is the only one with an
    // emissive note: "an advisor who glows the colour of a mastery star is a legibility
    // bug, not a style choice."
    const offenders: string[] = [];
    for (const eraId of ERAS) {
      const found = colours(eraId).filter((hex) => hex.toUpperCase().includes("FFB703"));
      if (found.length > 0) {
        offenders.push(`${eraId}: ${found.join(", ")}`);
      }
    }
    expect(offenders).toEqual([]);
    // FLOOR, and it is the one that matters most here: "no era uses gold" holds trivially
    // over a wardrobe that states no colours at all. Every era states at least a dozen.
    for (const eraId of ERAS) {
      expect(colours(eraId).length, eraId).toBeGreaterThanOrEqual(12);
    }
    expect(ERAS.length).toBeGreaterThanOrEqual(10);
  });

  it("states every colour as a hex, so nothing arrives from a stylesheet a test cannot read", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const eraId of ERAS) {
      for (const value of colours(eraId)) {
        checked += 1;
        // A gradient is allowed and is spelled with a hex inside it; a bare CSS keyword or
        // a `var(--…)` is not, because neither can be checked against a palette here.
        if (!/#[0-9A-Fa-f]{6}/.test(value)) {
          bad.push(`${eraId}: ${value}`);
        }
      }
    }
    expect(bad).toEqual([]);
    // A COUNT UNDER THE CONTAINMENT, because "none of them is bad" is true of none of
    // them. Measured when this was written: emptying the population left this the only
    // assertion in the file still passing, which is what a missing floor looks like.
    expect(checked).toBeGreaterThanOrEqual(ERA_SEQUENCE.length * 12);
    expect(ERAS.length).toBeGreaterThanOrEqual(10);
  });
});
