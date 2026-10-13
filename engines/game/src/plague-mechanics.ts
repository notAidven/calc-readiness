export type PlagueMechanicAnswer = "built" | "no_analogue" | "deferred";

export interface PlagueMechanic {
  readonly id: string;
  readonly mechanic: string;
  readonly answer: PlagueMechanicAnswer;
  readonly instance: string;
  readonly engine_symbols: readonly string[];
  readonly next: string | null;
}

/**
 * The reference pack's complete mechanic inventory, re-answered for Three Rounds at the Care
 * House. Keeping the twenty-four source ids makes a dropped loop concern visible in review.
 */
export const PLAGUE_MECHANICS: readonly PlagueMechanic[] = [
  {
    id: "M1",
    mechanic: "The crisis call, on the city, before the player enters",
    answer: "built",
    instance:
      "The era-six mid-era call opens Oru's short Care House briefing over the live city. `plagueEntry` derives the trigger from the era rather than pinning a second number.",
    engine_symbols: ["plagueEntry"],
    next: null,
  },
  {
    id: "M2",
    mechanic:
      "The city while a call is unanswered. D-CRISIS-35 freezes building and leaves learning alone",
    answer: "deferred",
    instance:
      "The shared city call owns this freeze. The Care House engine is clockless and cannot advance before it is mounted, but the city-level refusal remains the shared call lane's responsibility.",
    engine_symbols: [],
    next: "Keep the existing shared crisis-call freeze guard applied to the era-six mount.",
  },
  {
    id: "M3",
    mechanic: "Entry and exit, as a change on screen",
    answer: "built",
    instance:
      "Entry fits temporary care furniture to the Town Hall forecourt. At the outcome the procedural layer clears in one state change and `plagueDamage` reports no durable ruin, scar, suspension or bill.",
    engine_symbols: ["plagueDamage", "plagueOutcome"],
    next: null,
  },
  {
    id: "M4",
    mechanic: "The atmosphere: light, sky, fog, exposure",
    answer: "deferred",
    instance:
      "The registered era-six high-overcast preset is threaded through the city's existing crisis-weather seam. It is renderer-owned and changes no infection, route, score, or round state.",
    engine_symbols: [],
    next: "The web renderer owns the registered PLAGUE_LIGHT preset and its visual checks.",
  },
  {
    id: "M5",
    mechanic: "Ground under the crisis",
    answer: "built",
    instance:
      "Five authored route bands are inlaid across the existing paving between mapped live-city buildings. The graph is fixed in `PLAGUE_GRAPH`, and no tile adjacency or inferred traffic enters it.",
    engine_symbols: ["PLAGUE_GRAPH"],
    next: null,
  },
  {
    id: "M6",
    mechanic: "Water and shoreline under the crisis",
    answer: "no_analogue",
    instance:
      "No analogue, because the outbreak travels only over the five authored land routes. Water and shoreline remain the city's own, and no boat, tide, or harbour state enters the reducer.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M7",
    mechanic: "Vegetation under the crisis",
    answer: "no_analogue",
    instance:
      "No analogue, because the maintained gardens do not change state. The crisis is organized care in an intact town, so wilt, overgrowth, dirt and decay would all communicate an unbuilt mechanic.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M8",
    mechanic: "The hazard's own body, and its stages",
    answer: "built",
    instance:
      "Infection is a binary state on one of five buildings. `plagueNodeViews` exposes clean, exposed, infected, and cared states without adding a person-level illness or hidden probability.",
    engine_symbols: ["plagueNodeViews"],
    next: null,
  },
  {
    id: "M9",
    mechanic: "The propagation, and its leading edge",
    answer: "built",
    instance:
      "The outbreak crosses authored building-pair routes only on the explicit `advance` event. `plagueRouteViews` records the open leading edges and the route that carried last night.",
    engine_symbols: ["plagueReducer", "plagueRouteViews"],
    next: null,
  },
  {
    id: "M10",
    mechanic: "The player's counter-mechanic, as an object",
    answer: "built",
    instance:
      "Quarantine commits a barrier to one route, while care commits a linen station to one exposed building. Both are targeted actions applied by the same reducer the scene reads.",
    engine_symbols: ["plagueReducer", "plagueAvailableActions"],
    next: null,
  },
  {
    id: "M11",
    mechanic: "Its own states: proposed, declared but inert, working, spent",
    answer: "built",
    instance:
      "Choosing, answering, resolved, and ended are explicit phases. Answer verdicts build a provisional count, the third commits solid geometry, and only a later advance moves infection.",
    engine_symbols: ["plagueReducer", "plaguePendingIntervention"],
    next: null,
  },
  {
    id: "M12",
    mechanic: "Its aimed coverage, and the footprint that coverage takes",
    answer: "built",
    instance:
      "A quarantine covers exactly one named route and care covers exactly one named exposed building. `plagueAvailableActions` derives only targets the current graph can truthfully affect.",
    engine_symbols: ["plagueAvailableActions"],
    next: null,
  },
  {
    id: "M13",
    mechanic: "Its pre-commit preview",
    answer: "built",
    instance:
      "The pending intervention identifies its route or building before the questions and records each answer as a filled or open cut. `plaguePendingIntervention` supplies that exact preview.",
    engine_symbols: ["plaguePendingIntervention"],
    next: null,
  },
  {
    id: "M14",
    mechanic: "Its duration",
    answer: "built",
    instance:
      "Accuracy sets a countable strength from one to three. Quarantine strength is nights remaining, care strength is crossings blocked, and both change only on the explicit night advance.",
    engine_symbols: ["PLAGUE", "plagueReducer"],
    next: null,
  },
  {
    id: "M15",
    mechanic: "Protection, and how much is left",
    answer: "built",
    instance:
      "A cared building holds one to three points of `care_strength`. Each attempted crossing consumes one, and `plagueNodeViews` exposes the remaining count for linen stacks and DOM copy.",
    engine_symbols: ["plagueNodeViews", "plagueReducer"],
    next: null,
  },
  {
    id: "M16",
    mechanic: "The threatened-but-unprotected building",
    answer: "built",
    instance:
      "A clean building on an open route from an infected one is exposed. `plagueNodeViews` derives that status and lists the exact risk routes, so renderer and accessible network agree.",
    engine_symbols: ["plagueNodeViews", "plagueRouteViews"],
    next: null,
  },
  {
    id: "M17",
    mechanic: "Accumulating damage short of destruction, and the threshold",
    answer: "no_analogue",
    instance:
      "No analogue, because a building is clean or infected and never accumulates fabric damage. The affected-set count escalates, but there is no damage threshold short of destruction.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M18",
    mechanic: "The ruin",
    answer: "no_analogue",
    instance:
      "No analogue, because infection ruins no building and shows no person suffering. `plagueDamage` returns empty durable collections after both contained and lost endings.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M19",
    mechanic: "Ground lost for good",
    answer: "no_analogue",
    instance:
      "No analogue, because the Plague changes no cell, road, shore, or placement. Route inlays and barrier stones are temporary, and the city's paving is intact when they clear.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M20",
    mechanic: "Repair and rebuild, as an action and as a visible result",
    answer: "no_analogue",
    instance:
      "No analogue, because nothing is damaged and there is no repair price. Ordinary civic use returns as the temporary kit clears, without adding a third crisis action after the outcome.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M21",
    mechanic: "Giving ground up, and buying it back",
    answer: "no_analogue",
    instance:
      "No analogue, because neither intervention gives up land or buys anything back. Strength is crisis state earned through answers, never an economy resource or client-computed price.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M22",
    mechanic: "The accuracy ladder, read off the board rather than off a card",
    answer: "built",
    instance:
      "The ladder is direct and countable: zero or one right still lands strength one, two rights land two, and three land three. `plaguePendingIntervention` is the source for that read.",
    engine_symbols: ["plaguePendingIntervention"],
    next: null,
  },
  {
    id: "M23",
    mechanic: "Ambient motion",
    answer: "no_analogue",
    instance:
      "No analogue, because nothing autonomous advances the scene. Every change follows a graded answer, and reduced motion removes the small DOM settling transition without hiding any state.",
    engine_symbols: [],
    next: null,
  },
  {
    id: "M24",
    mechanic: "The conclusion, as a screen with a derived verdict",
    answer: "built",
    instance:
      "`plagueOutcome` derives contained or lost from live risk routes and affected places, reports accuracy, writes no mastery, gates no progression, and leaves no durable city trace.",
    engine_symbols: ["plagueOutcome"],
    next: null,
  },
];
