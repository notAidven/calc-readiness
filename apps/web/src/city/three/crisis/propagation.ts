import type * as THREE from "three";

/**
 * **THE PROPAGATION SEAM, WHICH EXISTS TO KEEP FOUR CRISES APART RATHER THAN TO SHARE THEM.**
 *
 * Every other file in this directory is here because four crises need the same thing. This one
 * is here because they need four DIFFERENT things and a framework's natural pull is toward
 * sameness. `crisis-reference-packs/README.md` §4 rules them apart deliberately, so that a
 * player does not meet the same mental model twice:
 *
 * | Era | What propagates | Along what | The one-word read |
 * | --- | --- | --- | --- |
 * | 1 Hard Winter | Frost | Tile adjacency, a front advancing inward | **Creeping** |
 * | 4 Succession | Allegiance | Nothing spatial at all | **Tipping** |
 * | 6 Plague | Infection | Authored links between buildings that need not touch | **Reaching** |
 * | 9 Intrusion | Counterfeit feed | A route over real city buildings | **Probing** |
 *
 * That document's own summary is the requirement: *"read down the fourth column and the four are
 * four different visual jobs"* — watch an edge, watch an object arrive, watch a line, read a
 * probe — and *"nothing else in this pass may blur those four"*.
 *
 * ## SO THIS FILE HOLDS NO SPREAD RULE, NO NEIGHBOUR TEST AND NO CELL
 *
 * **The crisis supplies its propagation layer entirely.** The framework's whole contribution is
 * {@link CrisisPropagation}: a DECLARATION the guards can sweep, and a `build` slot it calls
 * without ever looking inside. There is no shared advance, no shared front, no shared
 * `spread(step)` and no shared cell type, because era one is the only crisis that has any of
 * those and a shared one would be era one's own with the other three bent through it.
 *
 * The test of the abstraction, stated so it can be applied to a change rather than admired: **if
 * era four's tipping is expressible only as a frost with the spread turned off, the abstraction
 * is wrong.** {@link PropagationTopology} is built so that it is not merely discouraged but
 * unrepresentable — the four variants share the `kind` discriminant and no substantive field at
 * all, so there is no `cells`, `adjacency` or `front` for a non-spatial crisis to fill in with a
 * degenerate value. `crisisPropagationSeparation.test.ts` asserts that disjointness over the
 * registered set rather than trusting this paragraph, and asserts it can fail.
 *
 * ## TWO COLLISIONS THIS SHAPE EXISTS TO KEEP IMPOSSIBLE
 *
 *  - **Era six against era seven.** Both want a link layer, and the crisis spec warns that an
 *    identical visual language would invite a player to sever era seven's network — correct in
 *    era six, destructive in era seven. So a link topology must state its {@link LinkRelief},
 *    and {@link RESERVED_LINK_RELIEF} pins the two apart before either is built.
 *  - **Era six against era nine.** Era six's authored links are a graph the player reasons
 *    about. Era nine's route is a single ordered probe path over buildings that actually stand
 *    in the learner's city. It has no branching or severable edge.
 */

/* -------------------------------------------------------------------------- */
/* The one-word read                                                          */
/* -------------------------------------------------------------------------- */

/**
 * **THE ONE-WORD READ, which is the property the separation is FOR.**
 *
 * Not a label. It is the player's mental model of the crisis, and the reason two crises may not
 * share one is that a player who has learnt to read the frost must not arrive at era four
 * expecting an edge to creep toward them. Exhaustive over the four in-scope crises (D-CRISIS-33)
 * and deliberately closed: a fifth crisis owes a fifth word, and a fifth word is a design
 * decision rather than a value somebody types into a registry entry.
 */
export const PROPAGATION_READS = ["creeping", "tipping", "reaching", "probing"] as const;

export type PropagationRead = (typeof PROPAGATION_READS)[number];

