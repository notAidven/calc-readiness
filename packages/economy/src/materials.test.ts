import { ERA_SEQUENCE, type EraId, getEraOfNode } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { ERA_COST_MULTIPLIER_STEP, MATERIAL_CARRY_FORWARD } from "./constants";
import { appendEntries, computeMaterialBalances } from "./ledger";
import {
  ERA_MATERIALS,
  eraCostMultiplier,
  erasWithAuthoredMaterialWords,
  materialCarryForward,
  materialForEra,
  materialForEraOrThrow,
  materialForNode,
} from "./materials";
import {
  ECONOMY_RESOURCES,
  EMPTY_LEDGER_VIEW,
  type LedgerEntry,
  MATERIAL_IDS,
} from "./types";

/**
 * The registry's population is asserted by CENSUS in both directions, not by a
 * count. A floor of "at least one authored era" would have been satisfied by the
 * wrong era, and a hardcoded 10 would have gone stale silently; the set equalities
 * below fail whichever way the registry and `ERA_SEQUENCE` come apart.
 */
describe("ERA_MATERIALS — the era → material registry", () => {
  it("covers every era in ERA_SEQUENCE, by set equality and not by count", () => {
    const registryEras = Object.keys(ERA_MATERIALS).sort();
    const sequenceEras = ERA_SEQUENCE.map((era) => era.id).sort();
    expect(registryEras).toEqual(sequenceEras);
    // A floor under the equality, so it cannot hold trivially over an empty registry.
    expect(sequenceEras.length).toBeGreaterThanOrEqual(10);
  });

  it("authors era one's WORDS exactly, and its material is stone", () => {
    // **THE AUTHORING DEBT, WHICH IS EVAN'S, AND ALL THAT IS LEFT OF THE OLD GATE.**
    // This census used to double as the mint gate and so decided that nine eras paid
    // nothing (D-5). Minting now reads the identity; this reads only whose words these
    // are, and it is asserted in both directions for the same reason it always was — a
    // count of one is satisfied by the wrong era, and the day Evan authors a second
    // era's pair this fails and owes a re-read.
    expect(erasWithAuthoredMaterialWords()).toEqual(["prehistoric"]);
    expect(materialForEra("prehistoric")).toEqual({
      id: "stone",
      display_name: "Stone",
      unit_noun: "pieces",
    });
    const defaulted = ERA_SEQUENCE.filter(
      (era) => ERA_MATERIALS[era.id].words === "defaulted",
    ).map((era) => era.id);
    expect(defaulted).toHaveLength(9);
    // The floor under both, so neither list can be satisfied by an empty registry.
    expect(erasWithAuthoredMaterialWords().length + defaulted.length).toBe(10);
    expect(defaulted).not.toContain("prehistoric");
  });

  it("resolves a mintable identity for ALL TEN, which is what era one used to hold alone", () => {
    // The gate opening, asserted over the whole population rather than over a sample.
    // `materialForEra` returning null for nine eras is what made `lessonCompleteGrant`
    // omit the payout key entirely, so this is the single assertion the whole ten-era
    // economy rests on.
    for (const era of ERA_SEQUENCE) {
      const identity = materialForEra(era.id);
      expect(identity, `${era.id} resolves no material`).not.toBeNull();
      expect(identity?.id, `${era.id} has an empty material id`).toBeTruthy();
      expect(materialForEraOrThrow(era.id).id).toBe(ERA_MATERIALS[era.id].material.id);
    }
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
  });

  it("gives every defaulted era the shipped fallback pair, inventing no word", () => {
    // The nine render the ruled id title-cased with `materialWord.ts`'s own fallback
    // noun. Asserted so that "no naming call was taken here" is checkable rather than
    // claimed: if someone authors a display name for a `defaulted` era, this fails and
    // the words census above is what they owe an update to.
    for (const era of ERA_SEQUENCE) {
      const entry = ERA_MATERIALS[era.id];
      if (entry.words !== "defaulted") {
        continue;
      }
      const id = entry.material.id;
      expect(entry.material.display_name, era.id).toBe(
        id.charAt(0).toUpperCase() + id.slice(1),
      );
      expect(entry.material.unit_noun, era.id).toBe("units");
    }
    const entry = ERA_MATERIALS.neolithic;
    expect(entry.words).toBe("defaulted");
    expect(entry.material.id).toBe("grain");
    expect(entry.material.display_name).toBe("Grain");
    // Still Evan's own word, so no rename is recorded against it.
    expect(entry.named_by).toBe("Evan");
    expect(entry.renamed_from).toBeUndefined();
  });

  it("uses only declared MaterialIds, and never the same one twice", () => {
    const ids = ERA_SEQUENCE.map((era) => ERA_MATERIALS[era.id].material.id);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    expect([...ids].sort()).toEqual([...MATERIAL_IDS].sort());
  });
});

