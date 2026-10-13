import {
  buildingLedger,
  type CitizenBuildingLedger,
  type CitizenNodeInput,
  citizenPopulation,
  daytimeCapacity,
  residenceCapacity,
} from "./citizens-population";
import { createSeededRng, mixSeed } from "./citizens-rng";
import type { CitizenRoleId } from "./descriptors";

/**
 * The citizen ROSTER (pure, framework-free, no clock, no unseeded randomness).
 *
 * Given city state plus a seed, this yields the population count, per-building role
 * and capacity, the assignment of people to buildings, and the waiting crowd. Not one
 * citizen is saved: the roster is recomputed on every load, and individuals are
 * generated from the seed so the same person has the same look and the same home
 * across sessions with nothing persisted (D-CIT1).
 *
 * WHAT IS NOT HERE, DELIBERATELY:
 *   - ROADS. The roster is deep-equal with and without a road network (D-CIT7). Roads
 *     change only the ROUTE between two fixed points and the car count, both of which
 *     are render-side; a road cell is not an input to any assignment, so roads
 *     literally cannot gate a citizen.
 *   - GEOMETRY. No world unit, no cell, no mesh (D-CIT8). The render layer turns a
 *     home assignment into a doorstep.
 *   - A CLOCK. Nothing accrues while the tab is open, so two loads of the same state
 *     produce the same city.
 *
 * THE SWAP-IN SEAM STAYS OPEN. Because the renderer consumes a roster and never
 * derives one, replacing this function with a loader that returns the same shape is a
 * one-file change here and ZERO change on the render side.
 */

/**
 * What a citizen is doing. NO STATE IN THIS UNION EXPRESSES HARM, and there is no
 * attribute a future contributor could set to make a citizen worse off (D-CIT6).
 * Nobody starves, sickens, riots, leaves, or dies; `waiting` is patient, not
 * suffering.
 *
 * NO MEMBER WAS ADDED FOR THE 2026-07-31 CRISIS RULING, and it is worth saying so here
 * because the ruling uses the word this union bans. D-CRISIS-28 has people LEAVE when a
 * crisis takes the capacity that was holding them — and the departure is a fact about the
 * settlement's ceiling, never an attribute on a person. A displaced citizen is `waiting`,
 * exactly as a citizen who has not been housed yet is. So nothing here was relaxed for it,
 * and a contributor who reaches for `leaving` is still stopped by two guards: the
 * exhaustive switch in `citizens-roster-invariants.test.ts`, which fails to COMPILE on a
 * new member, and its banned-substring list, which contains that literal word.
 *
 * `sheltering` DID arrive later (2026-08-02) and it went through exactly that gate: it is a
 * safety state and not a harm one, the switch names it, and the argument for admitting it is
 * below.
 *
 * `commuting` and `sheltering` are RENDER-TIME states: a pure clockless derivation cannot
 * know that someone is mid-walk, and it takes no crisis input at all, so this function emits
 * neither. They stay in the union because the union is what the no-harm-state test guards,
 * and the render layer needs the vocabulary.
 *
 * ## `sheltering` IS THE ONE MEMBER A CRISIS PUTS ON A PERSON, AND IT IS A SAFETY STATE
 *
 * The team lead, on the Hard Winter running over his city (2026-08-02): *"during the winter
 * crisis - the citizens should stay within where the frost is; they shouldnt be running
 * outside, they should be within the bounds/hiding/looking scared"*. Before this member there
 * was no vocabulary for that at all: the six ordinary-city states are all a person going
 * about their business, so a crowd on a crisis board commuted and visited as though the frost
 * were not happening.
 *
 * **It says a person is SAFE, not that they are harmed, which is why D-CIT6 admits it.** A
 * sheltering citizen is indoors or pressed against a wall out of the weather — the same
 * register as `housed`, one beat tenser. The bar the union holds is that no attribute may
 * make a person WORSE OFF, and the states that would (`freezing`, `starving`, `dying`) are
 * still refused: this one is the opposite of each of them, and drawing it is what lets the
 * render layer stop drawing people strolling across ice.
 *
 * It changes no count. Population, homes, daytime seats and the waiting list are all decided
 * above without reading it, and `citizenShelter.ts` / `citizenPlaces.ts` in the web lane stage
 * one place per citizen exactly as `ceremonyCrowd.ts` does — see that file's header for the
 * shape of the argument, which is the precedent this follows rather than a new one.
 */
