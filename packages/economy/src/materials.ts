import { ERA_SEQUENCE, type EraId, eraNumber, getEraOfNode } from "@cr/skill-graph";

import { civicCatalogueForEra } from "./civicCatalogue";
import {
  ERA_COST_MULTIPLIER_STEP,
  ERA_MATERIAL_TOTAL,
  MATERIAL_CARRY_FORWARD,
} from "./constants";
import type { MaterialId } from "./types";

/**
 * ERA MATERIALS — the per-era spendable resource (era design D-ERA13: "one
 * spendable resource, era-themed, from flint through to credits or data" — whose own
 * "flint" is one of the six names the lead's recognisability ruling has since
 * replaced; see {@link MaterialAttribution}).
 *
 * NOT to be confused with `resources.ts` in this same package, which despite its
 * name holds the COSMETIC catalog — "resource" there means a resource-spec §8.4
 * entity, not a material. The two never meet: a cosmetic is priced in gold, a civic
 * building in a material.
 *
 * WHY THIS FILE IMPORTS `@cr/skill-graph`. The era sequence is the graph's
 * (`eras.ts`, D-ERA2: never inferred from a `DomainId`), and a lesson-completion
 * grant has to resolve its node's era to know which material to credit. That is the
 * SANCTIONED direction of INV-COS-1 — "the economy READS progression to decide
 * grants; nothing economic gates learning" — and the reverse edge is what
 * `one-way-invariant.test.ts` forbids. The gain is compile-time totality:
 * {@link ERA_MATERIALS} is a `Record<EraId, EraMaterial>`, so adding an era without
 * a material entry does not typecheck.
 */

/** What the HUD needs to render a stockpile, per era one §1's "count of worked pieces". */
export interface MaterialIdentity {
  readonly id: MaterialId;
  /** Learner-facing name, e.g. "Flint". */
  readonly display_name: string;
  /**
   * The unit a count is read in. Era one §1 is explicit that the era-one material
   * "wants to read as a count of worked pieces, not a weight or a currency", which
   * is a fact about this string and not about the number beside it — so it survived
   * the rename from flint to stone unchanged in intent.
   */
  readonly unit_noun: string;
}

/**
 * WHO WROTE THE NAME — kept separate from who owns the era's identity slot, because
 * after the lead's recognisability ruling those are two different people for six of
 * the ten eras.
 *
 * O-6's identity half is Evan's and the SLOT is still his in every era. But six of the
 * names are now the lead's words, not Evan's, so leaving `owner: "Evan"` on them would
 * credit him with strings he did not write. `renamed_from` keeps his original word
 * beside the replacement instead of discarding it, so the provenance of every one of the
 * ten is readable in one place.
 *
 * **UNCHANGED BY THE 2026-07-30 MINT OPENING**, deliberately and to the byte. Opening the
 * gate moved which flag decides whether an era pays; it did not reassign a single name,
 * and nothing here may be read as this lane having taken a naming call that is Evan's.
 */
export interface MaterialAttribution {
  /** Who wrote the NAME this entry carries. */
  readonly named_by: "Evan" | "team lead";
  /**
   * Evan's original word, present exactly when the lead's rule replaced it and
   * absent exactly when the name is still Evan's own. Asserted in BOTH directions,
   * so neither a stale `renamed_from` nor a missing one can survive.
   */
  readonly renamed_from?: string;
}

