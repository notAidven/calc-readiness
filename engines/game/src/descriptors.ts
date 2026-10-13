import type { AnswerType } from "@cr/components";
import { D1_ITEM_PACK } from "@cr/item-bank/src/d1";
import { PRODUCT_ITEM_PACK } from "@cr/item-bank/src/product";
import {
  type DomainId,
  type EraId,
  getEraNodes,
  getNode,
  getNodesByDomain,
} from "@cr/skill-graph";

import { D1_NEIGHBORHOOD_ID, NEIGHBORHOOD_LABELS } from "./neighborhood";
import type { PlotPosition } from "./plots";
import {
  DEFAULT_STORM_ITEM_COUNT,
  DEFAULT_STORM_TIMER_BUDGET_MS,
  STORM_CLEAR_RATIO,
} from "./storm";

/**
 * The data-driven neighborhood descriptor model (pure, framework-free).
 *
 * The engine is GENERIC over "a neighborhood": everything domain-specific is
 * declarative data resolved from two sources of truth — the skill-graph registry
 * (`@cr/skill-graph`: nodes/edges/scope) and the game descriptors here (layout,
 * building-visual archetypes, storm tuning, and the
 * architected-only endgame attack scene). A single resolver,
 * `resolveNeighborhood(domain)`, composes them so `buildCityViewModel` never
 * hard-codes a node id, an edge, or "D1".
 *
 * MVP build fence: ONLY D1 is `populated` (authored layout + archetypes, and the
 * registry's six `product_scope: "mvp"` nodes). D2-D9 are typed, `architected`
 * slots (empty layout, no built nodes) shown as distant locked districts, and the
 * endgame "Attacks = Calculus I" scene is an architected-only TYPE
 * (`AttackSceneDescriptor`, `built: false`) — declared and example-populated,
 * never built. See `docs/superpowers/specs/Game_Architecture_Blueprint.md`.
 */

/* -------------------------------------------------------------------------- */
/* Building-visual archetypes (keyed by answer-type; MVP_Definition §1)       */
/* -------------------------------------------------------------------------- */

/**
 * The building "type" a plot renders as, keyed to the node's answer-type family.
 * Abstract tokens only — the web layer maps them to concrete three.js geometry and
 * palette, so the engine stays framework-free.
 */
export type BuildingArchetypeId =
  | "numeric"
  | "multiple_choice"
  | "constructed_response"
  | "generic";

export interface BuildingArchetypeDescriptor {
  readonly id: BuildingArchetypeId;
  /** Human name, surfaced in the DOM mirror (never color-alone). */
  readonly label: string;
  /** Abstract silhouette family the renderer maps to geometry. */
  readonly silhouette: "hall" | "tower" | "workshop" | "block";
  /** Abstract palette token the renderer maps to a concrete accent color. */
  readonly accent: string;
}

export const BUILDING_ARCHETYPES: Readonly<
  Record<BuildingArchetypeId, BuildingArchetypeDescriptor>
> = {
  numeric: { id: "numeric", label: "Numeric hall", silhouette: "hall", accent: "azure" },
  multiple_choice: {
    id: "multiple_choice",
    label: "Choice tower",
    silhouette: "tower",
    accent: "violet",
  },
  constructed_response: {
    id: "constructed_response",
    label: "Expression workshop",
    silhouette: "workshop",
    accent: "amber",
  },
  generic: {
    id: "generic",
    label: "Foundation block",
    silhouette: "block",
    accent: "slate",
  },
};

export function getBuildingArchetype(id: BuildingArchetypeId): BuildingArchetypeDescriptor {
  return BUILDING_ARCHETYPES[id];
}

/* -------------------------------------------------------------------------- */
/* Citizen social roles (keyed by node id; citizens design D-CIT3 / D-CIT17)  */
/* -------------------------------------------------------------------------- */

