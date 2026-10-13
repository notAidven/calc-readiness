import {
  canonicalCivicPlacementId,
  civicCatalogueRow,
  civicModelTypeFor,
  type ParsedCivicPlacementId,
  parseCivicPlacementId,
} from "@cr/economy";

/**
 * CIVIC BUILDINGS ON THE GRID — the identity half of era one's bought catalogue.
 *
 * A civic building is BOUGHT, not earned (D-ERA7), so it has no graph node, no
 * `student_node_state` row, no mastery and no lesson. Everything spatial in this lane
 * — occupancy, the reachability walk, the ghost, the drag, the session write — is
 * nevertheless keyed on a `PlacedTransform.nodeId`, and that is worth keeping rather
 * than forking: `placementRefusal` is the ONE placement decision every gate calls
 * (`worldLayout.ts`), and a civic building that went around it would be the second
 * authority on what is legal.
 *
 * So a civic placement carries a SYNTHETIC id in the same field, and this module owns
 * the scheme both ways. Nothing else parses one.
 *
 *     civic:longhouse:3      type `longhouse`, the 3rd civic building ever placed
 *
 * The sequence number is what makes the same type buildable *"as many times as you can
 * afford"* (era one section 0) without two placements colliding on one key. It is a
 * monotone counter over the session's whole civic list rather than a per-type one, so
 * an id is never reused after a teardown (O-4, unbuilt) hands a plot back.
 *
 * WHY A PREFIXED STRING AND NOT A SECOND FIELD ON `PlacedTransform`. Because every
 * consumer of that type — `occupiedCells`, `unreachableNodeIds`, `footprintFor`, the
 * scene's `building-${nodeId}` object names, the callout anchor — would then need to
 * learn about a field that is `undefined` for six sevenths of the island. A namespaced
 * id is inert to all of them, and the one place that must tell the two apart
 * ({@link civicTypeOf}) is a string test with a floor under it in the tests.
 */

/** Mint the id for the `sequence`-th civic building of a type (see the file header). */
export function civicPlacementId(identity: string, sequence: number): string {
  const row = civicCatalogueRow(identity);
  if (row === null) {
    throw new Error(`city: cannot mint a civic placement for unknown id "${identity}".`);
  }
  return canonicalCivicPlacementId(row, sequence);
}

/**
 * The next free sequence number over a set of civic placement ids: one past the HIGHEST
 * already in use, read out of the ids themselves rather than from a count.
 *
 * **THE COUNT AND THE HIGHEST AGREE TODAY AND WILL NOT ONCE TEARDOWN LANDS** (O-4 is priced
 * but unbuilt): clearing the 2nd of 3 buildings leaves two ids and a live `:2`, so a
 * count-derived mint would issue a duplicate and the new building would silently replace the
 * old one in the session's map.
 *
 * It lives HERE, in the module whose header says *"this module owns the scheme both ways.
 * Nothing else parses one"*, because there are now two callers: `citySession`'s purchase mint,
 * and the catch-up's inherited seeding, which has to hand the session ids that do not collide
 * with the ages it seeded before. A second copy of this rule is a second answer to *"which
 * building is `:3`"*.
 */
export function civicSequenceAfter(placementIds: Iterable<string>): number {
  let highest = -1;
  for (const id of placementIds) {
    const parsed = parseCivicPlacementId(id);
    if (parsed !== null && parsed.sequence > highest) {
      highest = parsed.sequence;
    }
  }
  return highest + 1;
}

/**
 * The civic type a placement id names, or `null` for anything that is not one — a
 * skill node, the hub sentinel, or a malformed/unknown civic id.
 *
 * FAILS TO `null` RATHER THAN THROWING, and never invents a type: a restored dev
 * snapshot holding an id for a type this era no longer authors must drop that building
 * rather than resolve it to some other row of the catalogue.
 */
export function civicTypeOf(nodeId: string): string | null {
  return parseCivicPlacementId(nodeId)?.modelType ?? null;
}

export type { ParsedCivicPlacementId };
/** The one strict parser, re-exported at the app seam all existing consumers import. */
export { parseCivicPlacementId };

/** True when this placement id belongs to a bought civic building. */
export function isCivicPlacement(nodeId: string): boolean {
  return civicTypeOf(nodeId) !== null;
}

/**
 * The authored, learner-facing name for a PLACEMENT ("The Longhouse").
 *
 * A thin adapter over the art lane's `civicBuildingName`, which is keyed by TYPE: this
 * lane holds placement ids and that one holds type ids, and one translation in one place
 * is what keeps the label from being read off the catalogue twice. Returns the raw id
 * for a non-civic one, so a caller that hands this the wrong id gets something
 * debuggable rather than a lie.
 */
export function civicName(nodeId: string): string {
  return parseCivicPlacementId(nodeId)?.row.name ?? nodeId;
}

/**
 * What one of these costs, in the era's material. Read from the CATALOGUE, never from
 * a caller — INV-COS-4's *"a client can never set its own price"*, which
 * `applyMaterialSpend` restates as *"the cost must be read from the catalogue and never
 * from a client payload"*.
 */
export function civicCost(identity: string): number {
  return civicCatalogueRow(identity)?.cost ?? 0;
}

/** The two capacities one civic building contributes for as long as it stands. */
export interface CivicContributions {
  readonly livability: number;
  readonly happiness: number;
}

/**
 * WHAT A BOUGHT CIVIC BUILDING GIVES THE CITY — the ONE reading of the catalogue that
 * every learner-facing surface reports from, or `null` for an id that is not a civic
 * placement.
 *
 * IT EXISTS BECAUSE TWO SURFACES NOW REPORT THESE NUMBERS. The live region has announced
 * them since the selection sentence was written (`civicSelectionMessage`), and clicking
 * the building opens a popup that shows them. Those are two accounts of the same two
 * figures, and two accounts drift: a catalogue retune that reached the sentence and not
 * the panel would leave a screen-reader user and a sighted user reading different numbers
 * off one building, with nothing failing. So neither surface reads
 * `ERA_ONE_CIVIC_TYPES` for a capacity any more — both come through here, and
 * `civicBuildingPopup.test.tsx` asserts the two agree per catalogue row.
 *
 * It deliberately answers ONLY the capacities, not a rendering of them. The sentence and
 * the panel are shaped differently on purpose (one is spoken, one is a list), and the
 * thing that must not fork is the arithmetic rather than the prose.
 */
export function civicContributions(nodeId: string): CivicContributions | null {
  const row = parseCivicPlacementId(nodeId)?.row;
  return row
    ? { livability: row.provides.livability, happiness: row.provides.happiness }
    : null;
}

/** Resolve a catalogue/model identity without parsing a placement id. */
export function civicIdentity(identity: string): {
  readonly row: NonNullable<ReturnType<typeof civicCatalogueRow>>;
  readonly modelType: string;
} | null {
  const row = civicCatalogueRow(identity);
  if (row === null) {
    return null;
  }
  const modelType = civicModelTypeFor(row);
  return modelType === null ? null : { row, modelType };
}