/**
 * Whether an era's learner-facing WORDS are Evan's authored pair or this registry's
 * default reading of the id.
 *
 * **THIS IS NO LONGER THE MINT GATE, and the split is the whole point.** The field it
 * replaces was `status: "authored" | "proposed"`, and it answered two questions at once:
 * *may this era mint* and *has Evan signed off the strings a HUD renders*. Those have
 * different owners, so conflating them meant the second silently decided the first —
 * which is how nine eras came to credit nothing (defect D-5). The mint side reads
 * {@link EraMaterial.material}'s `id`, which the lead's recognisability ruling settled
 * for all ten; this field records only what is still owed.
 *
 * - `authored` — Evan's own pair, written for that era. Era one alone, and
 *   `materials.test.ts` asserts that as a census in both directions, so the day he
 *   authors a second era the census fails and owes a re-read. That assertion is the
 *   thing standing in for the gate this type used to be.
 * - `defaulted` — the display name is the ruled id title-cased and the unit noun is
 *   `units`, which is the fallback `apps/web/src/economy/materialWord.ts` already
 *   shipped for exactly this case. So no word here is invented: nine eras render the
 *   default they were already rendering, and they now mint as well.
 */
export type MaterialWords = "authored" | "defaulted";

/**
 * An era's material: an identity that always resolves, plus who wrote its name and
 * whether its words are authored.
 *
 * The `proposed` variant that used to sit beside this is gone, and with it the
 * `proposed_id` field — every era now carries a full {@link MaterialIdentity}, so no
 * caller has to ask which shape it got before reading an id. `EraLandBudget`'s
 * authored/unauthored discrimination is still the right model for a RADIUS, which is a
 * number nobody has chosen; a material id is not that, because all ten were chosen.
 */
export interface EraMaterial extends MaterialAttribution {
  readonly material: MaterialIdentity;
  readonly words: MaterialWords;
}

/** The default unit noun, matching `materialWord.ts`'s shipped fallback. */
const DEFAULT_UNIT_NOUN = "units";

/** Title-case the ruled id, so a display name is a reading of it and not a new word. */
function defaultDisplayName(id: MaterialId): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/** An id still in Evan's own words, rendered with the default pair. */
const evan = (id: MaterialId): EraMaterial => ({
  material: {
    id,
    display_name: defaultDisplayName(id),
    unit_noun: DEFAULT_UNIT_NOUN,
  },
  words: "defaulted",
  named_by: "Evan",
});

/** Evan's slot, renamed by the lead's recognisability rule, with the default pair. */
const renamed = (id: MaterialId, renamed_from: string): EraMaterial => ({
  material: {
    id,
    display_name: defaultDisplayName(id),
    unit_noun: DEFAULT_UNIT_NOUN,
  },
  words: "defaulted",
  named_by: "team lead",
  renamed_from,
});

/**
 * THE ERA → MATERIAL REGISTRY. Total over {@link EraId} by the compiler, and
 * asserted by CENSUS rather than by count in `materials.test.ts`: the set of eras whose
 * WORDS are authored must equal `{prehistoric}` exactly. A count floor would have been
 * satisfied by the wrong era.
 *
 * **ALL TEN ERAS MINT.** Era one is the only era whose words are Evan's; the other nine
 * render the ruled id title-cased with the default unit noun, and every one of the ten
 * credits its material on a lesson completion. Until 2026-07-30 the nine credited
 * nothing at all, because minting read the same flag that recorded whose words these
 * are — see {@link MaterialWords} for why that conflation was the defect and what
 * replaced it.
 *
 * EVERY ID HERE DISAGREES WITH ITS OWN `civic-buildings.md` FOR SIX OF THE TEN ERAS,
 * and that is a decision rather than drift: the lead's ruling is the newer product
 * call, so the documents are stale and owe an edit. They are another owner's files
 * and are not touched from here; the design record lists exactly which line in which
 * document, so the reconciliation is findable rather than discovered.
 */