/**
 * What a building IS socially: people live here, learn here, or work-and-visit here.
 * `civic` is the FALLBACK, so no building is ever role-less and an unauthored island
 * gets a working social life the day its buildings land (D-CIT12).
 *
 * Keyed by NODE ID, deliberately. The learner-facing name is a display string the
 * user may tweak freely (`NUM.S` has already gone "Town Hall" → "City Bank" → "Assembly
 * Hall", and every building now carries a per-era subtitle on top — D-ERA29),
 * and the Gridwork art mass (`gridworkId`) lives in
 * `apps/web/src/city/buildingAssets.ts` — which this framework-free package cannot
 * import. The node id is the registry's own primary key and does not move when
 * either of those does.
 *
 * This is NOT `BuildingArchetypeId`. That is derived from the node's authored
 * `answer_type` and describes how the learner ANSWERS; on D1 it groups four numeric
 * halls together and splits the school from the park. Citizens must not read it.
 *
 * Unlike `building_archetypes`, this map is AUTHORED rather than derived: a social
 * role cannot be read off anything the item bank knows.
 */
export type CitizenRoleId = "residence" | "school" | "civic";

/**
 * D1's authored roles. One residence, one school, four civic — and the park is
 * `civic` deliberately: a lawn is not a workplace but it is emphatically somewhere to
 * be, and a fourth "leisure" family buys nothing its capacity number cannot express.
 */
const D1_CITIZEN_ROLES: Readonly<Record<string, CitizenRoleId>> = {
  "NUM.2": "residence", // the Dwellings — the island's housing
  "NUM.3": "school", // the Workshop — a daytime destination, never a home
  "NUM.S": "civic", // the Assembly Hall
  "NUM.F": "civic", // the Store
  "NUM.5": "civic", // the Tower
  "NUM.4": "civic", // the Commons
};

/* -------------------------------------------------------------------------- */
/* Answer-type → archetype binding (DERIVED from the authored item bank)      */
/* -------------------------------------------------------------------------- */

/**
 * Map a node's authored item `answer_type` (from `@cr/item-bank` — the single
 * source of truth students actually answer against) to the building archetype it
 * renders as. This is the ONE place the answer-type → building binding lives:
 *
 *   numeric                 → numeric hall (`numeric`)
 *   multiple_choice         → choice tower (`multiple_choice`)
 *   expression | multipart  → expression workshop (`constructed_response`)
 *   anything else           → generic block (`generic`, the fallback)
 *
 * `constructed_response` is the art bible's family name for the expression /
 * free-form workshop silhouette (City_Art_Bible.md §3), so `expression` items map
 * to it. Deriving the archetype here (instead of hand-authoring one per node)
 * means the city can never silently drift from the items in the bank.
 */
export function archetypeForAnswerType(answerType: AnswerType): BuildingArchetypeId {
  switch (answerType) {
    case "numeric":
      return "numeric";
    case "multiple_choice":
      return "multiple_choice";
    case "expression":
    case "multipart":
      return "constructed_response";
    default:
      return "generic";
  }
}

/** The only part of a frozen bank item this derivation reads. */
interface BankAnswerTypeView {
  readonly node_id: string;
  readonly answer: { readonly answer_spec: { readonly answer_type: AnswerType } };
}

/**
 * Derive each node's building archetype from an authored item bank, keyed by the
 * node's `answer_type`. A node whose bank items disagree on answer_type is an
 * authoring error, so we fail loud rather than silently pick one.
 *
 * A node with NO items in the bank simply gets no entry, and the descriptor's
 * `default_archetype` covers it. That is deliberately not a throw: a node appended to
 * the registry ahead of its items is an ordinary transitional state (RAD.4 arrived that
 * way in the 2026-07-25 D2 QA pass), and this function runs at module load, so throwing
 * would take the whole game engine down over a content gap. The claim that a given
 * island's nodes are all covered belongs in that island's guard, where it fails CI
 * loudly without bricking the app — see `d2-archetypes.test.ts`.
 */
