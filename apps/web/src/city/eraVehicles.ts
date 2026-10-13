import { WALK_SPEED_UNITS_PER_SEC } from "@cr/game";
import type { EraId } from "@cr/skill-graph";

/**
 * PER-ERA ROAD VEHICLES — what moves along the roads the player paid for, era by era.
 *
 * Authority: `docs/superpowers/specs/2026-08-01-era-vehicles-and-city-life.md` §2 (the
 * ten forms), §4.2 (how big), §4.3 (how fast) and §6 (the two tuning constants). That
 * document exists because the lead refused the engineering framing of the backlog item:
 * *"not the carts, those need to be designed."* **Nothing here re-decides any of it.**
 *
 * ## WHY THIS IS A TABLE AND NOT A CART
 *
 * The backlog recommended *"era one's vehicle is a handcart"*. Era one's own style guide
 * bans the wheeled cart in as many words (`eras/era-01-prehistoric/style-guide.md:899`),
 * reserves the wheel for era two (`:224`), and era two then reserves TRANSPORT for era
 * three (`era-02:305-306`). So a constant with one renderer attached would have shipped an
 * anachronism into the only era a learner can reach. **Era one's vehicle is a dragged hide
 * sled**, and the ten forms differ enough that a shared "vehicle" mesh is not a thing that
 * exists.
 *
 * ## WHAT AN ERA WITH NO ROW DOES: NOTHING, AND THAT IS THE POINT
 *
 * `Partial`, exactly as `ERA_ROAD_SURFACING` and `ERA_ISLAND_GROUND` are, but with the
 * OPPOSITE fallback, and the difference is the whole reason this table is safe to ship one
 * row at a time. A road tile the player paid for cannot render nothing, so
 * `roadSurfacing()` degrades to bare earth. A vehicle is not paid for and not owed, so an
 * era with no authored form gets **no vehicle at all** rather than a borrowed one: era
 * one's sled hauled across era eight's asphalt is the same defect as a car on era one's
 * earth path, and the fallback that avoids both is the empty one. {@link vehicleForEra}
 * returns `null`, `Vehicles.tsx` renders an empty group, and `eraVehicles.test.ts` holds
 * the census in both directions so a later era cannot be quietly forgotten OR quietly
 * dressed in a neighbour's vehicle.
 *
 * ## THE PIGMENT IS NOT HERE
 *
 * Same division D-ERA30 already made for the road surface, where the courses are code and
 * the colour is authored per era: this table holds the MECHANISM (which form, how fast, how
 * big) and `three/Vehicles.tsx` owns the geometry and the tones. Era one's tones cost
 * nothing because they already ship — `ERA_ONE_PROP_TONES` holds `timber`, `hide`,
 * `hideDark` and `cord`, which is the whole sled.
 */

/**
 * Which form an era's vehicle takes. One member per AUTHORED era, so the renderer switches
 * exhaustively and a form added to the table is a compile error until it is drawn — the
 * same D-ERA28 rule `RoadCourse["kind"]` uses, and for the same reason: a vehicle that
 * typechecks and silently renders nothing is worse than one that fails the build.
 *
 * The nine unauthored eras contribute no member. Their forms are designed (§2.2 to §2.10)
 * and none is built, so there is nothing for a `kind` to name yet.
 */
export type VehicleKind = "hide-sled";

export interface VehicleForm {
  readonly kind: VehicleKind;
  /**
   * The design vocabulary's name for it. **Never learner-visible**: a vehicle is inside
   * the `aria-hidden` canvas, is not a click target and has no accessible name (§6.3), so
   * this reaches code and review and no player.
   */
  readonly label: string;
  /**
   * How fast it travels, world units per second.
   *
   * **THE MOTION RULE (§4.3): no moving thing in the city ever travels faster than a
   * citizen walks**, so this is `<= WALK_SPEED_UNITS_PER_SEC` for every era, forever, and
   * `eraVehicles.test.ts` asserts the inequality over the whole table. The rule
   * deliberately inverts the real world — era ten's drone is no faster than era one's sled
   * — because a city whose traffic speeds up era by era has urgency built into its
   * progression, which `Game_Visual_Design_Brief.md` §2 refuses.
   */
  readonly speedUnitsPerSec: number;
  /** Length along the route. §4.2: 2.6u to 3.4u, so it reads at full zoom-out and still
   *  sits inside one 4u cell. */
  readonly length: number;
  /** Width across the route. §4.2 holds era one's to the 1.68u TREAD it wore, not the
   *  2.64u verge, because a dragged thing sits in the track it made. */
  readonly bodyWidth: number;
  /** Total height. §4.2 caps every vehicle at 2.0u, under half era one's shortest
   *  building (the Roundhouse, 4.821u), so a vehicle can never compete with a
   *  silhouette. */
  readonly height: number;
}

/**
 * ERA ONE, PREHISTORIC: THE HIDE SLED. §2.1, and it is **INVENTED inside an explicit
 * ban** — the guide says three times what era one's vehicle cannot be and never says what
 * it is, so this form is owed Evan's approval (§8 items 1 and 7) in a way the nine
 * transcribed forms are not.
 *
 * Two poles converging to a blunt point at the leading end, three cross-battens lashed
 * across them, a hide bundle corded down over the battens, hauled by one figure at the
 * point. The nose lifts and the tail drags, so the silhouette is a wedge with a lump on
 * it, tilted, low — one dominant mass plus one thing that breaks the outline, which is the
 * Art Bible's building rule applied to something 16 by 11 px at full zoom-out.
 *
 * **1.1 u/s rather than the 1.6 ceiling**, per §4.3: a hauled load is visibly working, and
 * nothing in the city goes slower than 1.0 because below that an object reads as stuck.
 */
const HIDE_SLED: VehicleForm = {
  kind: "hide-sled",
  label: "the hide sled",
  speedUnitsPerSec: 1.1,
  length: 3.0,
  bodyWidth: 1.6,
  height: 1.85,
};

/**
 * THE TABLE. One row, and the nine absences are load-bearing rather than unfinished
 * business: see the header for what an era with no row does and why that differs from
 * every other per-era table in the city.
 */
export const ERA_VEHICLES: Partial<Record<EraId, VehicleForm>> = {
  prehistoric: HIDE_SLED,
};

/** Whether this era has an AUTHORED vehicle, as opposed to no vehicle at all. */
export function hasAuthoredVehicle(eraId: EraId): boolean {
  return eraId in ERA_VEHICLES;
}

/**
 * The vehicle this era's roads carry, or `null` where the era has none. **Partial on
 * purpose** — see the header. A caller that gets `null` renders nothing.
 */
export function vehicleForEra(eraId: EraId): VehicleForm | null {
  return ERA_VEHICLES[eraId] ?? null;
}

/**
 * The ceiling the motion rule sets, re-exported under the name the rule is stated in so a
 * reader of this file does not have to go and find it. It is `@cr/game`'s citizen walking
 * speed, unchanged: the rule is that a vehicle is measured against a WALKER.
 */
export const VEHICLE_SPEED_CEILING = WALK_SPEED_UNITS_PER_SEC;
