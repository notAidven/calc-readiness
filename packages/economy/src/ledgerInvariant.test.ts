import { describe, expect, it } from "vitest";

import { REASON_LESSON_COMPLETE, SPEND_REASON_PREFIXES } from "./constants";
import {
  assertLedgerEntryInvariant,
  ECONOMY_RESOURCES,
  type LedgerEntry,
  MATERIAL_IDS,
} from "./types";

/**
 * **TWO OF THE THREE CLAUSES THIS FILE GUARDED ARE DELETED, NOT WEAKENED, AND THAT IS
 * THE POINT.**
 *
 * `assertLedgerEntryInvariant` carried three rules. *"XP is never spendable"* quantified
 * over `NON_SPENDABLE_RESOURCES`, whose only member was `xp`; *"`cosmetic_id` is set iff
 * the row is a cosmetic purchase"* guarded a column. The 2026-08-03 sunset empties the
 * first set and removes the second column, so keeping either clause would leave an
 * assertion that passes over every row it can ever see — the hollow-guard shape
 * `.cursor/rules/qa-verification.mdc` records thirteen instances of in this tree. They
 * went with the thing they were about, and their tests went with them.
 *
 * **THE SURVIVING CLAUSE NOW CARRIES WHAT THEY SHARED.** *"A spend must name its
 * subject"* was added when `cosmetic_id` was re-keyed off the purchase prefix, because
 * that re-keying let a spend carry a GRANT's reason code and no id — material leaving the
 * wallet for no stated reason, which the old `cosmetic_id`-iff-spend rule had been
 * catching incidentally. That incidental catch is gone for good now, so this clause is
 * the only thing standing between the ledger and an unexplained debit. Its coverage is
 * correspondingly the bulk of this file.
 */

function entry(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    student_id: "s",
    event_id: "e",
    // Era one's material — the default was `gold` while a currency held that word,
    // and `stone` is the live spendable this file is now about.
    resource_type: "stone",
    kind: "grant",
    amount: 10,
    reason_code: REASON_LESSON_COMPLETE,
    created_at: "2026-07-29T00:00:00.000Z",
    ...over,
  };
}

describe("a spend must NAME ITS SUBJECT — now the only clause between the two", () => {
  it("rejects a spend carrying a grant's reason code", () => {
    // The hole re-keying `cosmetic_id` opened, and the one nothing else catches now that
    // the re-keyed clause is gone. Found by `economyPersistence.test.ts`'s forged blob.
    expect(() =>
      assertLedgerEntryInvariant(
        entry({ kind: "spend", reason_code: REASON_LESSON_COMPLETE }),
      ),
    ).toThrow(/a spend must name its subject/);
  });

  it("rejects a LATER era's material spend carrying a grant's reason code", () => {
    // A different material from the default, so this case cannot pass merely because
    // the fixture's own resource happens to be the one under test.
    expect(() =>
      assertLedgerEntryInvariant(
        entry({ resource_type: "gold", kind: "spend", reason_code: "interleaved" }),
      ),
    ).toThrow(/a spend must name its subject/);
  });

  it("rejects an empty reason code on a spend", () => {
    expect(() =>
      assertLedgerEntryInvariant(entry({ kind: "spend", reason_code: "" })),
    ).toThrow(/a spend must name its subject/);
  });

  it("rejects the RETIRED purchase reason, so no shop row can be replayed in", () => {
    // `purchase:` left `SPEND_REASON_PREFIXES` with the shop, and this is that removal
    // measured rather than assumed: a spend carrying the retired prefix — from a stored
    // dev blob, or from an Aurora row minted before the sunset — is now refused at the
    // door instead of restoring a purchase nothing can undo.
    expect(() =>
      assertLedgerEntryInvariant(
        entry({ kind: "spend", reason_code: "purchase:skin.numeric.brass" }),
      ),
    ).toThrow(/a spend must name its subject/);
  });

  it("admits exactly the four declared spend reasons and nothing else", () => {
    // AN EXACT-SET CENSUS, not a floor. It went three → four when crisis repair landed
    // (`repair:`) and four → three when the shop was sunset (`purchase:`), and both moves
    // had to edit this line. A prefix added without it changing is a spend reason nobody
    // declared; a prefix REMOVED while a caller still writes it is a whole class of row
    // the guard would start rejecting at runtime. Both fail here.
    expect(SPEND_REASON_PREFIXES).toEqual([
      "build:",
      "repair:",
      "era_advance:",
      "island_reset:",
    ]);
    for (const prefix of SPEND_REASON_PREFIXES) {
      expect(() =>
        assertLedgerEntryInvariant(
          entry({ kind: "spend", reason_code: `${prefix}subject` }),
        ),
      ).not.toThrow();
    }
    expect(SPEND_REASON_PREFIXES).toHaveLength(4);
  });

  it("still rejects a spend whose reason is ALMOST a declared one", () => {
    // The clause the widening owes, and it is owed twice over now that this clause is
    // load-bearing alone: the check is a prefix match, and these are the three ways to
    // fail it while looking like a repair.
    for (const reason of ["repair", "repairs:d1", " repair:d1"]) {
      expect(
        () => assertLedgerEntryInvariant(entry({ kind: "spend", reason_code: reason })),
        `"${reason}" was admitted`,
      ).toThrow(/a spend must name its subject/);
    }
  });

  it("admits a MATERIAL spend in every era, which the old `must be gold` clause forbade", () => {
    for (const material of MATERIAL_IDS) {
      expect(() =>
        assertLedgerEntryInvariant(
          entry({ resource_type: material, kind: "spend", reason_code: "build:p1" }),
        ),
      ).not.toThrow();
    }
    expect(MATERIAL_IDS).toHaveLength(10);
  });

  it("leaves GRANTS free to carry any reason, including era_advance's credit leg", () => {
    // A carry-forward writes both legs under one `era_advance:` id, so this clause is
    // asserted in the spend direction only.
    expect(() =>
      assertLedgerEntryInvariant(
        entry({ resource_type: "grain", reason_code: "era_advance:neolithic" }),
      ),
    ).not.toThrow();
    expect(() =>
      assertLedgerEntryInvariant(entry({ reason_code: REASON_LESSON_COMPLETE })),
    ).not.toThrow();
  });
});

describe("the amount clause is untouched", () => {
  it("rejects a zero, negative or non-finite amount", () => {
    for (const amount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => assertLedgerEntryInvariant(entry({ amount }))).toThrow(
        /positive finite number/,
      );
    }
  });
});

describe("the resource axis itself", () => {
  it("is the ten materials and nothing else", () => {
    // It was `[...RESOURCE_TYPES, ...MATERIAL_IDS]` — eleven, with `xp` at the head — and
    // the union had to be kept DISJOINT because `applyGrant` walks the concatenation and
    // a shared id would have written two rows under one event. There is one union now,
    // so that whole failure mode is unreachable and the disjointness guard went with it.
    expect(ECONOMY_RESOURCES).toEqual(MATERIAL_IDS);
    expect(new Set(ECONOMY_RESOURCES).size).toBe(ECONOMY_RESOURCES.length);
    expect(ECONOMY_RESOURCES).toHaveLength(10);
    expect(ECONOMY_RESOURCES).not.toContain("xp");
  });

  it("orders rows deterministically, by era in play order", () => {
    expect(ECONOMY_RESOURCES[0]).toBe("stone");
    // Era five's, which is where the retired currency's word ended up. Row order is what
    // `applyGrant` iterates, so it is behaviour, not cosmetics.
    expect(ECONOMY_RESOURCES[4]).toBe("gold");
  });
});