function deriveBankArchetypes(
  items: readonly BankAnswerTypeView[],
  bankLabel: string,
): Record<string, BuildingArchetypeId> {
  const answerTypeByNode = new Map<string, AnswerType>();
  for (const item of items) {
    const answerType = item.answer.answer_spec.answer_type;
    const existing = answerTypeByNode.get(item.node_id);
    if (existing !== undefined && existing !== answerType) {
      throw new Error(
        `Item bank authors conflicting answer_types for ${item.node_id}: ` +
          `${existing} vs ${answerType}; a node must have one answer-type family. ` +
          `(bank: ${bankLabel})`,
      );
    }
    answerTypeByNode.set(item.node_id, answerType);
  }

  const archetypes: Record<string, BuildingArchetypeId> = {};
  for (const [nodeId, answerType] of answerTypeByNode) {
    archetypes[nodeId] = archetypeForAnswerType(answerType);
  }
  return archetypes;
}

/** The in-product (mvp or target) node ids the registry assigns to a domain. */
function inProductNodeIds(domain: DomainId): readonly string[] {
  return getNodesByDomain(domain)
    .filter((node) => node.product_scope === "mvp" || node.product_scope === "target")
    .map((node) => node.id);
}

/**
 * D1 node → archetype, DERIVED from `@cr/item-bank` (not a hard-coded literal).
 * NUM.S/NUM.F/NUM.2/NUM.5 author `numeric` items (numeric halls); NUM.3 and NUM.4
 * author genuine `expression` items and therefore resolve to the expression
 * workshop. Feeds `D1_DESCRIPTOR.building_archetypes` below.
 */
export const D1_BANK_ARCHETYPES: Readonly<Record<string, BuildingArchetypeId>> =
  deriveBankArchetypes(D1_ITEM_PACK, "D1_ITEM_PACK");

const D2_IN_PRODUCT_NODE_IDS: ReadonlySet<string> = new Set(inProductNodeIds("D2"));

/**
 * D2 node → archetype, derived the same way, from the frozen PRODUCT assessment pack
 * restricted to the registry's own D2 nodes.
 *
 * ## Why this bank and not D2's practice pool
 *
 * `D1_ITEM_PACK` is D1's assessment forms (A + B), so the matching population for D2 is
 * `PRODUCT_ITEM_PACK` filtered to D2 — not `D2_PRACTICE_POOL`. The distinction is
 * load-bearing rather than tidy: the practice pool mixes text-graded answers with
 * widget-graded `expr_builder` items, so four of the five nodes carry TWO answer types
 * there and `deriveBankArchetypes` would throw on the conflict. The assessment pack
 * authors one family per node (six items each), which is what makes a single archetype
 * per building an honest summary of how the learner answers.
 *
 * ## The result, and the design doc it corrects
 *
 * EXP.1 authors `expression` items → the expression workshop. RAD.1-4 all author
 * `numeric` items → numeric halls. `2026-07-26-d2-boomtown-square-island-design.md` §4
 * INFERRED the per-node accent from each skill and flagged it at §14 Q3 as still owing
 * confirmation against the bank; measured, its guess was wrong for RAD.2, RAD.3 and
 * RAD.4, which it read as constructed-response amber and which are numeric teal. That
 * is the whole argument for deriving this rather than transcribing a table.
 */
export const D2_BANK_ARCHETYPES: Readonly<Record<string, BuildingArchetypeId>> =
  deriveBankArchetypes(
    PRODUCT_ITEM_PACK.filter((item) => D2_IN_PRODUCT_NODE_IDS.has(item.node_id)),
    "PRODUCT_ITEM_PACK ∩ D2",
  );

/* -------------------------------------------------------------------------- */
/* Endgame attack scene — architected-only TYPE (MVP_Definition §8a)          */
/* -------------------------------------------------------------------------- */

export interface AttackWaveDescriptor {
  readonly id: string;
  readonly label: string;
  /** e.g. "limits" | "derivatives" | "integrals". */
  readonly calculus_concept: string;
}

/**
 * The "Attacks = Calculus I" endgame, expressed as a TYPE only. `built: false`
 * is a literal, so "unbuilt" is a compile-time fact: turning it on requires
 * editing the type, not flipping a stray boolean. It reuses the same
 * neighborhood-scoped, NON-punishing set-piece shape as the storm; nothing
 * renders or runs it at MVP.
 */