/**
 * THE RECOGNISABILITY RULING (team lead, 2026-07-29) as assertions rather than as a
 * comment. The rule is that every material reads at a glance to someone who has
 * never played, which rules out a specimen of a familiar category and a unit of
 * measurement. That is a judgement no test can make — so what is pinned here is the
 * part that IS mechanical: the exact names, whose word each one is, and the two ways
 * the attribution list can rot.
 */
describe("the recognisability ruling", () => {
  it("holds the ruled name for every era the lead named", () => {
    const nameOf = (eraId: EraId): string => ERA_MATERIALS[eraId].material.id;
    expect(nameOf("prehistoric")).toBe("stone");
    expect(nameOf("bronze_age")).toBe("bronze");
    expect(nameOf("atomic_age")).toBe("electricity");
    // The three the ruling left to me: "medieval should be gold or something more
    // recognizable", "florins should be something else", "compute cycles should be
    // something else and less abstract". Era five now takes the lead's first choice
    // literally, because the gold-drop freed the word.
    expect(nameOf("medieval")).toBe("gold");
    expect(nameOf("renaissance")).toBe("gems");
    expect(nameOf("information_age")).toBe("silicon");
  });

  it("retires every renamed word from the id union entirely", () => {
    // EIGHT words for seven renames, because era five was renamed twice: the lead's
    // rule took `guild_marks` to `coins`, and the gold-drop took `coins` to `gold`.
    // `renamed_from` records only the word an entry directly replaced (the census
    // below asserts that), so `guild_marks` would drop out of every derived list —
    // and a word that stops being tracked is a word free to be re-minted as a live
    // id. It is named here for exactly that reason.
    const retired = [
      "flint",
      "ingots",
      "silver_coin",
      "guild_marks",
      "coins",
      "florins",
      "kilowatt_hours",
      "compute_cycles",
    ];
    for (const old of retired) {
      expect(MATERIAL_IDS as readonly string[]).not.toContain(old);
    }
    expect(retired).toHaveLength(8);
    expect(MATERIAL_IDS).toHaveLength(10);
  });

  it("keeps the three names that already passed the rule", () => {
    // Untouched by the ruling: each is a category, a substance, and universally
    // known. `grain` in particular cannot become "food" — food is a livability INPUT
    // in this model and never a stockpile.
    for (const id of ["grain", "coal", "data"] as const) {
      expect(MATERIAL_IDS).toContain(id);
    }
  });

  /**
   * **THE DISJOINTNESS GUARD STOOD HERE, AND IT WENT WITH THE UNION IT WAS ABOUT.**
   *
   * `ResourceType` and `MaterialId` had to be kept disjoint because `applyGrant` walks
   * their concatenation: an id in both was visited twice and wrote two rows for one key
   * under one `event_id`, breaking the `(student_id, event_id, resource_type)` key. It
   * was itself a rewrite of an older guard that said "no material may be called `gold`"
   * — the right invariant written as the wrong rule.
   *
   * The XP sunset (2026-08-03) deletes `ResourceType`, so there is one union and nothing
   * for a material to collide with. An intersection assertion over one populated set and
   * one deleted one is not a weaker guard, it is a guard with an empty population that
   * can only ever report green, so it is deleted rather than kept. What replaces it is
   * the property that still has content: the resource axis IS the materials, exactly.
   */
  it("has one resource union, and it is the ten materials", () => {
    expect(ECONOMY_RESOURCES).toEqual(MATERIAL_IDS);
    expect(new Set(ECONOMY_RESOURCES).size).toBe(ECONOMY_RESOURCES.length);
    expect(MATERIAL_IDS).toHaveLength(10);
  });

  it("holds `gold` as era five's material and as nothing else", () => {
    // The specific arrangement the gold-drop produced, pinned so a half-revert is
    // caught. A stored blob written before the drop carries `resource_type: "gold"`
    // meaning the CURRENCY, and `ECONOMY_DEV_SCHEMA_VERSION` is what stops that old blob
    // being read under the new meaning.
    expect(MATERIAL_IDS as readonly string[]).toContain("gold");
    expect(ERA_MATERIALS.medieval.material.id).toBe("gold");
  });
});

/**
 * The attribution list, asserted in BOTH directions per
 * `.cursor/rules/qa-verification.mdc`: an entry that stops qualifying fails, and a
 * qualifier that quietly joins the list fails. Either direction alone would let
 * Evan's name sit on a string the lead wrote, or the lead's on one of Evan's.
 */