export type CitizenState =
  | "housed"
  | "waiting"
  | "commuting"
  | "at_school"
  | "at_work"
  | "visiting"
  | "sheltering";

/** A citizen's seeded appearance. Stable for a given seed and citizen index. */
export interface CitizenLook {
  /** 0..1, for the render layer to map onto its own palette. No colour here. */
  readonly body_tone: number;
  readonly shirt_tone: number;
  /** 0.9..1.1 — a little variety in stature so a crowd is not a clone army. */
  readonly height_scale: number;
  /** 0..1 phase offset so a crowd does not walk in lockstep. */
  readonly gait_phase: number;
}

export interface Citizen {
  /** `citizen-000`, index-ordered. Stable: person N is person N at any population. */
  readonly id: string;
  readonly state: CitizenState;
  /** The residence they live in, or `null` while they are waiting for one. */
  readonly home_node_id: string | null;
  /** Where they spend the day, or `null` for out and about (and for the waiting). */
  readonly day_node_id: string | null;
  readonly look: CitizenLook;
}

/** One building's people: who lives there, and who is there by day. */
export interface CitizenBuildingOccupancy {
  readonly node_id: string;
  readonly role: CitizenRoleId;
  readonly residence_capacity: number;
  readonly residents: readonly string[];
  readonly daytime_capacity: number;
  readonly visitors: readonly string[];
}

/**
 * One BOUGHT civic building standing on the island, as the roster sees it.
 *
 * KEYED BY A PLACEMENT ID, NOT A NODE ID, because a civic building is not a graph
 * node: it has no lesson, no mastery, no `student_node_state` row, and the same type
 * is buildable *"as many times as you can afford"* — so `"longhouse"` cannot be a key
 * (the second one would collide with the first). The web lane mints one id per
 * placement and passes it through; nothing here parses it.
 */
export interface CivicRosterInput {
  /** This building's own id — unique per placement, opaque to the roster. */
  readonly placement_id: string;
  /** Resolved by the web catalogue adapter; the engine imports no era-specific table. */
  readonly citizen_role: CitizenRoleId;
}

export interface CitizenRosterInput {
  /**
   * The island's nodes, IN PLACEMENT ORDER (the order the player placed them, which
   * `citySession.readPlacements()` preserves). The order matters only for WHICH
   * building a resident occupies, never for any count: it is what makes "placing a
   * new building never changes an existing citizen's home" true, because a new
   * building appends and draws only from the waiting pool.
   */
  readonly nodes: readonly CitizenNodeInput[];
  /**
   * The BOUGHT civic buildings on the ground, so the roster's per-building view
   * accounts for every building the city has rather than only the earned half
   * (D-ERA7 splits the two classes; the crowd lives among both).
   *
   * ## THEY CARRY A ROLE AND NO CAPACITY, AND THAT IS THE WHOLE DESIGN HERE
   *
   * Each one appends a `buildings[]` entry with its authored `citizen_role` and
   * `residence_capacity`/`daytime_capacity` of ZERO. So a Longhouse reads as a
   * `residence` and a Smokehouse does not, which is the distinction the panel and the
   * crowd must agree on — and nobody's home moves, nobody arrives, and nobody is
   * seated by a purchase.
   *
   * **A LIVABILITY CONTRIBUTION IS NOT A DOORSTEP.** This is not a shortcut, it is the
   * precedent this repository already set, in as many words: `HUB_FOUNDING_LIVABILITY`
   * is *"DELIBERATELY NOT ADDED TO `residenceCapacity`"* because *"livability is a
   * different question — how many the city can SUSTAIN — and section 8.1 answers it
   * for the founders without giving anybody a doorstep to stand on."* A bought
   * Longhouse is the same kind of number, read off the same pooled model
   * (`city-vitality.ts`), and it must reach the readout the same way.
   *
   * TWO SHIPPED INVARIANTS SAY SO, and both would break under the other reading:
   *   - D-CIT2 — population is a pure function of LEARNING STATE, with no capacity
   *     feedback and no way to farm people by building houses. Routing a purchase
   *     through `buildingLedger` would put it into `citizenPopulation`, so buying four
   *     Longhouses would summon eight citizens (`CITIZENS_PER_COMPLETE_BUILDING`) out
   *     of a stone stockpile. `citizens-invariants.test.ts`'s *"capacity never gates
   *     arrivals"* is the same rule from the other side.
   *   - `ENDGAME_SPARE_HOMES = 0` — the settled ending is pinned on full-mastery
   *     `residenceCapacity` EQUALLING the population, *"every home occupied and nobody
   *     waiting"*, because an island of empty houses reads hollow. Bought homes would
   *     make the settled city's own spare-home count a function of the player's
   *     shopping.
   *
   * Absent or empty leaves every count and every assignment byte-for-byte as it was,
   * which is what keeps this additive for every existing caller.
   */
  readonly civic?: readonly CivicRosterInput[];
  /**
   * A stable per-student seed. An INPUT, never invented downstream (D-CIT8): a
   * renderer that minted its own would reintroduce per-mount instability.
   */
  readonly seed: number;
}