export interface AttackSceneDescriptor {
  readonly built: false;
  readonly concept_source: string;
  readonly example_waves: readonly AttackWaveDescriptor[];
}

/** The single example endgame seam. Architected-only (`built: false`). */
export const ENDGAME_ATTACK_SCENE: AttackSceneDescriptor = {
  built: false,
  concept_source: "Calculus I",
  example_waves: [
    { id: "limits", label: "Limit Surge", calculus_concept: "limits" },
    { id: "derivatives", label: "Derivative Gale", calculus_concept: "derivatives" },
    { id: "integrals", label: "Integral Flood", calculus_concept: "integrals" },
  ],
};

/* -------------------------------------------------------------------------- */
/* Neighborhood descriptors + registry                                        */
/* -------------------------------------------------------------------------- */

/** Authored isometric grid positions, applied in registry order to the nodes. */
export interface NeighborhoodLayoutDescriptor {
  readonly plot_positions: readonly PlotPosition[];
}

/** Storm tuning (the 80% clear ratio is the rule; item count/timer are tuning). */
export interface StormDescriptor {
  readonly item_count: number;
  readonly clear_ratio: number;
  readonly timer_budget_ms: number;
}

/** "populated" = built at MVP (D1 only); "architected" = typed/empty slot. */
export type NeighborhoodStatus = "populated" | "architected";

export interface NeighborhoodDescriptor {
  readonly domain: DomainId;
  readonly label: string;
  readonly status: NeighborhoodStatus;
  readonly layout: NeighborhoodLayoutDescriptor;
  /**
   * Node id -> building archetype. For the populated D1 neighborhood this is
   * DERIVED from the item bank's authored `answer_type` (see `D1_BANK_ARCHETYPES`),
   * not a hand-authored literal; `default_archetype` covers any unlisted node.
   */
  readonly building_archetypes: Readonly<Record<string, BuildingArchetypeId>>;
  readonly default_archetype: BuildingArchetypeId;
  /**
   * Node id -> social role for citizens (D-CIT17). Authored per island; anything
   * unlisted takes `default_citizen_role`. Read by `resolveNeighborhood` exactly as
   * `building_archetypes` is.
   */
  readonly citizen_roles: Readonly<Record<string, CitizenRoleId>>;
  readonly default_citizen_role: CitizenRoleId;
  readonly storm: StormDescriptor;
  /** Architected-only endgame seam; only the populated D1 slot wires the example. */
  readonly attack: AttackSceneDescriptor | null;
}

/** Shared default storm tuning (single source: the storm module constants). */
const DEFAULT_STORM_DESCRIPTOR: StormDescriptor = {
  item_count: DEFAULT_STORM_ITEM_COUNT,
  clear_ratio: STORM_CLEAR_RATIO,
  timer_budget_ms: DEFAULT_STORM_TIMER_BUDGET_MS,
};

/**
 * The ONE populated neighborhood at MVP: D1 (Real Numbers & Arithmetic).
 *
 * Only the authored, non-registry data lives here — the six plots' isometric
 * positions (applied in registry order to D1's `mvp` nodes), the storm tuning,
 * and the architected-only attack seam. The
 * node→archetype assignment (which answer-type building each skill renders as) is
 * DERIVED from the item bank, not authored here. The node set, prerequisite
 * edges, and lesson shells are read from the registry by `resolveNeighborhood`,
 * never duplicated here.
 */