describe("attribution — whose word each name is", () => {
  const entries = ERA_SEQUENCE.map((era) => [era.id, ERA_MATERIALS[era.id]] as const);

  it("names an author for all ten, from one of exactly two people", () => {
    for (const [, entry] of entries) {
      expect(["Evan", "team lead"]).toContain(entry.named_by);
    }
    expect(entries).toHaveLength(10);
  });

  it("records `renamed_from` on EVERY lead-named entry and on no other", () => {
    const leadNamed = entries.filter(([, e]) => e.named_by === "team lead");
    const evanNamed = entries.filter(([, e]) => e.named_by === "Evan");
    // Forward: a lead rename must say what it replaced, or Evan's word is lost.
    for (const [, entry] of leadNamed) {
      expect(typeof entry.renamed_from).toBe("string");
      expect(entry.renamed_from).not.toBe("");
    }
    // Reverse: an Evan-named entry must NOT carry one, so a stale `renamed_from`
    // cannot linger claiming a rename that was reverted.
    for (const [, entry] of evanNamed) {
      expect(entry.renamed_from).toBeUndefined();
    }
    // Composition, not just size: which eras were renamed is the claim.
    expect(leadNamed.map(([id]) => id)).toEqual([
      "prehistoric",
      "bronze_age",
      "classical",
      "medieval",
      "renaissance",
      "atomic_age",
      "information_age",
    ]);
    expect(evanNamed.map(([id]) => id)).toEqual(["neolithic", "industrial", "cyberpunk"]);
  });

  it("keeps every retired word readable, and never as a live id", () => {
    const replaced = entries
      .map(([, e]) => e.renamed_from)
      .filter((word): word is string => word !== undefined);
    expect(replaced).toEqual([
      "flint",
      "ingots",
      "silver_coin",
      // Era five's is `coins`, the word the gold-drop replaced — NOT `guild_marks`,
      // which `coins` had already replaced. The field names one step, so this is the
      // convention working rather than a lost record; the earlier step lives in the
      // design record's before/after table and is pinned above by name.
      "coins",
      "florins",
      "kilowatt_hours",
      "compute_cycles",
    ]);
    for (const word of replaced) {
      expect(MATERIAL_IDS as readonly string[]).not.toContain(word);
    }
  });
});

describe("materialForNode — the resolution a lesson-completion lump needs", () => {
  it("resolves every era-one node to stone", () => {
    for (const nodeId of ERA_SEQUENCE[0]?.nodes ?? []) {
      expect(materialForNode(nodeId)?.id).toBe("stone");
    }
    // Floor: the loop above must have run over a real, non-empty node set.
    expect(ERA_SEQUENCE[0]?.nodes.length).toBeGreaterThanOrEqual(6);
  });

  it("resolves a later era's node to ITS OWN material, never era one's", () => {
    // This asserted `null` while the words flag gated minting, and the null was the
    // defect rather than the guard: era two's lessons paid nothing. What the assertion
    // was really protecting is that a node never resolves to the WRONG era's material,
    // so that is what it says now — over every era, not just the second.
    const laterNode = ERA_SEQUENCE[1]?.nodes[0] ?? "";
    expect(getEraOfNode(laterNode)?.id).toBe("neolithic");
    expect(materialForNode(laterNode)?.id).toBe("grain");

    for (const era of ERA_SEQUENCE) {
      for (const nodeId of era.nodes) {
        expect(materialForNode(nodeId)?.id, nodeId).toBe(ERA_MATERIALS[era.id].material.id);
      }
    }
    // A floor with a SHAPE: the sweep must have crossed every era and reached ten
    // distinct materials, or it is era one's six nodes asserted ten times.
    expect(
      new Set(ERA_SEQUENCE.flatMap((era) => era.nodes.map((n) => materialForNode(n)?.id)))
        .size,
    ).toBe(10);
  });

  it("returns null for a node in no era at all", () => {
    expect(materialForNode("NOT.A.NODE")).toBeNull();
  });
});

describe("eraCostMultiplier — the 2^(N-1) ladder", () => {
  it("is 1 in era one, so the constants table holds era-one numbers", () => {
    expect(eraCostMultiplier("prehistoric")).toBe(1);
  });

  it("doubles every era, ending at 512 in era ten", () => {
    const multipliers = ERA_SEQUENCE.map((era) => eraCostMultiplier(era.id));
    expect(multipliers).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 256, 512]);
    expect(ERA_COST_MULTIPLIER_STEP).toBe(2);
  });
});

