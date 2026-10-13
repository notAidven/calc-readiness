import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CUT_MARK_NAME } from "../city/three/successionMarks";
import {
  BOUNDARY_STONE_NAME,
  BOUNDARY_STONE_PROUD,
  BOUNDARY_STONE_SPAN,
  buildBoundaryStone,
  buildCivicBuilding,
  buildClaimPost,
  CIVIC_FABRIC_NAME,
  CIVIC_NAME,
  CLAIM,
  CLAIM_POST_NAME,
  FIGURE_NAME,
  OPENING_BAR_NAME,
  PLINTH_HEIGHT,
  SHUTTER_NAME,
} from "../city/three/successionScene";
import { SUCCESSION_SCENE_TONES as S } from "../city/three/successionTones";
import { buildDistrict, buildForum } from "./successionForum";
import { SUCCESSION_SCENARIOS } from "./successionScenarios";
import { successionStands } from "./successionStands";
import { successionView } from "./successionView";

/**
 * **ASSET 4, AND THE ONLY THING THE WHOLE ASSET READS IS THE OPENING SET.**
 *
 * Claude Design's third pass rebuilt this asset after the first version was measured and failed.
 * The old rule fixed a marble plate to a wall plane containing the principal door;
 * `scripts/measure-era4-frontage.mjs` found that unsatisfiable on four of era four's ten claimable
 * buildings, found **three of the ten with no door at all**, and found the plate wider than the
 * entrance on all ten. So the mark came off the wall.
 *
 * **Those two counts are separate, and the sheet joins them wrongly.** Asset 4 says *"four of ten
 * fail, three of those because there is no door to be beside"*, and read against
 * `docs/design-refs/era4-frontage/frontage-measurements.json` the four failures are the Cottages,
 * the Fountain, the Barracks and the Customs House — of which **two** are doorless, because the
 * third doorless building, the Wine Cellars, passes the reach test. The sheet's own other sentence,
 * *"three of ten claimable buildings have no door"*, is the true one. Written out here because the
 * sheet's author asks for it: *"treat any 'N of these' sentence as the least trustworthy line on the
 * page"*, and this is the fourth such slip across the three rounds.
 *
 * What replaced it is a free-standing post at the plot's front corner, and the reason the rebuild
 * is *"the piece to review hardest"* is that it moves the asset's dependencies rather than its
 * numbers. This file holds what is left to assert, and it is deliberately short, because the point
 * of the rebuild is that there is less to assert:
 *
 *  1. the post is sized off the **wall** and placed off the **plot**, and reads nothing else;
 *  2. it carries the mark on **all four faces**, because the camera orbits;
 *  3. a contested building has **openings to shutter**, or `contested` would be invisible;
 *  4. the fabric's outline is **identical in all three states**, which is *shuttered against
 *     sacked* made measurable rather than judged;
 *  5. the post and a **boundary stone** read apart, which is the confusion the post creates and
 *     the one the sheet's own author most wanted measured.
 *
 * **Every one of these was watched go red.** The four-face sweep fails at *"reads at every
 * heading"* with three faces; the fabric comparison fails at *"the fabric's outline is unchanged"*
 * the moment a board is added inside the fabric group; the separation fails at *"upright against
 * set-in"* when the post is shortened to a stone's proud height. What none of them can do is say
 * whether the two objects LOOK different at 1024x580, which is why
 * `docs/design-refs/era4-claim-post/` holds the frames as well.
 */

/* -------------------------------------------------------------------------- */
/* Reading a built group                                                      */
/* -------------------------------------------------------------------------- */

function allNamed(group: THREE.Object3D, name: string): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  group.traverse((child) => {
    if (child.name === name) {
      found.push(child);
    }
  });
  return found;
}

function firstNamed(group: THREE.Object3D, name: string): THREE.Object3D {
  const found = allNamed(group, name)[0];
  if (!found) {
    throw new Error(`nothing named ${name} in ${group.name}`);
  }
  return found;
}

/** The world-space box of everything under an object, with its own transform applied. */
function boxOf(object: THREE.Object3D): THREE.Box3 {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object);
}

/**
 * Names, geometry sizes and tones, with every place stripped out — the same instrument
 * `successionForum.test.ts` uses, for the same reason. Two posts that fingerprint the same are two
 * posts drawn as one picture, wherever they were put.
 */