const D1_DESCRIPTOR: NeighborhoodDescriptor = {
  domain: D1_NEIGHBORHOOD_ID,
  label: NEIGHBORHOOD_LABELS.D1,
  status: "populated",
  layout: {
    // Registry order for D1: NUM.S, NUM.F, NUM.2, NUM.3, NUM.4, NUM.5.
    plot_positions: [
      { col: 0, row: 0 },
      { col: 2, row: 0 },
      { col: 1, row: 1 },
      { col: 3, row: 1 },
      { col: 2, row: 2 },
      { col: 0, row: 2 },
    ],
  },
  // DERIVED from the item bank's authored answer_type (see D1_BANK_ARCHETYPES),
  // never a hand-authored per-node literal, so the six buildings always match the
  // items students answer. `default_archetype` is the explicit fallback for any
  // node the bank has no entry for.
  building_archetypes: D1_BANK_ARCHETYPES,
  default_archetype: "generic",
  // AUTHORED, not derived (D-CIT17): a social role cannot be read off `answer_type`.
  citizen_roles: D1_CITIZEN_ROLES,
  default_citizen_role: "civic",
  storm: DEFAULT_STORM_DESCRIPTOR,
  attack: ENDGAME_ATTACK_SCENE,
};

/**
 * An architected-only slot: typed and reachable through the same resolution path,
 * but empty (no authored layout, no archetype assignments, no built nodes in the
 * registry), so it resolves to a zero-plot neighborhood shown as scenery. This is
 * how the other eight domains are "architected, not built."
 */
function architectedSlot(domain: DomainId): NeighborhoodDescriptor {
  return {
    domain,
    label: NEIGHBORHOOD_LABELS[domain],
    status: "architected",
    layout: { plot_positions: [] },
    building_archetypes: {},
    default_archetype: "generic",
    citizen_roles: {},
    default_citizen_role: "civic",
    storm: DEFAULT_STORM_DESCRIPTOR,
    attack: null,
  };
}

/**
 * PLACEHOLDER (D10 Geometry island): needs Evan to finalize theme/hue/buildings.
 *
 * The 2026-07-24 coverage expansion added a D10 Geometry domain (GEO.1/GEO.2,
 * both `target` scope). Its game island — theme, hue, and per-node buildings —
 * is UNASSIGNED (see `docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md`
 * §4, D10 row: an unassigned placeholder needing Evan + Anthony). This is a
 * minimal architected slot (zero built/`mvp` nodes → resolves to zero plots),
 * just enough to keep `Record<DomainId, …>` exhaustive. The placeholder
 * `building_archetypes` below name GEO.1/GEO.2 only so Evan has an obvious hook;
 * they are inert until the island is authored and GEO nodes are built.
 */
const GEOMETRY_PLACEHOLDER_DESCRIPTOR: NeighborhoodDescriptor = {
  ...architectedSlot("D10"),
  // PLACEHOLDER (D10 Geometry island): needs Evan to finalize theme/hue/buildings
  building_archetypes: {
    "GEO.1": "generic", // PLACEHOLDER Geometry building (measure by triangle) — Evan to finalize
    "GEO.2": "generic", // PLACEHOLDER Geometry building (area/volume of figures) — Evan to finalize
  },
};