export const ERA_MATERIALS: Record<EraId, EraMaterial> = {
  prehistoric: {
    // "Flint" was a specimen of a category everyone already knows. Era one §1's
    // requirement that it read as "a count of worked pieces, not a weight or a
    // currency" is about `unit_noun` and survives the rename intact.
    material: { id: "stone", display_name: "Stone", unit_noun: "pieces" },
    words: "authored",
    named_by: "team lead",
    renamed_from: "flint",
  },
  // Already a category, already a substance, universally recognised — and it cannot
  // become "food", because food is a livability INPUT in this model, never a
  // stockpile (D-ERA13, and `capacity.ts`).
  neolithic: evan("grain"),
  // An ingot is a SHAPE metal comes in. The substance is the era's own name.
  bronze_age: renamed("bronze", "ingots"),
  // "Silver coin" is a coin qualified by its metal — the florin failure exactly.
  // Naming the substance also continues the one ladder nobody has to be taught:
  // bronze, then silver.
  classical: renamed("silver", "silver_coin"),
  // THE LEAD'S OWN SUGGESTION, taken at last: "gold or something more recognizable".
  // It was unavailable while a currency held the word, so this era ran on `coins` — the
  // category the ruling invoked, but a fallback and only ever that. The gold-drop
  // retired that currency, so `gold` is free and era five takes it: a substance, the
  // category, known to everyone, and it completes the ladder nobody has to be taught —
  // bronze, silver, GOLD.
  //
  // `renamed_from` is `coins`, not `guild_marks`. That is the convention working rather
  // than a lost record: this field names the word THIS entry replaced, and the
  // guild_marks -> coins step is in the design record's §4.1a before/after table.
  // Chaining every historical value here would make it a changelog, not an attribution.
  medieval: renamed("gold", "coins"),
  // GEMS STANDS, re-checked on its own merits now that era five has vacated `coins`
  // rather than leaving it taken. Two reasons, and the second is new:
  //  1. It passes the rule independently. "Gems" IS the category — diamonds and rubies
  //     are its specimens — and it is a substance rather than a unit, which is exactly
  //     where `florins` failed. Nothing about it depended on `coins` being unavailable.
  //  2. Era five now holds `gold`, so the metal ladder COMPLETES at era five. Putting
  //     `coins` here would make eras five and six two adjacent money eras, which is the
  //     "second coinage" problem this line already named. Gems move era six to a
  //     different KIND of portable wealth, which is what Renaissance banking wants.
  renaissance: renamed("gems", "florins"),
  // A substance, a category, and known to everyone. Untouched by the ruling.
  industrial: evan("coal"),
  // A kilowatt-hour MEASURES the substance. This is the substance.
  atomic_age: renamed("electricity", "kilowatt_hours"),
  // "Compute cycles" measures work rather than naming a thing. Silicon is the
  // literal stuff era nine's rationale is about ("doubling transistors"), it is a
  // substance like stone and bronze and coal before it, and "Silicon Valley" has
  // done the recognisability work already. Chips and microchips were the runners-up
  // and lose on the ruling's own logic: a chip is a manufactured specimen, the way
  // an ingot was.
  information_age: renamed("silicon", "compute_cycles"),
  // KEPT, and it is the one worth re-reading. "Data" sounds abstract, but it passes
  // both halves of the rule: it is the category (gigabytes are the unit, not the
  // thing) and it is metered, bought and run out of by most people alive. Era ten
  // was not in the ruling's list; flagged in the design record as reviewable rather
  // than settled.
  cyberpunk: evan("data"),
};

/**
 * The era's material. **Never null for any of the ten**, and never throws.
 *
 * THE RETURN TYPE IS STILL NULLABLE ON PURPOSE. Every era resolves today, so the null
 * is unreachable — but narrowing the signature would turn each of the seven existing
 * `=== null` branches into a no-overlap compile error, including one in an unmerged
 * branch of another lane. A signature that costs another owner a merge conflict to
 * express "this cannot happen" is the wrong trade, and the branches are cheap: they are
 * the same fail-safe every caller already wrote.
 */
export function materialForEra(eraId: EraId): MaterialIdentity | null {
  return ERA_MATERIALS[eraId].material;
}

