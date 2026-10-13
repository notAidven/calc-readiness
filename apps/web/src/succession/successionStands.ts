/**
 * **WHERE THE DISTRICTS ARE DRAWN, AND WHY THAT IS ALLOWED TO EXIST AT ALL.**
 *
 * Era four's model has no positions: *"a district has no position, no extent and no
 * neighbours"*, and an allegiance is decided by a global scalar rather than by anything about
 * any other district. A surface still has to put a plinth somewhere, and this is the file that
 * decides where. The two statements only stay compatible if the arrow points one way, so this
 * module is built to make the arrow structural rather than promised.
 *
 * ## THE THREE THINGS THAT MAKE IT ONE-WAY
 *
 *  1. **The only input is the drift order.** {@link successionStands} takes district ids in
 *     `exposure` order and a count. It cannot read an allegiance, a claim, a block or a bank,
 *     because none of them is a parameter — so no board state can move a plinth, and the forum
 *     a player sees in cycle one is the forum they see at the settle.
 *  2. **There is no inverse, and there is not going to be one.** Nothing here maps a place back
 *     to a district: no `standAt`, no nearest-stand lookup, no hit test. Picking a district is
 *     picking its ID — the scene puts the id in `userData` and the DOM puts it in a
 *     `data-district` attribute — so a click carries a name and never a place.
 *  3. **The layout is a PARAMETER.** {@link SuccessionForum} is handed in, defaulted to
 *     {@link SUCCESSION_FORUM}. That is not configurability for its own sake: it is what lets
 *     `successionSpatialityIsOneWay.test.ts` build the whole decision surface twice under two
 *     visibly different forums and require every decision to come back identical. A property
 *     nobody can inject is a property nobody has measured.
 *
 * ## WHAT THE ARRANGEMENT IS, AND WHY IT IS A FORUM AND NOT A MAP
 *
 * An arc of plinths around one open square, with each district's civic building set back behind
 * its own plinth and a run of boundary stones enclosing the pair. That is `wide-master.png`'s
 * own arrangement and it is chosen against the obvious alternative, which is a map: era four's
 * art brief is explicit that a boundary run *"must not read as a map with coloured
 * territories"* — the stones **enclose** and never **join**, and nothing fills what they
 * enclose.
 *
 * The arc also does the one job the drift order needs done. `exposure` is a total order and the
 * drift line names its lowest member, so the districts read left to right in exactly the order
 * they will decide in. That is an ordering rendered as an ordering, which is the honest picture
 * of a total order — and emphatically not a topology, because two plinths side by side on this
 * arc have no relationship whatever.
 */

/**
 * A place and a facing on the ground plane, in world units. **Drawing only.**
 *
 * There is no `district_id` on this type on purpose. A spot is where something is put; the
 * thing that knows which district it belongs to is {@link SuccessionStand}, which holds the id
 * beside its spots rather than letting a spot carry one around the scene graph where somebody
 * could be tempted to read it back off a raycast.
 */
export interface SuccessionSpot {
  readonly x: number;
  readonly z: number;
  /** Rotation about the up axis, radians, so a plinth faces the middle of the forum. */
  readonly turn: number;
}

/** One district's furniture: its plinth, its civic building, and the stones enclosing them. */
export interface SuccessionStand {
  readonly district_id: string;
  /** Where the plinth stands. A block waits at its foot; a figure goes up on its top face. */
  readonly plinth: SuccessionSpot;
  /** Where the district's one civic building stands, set back behind the plinth. */
  readonly civic: SuccessionSpot;
  /**
   * The boundary run: separate stones turning a corner round an area, closed, one every few
   * paces. **They enclose and never join** — nothing here returns a line, a band or a path
   * between two districts, which is the propagation separation stated as a return type.
   */
  readonly bounds: readonly SuccessionSpot[];
}

/**
 * The forum's shape. Every number is in world units except {@link SuccessionForum.sweep} and
 * {@link SuccessionForum.bearing}, which are radians.
 *
 * Handed in rather than baked so the permutation test can move it. See the header.
 */