function fingerprint(group: THREE.Object3D): string {
  const parts: string[] = [];
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      parts.push(`group:${child.name}`);
      return;
    }
    mesh.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    mesh.geometry.boundingBox?.getSize(size);
    parts.push(
      [
        mesh.name,
        size
          .toArray()
          .map((one) => one.toFixed(4))
          .join("/"),
        (mesh.material as THREE.MeshStandardMaterial).color.getHexString(),
      ].join("|"),
    );
  });
  return parts.join("\n");
}

function districtsOf(scenarioId: string) {
  const scenario = SUCCESSION_SCENARIOS.find((entry) => entry.id === scenarioId);
  if (!scenario) {
    throw new Error(`no scenario "${scenarioId}"`);
  }
  return successionView(scenario.build()).districts;
}

/** The wall the forum's own civic building carries, which is what the post is sized against. */
const CIVIC_WALL = 2.5;

/* -------------------------------------------------------------------------- */
/* 1 · sized off the wall, placed off the plot, reading nothing else          */
/* -------------------------------------------------------------------------- */

describe("the claim post is sized off the wall and placed off the plot", () => {
  it("clamps its height into the band at every wall a model could hand it", () => {
    const post = CLAIM.POST;
    // Swept over wall heights no era-four model has as well as the ones it does, because the
    // clamp is the whole reason `wallHeight` may be anything: the measurement's fit scale varies
    // by more than 3x across this era, so a rule that trusted the number would be trusting the
    // widest-varying quantity in the set.
    for (const wall of [0, 0.4, 1.5, CIVIC_WALL, 3.4, 4.2, 12, 400]) {
      // Compared against the band with a float32 epsilon either side, because
      // `Box3.setFromObject` walks vertex positions through a float32 attribute: a clamp that
      // lands exactly on the ceiling comes back as 1.620000001192.
      const slop = 1e-6;
      const tall = boxOf(buildClaimPost("chevron", wall)).max.y;
      expect(tall, `a ${wall} wall gave a ${tall} post`).toBeGreaterThanOrEqual(
        post.hMin - slop,
      );
      expect(tall).toBeLessThanOrEqual(post.hMax + slop);
    }
    /*
     * And the band is a band rather than a constant: inside it the RATIO is what decides, so a
     * bigger building really does get a bigger post.
     *
     * The two walls below are chosen to land inside the band, which on this forum is narrow —
     * `[hMin, hMax]` is `[1.48, 1.62]`, because the sheet's floor scaled up to this world nearly
     * meets this world's own ceiling at the plinth's crown. Every civic building the crisis draws
     * today reports the same 2.5 wall and so clamps to the floor. That is worth knowing rather than
     * hiding: on this board the ratio is inert and the clamp is doing the work.
     */
    const small = boxOf(buildClaimPost("chevron", 3.6)).max.y;
    const large = boxOf(buildClaimPost("chevron", 3.8)).max.y;
    expect(small).toBeLessThan(large);
    expect(large).toBeCloseTo(3.8 * post.hRatio, 6);
    // And the ceiling really is the plinth's crown, so nothing on the paving can reach the height
    // allegiance is drawn at.
    expect(post.hMax).toBeLessThan(PLINTH_HEIGHT);
  });

  it("is 0.40 square on the shaft under a cap that oversails all round", () => {
    const post = buildClaimPost("chevron", CIVIC_WALL);
    const shaft = boxOf(firstNamed(post, `${CLAIM_POST_NAME}-core`));
    const cap = boxOf(firstNamed(post, `${CLAIM_POST_NAME}-cap`));

    // The whole post, skin included, is `side` across; the core is the skin's own thickness in
    // from it on both faces, which is what makes the groove a groove.
    expect(boxOf(post).max.x - boxOf(post).min.x).toBeCloseTo(
      CLAIM.POST.side + CLAIM.POST.capOver * 2,
      6,
    );
    expect(shaft.max.x - shaft.min.x).toBeCloseTo(CLAIM.POST.side - CLAIM.POST.cut * 2, 6);
    // A cap, because an uncapped square post reads as an offcut standing on end. It has to
    // OVERSAIL to read as one, so the assertion is about the overhang and not about its presence.
    expect(cap.max.x - cap.min.x).toBeGreaterThan(CLAIM.POST.side);
    expect(cap.min.y).toBeCloseTo(shaft.max.y, 6);
  });

  it("is drawn identically whatever the fabric it stands beside does", () => {
    // The claim the rebuild rests on. `bays` changes the plot's width, its column count, its roof
    // and its opening set, and changes nothing about the wall — so if the post is genuinely sized
    // off the wall and placed off the plot rectangle, its PICTURE cannot move at all and its
    // PLACE can only move with the plot's own corner.
    const built = [1, 3, 5, 9].map((bays) => ({
      bays,
      civic: buildCivicBuilding({ claim: "claimed", mark: "chevron", bays }),
    }));

    const prints = new Set(
      built.map((one) => fingerprint(firstNamed(one.civic, CLAIM_POST_NAME))),
    );
    expect(
      prints.size,
      "the post is drawn differently for different buildings, so it is reading one",
    ).toBe(1);

    // And its corner really does move with the plot, so the invariance above is not the invariance
    // of an object nailed to the origin.
    const corners = built.map((one) => firstNamed(one.civic, CLAIM_POST_NAME).position.x);
    expect(new Set(corners).size).toBe(built.length);
    for (const [index, one] of built.entries()) {
      // The plot's own front-left corner, stood off by the ruled inset. Written as the plot
      // arithmetic rather than as a literal, because the plot rectangle IS the placement rule.
      const plotHalf = (one.bays * 1.15) / 2;
      expect(corners[index]).toBeCloseTo(-(plotHalf + CLAIM.POST.inset), 6);
    }
  });

  it("stands clear of the podium it is placed beside, on the paving", () => {
    const civic = buildCivicBuilding({ claim: "claimed", mark: "ring" });
    const post = firstNamed(civic, CLAIM_POST_NAME);
    const podium = firstNamed(civic, `${CIVIC_NAME}-podium`);
    const postBox = boxOf(post);
    const podiumBox = boxOf(podium);

    // Free-standing is the whole asset, so it has to be measurably free: no overlap with the
    // plot's own stonework in either ground axis, and its foot on the paving rather than on the
    // podium's top.
    expect(postBox.max.x).toBeLessThan(podiumBox.min.x);
    expect(postBox.min.z).toBeGreaterThan(podiumBox.max.z);
    expect(postBox.min.y).toBeCloseTo(0, 6);
  });
});