export interface CitizenRoster {
  readonly population: number;
  readonly residence_capacity: number;
  readonly daytime_capacity: number;
  /** How many people have homes. `housed + waiting.length === population`, always. */
  readonly housed: number;
  readonly buildings: readonly CitizenBuildingOccupancy[];
  /** Every citizen, in stable index order. UNCAPPED — the cap is render-only. */
  readonly citizens: readonly Citizen[];
  /** Citizen ids with no home yet. UNBOUNDED, and empty at full mastery. */
  readonly waiting: readonly string[];
  /**
   * The island is FULL, SETTLED, AND HAPPY: every node mastered and nobody waiting.
   * The one flag the closing "this community is happy" beat is keyed on (D-CIT16).
   */
  readonly settled: boolean;
}

/** Salt so the look stream cannot collide with any other seeded stream. */
const LOOK_SALT = 0x100;

function citizenId(index: number): string {
  return `citizen-${String(index).padStart(3, "0")}`;
}

/**
 * A citizen's look, drawn from a per-citizen sub-seed rather than from a shared
 * stream. This is what makes a look independent of the POPULATION: citizen 3 looks
 * the same whether the island holds ten people or forty-four, so the crowd does not
 * re-skin itself every time someone arrives.
 */
function lookFor(seed: number, index: number): CitizenLook {
  const rng = createSeededRng(mixSeed(seed, LOOK_SALT + index));
  return {
    body_tone: rng(),
    shirt_tone: rng(),
    height_scale: 0.9 + rng() * 0.2,
    gait_phase: rng(),
  };
}

/** The day state a role family implies. `residence` is not a daytime destination. */
function dayStateFor(role: CitizenRoleId): CitizenState {
  switch (role) {
    case "school":
      return "at_school";
    case "civic":
      return "at_work";
    default:
      return "housed";
  }
}