/**
 * The era's material, or a loud failure. Callers that are about to MINT use this: an
 * era resolving silently to nothing is the failure `descriptors.ts` names on a missing
 * plot position ("an era model that resolves silently to an empty city is strictly
 * worse than one that throws").
 *
 * It cannot fire while {@link ERA_MATERIALS} is total over {@link EraId} and every entry
 * carries an identity, which the compiler enforces. Kept because the class of defect it
 * catches is a registry that stops being total, not an era that is behind on authoring.
 */
export function materialForEraOrThrow(eraId: EraId): MaterialIdentity {
  const material = materialForEra(eraId);
  if (material === null) {
    throw new Error(
      `economy: era ${eraId} resolves no material. ERA_MATERIALS is meant to carry an ` +
        `identity for every era; this is a registry defect, not a missing authoring.`,
    );
  }
  return material;
}

/**
 * The material a NODE's completion pays in — the resolution a lesson-complete grant
 * needs. Null only when the node sits in no era at all.
 */
export function materialForNode(nodeId: string): MaterialIdentity | null {
  const era = getEraOfNode(nodeId);
  return era === undefined ? null : materialForEra(era.id);
}

/**
 * Every era whose learner-facing WORDS are Evan's own, in play order — which is the
 * authoring debt, not the mint gate.
 *
 * Renamed from `erasWithAuthoredMaterial`, because that name now reads as a claim about
 * which eras have a material and every era does. Its one call site is the census in
 * `materials.test.ts`.
 */
export function erasWithAuthoredMaterialWords(): readonly EraId[] {
  return ERA_SEQUENCE.filter((era) => ERA_MATERIALS[era.id].words === "authored").map(
    (era) => era.id,
  );
}

/**
 * The era-N cost multiplier, `2^(N-1)` (era design §7). Era one is 1, so every
 * authored number in the constants table is an era-one number.
 */
export function eraCostMultiplier(eraId: EraId): number {
  return ERA_COST_MULTIPLIER_STEP ** (eraNumber(eraId) - 1);
}

/**
 * Which era mints a material — the reverse of {@link ERA_MATERIALS}.
 *
 * Total over {@link MaterialId} because the registry is a bijection: ten eras, ten
 * distinct ids, asserted as a census in `materials.test.ts`. Needed because a ledger
 * row carries only its `resource_type`, and anything era-scaled about it (its cap
 * ceiling, its price scale) has to be recovered from that one string.
 */
export function eraOfMaterial(material: MaterialId): EraId {
  for (const era of ERA_SEQUENCE) {
    if (ERA_MATERIALS[era.id].material.id === material) {
      return era.id;
    }
  }
  throw new Error(
    `economy: material "${material}" belongs to no era. ERA_MATERIALS is meant to be ` +
      `a bijection over MaterialId; this is a registry defect, not a missing lookup.`,
  );
}

/** The era's curated node count — the divisor the per-lesson grant is normalised by. */
export function eraNodeCount(eraId: EraId): number {
  const era = ERA_SEQUENCE.find((entry) => entry.id === eraId);
  if (era === undefined) {
    throw new Error(`economy: no era "${eraId}" in the shipped sequence.`);
  }
  return era.nodes.length;
}

/**
 * **What ONE lesson completion pays, in the era's material.**
 *
 * The ruling: *"each era should give about the same amount of total resource - it
 * shouldn't fluctuate. adjust by scaling the reward per lesson relative to the # of
 * lessons."* So the era TOTAL is the authored constant
 * ({@link ERA_MATERIAL_TOTAL}) and this rate is derived — a five-node era pays more
 * per lesson than a nine-node one and they land in the same place.
 *
 * The multiplication happens BEFORE the division, deliberately. Scaling an already
 * rounded era-one rate would compound the rounding error by the ladder: era eight
 * would drift 384 off its target instead of 3. Dividing last keeps every era's actual
 * total within 3 of {@link ERA_MATERIAL_TOTAL} at era-one scale, which is 0.5%.
 *
 * Rounds rather than floors, so the drift is SYMMETRIC — which is the property worth
 * having, and it is not the same as being generous. `600 / 9 = 66.67`, so the two
 * nine-node eras round DOWN and land **3 UNDER**: `Math.round(600 × 128 / 9) = 8533`
 * and `8533 × 9 = 76,797` against 76,800. This line used to claim 3 over and name that
 * the safe direction for a solvency guarantee; the rate does not take it. Nothing breaks
 * — 3 at era eight's ×128 is 0.023 at era-one scale, so 599.977 still clears a need of
 * 540 — but it is the reason era eight holds the table's narrowest headroom share
 * (0.099965 against era one's exact 0.1), which `civicSolvency.test.ts` asserts.
 */