/** What the player physically DOES to read this propagation. §4's fourth column. */
export const PROPAGATION_JOBS = [
  "watch-an-edge",
  "watch-an-object-arrive",
  "watch-a-line",
  "watch-a-probe",
] as const;

export type PropagationJob = (typeof PROPAGATION_JOBS)[number];

/* -------------------------------------------------------------------------- */
/* What propagates along what                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Whether a link is inlaid in the floor or stands on it.
 *
 * The whole of the era six / era seven separation, as one word. Era six's bands are IN the
 * paving; era seven's steam mains are ON it, on sleepers. See {@link RESERVED_LINK_RELIEF}.
 */
export type LinkRelief = "in-the-floor" | "on-the-floor";

/**
 * **ERA ONE.** Frost, over cells, as a front with a heading.
 *
 * The only variant that knows what a cell is, and the only one that will ever need to: era four
 * lays no per-cell layer at all (`crises/README.md`'s reach table calls it *"the only one of the
 * nine that lays no ground layer"*), era six propagates per LINK rather than per cell, and era
 * nine propagates invisibly.
 */
export interface TileAdjacencyTopology {
  readonly kind: "tile-adjacency";
  /** Where the front starts and which way it travels. */
  readonly advance: "inward-from-the-rim";
  /**
   * The mark's subject is a BOUNDARY, not a patch. `winterFrostFront.ts` is the whole argument:
   * a cell on its own cannot see an edge, so the front is read off the neighbours.
   */
  readonly frontSubject: "cell-boundary";
}

/**
 * **ERA FOUR.** Allegiance, over districts, along nothing.
 *
 * A district decides on its own, in favour of whoever is currently strongest, and the player
 * watches an OBJECT arrive rather than an edge move: a numbered block waiting at the foot of a
 * plinth, which goes up on the plinth when the drift lands
 * (`crises/era-04-succession-crisis.md` §3.4).
 *
 * **Note what this variant does not have and could not be given without becoming era one:** no
 * neighbour, no adjacency, no direction, no front, no leading edge and no cell. That is not a
 * gap. It is the whole content of *"nothing spatial at all"*, and a field here that a frost
 * could recognise is the defect this file exists to prevent.
 */
export interface UnlinkedTopology {
  readonly kind: "unlinked";
  /** The unit that decides. A district, which is a region of the city and not a tile. */
  readonly decidesPer: "district";
  /** What decides it. A standing comparison, computed from nothing on the board. */
  readonly decidedBy: "whoever-is-currently-strongest";
}

/**
 * **ERA SIX.** Infection, along authored links, between buildings that need not touch.
 *
 * The reach is the point: two linked buildings can be at opposite ends of the city, so the
 * player watches a LINE rather than a boundary. {@link linkRelief} is not decoration; see
 * {@link RESERVED_LINK_RELIEF}.
 */
export interface AuthoredLinkTopology {
  readonly kind: "authored-link";
  /** What a link joins. Buildings people use, not cells and not districts. */
  readonly endpoints: "building-pair";
  /** Whether the band is inlaid or raised. The era-seven separation. */
  readonly linkRelief: LinkRelief;
  /** Two linked buildings need not be adjacent, which is what makes this reach rather than creep. */
  readonly requiresContact: false;
}

/** Era six's replacement: one authored patient count arrives after an answered round. */
export interface RoundArrivalTopology {
  readonly kind: "round-arrival";
  readonly advancesOn: "answered-batch";
  readonly countFrom: "authored-round";
}

/**
 * **ERA NINE.** Compromise, along nothing visible.
 *
 * Status is hidden per BUILDING and the only way to learn it is to read a panel, so the player's
 * job is reading a board and not watching the island. `era-09-intrusion.md` §2.2: *"era nine has
 * no edge layer ... drawing a network would import era six's topology into a crisis that does not
 * have one"*, and its ground marks *"say where evidence was found"* rather than what is connected
 * to what — which is why {@link hiddenPer} is a building and there is no link field to fill in.
 */