/**
 * D2 (Exponents & Radicals) — the node→building ARCHETYPE hook, authored; everything
 * that depends on how D2 looks, deliberately not.
 *
 * The five nodes (EXP.1, RAD.1-4) now carry real, derived archetypes instead of the
 * single `{ "RAD.4": "generic" }` placeholder that stood here, whose stated reason —
 * "the whole D2 island is unauthored" — stopped being true of the item bank once
 * `packages/item-bank/src/d2/**` and the D2 slice of `PRODUCT_ITEM_PACK` landed.
 * `d2-archetypes.test.ts` is the guard.
 *
 * ## This slot stays `architected`, and that is not a placeholder either
 *
 * `resolveNeighborhood` draws plots from nodes with `product_scope: "mvp"`. All five D2
 * nodes are `target`, so D2 resolves to ZERO plots and this map is inert until the
 * registry says otherwise — which it cannot casually, because `graph_invariants.py`
 * pins the MVP count at 6 and the registry is a frozen, cross-lane surface. Marking
 * this `populated` today would trip the resolver's own fail-loud fence rather than
 * render anything. So authoring the hook is READINESS, not rendering.
 *
 * ## Why there is no layout, no citizen role, and no building name here
 *
 * Not oversight, and not "Evan to finalize" in the old sense — these three are blocked
 * on a DESIGN ruling that is open by name. `2026-07-27-era-progression-design.md` §2
 * supersedes the island model itself (**D-ERA1**: eras replace islands, one continuous
 * city, ten chapters) and supersedes
 * `2026-07-26-d2-boomtown-square-island-design.md` "as an island brief, partially
 * salvageable as era two". D2 is era two, the Neolithic (`ERA_SEQUENCE[1]`, whose node
 * set is exactly these five), and **O-11** — how much of the Boomtown Square theming
 * survives as that era, owner Evan — is still open. `eras/era-02-neolithic/style-guide.md`
 * puts the likely answer bluntly: *"None of that dressing can survive"* (a railway and a
 * telegraph are millennia out of period), *"but the identity layer partially does."*
 *
 * So what is authorable now is precisely the layer that does not depend on the ruling:
 *
 *   - `building_archetypes` — DERIVED from the frozen bank's `answer_type`, a fact about
 *     how the learner answers. Era-agnostic, so the ruling cannot move it. AUTHORED.
 *   - `citizen_roles` — residence / school / civic is what a building DOES for the city,
 *     which is era-agnostic per D-ERA20 but is a property of the identity O-11 rules on:
 *     a Boom Hotel is a `residence` and a threshing floor is not. DEFERRED, so this stays
 *     `{}` and every node takes `default_citizen_role: "civic"` (D-CIT12's fallback —
 *     an unauthored island still gets a working social life).
 *   - `layout.plot_positions` — the free-build city places buildings itself, and under
 *     D-ERA1 D2's buildings arrive on the SAME island rather than on a second one, so a
 *     six-plot isometric grid for a "D2 neighborhood" would be authoring the superseded
 *     model. DEFERRED, empty. If anything ever marks this `populated` without authoring
 *     positions, the resolver throws by node index rather than silently mis-placing.
 *
 * Two more that live outside this package and are deferred for the same reason:
 * `NODE_FOOTPRINTS` (era one's are frozen for all ten eras by D-ERA10, and the island
 * brief's D2 footprints were argued FROM the retired silhouettes — a road running
 * through the Toll Gate's lot, the Telegraph Office's wire fan — so freezing them now
 * would freeze a decision derived from art that has been ruled out), and
 * `D1_NODE_BUILDINGS` display names plus their `eraDressing.ts` subtitle row, which are
 * the dressing O-11 rules on directly. See `apps/web/src/city/buildingAssets.ts` for the
 * incoming-art notes.
 */
const D2_DESCRIPTOR: NeighborhoodDescriptor = {
  ...architectedSlot("D2"),
  // DERIVED from the frozen assessment pack's authored answer_type, exactly as D1's is.
  building_archetypes: D2_BANK_ARCHETYPES,
};

/**
 * Every in-product domain has a descriptor slot. The `Record<DomainId, …>` type
 * makes that a COMPILE-TIME guarantee: omitting a domain is a type error. D1 is
 * populated; D2-D10 are architected/empty. D2 now carries derived archetypes for all
 * five of its nodes (still zero-plot — see `D2_DESCRIPTOR`); the D10 Geometry island is
 * still an unauthored placeholder.
 */
export const NEIGHBORHOOD_DESCRIPTORS: Readonly<Record<DomainId, NeighborhoodDescriptor>> =
  {
    D1: D1_DESCRIPTOR,
    // Archetypes authored + derived; layout/roles/dressing deferred on O-11.
    D2: D2_DESCRIPTOR,
    D3: architectedSlot("D3"),
    D4: architectedSlot("D4"),
    D5: architectedSlot("D5"),
    D6: architectedSlot("D6"),
    D7: architectedSlot("D7"),
    D8: architectedSlot("D8"),
    D9: architectedSlot("D9"),
    // PLACEHOLDER (D10 Geometry island): needs Evan to finalize theme/hue/buildings
    D10: GEOMETRY_PLACEHOLDER_DESCRIPTOR,
  };

