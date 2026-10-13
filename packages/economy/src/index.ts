/**
 * `@cr/economy` — the pure ERA-MATERIAL rules core (ZERO I/O).
 *
 * NO database, NO network, NO React/DOM live here. Both economy adapters — the
 * in-memory dev adapter (`apps/web/src/economy`) and, later, the Aurora Lambda
 * (`services/economy-api`) — call THESE same functions, so grant/spend semantics
 * can never drift between demo and production.
 *
 * The two most bug-prone behaviours are plain, unit-tested functions:
 * - {@link applyGrant} — idempotent on a deterministic `event_id`; a replay is a
 *   no-op, and one event's rows are appended together or not at all.
 * - {@link applyMaterialSpend} — atomic material spend; insufficient funds leave
 *   state untouched.
 *
 * ## WHAT THIS PACKAGE NO LONGER HAS: THE SHOP AND XP (2026-08-03)
 *
 * Team lead: *"sunset the cosmetic shop and xp systems completely - they dont really
 * have a role in our game. remove it from the interface and it shouldnt really have any
 * implications anywhere."* Deleted here: `resources.ts` (the 24-item cosmetic catalogue,
 * the descriptors, the shop namespaces and `prestigeUnlocks`), `spend.ts` (`applySpend`,
 * the atomic cosmetic purchase), `levels.ts` (the XP→level curve and the eight rank
 * titles), `starGrant` and its event id, the `xp` resource, the `Balances` projection
 * and the `cosmetic_id` ledger column. **RESOURCES STAY**: the ten era materials, the
 * ledger, the cap, the drill bound, the civic catalogue, roads and crisis repair are
 * untouched, because they are how buildings get paid for.
 *
 * The two ledger-invariant clauses that quantified over XP and over `cosmetic_id` were
 * deleted with them rather than left standing over an empty population; see `types.ts`.
 *
 * INV-COS-1 (one-way): this package must NEVER be imported by a learning-path
 * module (mastery service, diagnostic engine, `isNeighborhoodReady`, lessons).
 * The economy READS progression to decide grants; nothing economic gates learning.
 * Enforced by `one-way-invariant.test.ts`. The invariant outlives the cosmetics it was
 * named for: it is about the DIRECTION of the edge, not about what is bought.
 *
 * THE CIVIC CATALOGUE (`civicCatalogue.ts`) is the forty buildings the economy
 * exists to buy, and `civicBuilding.ts` is what you can do with them: purchase
 * (priced from the catalogue, never from a caller), teardown at O-4, and O-5's
 * legacy decay into `deriveCapacities`. The AUTHORED source is the ten
 * `docs/superpowers/specs/eras/<era>/civic-buildings.md` tables;
 * `test/eraCivicCatalogueParity.test.ts` holds the two identical row for row, in
 * both directions, so neither can drift.
 *
 * ERA MATERIALS (`materials.ts`, `materialSpend.ts`) and the TWO CAPACITIES
 * (`capacity.ts`) extend the same ledger rather than sitting beside it: a material is
 * a value on `LedgerEntry.resource_type`, so idempotency, atomicity, derived
 * balances, the row invariants and the persistence path are one implementation for
 * both axes. `docs/superpowers/specs/2026-07-29-era-resource-model-design.md` is the
 * decision record — every ruling, and every open question, in one place.
 *
 * That is also the direction INV-COS-1 permits: this package imports
 * `@cr/skill-graph` (for the era sequence a node's material is resolved through) and
 * `@cr/mastery-service` (for the mapping from "four of five correct" to the persisted
 * `mastery` that row 1's grant is gated on — {@link LESSON_GRANT_MASTERY_BAR}), and
 * neither may import back.
 */

export * from "./cap";
export * from "./capacity";
export * from "./civicBuilding";
export * from "./civicCatalogue";
export * from "./civicIdentity";
export * from "./constants";
export * from "./earn";
export * from "./events";
export * from "./grant";
export * from "./ledger";
export * from "./materialSpend";
export * from "./materials";
export * from "./types";