/* -------------------------------------------------------------------------- */
/* 2 · the mark is on all four faces                                          */
/* -------------------------------------------------------------------------- */

describe("the mark is cut into all four faces, because the camera orbits", () => {
  it("cuts one face per quarter turn, for both marks", () => {
    for (const mark of ["chevron", "ring"] as const) {
      const post = buildClaimPost(mark, CIVIC_WALL);
      const faces = allNamed(post, `${CUT_MARK_NAME}-upright`);
      expect(faces, `${mark}: a post that reads at only some headings`).toHaveLength(4);

      // The four are the four quarter turns and not four copies of one heading, which is what a
      // loop that forgot to advance its angle would produce — and which would look exactly like a
      // working post from the one heading somebody photographed.
      const headings = faces.map((face) =>
        Number(
          (((face.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)).toFixed(6),
        ),
      );
      expect([...headings].sort((a, b) => a - b)).toEqual(
        [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((one) => Number(one.toFixed(6))),
      );
      for (const face of faces) {
        expect(face.userData.mark).toBe(mark);
      }
    }
  });

  it("gives the ring's groove and its enclosed disc one centre", () => {
    // The defect `ringHole`'s centre argument exists to prevent, and it is worth an assertion
    // because it produces a mark that is subtly wrong rather than obviously broken: a ring cut
    // high on the shaft while the stone it encloses sits at the face's middle reads as a hole with
    // a lump under it.
    const post = buildClaimPost("ring", CIVIC_WALL);
    const face = allNamed(post, `${CUT_MARK_NAME}-upright`)[0] as THREE.Object3D;
    const island = firstNamed(face, `${CUT_MARK_NAME}-island`);
    const shaft = boxOf(firstNamed(post, `${CLAIM_POST_NAME}-core`));

    // High on the shaft, at the ruled fraction, and the enclosed disc is there too.
    expect(island.position.y).toBeCloseTo(
      (shaft.max.y - shaft.min.y) * CLAIM.POST.markUp,
      6,
    );
    // Standing at the face's own full depth, which is what makes it untouched stone rather than a
    // second groove: its front face is level with the skin's outer surface.
    expect(island.position.z + CLAIM.POST.cut / 2).toBeCloseTo(CLAIM.POST.side / 2, 6);
  });

  it("draws the post in marble over a groove core, and nothing in it is a character", () => {
    const post = buildClaimPost("chevron", CIVIC_WALL);
    const tones = new Set<number>();
    post.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        tones.add((mesh.material as THREE.MeshStandardMaterial).color.getHex());
      }
    });
    // Two tones and no third. The cut reads on VALUE — the groove core is the stone 44 percent
    // down — so it survives the shadowed quarter of the orbit without anything being lit from
    // inside, which is question 4's refusal: the only emissive in era four is the proposal's.
    expect([...tones].sort()).toEqual([S.CUT_SHADOW, S.MARBLE].sort());
  });
});