export function lessonMaterialAmount(eraId: EraId): number {
  return Math.round((ERA_MATERIAL_TOTAL * eraCostMultiplier(eraId)) / eraNodeCount(eraId));
}

/**
 * What an era grants in total if every one of its lessons is completed — the finite
 * supply INV-ERA-4 is measured against. Within 3 of the target at era-one scale;
 * exactly on it for the six eras whose node count divides {@link ERA_MATERIAL_TOTAL}.
 */
export function eraMaterialTotal(eraId: EraId): number {
  return lessonMaterialAmount(eraId) * eraNodeCount(eraId);
}

/**
 * The founding advance for a later island. Era one is the established exception: its Hall is
 * pre-seeded before any ceremony and its first lesson still pays the original opening grant.
 */
export function islandFoundingMaterialAmount(eraId: EraId): number {
  return eraNumber(eraId) === 1 ? 0 : lessonMaterialAmount(eraId);
}

/**
 * A node's post-founding lesson payout. The founding advance is taken out of the authored era
 * total, then the remainder is divided deterministically across that era's nodes. Remainders go
 * to the earliest authored nodes so the sum is exact even in the two nine-node eras.
 */
export function lessonMaterialAmountAfterFounding(nodeId: string): number {
  const era = getEraOfNode(nodeId);
  if (era === undefined || eraNumber(era.id) === 1) {
    return era === undefined ? 0 : lessonMaterialAmount(era.id);
  }
  const index = era.nodes.indexOf(nodeId);
  if (index < 0) {
    return 0;
  }
  const remaining = eraMaterialTotal(era.id) - islandFoundingMaterialAmount(era.id);
  const base = Math.floor(remaining / era.nodes.length);
  const extra = remaining % era.nodes.length;
  return base + (index < extra ? 1 : 0);
}

/** A price authored at era-one scale, in the era's own material. */
export function eraScaledPrice(eraOneCost: number, eraId: EraId): number {
  return Math.round(eraOneCost * eraCostMultiplier(eraId));
}

/**
 * The onboarding civic-bootstrap top-up: a flat 120 at era-one scale (era one's own
 * dearest catalogue row, authored rather than derived from it, so the amount cannot
 * silently drift if the catalogue is retuned), scaled like any other era-one-authored
 * price via {@link eraScaledPrice}.
 */
export function civicBootstrapMaterialAmount(eraId: EraId): number {
  return eraScaledPrice(120, eraId);
}

/**
 * O-6, SECOND HALF — how much of a leftover stockpile survives an era advance.
 *
 * The rate is expressed as a fraction of PURCHASING POWER ({@link
 * MATERIAL_CARRY_FORWARD}); the division by {@link ERA_COST_MULTIPLIER_STEP} is the
 * ladder, since era N+1 prices are exactly that much higher. Floors, so it can never
 * mint a fractional piece of stone, and floors to ZERO for a small stockpile rather
 * than going negative.
 *
 * Two properties are asserted in the tests rather than argued here: MONOTONIC (more
 * in is never less out) and LOSSY (never more than the neutral rate would give).
 */
export function materialCarryForward(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.floor((amount * MATERIAL_CARRY_FORWARD) / ERA_COST_MULTIPLIER_STEP);
}