export function deriveCitizenRoster(input: CitizenRosterInput): CitizenRoster {
  const ledger = buildingLedger(input.nodes);
  const population = citizenPopulation(ledger);
  const capacity = residenceCapacity(ledger);
  const daytime = daytimeCapacity(ledger);

  // WHO IS HOUSED is decided before WHERE, and it is decided by index: the lowest
  // `min(population, capacity)` indices always have homes. Because capacity is
  // monotone (mastery is monotone, placement is monotone) and population only grows
  // by appending higher indices, a citizen who was housed is STILL housed — the
  // no-eviction guarantee, structural rather than incidental (D-CIT6). A growing
  // crowd is therefore always new arrivals, never a setback.
  //
  // NARROWED 2026-07-31, and the argument above is KEPT because it is valid over the
  // premise it names. The team lead ruled that a mid-era crisis takes CAPACITY and
  // that the people it was holding leave: "people leave because there's a reduction
  // of the capacity […] but they'll come back if you increase capacity via the civic
  // buildings" (D-CRISIS-28; citizens design AMENDMENT 3).
  //
  // WHAT THE ARGUMENT RESTS ON, exactly: capacity being monotone. Both `mastery` and
  // `placed` are monotone, so every term `residenceFor` reads can only rise, so
  // `min(population, capacity)` can only rise. That still holds for every LEARNING
  // event, which is all that moved capacity when this was written. What breaks is the
  // universal reading — capacity never falls, full stop — because a crisis is a second
  // mover. When it falls below the population, `min` falls with it and the
  // highest-indexed housed citizens become `waiting`.
  //
  // THAT IS NOW THE INTENDED BEHAVIOUR AND THIS LINE ALREADY IMPLEMENTS IT. No clamp
  // and no throw is the correct shape: a departure is the mirror image of an arrival,
  // it displaces in exact reverse of arrival order, and because nothing here is
  // persisted (D-CIT1) restoring the ceiling returns a DEEP-EQUAL roster — the same
  // person, the same home, the same seeded look, with nothing replayed.
  //
  // WHAT IS STILL OWED, and it is not here: `capacity` is `residenceCapacity`, a sum
  // over SKILL NODES that no crisis may lower and that a purchased civic building adds
  // nothing to. The capacity the ruling's lever moves is the economy's `livability`,
  // and this function takes no economy input at all. Until those are reconciled the
  // ruling cannot reach this line. Do not wire it here on the way past — it changes
  // what `settled` means and it needs the no-eviction sweep's population widened from
  // learning advances to capacity reductions from any source, with a demonstrated red.
  // Tracked as O-20 in `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`.
  const housed = Math.min(population, capacity);

  const homeByIndex: (string | null)[] = new Array(population).fill(null);
  const residentsByNode = new Map<string, string[]>();
  let nextIndex = 0;
  for (const entry of ledger) {
    const residents: string[] = [];
    // Fill greedily, in the order the caller supplied the buildings (placement
    // order): a NEW building appends and draws only from people with no home, so it
    // cannot move an existing resident.
    while (residents.length < entry.residence_capacity && nextIndex < housed) {
      homeByIndex[nextIndex] = entry.node_id;
      residents.push(citizenId(nextIndex));
      nextIndex += 1;
    }
    residentsByNode.set(entry.node_id, residents);
  }

  // DAYTIME destinations go to HOUSED citizens only, in the same index order. The
  // waiting crowd gathers at the Civic Center and holds no seat, so the street never
  // looks emptier than the waiting count says. A housed citizen with no seat is out
  // and about (`visiting`), which is not a lesser state — it is a lawn, a doorstep,
  // a walk.
  const dayByIndex: (string | null)[] = new Array(population).fill(null);
  const visitorsByNode = new Map<string, string[]>();
  let nextDayIndex = 0;
  for (const entry of ledger) {
    const visitors: string[] = [];
    while (visitors.length < entry.daytime_capacity && nextDayIndex < housed) {
      dayByIndex[nextDayIndex] = entry.node_id;
      visitors.push(citizenId(nextDayIndex));
      nextDayIndex += 1;
    }
    visitorsByNode.set(entry.node_id, visitors);
  }

  const roleByNode = new Map<string, CitizenRoleId>(
    ledger.map((entry) => [entry.node_id, entry.role]),
  );

  const citizens: Citizen[] = [];
  const waiting: string[] = [];
  for (let index = 0; index < population; index += 1) {
    const id = citizenId(index);
    const home = homeByIndex[index] ?? null;
    const day = dayByIndex[index] ?? null;
    let state: CitizenState;
    if (home === null) {
      state = "waiting";
      waiting.push(id);
    } else if (day === null) {
      state = "housed";
    } else {
      const role = roleByNode.get(day);
      const dayState = role === undefined ? "visiting" : dayStateFor(role);
      state = dayState === "housed" ? "visiting" : dayState;
    }
    citizens.push({
      id,
      state,
      home_node_id: home,
      day_node_id: home === null ? null : day,
      look: lookFor(input.seed, index),
    });
  }

  const buildings: CitizenBuildingOccupancy[] = ledger.map(
    (entry: CitizenBuildingLedger) => ({
      node_id: entry.node_id,
      role: entry.role,
      residence_capacity: entry.residence_capacity,
      residents: residentsByNode.get(entry.node_id) ?? [],
      daytime_capacity: entry.daytime_capacity,
      visitors: visitorsByNode.get(entry.node_id) ?? [],
    }),
  );

  // The BOUGHT half of the city, appended after the earned half so the skill
  // buildings' order — the one the home assignment above walked — is untouched. Role
  // only, no capacity and no occupants; see `CitizenRosterInput.civic` for why a
  // livability contribution is not a doorstep.
  for (const entry of input.civic ?? []) {
    buildings.push({
      node_id: entry.placement_id,
      role: entry.citizen_role,
      residence_capacity: 0,
      residents: [],
      daytime_capacity: 0,
      visitors: [],
    });
  }

  return {
    population,
    residence_capacity: capacity,
    daytime_capacity: daytime,
    housed,
    buildings,
    citizens,
    waiting,
    settled:
      ledger.length > 0 && waiting.length === 0 && ledger.every((entry) => entry.mastered),
  };
}