/* -------------------------------------------------------------------------- */
/* 3 and 4 · the openings, and the outline that does not change               */
/* -------------------------------------------------------------------------- */

describe("a contested building loses its openings and keeps its outline", () => {
  it("boards every opening but the widest, and bars that one", () => {
    const contested = buildCivicBuilding({ claim: "contested", mark: "chevron" });
    const boards = allNamed(contested, SHUTTER_NAME);
    const rails = allNamed(contested, `${OPENING_BAR_NAME}-rail`);

    // A floor first, because every claim below holds trivially over an empty frontage — and an
    // empty frontage is the failure the sheet's own `assertClaimable` names: a building with no
    // openings to shutter is a building whose `contested` state is invisible.
    expect(boards.length, "nothing was boarded, so contested is invisible").toBeGreaterThan(
      8,
    );
    expect(rails).toHaveLength(CLAIM.BAR.rails);

    // THE REGULARITY IS THE TELL. Salvage is never the same size twice; this is one width, one
    // thickness, and one length per opening. Measured over every board rather than the first.
    const sizes = new Set(
      boards.map((board) => {
        const size = new THREE.Vector3();
        (board as THREE.Mesh).geometry.computeBoundingBox();
        (board as THREE.Mesh).geometry.boundingBox?.getSize(size);
        return `${size.x.toFixed(4)}x${size.z.toFixed(4)}`;
      }),
    );
    expect([...sizes]).toEqual([
      `${CLAIM.BOARD.across.toFixed(4)}x${CLAIM.BOARD.thick.toFixed(4)}`,
    ]);

    /*
     * AND THE BAR IS ON THE WIDEST OPENING, which is the ruling that replaced *"the door"*.
     *
     * Read off the opening set rather than off a rail's span, because measuring the rail cannot
     * make the distinction: every opening on this building is wide enough for a rail, so a bar on
     * the wrong one produces a perfectly plausible rail. What is asserted is that the barred width
     * is the maximum of the set AND that it is strictly greater than every other member, so a tie
     * — which is what a colonnade of equal bays would give, and the reason this building has a
     * doorway at all — fails here rather than being resolved arbitrarily.
     */
    const openings = contested.userData.openings as number[];
    const barred = contested.userData.barred as number;
    expect(openings.length).toBeGreaterThan(4);
    expect(barred).toBe(Math.max(...openings));
    expect(openings.filter((one) => one >= barred)).toHaveLength(1);

    // The rails span that opening plus the ruled overhang, so the bar reads as fixed ACROSS the
    // opening rather than fitted inside it.
    const railWide = boxOf(rails[0] as THREE.Object3D);
    expect(railWide.max.x - railWide.min.x).toBeCloseTo(barred + CLAIM.BAR.over, 6);
  });

  it("leaves the fabric's outline byte-identical in all three claim states", () => {
    // **Shuttered against sacked is the costliest confusion in the batch**, and it separates on
    // silhouette against fabric — so the assertion is that the fabric has not moved at all, which
    // is stronger than the sheet's "to within the boards' 0.13 proud" and is available because the
    // claim furniture is a sibling of the fabric rather than a child of it.
    const states = (["unclaimed", "claimed", "contested"] as const).map((claim) =>
      buildCivicBuilding({ claim, mark: claim === "unclaimed" ? null : "chevron" }),
    );
    const fabrics = states.map((civic) => firstNamed(civic, CIVIC_FABRIC_NAME));

    const prints = new Set(fabrics.map((fabric) => fingerprint(fabric)));
    expect(
      prints.size,
      "the building's own fabric changes between claim states, so a claim is damage",
    ).toBe(1);

    const boxes = fabrics.map((fabric) => boxOf(fabric));
    for (const measured of boxes) {
      expect(measured.min.toArray()).toEqual((boxes[0] as THREE.Box3).min.toArray());
      expect(measured.max.toArray()).toEqual((boxes[0] as THREE.Box3).max.toArray());
    }

    // The column count is part of the outline and it is the tell a sacked building gives first, so
    // it is asserted separately rather than trusted to the box: a fallen column can leave a
    // bounding box untouched.
    const columns = fabrics.map(
      (fabric) => allNamed(fabric, `${CIVIC_NAME}-column`).length,
    );
    expect(new Set(columns).size).toBe(1);
    expect(columns[0]).toBeGreaterThan(4);

    // And the roofline. Nothing in this crisis puts a gap in one.
    for (const fabric of fabrics) {
      expect(allNamed(fabric, `${CIVIC_NAME}-roof`)).toHaveLength(1);
    }
  });

  it("puts nothing a claim adds inside the fabric group", () => {
    // The structural half of the claim above, and the direction that keeps it true: the guard is
    // only as good as the split, and a board added to the fabric group by mistake would make the
    // comparison above measure the boards instead of the building.
    const contested = buildCivicBuilding({ claim: "contested", mark: "ring" });
    const fabric = firstNamed(contested, CIVIC_FABRIC_NAME);
    for (const name of [SHUTTER_NAME, OPENING_BAR_NAME, CLAIM_POST_NAME]) {
      expect(allNamed(fabric, name), `${name} is inside the fabric`).toHaveLength(0);
      expect(allNamed(contested, name).length, `${name} is missing`).toBeGreaterThan(0);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 5 · the post against a boundary stone                                      */
/* -------------------------------------------------------------------------- */

describe("the claim post and a boundary stone read apart", () => {
  it("separates them on upright against set-in, measured off both objects", () => {
    const post = boxOf(buildClaimPost("chevron", CIVIC_WALL));
    const stone = boxOf(buildBoundaryStone("chevron"));

    /*
     * The confusion is real and it is worth stating before the numbers: both are pale stone
     * standing on the paving carrying the same cut mark. What the sheet separates them on is
     * SILHOUETTE, because that is the channel that survives zoom-out where hue does not.
     *
     * **PROUD, NOT TALL, and the difference is the whole word "set-in".** A stone's box reaches
     * below `y = 0` by `BOUNDARY_STONE_SUNK`, so its box HEIGHT counts stone nobody can see. What
     * a player is separating is what stands above the paving.
     */
    const postTall = post.max.y;
    // The SHAFT's width, because the shaft is what carries the upright read and the cap is a head
    // on it rather than part of the column.
    const postWide = CLAIM.POST.side;
    const stoneProud = stone.max.y;
    const stoneWide = stone.max.x - stone.min.x;

    // The cap oversails the shaft, so the upright has a head rather than a sawn end.
    expect(post.max.x - post.min.x).toBeGreaterThan(postWide);
    // Squat-in-the-floor against upright-on-the-floor.
    expect(
      stoneWide / stoneProud,
      "the stone is not wider than it is proud",
    ).toBeGreaterThan(1.8);
    expect(postTall / postWide, "the post is not taller than it is wide").toBeGreaterThan(
      1.8,
    );
    /*
     * And by a margin rather than a hair: the post stands more than twice a stone's proud height.
     *
     * **THIS MARGIN IS THINNER THAN THE SHEET'S AND THAT IS WORTH KNOWING.** The sheet's stone is
     * 0.62 by 0.28 proud against a 0.90-to-1.80 post, which is 3.2x to 6.4x. The shipped stone is
     * 1.02 by 0.49, because it was sized against a frame at the forum's own camera rather than at
     * the sheet's inspection distance, so the ratio here is nearer 2.1x. The inversion is the same
     * and the headroom is not, which is exactly why this claim owes a rendered frame as well as
     * this line — `docs/design-refs/era4-claim-post/`.
     */
    expect(postTall).toBeGreaterThan(stoneProud * 2);
    // In plan the relationship inverts, which is the second half of the same read: the wide thing
    // is low and the narrow thing is tall.
    expect(stoneWide).toBeGreaterThan(postWide);
    expect(stoneProud).toBeCloseTo(BOUNDARY_STONE_PROUD, 6);
    expect(stoneWide).toBeCloseTo(BOUNDARY_STONE_SPAN, 6);
  });

  it("puts the stone's mark on its top face and the post's on its sides", () => {
    // The confirmation behind the silhouette, and it is a fact about the construction rather than
    // about the proportions: a top-face cut has a groove FLOOR under it, an upright cut has a core
    // BEHIND it. So the two objects cannot be told apart wrongly by a guard that only measured
    // boxes.
    const stone = buildBoundaryStone("ring");
    expect(allNamed(stone, `${CUT_MARK_NAME}-floor`)).toHaveLength(1);
    expect(allNamed(stone, `${CUT_MARK_NAME}-upright`)).toHaveLength(0);

    const post = buildClaimPost("ring", CIVIC_WALL);
    expect(allNamed(post, `${CUT_MARK_NAME}-floor`)).toHaveLength(0);
    expect(allNamed(post, `${CUT_MARK_NAME}-upright`)).toHaveLength(4);
  });

  it("puts a stone in a run and a post alone, in every state of every board", () => {
    // The other confirmation, and the one only a whole board can carry: a boundary stone is always
    // one of a run and a post is always by itself. Swept over every named scenario rather than one,
    // because a state nobody photographed is exactly where a second post would appear.
    expect(SUCCESSION_SCENARIOS.length).toBeGreaterThanOrEqual(6);
    let claimed = 0;
    for (const scenario of SUCCESSION_SCENARIOS) {
      const view = successionView(scenario.build());
      const stands = successionStands(view.districts.map((district) => district.id));
      for (const [index, district] of view.districts.entries()) {
        const stand = stands[index];
        if (!stand) {
          continue;
        }
        const group = buildDistrict(district, stand);
        const posts = allNamed(group, CLAIM_POST_NAME);
        const stones = allNamed(group, BOUNDARY_STONE_NAME);
        expect(stones.length, `${scenario.id}/${district.id}`).toBeGreaterThanOrEqual(8);
        if (district.claim === "unclaimed") {
          expect(posts, `${scenario.id}/${district.id} is unclaimed`).toHaveLength(0);
          continue;
        }
        // One, unless the plan is re-cutting the mark — in which case the second is the ghost of
        // the one arriving, which is the proposal grammar rather than a second object.
        const solid = posts.filter((one) => one.userData.proposed !== true);
        expect(
          solid,
          `${scenario.id}/${district.id} has ${solid.length} posts`,
        ).toHaveLength(1);
        claimed += 1;
      }
    }
    // A floor, because every claim above passes over a board with nothing claimed on it.
    expect(claimed, "no district on any board is claimed").toBeGreaterThanOrEqual(4);
  });

  it("never lets a post reach the height a claimant's figure starts at", () => {
    // The post's other neighbour: both are single uprights, so they separate on reach. A figure's
    // lowest stone stands on a plinth's crown and a post's highest is its cap, and the two never
    // meet — measured on a real board rather than argued from the clamp, because the clamp's own
    // ceiling is close enough to a plinth's height to be worth checking against the board that
    // ships.
    const districts = districtsOf("mixed");
    const stands = successionStands(districts.map((district) => district.id));
    let compared = 0;
    for (const [index, district] of districts.entries()) {
      const stand = stands[index];
      if (!stand || district.figure === "none" || district.claim === "unclaimed") {
        continue;
      }
      const group = buildDistrict(district, stand);
      const post = boxOf(firstNamed(group, CLAIM_POST_NAME));
      const figure = boxOf(firstNamed(group, FIGURE_NAME));
      expect(post.max.y, `${district.id}: the post reaches the figure`).toBeLessThan(
        figure.min.y,
      );
      compared += 1;
    }
    expect(compared, "no district carries both a figure and a post").toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* And the whole board still holds together                                   */
/* -------------------------------------------------------------------------- */

describe("every claimable building on every board can say what it needs to", () => {
  it("gives every contested building openings to shutter and a bar to differ", () => {
    // The sheet's own `assertClaimable`, which is two invariants where the old rule had four. A
    // building with no openings would draw `contested` as nothing at all, which is the one way
    // this asset can fail silently.
    let contested = 0;
    for (const scenario of SUCCESSION_SCENARIOS) {
      const forum = buildForum(successionView(scenario.build()));
      for (const district of successionView(scenario.build()).districts) {
        if (district.claim !== "contested") {
          continue;
        }
        contested += 1;
      }
      for (const civic of allNamed(forum, CIVIC_NAME)) {
        if (civic.userData.claim !== "contested") {
          continue;
        }
        expect(
          allNamed(civic, SHUTTER_NAME).length,
          `${scenario.id}: a contested building with nothing boarded`,
        ).toBeGreaterThan(8);
        expect(allNamed(civic, OPENING_BAR_NAME)).toHaveLength(1);
      }
    }
    expect(contested, "no board reaches a contested building").toBeGreaterThanOrEqual(1);
  });
});