export interface UnobservableTopology {
  readonly kind: "unobservable";
  /** What holds the hidden status. Per building, never per connection. */
  readonly hiddenPer: "building";
  /** The only way a player learns it. */
  readonly learnedBy: "diagnostic-reading";
}

/** Era nine: one ordered probe route over placements the learner's city really contains. */
export interface CityRouteTopology {
  readonly kind: "city-route";
  readonly movesWhen: "breached-round";
  readonly visits: "real-building";
}

/**
 * **WHAT PROPAGATES ALONG WHAT, as four variants that share the discriminant and nothing else.**
 *
 * The disjointness is the design. Merge any two of these into a parameterised shape and the
 * parameter becomes a dial between two mental models the design spent a ruling separating, which
 * is exactly how *"a framework naturally pushes toward sameness"* would land here.
 */
export type PropagationTopology =
  | TileAdjacencyTopology
  | UnlinkedTopology
  | AuthoredLinkTopology
  | RoundArrivalTopology
  | UnobservableTopology
  | CityRouteTopology;

/**
 * **THE ERA SIX / ERA SEVEN RESERVATION, written down before either is built.**
 *
 * The crisis spec puts both crises on one edge primitive and warns that identical visual language
 * would invite a player to sever era seven's network. Era seven is shelved and the warning is
 * still live, because a shelved design comes back — so the two reliefs are pinned here rather
 * than left to whoever builds the second one to notice.
 *
 * `crisisPropagationSeparation.test.ts` asserts the two differ, so a later edit that made era
 * six's bands stand on the floor would fail rather than merely be regrettable.
 */
export const RESERVED_LINK_RELIEF = {
  /** The Plague. Inlaid bands: a hazard to CUT. */
  renaissance: "in-the-floor",
  /** The Boiler Cascade, shelved. Raised steam mains on sleepers: a supply line to KEEP. */
  industrial: "on-the-floor",
} as const satisfies Record<string, LinkRelief>;

/* -------------------------------------------------------------------------- */
/* How it reaches the screen                                                  */
/* -------------------------------------------------------------------------- */

/**
 * WHAT KIND OF THING the propagation is drawn as, where it is drawn at all.
 *
 * Deliberately about the CARRIER and not about the content: the framework has to know whether a
 * layer wants the shared ground ladder, and it must not know anything else.
 *
 * **Which RUNG is the crisis's own and is not here**, which is the same refusal the rest of this
 * file is built on: a rung is a number inside the crisis's own depth budget, era one derives its
 * from its snow course's relief and its cells' dish, and a framework holding the number would be
 * a framework with an opinion about what is stacked under it.
 */
export type PropagationCarrier =
  /** Terrain over cells, on the shared ground-decal ladder. Era one's front. */
  | { readonly kind: "ground-course" }
  /**
   * A standing object at an authored anchor. Era four's block and shear-legs at a plinth, which
   * takes no rung at all because era four lays no ground layer.
   */
  | { readonly kind: "standing-object"; readonly anchor: "authored-plinth" }
  /** A state-bearing route over actual city placements. Era nine's probe. */
  | { readonly kind: "standing-object"; readonly anchor: "city-route" }
  /** A band inlaid in the floor between two endpoints, flush. Era six's links. */
  | { readonly kind: "floor-inlay" };

/** Whether a carrier wants the shared ground ladder. Era four's is the one that does not. */
export function carrierUsesGroundLadder(carrier: PropagationCarrier): boolean {
  return carrier.kind === "ground-course" || carrier.kind === "floor-inlay";
}