export interface SuccessionForum {
  /** How far the arc of plinths stands from the middle of the forum. */
  readonly reach: number;
  /** How much of a turn the arc spans. The districts are spread evenly across it. */
  readonly sweep: number;
  /** Where the arc starts, measured the same way. */
  readonly bearing: number;
  /** How much further out than its plinth a district's civic building sits. */
  readonly setback: number;
  /** Half the width of one district's enclosed ground, across the arc. */
  readonly halfAcross: number;
  /** Half the depth of the same, along the arc's own outward line. */
  readonly halfDeep: number;
  /** Stones per side of the enclosure. Three is *"one every few modules"* at this size. */
  readonly stonesPerSide: number;
  /**
   * **HOW MUCH OPEN PAVING TWO DISTRICTS' RUNS LEAVE BETWEEN THEM.**
   *
   * A stone's own width plus a little, because a run is laid out as a centre line and the stones stand
   * ON it: two enclosures that merely fail to intersect can still put a stone of one within a stone's
   * width of a stone of the other, and two stones sharing a spot is the defect this exists to stop.
   * `successionScene.ts` draws a boundary stone 1.02 across, and it is deliberately not imported here
   * — nothing in this module opens `three`, for the reason `winterTones.ts` records — so this is the
   * one figure that has to be kept in step by hand. `successionForum.test.ts` measures the result
   * against the real stone on every authored board, which is what keeps the two honest.
   */
  readonly clear: number;
  /**
   * **THE SMALLEST AN ENCLOSURE MAY BE AND STILL STAND OUTSIDE THE PLINTH IT ENCLOSES.**
   *
   * Half the plinth's widest course plus half a stone — 0.975 plus 0.51 — rounded up. A run narrower
   * than this puts stones on the stonework, which reads as a plinth with rubble round its foot rather
   * than as a district with a boundary.
   *
   * It is a FLOOR where the spacing bounds below are a CEILING, and on the six-ward board the two
   * nearly meet: six plinths on this arc leave 4.75 between them and an enclosure needs 3.0 plus a
   * stone's width of clearance. That is the tightest authored board, and it is why the bounds are
   * derived per board rather than fixed.
   */
  readonly snug: number;
}

/**
 * **THE SHIPPED FORUM.**
 *
 * Sized against era four's own island rather than guessed: `eraBuildableRadius("classical")` is
 * 42 and the drawn ground reaches further, so a `reach` of 15 puts the arc well inside the
 * paving with the basin, the quay and the tree line still in frame at the crisis camera. The
 * sweep is a little over a third of a turn, which keeps six plinths — the longest authored
 * board — clear of each other at `halfAcross` without the arc closing into a ring; a ring would
 * put the far side of the board facing away from a camera that does not orbit during a crisis.
 */
export const SUCCESSION_FORUM: SuccessionForum = {
  /**
   * **THE ARC WRAPS THE OPEN SQUARE NOW, AND IT USED TO BE A ROW ACROSS THE BACK.**
   *
   * It was `reach: 13.5` over a `sweep` of 1.76, and both numbers were chosen to keep the
   * outermost plinth inside the strip the crisis panel leaves at 1024x580 — a fixed camera
   * cannot frame a wide arc in a 624px-wide canvas, so the arc was narrowed until it fitted.
   * That is the wrong end to solve it from, and the play-test frame says what it cost: six civic
   * buildings 6.1 across on 36.8 units of arc are all but touching, so the whole board came back
   * as *"cramped into this little batch"* in the upper corner of an empty disc.
   *
   * The frame is now fitted to the forum rather than the forum to the frame
   * (`forumFraming.ts`), which is `CityScene`'s own long-standing mechanism and takes the
   * viewport out of these numbers entirely. So the arc is sized by what the ARRANGEMENT needs:
   * `sweep * (reach + setback)` is 49 units of civic frontage for six buildings, which leaves
   * about two and a half units of open paving between neighbours instead of a hair.
   *
   * At 2.42 radians the arc is 139 degrees, so it reaches round past the sides and encloses the
   * open square rather than lining one edge of it — which is what `wide-master.png` draws and is
   * the difference between a forum and a terrace. The port, the basin and the planting hold the
   * open side; see `buildForumFurniture`.
   */
  reach: 13.4,
  sweep: 2.72,
  bearing: -1.36,
  /**
   * **THE SETBACK CAME IN, AND THE PORT IS WHY.**
   *
   * At 7.4 the civic buildings stood at a radius of 20.9 on a disc of 25, which left no clear
   * shoreline anywhere behind them — so the shut port had to stand either in front of the
   * buildings or inside them, and the version that shipped had it five units inside the paving
   * with no water beside it at all. At 5.1 the frontage is at 18.5 and there are six and a half
   * units of open rim behind the arc, which is a quay's worth.
   *
   * It costs the buildings nothing: 5.1 still sets each one a clear pace behind its own plinth's
   * enclosure, which is what a setback is for.
   */
  setback: 5.1,
  halfAcross: 2.7,
  halfDeep: 3.5,
  /**
   * **TWO, AND IT WAS THREE UNTIL A FRAME SAID OTHERWISE.**
   *
   * At three a side the long board carried seventy-two stones over one paved square, and
   * photographed at 1024x580 they read as rubble strewn across the floor rather than as a
   * deliberate enclosure — which is the *sacked city* confusion the art sheet calls this era's
   * costliest, arriving through the ground instead of through the buildings. Eight to a district
   * is *"one every few modules"*, which is what the brief asks for, and it leaves the corners as
   * the thing the eye reads.
   */
  stonesPerSide: 2,
  clear: 1.2,
  snug: 1.5,
};