export function getNeighborhoodDescriptor(domain: DomainId): NeighborhoodDescriptor {
  return NEIGHBORHOOD_DESCRIPTORS[domain];
}

/* -------------------------------------------------------------------------- */
/* The ERA roster — the D-ERA1 axis, beside the domain one, never replacing it */
/* -------------------------------------------------------------------------- */

/**
 * THE ERA-SCOPED SKILL ROSTER: which buildings an era puts in the ONE city.
 *
 * ## Why this exists beside `resolveNeighborhood` rather than inside it
 *
 * `resolveNeighborhood` answers a question about a DOMAIN — "which of D<n>'s nodes are
 * built at MVP" — and it answers it off `product_scope: "mvp"`, which lives in the frozen
 * registry. **D-ERA1 replaced the model that question belongs to.** There are no longer
 * nine islands to populate one at a time; there is one city and ten chapters, and the set
 * of buildings standing in it is a function of the ERA, which `ERA_SEQUENCE` authors and
 * `getEraNodes` reads. Era two's five nodes are `EXP.1` and `RAD.1`-`RAD.4`, spread across
 * one domain today and explicitly NOT guaranteed to stay that way (`eras.ts`: three
 * domains span more than one era and three eras hold more than one domain), so a
 * domain-scoped resolver cannot express an era's roster even in principle.
 *
 * **This is additive and reads the same descriptors.** An era plot is resolved through the
 * node's OWN domain descriptor — `building_archetypes`, `citizen_roles` and their
 * defaults — so nothing here is a second opinion about what a building is. It is the same
 * data, keyed by the other axis. `resolveNeighborhood` is untouched, still MVP-scoped,
 * still the only thing every existing surface reads, and its fail-loud fences are
 * unchanged.
 *
 * ## WHAT THIS DOES NOT DO: it does not promote anything into the product
 *
 * Era two's nodes are `product_scope: "target"` and this function does not change that.
 * `resolveNeighborhood("D2")` still resolves to ZERO plots, D2's descriptor is still
 * `architected`, and `d2-archetypes.test.ts`'s assertions all still hold — nothing here
 * touches the registry, which is a frozen cross-lane surface and not this lane's to flip.
 * What this adds is a SEAM: a caller that already knows which era it means can resolve
 * that era's roster without asking the registry a question the registry answers about a
 * superseded model. `buildCityViewModel` takes it only when passed `expansion_era`, which
 * defaults to absent, so every shipped surface is byte-for-byte unchanged.
 *
 * ## `position` IS DERIVED, INERT, AND HERE ONLY BECAUSE `ResolvedPlot` CARRIES IT
 *
 * `PlotPosition` is the isometric plot grid of the pre-D-ERA1 island model, and D2's
 * descriptor deliberately authors NO `plot_positions` for exactly that reason (see
 * `D2_DESCRIPTOR`: "the free-build city places buildings itself … a six-plot isometric
 * grid for a 'D2 neighborhood' would be authoring the superseded model"). The free-build
 * city reads a building's cell from the player's own `PlacedTransform`, never from here.
 * So this fills the field from the node's index rather than leaving the era unresolvable
 * on an authored-layout fence that D-ERA1 retired — and `eraRoster.test.ts` pins that the
 * value is index-derived, so nobody can mistake it for an authored layout later.
 */