/**
 * **THE LAYER, IN THREE STATES, AND THE THREE ARE NOT INTERCHANGEABLE.**
 *
 *  - `none` means this crisis has NO world geometry for its propagation, permanently and by
 *    design. Era nine is the case, and the reason it is a distinct state rather than an absent
 *    builder is that *"not built yet"* and *"must never exist"* look identical from outside and
 *    only one of them may quietly acquire a layer later;
 *  - `designed` means the brief specifies it and nobody has built it. Era four is the case;
 *  - `built` means the crisis hands over a builder the framework calls and does not inspect.
 */
export type PropagationLayer<TMark> =
  | {
      readonly kind: "none";
      /** Why there is nothing, in the brief's own terms. A blank fails the guard. */
      readonly because: string;
    }
  | {
      readonly kind: "designed";
      readonly carrier: PropagationCarrier;
      /** What is owed before this becomes `built`. */
      readonly owed: string;
    }
  | {
      readonly kind: "built";
      readonly carrier: PropagationCarrier;
      /** The `name` the crisis puts on the group, so a guard can find it on a real board. */
      readonly markName: string;
      /**
       * **THE CRISIS'S OWN BUILDER. The framework calls this and never looks inside it.**
       *
       * `TMark` is whatever the crisis needs and the framework has no opinion about it: era one's
       * is a cell centre, a rung and an approach; era four's would be a plinth and a claimant.
       * The generic is the mechanical form of *"the propagation layer must be a thing each crisis
       * supplies entirely"* — there is no shape here for a shared advance to live in.
       */
      readonly build: (mark: TMark) => THREE.Group;
    }
  | {
      /**
       * Built as a stateful React scene layer rather than an imperative one-mark group.
       * The component path is data so the registry names the production owner.
       */
      readonly kind: "mounted";
      readonly carrier: PropagationCarrier;
      readonly markName: string;
      readonly componentPath: string;
    };

/* -------------------------------------------------------------------------- */
/* One crisis's propagation                                                   */
/* -------------------------------------------------------------------------- */

/** Everything a crisis declares about how its hazard travels, plus its layer. */
export interface CrisisPropagation<TMark> {
  readonly read: PropagationRead;
  readonly job: PropagationJob;
  readonly topology: PropagationTopology;
  readonly layer: PropagationLayer<TMark>;
}

/**
 * The same declaration with the builder erased, so the four can sit in one array and be swept.
 *
 * The erasure exists because {@link CrisisPropagation} is generic in a type the framework must
 * not know: a homogeneous registry would have to pick one `TMark`, and picking one is how the
 * other three crises end up expressed in the first one's terms.
 */
export interface CrisisPropagationDeclaration {
  readonly read: PropagationRead;
  readonly job: PropagationJob;
  readonly topology: PropagationTopology;
  readonly layer:
    | { readonly kind: "none"; readonly because: string }
    | {
        readonly kind: "designed";
        readonly carrier: PropagationCarrier;
        readonly owed: string;
      }
    | {
        readonly kind: "built";
        readonly carrier: PropagationCarrier;
        readonly markName: string;
      }
    | {
        readonly kind: "mounted";
        readonly carrier: PropagationCarrier;
        readonly markName: string;
        readonly componentPath: string;
      };
}

/** Erase the builder, keeping every field a guard reads. */
export function propagationDeclaration<TMark>(
  propagation: CrisisPropagation<TMark>,
): CrisisPropagationDeclaration {
  const layer = propagation.layer;
  return {
    read: propagation.read,
    job: propagation.job,
    topology: propagation.topology,
    layer:
      layer.kind === "built"
        ? { kind: "built", carrier: layer.carrier, markName: layer.markName }
        : layer,
  };
}

/**
 * The substantive field names one topology spends, with the shared discriminant removed.
 *
 * This is what makes *"the four share no field"* a measurement rather than a claim, and it is
 * read by `crisisPropagationSeparation.test.ts` over the registry's real entries. `kind` comes
 * out because it is the discriminant every variant must have.
 */
export function topologyFields(topology: PropagationTopology): readonly string[] {
  return Object.keys(topology)
    .filter((field) => field !== "kind")
    .sort();
}