describe("materialCarryForward — O-6's second half", () => {
  it("keeps half the purchasing power, i.e. a quarter of the count", () => {
    expect(MATERIAL_CARRY_FORWARD).toBe(0.5);
    // Half the purchasing power, over a ladder step of 2, is a quarter of the count.
    expect(materialCarryForward(400)).toBe(100);
    expect(materialCarryForward(100)).toBe(25);
  });

  it("is LOSSY — never more than the purchasing-power-neutral rate", () => {
    for (const amount of [1, 3, 7, 40, 99, 100, 601, 5_000]) {
      const neutral = amount / ERA_COST_MULTIPLIER_STEP;
      expect(materialCarryForward(amount)).toBeLessThan(neutral);
    }
  });

  it("is MONOTONIC — more carried in is never less carried out", () => {
    let previous = -1;
    for (let amount = 0; amount <= 400; amount += 1) {
      const out = materialCarryForward(amount);
      expect(out).toBeGreaterThanOrEqual(previous);
      previous = out;
    }
  });

  it("floors to zero rather than going negative or fractional", () => {
    for (const amount of [0, 1, 2, 3, -50, Number.NaN, Number.POSITIVE_INFINITY]) {
      const out = materialCarryForward(amount);
      expect(out).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(out)).toBe(true);
    }
    expect(materialCarryForward(3)).toBe(0);
  });
});

/** A raw row builder, so the derivations can be tested without a grant recipe. */
function row(
  resource: LedgerEntry["resource_type"],
  kind: LedgerEntry["kind"],
  amount: number,
  eventId: string,
): LedgerEntry {
  return {
    student_id: "s",
    event_id: eventId,
    resource_type: resource,
    kind,
    amount,
    reason_code: kind === "spend" ? "build:p1" : "lesson_complete",
    created_at: "2026-07-29T00:00:00.000Z",
  };
}

describe("the ONE projection over one ledger", () => {
  // There were two, and the pair was the subject of this block: `computeBalances` for
  // the wallet and `computeMaterialBalances` for the stockpile, with an assertion that
  // the first SKIPPED material rows rather than absorbing them. The wallet projected
  // xp alone, so the sunset leaves one read model and nothing for it to be confused
  // with. `gold` is still in the fixture on purpose — it is era FIVE's material, and a
  // row carrying it must be counted as a stockpile and not as the retired currency.
  const view = appendEntries(EMPTY_LEDGER_VIEW, [
    row("gold", "grant", 15, "e1"),
    row("stone", "grant", 100, "e1"),
    row("stone", "spend", 80, "e2"),
  ]);

  it("computeMaterialBalances derives the stockpile as grants minus spends", () => {
    expect(computeMaterialBalances(view)).toEqual({ stone: 20, gold: 15 });
  });

  it("keeps each material's stockpile its own, rather than summing them", () => {
    // The numbers are chosen so a merged total (15 + 100 - 80 = 35) cannot coincide
    // with either right answer.
    expect(computeMaterialBalances(view).stone).toBe(20);
    expect(computeMaterialBalances(view).gold).toBe(15);
  });

  it("is sparse — a material the ledger never touched is simply absent", () => {
    expect(computeMaterialBalances(view).grain).toBeUndefined();
    expect(Object.keys(computeMaterialBalances(EMPTY_LEDGER_VIEW))).toEqual([]);
  });
});

describe("every era mints, and the fail-loud path is still wired", () => {
  it("resolves a material for each of the ten rather than throwing for nine", () => {
    // The inverse of what this block asserted before the mint gate opened. It required
    // nine eras to THROW, which is why it had to be rewritten rather than kept — but the
    // rewrite is the same claim about the same population, pointed the other way.
    const resolved: EraId[] = ERA_SEQUENCE.filter((era) => {
      try {
        return materialForEraOrThrow(era.id).id.length > 0;
      } catch {
        return false;
      }
    }).map((era) => era.id);
    expect(resolved).toEqual(ERA_SEQUENCE.map((era) => era.id));
    expect(resolved.length).toBeGreaterThanOrEqual(10);
  });

  it("still throws if the registry stops being total, which is what it now guards", () => {
    // The fail-loud branch is unreachable through the shipped registry, so it is proved
    // by handing the function a registry entry with no identity — the registry defect it
    // exists for. Without this the `throw` would be a line nothing ever covers, and a
    // guard nothing exercises is one that can be deleted by accident.
    const registry = ERA_MATERIALS as Record<string, { material: unknown }>;
    const saved = registry.neolithic;
    try {
      registry.neolithic = { material: null };
      expect(() => materialForEraOrThrow("neolithic")).toThrow(/resolves no material/);
    } finally {
      registry.neolithic = saved as { material: unknown };
    }
    expect(materialForEraOrThrow("neolithic").id).toBe("grain");
  });
});