export function resolveEraPlots(eraId: EraId): readonly ResolvedPlot[] {
  const nodeIds = getEraNodes(eraId);
  const eraNodeIds = new Set(nodeIds);

  return nodeIds.map((nodeId, index) => {
    const node = getNode(nodeId);

    // Fail loud, following this module's own discipline: an era naming a node the
    // registry does not have is a curation/registry desync, and a silently dropped
    // building is a lesson the learner can never reach.
    if (!node) {
      throw new Error(
        `Era "${eraId}" lists node ${nodeId}, which the skill registry does not have.`,
      );
    }

    const descriptor = getNeighborhoodDescriptor(node.domain);
    const archetypeId =
      descriptor.building_archetypes[node.id] ?? descriptor.default_archetype;
    const citizenRole =
      descriptor.citizen_roles[node.id] ?? descriptor.default_citizen_role;

    return {
      node_id: node.id,
      lesson_shell: node.lesson_shell,
      // Derived and inert — see the docblock. Never an authored layout.
      position: { col: index, row: 0 },
      // Roads in, scoped to the ERA rather than to the domain: a prereq in an earlier
      // era is a building already standing, not a road this chapter draws.
      road_sources: node.prereqs.filter((prereq) => eraNodeIds.has(prereq)),
      archetype: getBuildingArchetype(archetypeId),
      citizen_role: citizenRole,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Resolution — the single generic path every neighborhood flows through      */
/* -------------------------------------------------------------------------- */

export interface ResolvedPlot {
  readonly node_id: string;
  readonly lesson_shell: string | null;
  readonly position: PlotPosition;
  /** Registry prereqs intersected with this neighborhood's own nodes (roads in). */
  readonly road_sources: readonly string[];
  readonly archetype: BuildingArchetypeDescriptor;
  /** Social role for citizens, resolved like the archetype (D-CIT17). */
  readonly citizen_role: CitizenRoleId;
}

export interface ResolvedNeighborhood {
  readonly domain: DomainId;
  readonly label: string;
  readonly status: NeighborhoodStatus;
  /** True iff `status === "populated"` (built at MVP). */
  readonly populated: boolean;
  /** Resolved plots in registry order; empty for architected slots. */
  readonly plots: readonly ResolvedPlot[];
  readonly storm: StormDescriptor;
  readonly attack: AttackSceneDescriptor | null;
}

/**
 * Compose a neighborhood from its descriptor + the registry. This is the ONE
 * path D1 (today) and every future neighborhood use — D1 is not a special case,
 * it is the single populated input to a generic pipeline.
 *
 * Fail-loud fence: throws if a resolved node has no authored position (a
 * registry/layout desync), if a `populated` descriptor has no built nodes, or if
 * an `architected` descriptor unexpectedly has built nodes. Because only D1
 * carries `product_scope: "mvp"` nodes in the registry (and `graph_invariants.py`
 * pins the MVP count at 6), D1 is structurally the only neighborhood that
 * resolves to a populated city; D2-D9 resolve to zero plots.
 */
export function resolveNeighborhood(
  domain: DomainId = D1_NEIGHBORHOOD_ID,
): ResolvedNeighborhood {
  const descriptor = getNeighborhoodDescriptor(domain);
  const nodes = getNodesByDomain(domain).filter((node) => node.product_scope === "mvp");
  const nodeIds = new Set(nodes.map((node) => node.id));
  const positions = descriptor.layout.plot_positions;
  const populated = descriptor.status === "populated";

  if (populated && nodes.length === 0) {
    throw new Error(
      `Neighborhood ${domain} is 'populated' but the registry has no built (mvp) nodes.`,
    );
  }

  if (!populated && nodes.length > 0) {
    throw new Error(
      `Neighborhood ${domain} is 'architected' but the registry has ${nodes.length} ` +
        `built (mvp) node(s); author its descriptor and mark it 'populated'.`,
    );
  }

  const plots: ResolvedPlot[] = nodes.map((node, index) => {
    const position = positions[index];

    if (!position) {
      throw new Error(
        `No authored plot position for ${domain} plot index ${index} ` +
          `(layout authors ${positions.length}).`,
      );
    }

    const archetypeId =
      descriptor.building_archetypes[node.id] ?? descriptor.default_archetype;
    const citizenRole =
      descriptor.citizen_roles[node.id] ?? descriptor.default_citizen_role;

    return {
      node_id: node.id,
      lesson_shell: node.lesson_shell,
      position,
      road_sources: node.prereqs.filter((prereq) => nodeIds.has(prereq)),
      archetype: getBuildingArchetype(archetypeId),
      citizen_role: citizenRole,
    };
  });

  return {
    domain,
    label: descriptor.label,
    status: descriptor.status,
    populated,
    plots,
    storm: descriptor.storm,
    attack: descriptor.attack,
  };
}