/**
 * Evenly spaced turns across the arc, for `count` districts.
 *
 * A single district sits at the middle of the sweep rather than at its start, which is the one
 * case an even division gets wrong: `two-and-the-forum` is three districts and every authored
 * board has at least three, but a caller with a real city may hand over one and a plinth pinned
 * to the arc's left end would look like a bug rather than like a board.
 */
function turnsAcross(forum: SuccessionForum, count: number): readonly number[] {
  if (count <= 1) {
    return [forum.bearing + forum.sweep / 2];
  }
  const step = forum.sweep / (count - 1);
  return Array.from({ length: count }, (_, index) => forum.bearing + index * step);
}

/** A spot out along one bearing from the middle of the forum, facing back into it. */
function outAlong(turn: number, out: number): SuccessionSpot {
  return {
    x: Math.sin(turn) * out,
    z: -Math.cos(turn) * out,
    // Faces the middle of the forum, which is where the player is looking from.
    turn: turn + Math.PI,
  };
}

/**
 * **THE BOUNDARY RUN FOR ONE DISTRICT: separate stones turning a corner round an area.**
 *
 * Built as four sides of a closed rectangle laid on the arc's own outward line and then rotated
 * into place, so every stone sits square to the paving's joints — which is what the art brief
 * asks for (*"set into the paving along one of its own joint lines"*) and is the reason the run
 * is not simply a circle of stones.
 *
 * The corners are shared rather than doubled: a run with two stones standing in the same place
 * reads as a mistake at the one moment the enclosure is meant to read as deliberate.
 */
function boundsAround(
  forum: SuccessionForum,
  turn: number,
  about: { readonly x: number; readonly z: number },
  halfAcross: number,
  halfDeep: number,
): readonly SuccessionSpot[] {
  const steps = Math.max(1, forum.stonesPerSide);
  const local: { readonly a: number; readonly d: number }[] = [];
  for (let index = 0; index < steps; index += 1) {
    const t = index / steps;
    // Anticlockwise from the near-left corner, so the four sides join without repeating one.
    local.push({ a: -halfAcross + 2 * halfAcross * t, d: -halfDeep });
    local.push({ a: halfAcross, d: -halfDeep + 2 * halfDeep * t });
    local.push({ a: halfAcross - 2 * halfAcross * t, d: halfDeep });
    local.push({ a: -halfAcross, d: halfDeep - 2 * halfDeep * t });
  }

  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return local.map(({ a, d }) => ({
    x: about.x + a * cos + d * sin,
    z: about.z + a * sin - d * cos,
    /*
     * **THE STONE IS SQUARE TO THE PAVING AND NOT TO THE RUN**, which is the art brief's own
     * instruction and is the opposite of what this returned before: *"each rotated to the flag joint
     * it sits on and NOT to the run's direction — a stone squared to the run reads as a fence post,
     * and a stone squared to the paving reads as set into the floor."*
     *
     * The RUN is still laid out on the district's own outward line — the rectangle above is rotated
     * by `turn` — so the enclosure is the district's and only the stones' own facing is the floor's.
     * That is the whole difference between a marker set into a pavement and a post driven into it.
     */
    turn: 0,
  }));
}

/**
 * **WHERE EVERY DISTRICT STANDS, from the drift order and the forum's shape and nothing else.**
 *
 * `districtIds` is expected in `exposure` order — `successionView` already sorts that way, so a
 * caller hands over `view.districts.map((district) => district.id)` and the arc reads in drift
 * order left to right.
 *
 * **It takes ids and not districts**, which is the smallest thing that makes the one-way rule
 * checkable by reading the signature: with a `SuccessionDistrictView[]` in hand this function
 * could branch on an allegiance and nobody would notice for a year.
 */
export function successionStands(
  districtIds: readonly string[],
  forum: SuccessionForum = SUCCESSION_FORUM,
): readonly SuccessionStand[] {
  const turns = turnsAcross(forum, districtIds.length);
  /**
   * **HOW WIDE ONE DISTRICT'S ENCLOSURE MAY BE, capped so two of them never overlap.**
   *
   * Read off the arc rather than fixed, and the reason is a frame: `six-wards` puts six plinths
   * across the same sweep four sit on, so a fixed half-width had neighbouring runs crossing each
   * other and the whole floor read as strewn cubes rather than as six enclosures. **They enclose
   * and never join**, and two runs that overlap have joined whatever the builder intended.
   *
   * The count is the only board fact this reads, and it is the same one the arc already reads:
   * how many districts there are to space out. Nothing here sees an allegiance, a claim or a
   * block.
   */
  /**
   * **HOW BIG ONE DISTRICT'S ENCLOSURE MAY BE, AND THE DEPTH IS BOUND TOO — WHICH IS THE HALF THIS
   * USED TO MISS.**
   *
   * Capping the width alone is not enough, and a frame proved it. Each district's enclosure is a
   * rectangle laid on that district's own outward bearing, so two enclosures diverge going outward
   * and CONVERGE going inward — and the depth is what carries a run inward, toward the middle of the
   * forum where the arc is tightest. On the four-district board the neighbouring bearings are 34
   * degrees apart, and two runs 7.9 apart that each reach 3.5 inward crossed at their corners
   * whatever their width.
   *
   * Photographed on the `divided` board it is unmistakable, and it is close to the worst thing this
   * crisis could draw: **a chevron stone and a ring stone standing in the same place**, which is two
   * districts' claims occupying one spot. It was invisible for as long as every named board carried
   * one claimant, because two stones in one place with the same mark look like one stone.
   *
   * So both halves are bounded, and the bound is ANGULAR rather than circular, because that is the
   * shape the arrangement actually has: at radius `r` two neighbouring bearings are `r * gap` apart,
   * so two runs clear each other at the innermost radius either of them reaches. Each bound is
   * computed against the other half at its FLOOR, so neither is a function of the other and there is
   * nothing circular to resolve.
   */
  const gap =
    districtIds.length > 1
      ? Math.abs(forum.sweep) / (districtIds.length - 1)
      : Number.POSITIVE_INFINITY;
  const room = (forum.reach - forum.snug) * gap;
  const halfAcross = Math.max(
    forum.snug,
    Math.min(forum.halfAcross, (room - forum.clear) / 2),
  );
  const halfDeep = Math.max(
    forum.snug,
    Math.min(forum.halfDeep, forum.reach - (2 * halfAcross + forum.clear) / gap),
  );

  return districtIds.map((id, index) => {
    const turn = turns[index] as number;
    const plinth = outAlong(turn, forum.reach);
    const civic = outAlong(turn, forum.reach + forum.setback);
    /*
     * THE RUN ENCLOSES THE PLINTH, and it used to enclose the midpoint between the plinth and
     * the civic building. That is the more literal reading of "this ground is that district's"
     * and it is the less legible one: photographed at 1024x580 the enclosures were long, their
     * corners were far apart, and over four districts the stones read as rubble strewn across
     * the paving rather than as four deliberate rectangles — which is the sacked-city confusion
     * arriving through the ground. A compact run around the plinth reads as an enclosure at a
     * glance, which is what the marks on it are for.
     */
    return {
      district_id: id,
      plinth,
      civic,
      bounds: boundsAround(forum, turn, plinth, halfAcross, halfDeep),
    };
  });
}

/**
 * The stands, keyed by district id, for a caller drawing one district at a time.
 *
 * A map from ID to place, and deliberately never the other way round — see the header's second
 * point. If you find yourself wanting the inverse, what you want is the id, and the scene node
 * or the DOM element you are holding already has it.
 */
export function successionStandsById(
  districtIds: readonly string[],
  forum: SuccessionForum = SUCCESSION_FORUM,
): ReadonlyMap<string, SuccessionStand> {
  return new Map(
    successionStands(districtIds, forum).map((stand) => [stand.district_id, stand]),
  );
}
