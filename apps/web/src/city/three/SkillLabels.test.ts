import { getNode, getNodesByDomain } from "@cr/skill-graph";
import { afterEach, describe, expect, it, vi } from "vitest";
import { skillDisplayName } from "../../diagnostic/skillNames";
import { D1_SKILL_IDS } from "../buildingAssets";
import { civicName, civicPlacementId } from "../civic";
import { MOCK_CITY_LOAD, MOCK_TOWN_HALL_PLACEMENT } from "../mockCity";
import { TOWN_HALL_ID } from "../townHall";
import type { PlacedTransform } from "../worldLayout";
import { STAR_BAND_TOP_ABOVE_ROOF } from "./MasteryStars";
import {
  createSkillLabelLayer,
  LABEL_ANCHOR_ABOVE_ROOF,
  LABEL_BUDGET,
  LABEL_CLEARANCE_ABOVE_STARS,
  LABEL_FADE_END_RATIO,
  LABEL_FADE_START_RATIO,
  type LabelBox,
  labelBudgetForViewport,
  labelIsShown,
  type LabelState,
  LABEL_TEXT,
  labelZoomOpacity,
  resolveVisibleLabels,
  skillLabelTargets,
} from "./SkillLabels";

/**
 * The floating skill labels above the skill buildings.
 *
 * EVERY POPULATION ASSERTION HERE CARRIES A COUNT FLOOR, and the floors are the point.
 * "No label names the hub", "every label's text comes from the skill-name source" and
 * "no two kept labels overlap" are all satisfied perfectly by an overlay that renders
 * NOTHING — zero labels name the hub, zero texts are wrong, and zero rects collide — so
 * a feature that silently produced an empty layer would pass this file without a floor
 * under each claim. The floors are read off the skill graph and the mock city's own
 * placements rather than written down, so a seventh era-one skill moves them with it.
 *
 * The population is scoped by BEHAVIOUR, not by implementation: what earns a label is
 * "this placement is a skill the graph knows", which is the same question the product
 * asks. That is why the hub is excluded without being named — its sentinel is absent
 * from the graph — and why the test below puts the hub INTO the input rather than
 * trusting that `CityScene` happens to keep it in a separate prop today. If some future
 * caller passes the hall through `placed`, this is what fails.
 *
 * What this file cannot prove is that the overlay is MOUNTED and painted; a component
 * existing is not evidence that it renders. That is the Playwright run
 * (`output/skill-labels-shot.mjs`), which counts the live `[data-skill-label]` elements
 * in the running app and screenshots them.
 */

/**
 * The era-one skill nodes, read from the GRAPH rather than written down: D1's shipping
 * skills are its `mvp`-scope nodes. The domain also carries `NUM.0` and `NUM.1` at
 * `excluded` scope, which are not buildings in this city and never reach a placement.
 */
const D1_GRAPH_SKILL_IDS = getNodesByDomain("D1")
  .filter((node) => node.product_scope === "mvp")
  .map((node) => node.id);

/** The mock city's six skill placements (`?mock` — every skill already on the grid). */
const MOCK_SKILL_PLACEMENTS: readonly PlacedTransform[] = MOCK_CITY_LOAD.placements ?? [];

/** The scene's source, read with Vite's `?raw` (house style — see `revealScope.test.ts`). */
const CITY_SCENE_SOURCE =
  (
    import.meta.glob("./CityScene.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>
  )["./CityScene.tsx"] ?? "";

/** The two production hand-off sites, read raw so deletion of either prop fails here. */
const CITY_CANVAS_HOST_SOURCE =
  (
    import.meta.glob("./CityCanvasHost.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>
  )["./CityCanvasHost.tsx"] ?? "";
const CITY_SURFACE_SOURCE =
  (
    import.meta.glob("../CitySurface.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>
  )["../CitySurface.tsx"] ?? "";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../../diagnostic/skillNames");
});

describe("which buildings earn a floating label", () => {
  it("labels all SIX era-one skills and gives the hub exactly one priority nameplate", () => {
    const withHub: PlacedTransform[] = [...MOCK_SKILL_PLACEMENTS, MOCK_TOWN_HALL_PLACEMENT];
    const targets = skillLabelTargets(withHub);
    const labelled = targets.map((target) => target.nodeId);

    // FLOOR, then composition. Six is the era's own skill count, read from the graph;
    // the seventh is the named hub, not another skill.
    expect(D1_GRAPH_SKILL_IDS).toHaveLength(6);
    expect(targets.length).toBe(D1_GRAPH_SKILL_IDS.length + 1);
    expect(new Set(labelled)).toEqual(new Set([...D1_GRAPH_SKILL_IDS, TOWN_HALL_ID]));
    expect(targets.find((target) => target.nodeId === TOWN_HALL_ID)).toMatchObject({
      kind: "hub",
      priority: 0,
      text: "Town Hall",
    });
    expect(getNode(TOWN_HALL_ID)).toBeUndefined();
  });

  it("anchors each label over its building's own footprint centre, not the origin", () => {
    // Six labels stacked at the world origin would satisfy a bare count. They have to
    // be at six distinct places, and at the places the placement math puts them.
    const targets = skillLabelTargets(MOCK_SKILL_PLACEMENTS);
    expect(targets).toHaveLength(6);
    const positions = new Set(targets.map((target) => `${target.x},${target.z}`));
    expect(positions.size).toBe(6);
    for (const target of targets) {
      expect(
        Math.hypot(target.x, target.z),
        `${target.nodeId} sits at the origin`,
      ).toBeGreaterThan(0);
    }
  });

  it("refuses unknown placements while keeping the hub's named exception", () => {
    const targets = skillLabelTargets([
      { nodeId: "NUM.S", col: 0, row: 0, rot: 0 },
      { nodeId: TOWN_HALL_ID, col: 4, row: 0, rot: 0 },
      { nodeId: "not-a-node", col: 8, row: 0, rot: 0 },
    ]);
    expect(targets.map((target) => target.nodeId)).toEqual(["NUM.S", TOWN_HALL_ID]);
  });

  it("also names a bought civic building, tied with the hub's own collision priority (2026-08-22)", () => {
    const civicId = civicPlacementId("smokehouse", 0);
    const targets = skillLabelTargets([
      { nodeId: "NUM.S", col: 0, row: 0, rot: 0 },
      { nodeId: TOWN_HALL_ID, col: 4, row: 0, rot: 0 },
      { nodeId: civicId, col: 8, row: 0, rot: 0 },
    ]);
    const civic = targets.find((target) => target.nodeId === civicId);
    const skill = targets.find((target) => target.nodeId === "NUM.S");
    const hub = targets.find((target) => target.nodeId === TOWN_HALL_ID);
    expect(civic).toMatchObject({
      kind: "civic",
      status: null,
      text: civicName(civicId),
    });
    expect(civic?.text).toBe("The Smokehouse");
    // A live check (2026-08-22) found a civic label reliably losing to the HUB's own
    // priority-0 nameplate whenever a bought building sat close enough to Town Hall to
    // overlap it on screen -- which is common, since civic buildings are bought near the
    // founding cluster the hub anchors. An in-between priority (which beat ordinary skill
    // captions fine) still lost to the hub automatically every time. Tying civic to the
    // hub's own priority means the two are settled by DEPTH like any other tie -- whoever
    // is nearer the camera wins -- rather than the hub reserving the space unconditionally.
    expect(civic?.priority).toBe(hub?.priority);
    expect(civic?.priority).toBeLessThan(skill?.priority ?? 1);
  });
});

describe("label density follows the live content region", () => {
  it("culls a populated phone city more aggressively without dropping the hub priority", () => {
    expect(labelBudgetForViewport(1024)).toBeGreaterThan(labelBudgetForViewport(390));
    expect(labelBudgetForViewport(390)).toBeGreaterThanOrEqual(3);

    const boxes: LabelBox[] = Array.from({ length: LABEL_BUDGET }, (_, index) => ({
      nodeId: index === LABEL_BUDGET - 1 ? TOWN_HALL_ID : `NUM.${index}`,
      priority: index === LABEL_BUDGET - 1 ? 0 : 1,
      left: index * 30,
      top: 100,
      width: 24,
      height: 20,
      depth: index + 1,
    }));
    const visible = resolveVisibleLabels(boxes, labelBudgetForViewport(390));
    expect(visible).toHaveLength(labelBudgetForViewport(390));
    expect(visible).toContain(TOWN_HALL_ID);
  });
});

describe("where the label's words come from", () => {
  it("shows the SKILL topic, not the building name or the era dressing", () => {
    const targets = skillLabelTargets(MOCK_SKILL_PLACEMENTS);
    const byNode = new Map(targets.map((target) => [target.nodeId, target.text]));
    expect(byNode.size).toBe(6);
    // The roster's third span, verbatim — "Signed numbers", not "Assembly Hall" and
    // not "Gathering Round".
    expect(byNode.get("NUM.S")).toBe("Signed numbers");
    for (const nodeId of D1_SKILL_IDS) {
      expect(byNode.get(nodeId), nodeId).toBe(skillDisplayName(nodeId));
    }
  });

  it("FOLLOWS a rename of the skill rather than carrying its own copy of the words", async () => {
    // The names in this city have been renamed twice in a week. A hard-coded label
    // table would pass every assertion above and then drift at the next rename, so the
    // source is replaced under the module and the label has to move with it.
    vi.resetModules();
    vi.doMock("../../diagnostic/skillNames", () => ({
      skillDisplayName: (nodeId: string) =>
        nodeId === "NUM.S" ? "Positives and negatives" : `renamed:${nodeId}`,
    }));
    const patched = await import("./SkillLabels");
    const targets = patched.skillLabelTargets(MOCK_SKILL_PLACEMENTS);

    expect(targets).toHaveLength(6);
    const byNode = new Map(targets.map((target) => [target.nodeId, target.text]));
    expect(byNode.get("NUM.S")).toBe("Positives and negatives");
    // Every other label followed too, so this is not one special-cased string.
    for (const nodeId of D1_SKILL_IDS.filter((id) => id !== "NUM.S")) {
      expect(byNode.get(nodeId), nodeId).toBe(`renamed:${nodeId}`);
    }
    // And the old words are gone from the rendered set entirely.
    expect(targets.map((target) => target.text)).not.toContain("Signed numbers");
  });
});

describe("clearing the other thing that floats up there", () => {
  it("sits strictly above the mastery-star band, derived from the stars' own extent", () => {
    // `MasteryStars` already floats over every topped-out building. The clearance is
    // read from the stars' exported band rather than measured off a screenshot, so
    // retuning the star size/margin/bob moves the label instead of overlapping it.
    expect(STAR_BAND_TOP_ABOVE_ROOF).toBeGreaterThan(0);
    expect(LABEL_CLEARANCE_ABOVE_STARS).toBeGreaterThan(0);
    expect(LABEL_ANCHOR_ABOVE_ROOF).toBe(
      STAR_BAND_TOP_ABOVE_ROOF + LABEL_CLEARANCE_ABOVE_STARS,
    );
    expect(LABEL_ANCHOR_ABOVE_ROOF).toBeGreaterThan(STAR_BAND_TOP_ABOVE_ROOF);
  });
});

/** A box at `(left, top)`, `depth` from the camera. 120×30 unless told otherwise. */
function boxAt(
  nodeId: string,
  left: number,
  top: number,
  depth: number,
  width = 120,
  height = 30,
  priority = 1,
): LabelBox {
  return { nodeId, left, top, width, height, priority, depth };
}

describe("collision: which labels survive a frame", () => {
  it("keeps EVERY label when none of them touch", () => {
    // The floor under every "no two overlap" claim below: an overlay that dropped
    // everything would satisfy those trivially.
    const boxes = D1_GRAPH_SKILL_IDS.map((nodeId, index) =>
      boxAt(nodeId, index * 200, 40, 60 + index),
    );
    expect(boxes).toHaveLength(6);
    expect(resolveVisibleLabels(boxes)).toHaveLength(6);
  });

  it("drops the label BEHIND when two overlap, and keeps the one in front", () => {
    const front = boxAt("NUM.S", 100, 100, 50);
    const behind = boxAt("NUM.F", 110, 104, 90); // squarely on top of `front`
    expect(resolveVisibleLabels([behind, front])).toEqual(["NUM.S"]);
    // Order of the input must not decide it — depth must.
    expect(resolveVisibleLabels([front, behind])).toEqual(["NUM.S"]);
  });

  it("keeps the Town Hall nameplate over a nearer skill label", () => {
    const skill = boxAt("NUM.S", 100, 100, 20);
    const hall = boxAt(TOWN_HALL_ID, 100, 100, 900, 120, 30, 0);
    const clear = boxAt("NUM.F", 400, 100, 50);
    expect(resolveVisibleLabels([skill, hall, clear])).toEqual([TOWN_HALL_ID, "NUM.F"]);
    expect(resolveVisibleLabels([hall, skill, clear])).toEqual([TOWN_HALL_ID, "NUM.F"]);
  });

  it("keeps a civic building's name over a nearer, overlapping skill label (2026-08-22)", () => {
    // The FIRST fix: at equal priority (1), a civic label sitting behind a nearer skill
    // label lost the collision pass every frame.
    const skillInFront = boxAt("NUM.S", 100, 100, 20);
    const civicBehind = boxAt(civicPlacementId("smokehouse", 0), 100, 100, 90, 120, 30, 0);
    const clear = boxAt("NUM.F", 400, 100, 50);
    expect(resolveVisibleLabels([skillInFront, civicBehind, clear])).toEqual([
      civicPlacementId("smokehouse", 0),
      "NUM.F",
    ]);
  });

  it("shows BOTH a civic label and the hub even when one loses the collision pass (2026-08-22)", () => {
    // The REAL defect, found only after the fix above still didn't satisfy the report: a
    // civic building bought near the founding cluster sits close enough to Town Hall to
    // overlap it on screen, and the hub won every overlap regardless of proximity --
    // "moving it farther from Town Hall fixes it" was the tell. The first attempt tied
    // civic to the hub's own priority so proximity would decide it, but the actual ask
    // was stronger: *"no it shouldnt be one winning over the other they should just
    // overlap"*. So `resolveVisibleLabels` still has to pick ONE winner between two
    // overlapping boxes (it has no other job), but `labelIsShown` -- what the frame loop
    // actually renders from -- is exempted from that verdict for a landmark. The smokehouse
    // "loses" the plain collision pass here and is STILL shown.
    const civicId = civicPlacementId("smokehouse", 0);
    const civicNearer = boxAt(civicId, 100, 100, 20, 120, 30, 0);
    const hallBehind = boxAt(TOWN_HALL_ID, 100, 100, 90, 120, 30, 0);
    const kept = new Set(resolveVisibleLabels([civicNearer, hallBehind]));
    expect(kept.has(TOWN_HALL_ID)).toBe(false);
    const offScreen = new Set<string>();
    expect(labelIsShown({ nodeId: civicId, kind: "civic", status: null }, offScreen, kept, true)).toBe(
      true,
    );
    expect(
      labelIsShown({ nodeId: TOWN_HALL_ID, kind: "hub", status: null }, offScreen, kept, true),
    ).toBe(true);
  });

  it("still hides an ordinary skill label that lost the collision pass", () => {
    // The exemption is for landmarks only. An ordinary skill caption that lost
    // `resolveVisibleLabels` must still stay hidden -- otherwise the whole point of
    // thinning a crowded city (this file's opening docblock) is gone.
    const kept = new Set<string>(["NUM.S"]);
    expect(
      labelIsShown({ nodeId: "NUM.F", kind: "skill", status: null }, new Set(), kept, true),
    ).toBe(false);
    expect(
      labelIsShown({ nodeId: "NUM.S", kind: "skill", status: null }, new Set(), kept, true),
    ).toBe(true);
  });

  it("thins a dense pile to a NON-OVERLAPPING set, and keeps at least one", () => {
    // Six labels stacked almost exactly on each other: era one's centre at a bad
    // azimuth. Whatever survives must not overlap, and it must not be nothing.
    const pile = D1_GRAPH_SKILL_IDS.map((nodeId, index) =>
      boxAt(nodeId, 300 + index * 4, 200 + index * 3, 40 + index * 5),
    );
    const kept = resolveVisibleLabels(pile);
    expect(kept.length).toBeGreaterThanOrEqual(1);
    expect(kept.length).toBeLessThan(pile.length);
    const keptBoxes = pile.filter((box) => kept.includes(box.nodeId));
    for (const a of keptBoxes) {
      for (const b of keptBoxes) {
        if (a === b) {
          continue;
        }
        const clear =
          a.left >= b.left + b.width ||
          b.left >= a.left + a.width ||
          a.top >= b.top + b.height ||
          b.top >= a.top + a.height;
        expect(clear, `${a.nodeId} still overlaps ${b.nodeId}`).toBe(true);
      }
    }
    // The nearest building's label is the one that survives.
    expect(kept[0]).toBe(pile[0]?.nodeId);
  });

  /**
   * **THE PASS RESOLVES ONE OVERLAY, BECAUSE ONE OVERLAY IS WHAT DRAWS IN THIS CHANNEL.**
   *
   * #470 gave this function a `reserved` list so that it and `ShieldTags`' own pass could share an
   * answer — two hosts drew above a roofline, each policed only its own boxes, and a `SHIELDED` tag
   * over one building could sit on a NEIGHBOUR's label with neither pass able to see it. The tag is
   * gone: the status IS the label now (`CRISIS_LABEL_TEXT`), so the two tests that exercised
   * `reserved` went with the parameter. What replaces them is the fact asserted here — every box
   * above a roofline is a candidate in ONE pass, which is what made the reservation necessary in
   * the first place and is the condition under which it is not.
   */
  it("resolves every box in the channel in one pass, with nothing outside it", () => {
    const label = boxAt("NUM.S", 100, 100, 50);
    const onTopOfIt = boxAt("town-hall", 110, 104, 900); // squarely on `label`, far behind it
    const clear = boxAt("NUM.F", 400, 100, 50);

    // A FLOOR FIRST, so what follows is a collision being resolved rather than a pass that drops
    // everything: two boxes that do not touch are both kept.
    expect(resolveVisibleLabels([label, clear])).toEqual(["NUM.S", "NUM.F"]);

    // And the hub's caption, which the crisis population now includes, is a CANDIDATE here rather
    // than screen this pass is told about — so it is the nearer of the two that survives, on the
    // one rule this function has. The old second overlay would have won this on its ruling instead.
    expect(resolveVisibleLabels([label, onTopOfIt, clear])).toEqual(["NUM.S", "NUM.F"]);
    expect(resolveVisibleLabels([onTopOfIt, label, clear])).toEqual(["NUM.S", "NUM.F"]);
  });

  it("never considers more than the budget, so the quadratic pass cannot grow", () => {
    // The cost claim in the source: the pairwise pass is bounded at LABEL_BUDGET²
    // however many buildings a later era places. Sixty spread-out labels would
    // otherwise all be kept and all be compared.
    const many = Array.from({ length: 60 }, (_, index) =>
      boxAt(`node-${index}`, index * 200, 40, index + 1),
    );
    const kept = resolveVisibleLabels(many);
    expect(LABEL_BUDGET).toBeLessThan(many.length);
    expect(kept).toHaveLength(LABEL_BUDGET);
    // And it is the NEAREST budget-many that were considered.
    expect(kept).toEqual(many.slice(0, LABEL_BUDGET).map((box) => box.nodeId));
  });
});

describe("zoom-out: what happens when the whole city is small", () => {
  // The layout's default distance (`islandRadius * 2.3`) and the dolly ceiling
  // (`VILLAGE_CAMERA.maxDistanceRatio`). Kept local: only the guard needs them.
  const DEFAULT_DISTANCE = 30 * 2.3;
  const MAX_DOLLY_RATIO = 2.6;

  it("is fully solid at the default framing", () => {
    expect(labelZoomOpacity(DEFAULT_DISTANCE, DEFAULT_DISTANCE)).toBe(1);
    // And still solid at the closest the camera may come.
    expect(labelZoomOpacity(DEFAULT_DISTANCE * 0.5, DEFAULT_DISTANCE)).toBe(1);
  });

  it("is fully GONE by full zoom-out, with room to spare before the limit", () => {
    expect(labelZoomOpacity(DEFAULT_DISTANCE * MAX_DOLLY_RATIO, DEFAULT_DISTANCE)).toBe(0);
    // Reaching zero strictly inside the reachable range is the claim: a fade that only
    // finished exactly at the dolly limit would still be legible everywhere in between.
    expect(LABEL_FADE_END_RATIO).toBeLessThan(MAX_DOLLY_RATIO);
    expect(LABEL_FADE_START_RATIO).toBeLessThan(LABEL_FADE_END_RATIO);
  });

  it("ramps monotonically in between rather than popping", () => {
    const samples = Array.from({ length: 21 }, (_, index) =>
      labelZoomOpacity(DEFAULT_DISTANCE * (1 + index * 0.08), DEFAULT_DISTANCE),
    );
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i] as number).toBeLessThanOrEqual(samples[i - 1] as number);
    }
    // A real ramp, not a step: some sample is strictly between the two extremes.
    expect(samples.some((value) => value > 0 && value < 1)).toBe(true);
  });
});

describe("staying wired into the scene", () => {
  it("keeps learner preference separate from the complete product stand-down", () => {
    // A source read, which per the QA rule only ever proves a deletion — and a deleted
    // mount is exactly what this catches. It is a tripwire, NOT the evidence that the
    // labels render: that is the Playwright run's live element count and screenshots.
    // Kept because the mount is one line in a file two other lanes are editing, and an
    // overlay that is merely constructible passes every other test in this file.
    const scene = CITY_SCENE_SOURCE;
    expect(scene.length).toBeGreaterThan(0);
    expect(scene).toContain("<SkillLabels");
    expect(scene).toContain('from "./SkillLabels"');
    expect(scene).toContain("showSkillLabels = true");
    expect(scene).toContain("skillLabelsStandDown = false");
    const guard = "{!skillLabelsStandDown && (";
    expect(scene).toContain(guard);
    // Both inputs the fade and the anchor depend on are actually threaded, so the mount
    // cannot be present but inert.
    const guarded = scene.slice(scene.indexOf(guard));
    const mount = guarded.slice(guarded.indexOf("<SkillLabels"));
    const mountProps = mount.slice(0, mount.indexOf("/>"));
    expect(mountProps).toContain("controlsRef");
    expect(mountProps).toContain("defaultCameraDistance");
    expect(mountProps).toContain("placed=");
    expect(mountProps).toContain("namesVisible={showSkillLabels}");
    expect(scene.match(/<SkillLabels/g)).toHaveLength(1);
  });

  it("threads Succession's complete stand-down through both production boundaries", () => {
    expect(CITY_SURFACE_SOURCE.length).toBeGreaterThan(2_000);
    expect(CITY_CANVAS_HOST_SOURCE.length).toBeGreaterThan(1_000);
    expect(CITY_SURFACE_SOURCE).toContain("showSkillLabels={buildingLabelsVisible}");
    expect(CITY_SURFACE_SOURCE).toContain("skillLabelsStandDown={successionInCity}");
    expect(CITY_CANVAS_HOST_SOURCE).toContain(
      "skillLabelsStandDown={skillLabelsStandDown}",
    );
  });
});

describe("the overlay DOM the player actually sees", () => {
  it("builds one element per skill label, carrying the skill's words", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const targets = skillLabelTargets(MOCK_SKILL_PLACEMENTS);
    const layer = createSkillLabelLayer(parent, targets, false);

    const rendered = Array.from(parent.querySelectorAll<HTMLElement>("[data-skill-label]"));
    expect(targets).toHaveLength(6);
    expect(rendered).toHaveLength(6);
    expect(rendered.map((el) => el.textContent)).toEqual(
      targets.map((target) => target.text),
    );
    expect(rendered.map((el) => el.dataset.skillLabel)).not.toContain(TOWN_HALL_ID);

    layer.dispose();
    expect(parent.querySelectorAll("[data-skill-label]")).toHaveLength(0);
    parent.remove();
  });

  it("renders a civic building's name tag slightly smaller than a skill's own (2026-08-22)", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const civicId = civicPlacementId("smokehouse", 0);
    const targets = skillLabelTargets([
      { nodeId: "NUM.S", col: 0, row: 0, rot: 0 },
      { nodeId: civicId, col: 4, row: 0, rot: 0 },
    ]);
    const layer = createSkillLabelLayer(parent, targets, false);

    const skillEl = layer.elements.get("NUM.S");
    const civicEl = layer.elements.get(civicId);
    expect(skillEl?.textContent).toBe("Signed numbers");
    expect(civicEl?.textContent).toBe("The Smokehouse");
    expect(civicEl?.dataset.civicLabel).toBe("true");
    expect(skillEl?.dataset.civicLabel).toBeUndefined();
    // Settled on 2026-08-22 after a live check found the real defect was collision
    // priority, not size: the text reads slightly smaller than a skill's own (11px vs
    // 12px), the original ask throughout.
    const civicFontSize = parseFloat(civicEl?.style.fontSize ?? "0");
    const skillFontSize = parseFloat(skillEl?.style.fontSize ?? "0");
    expect(civicFontSize).toBeGreaterThan(0);
    expect(civicFontSize).toBeLessThan(skillFontSize);

    layer.dispose();
    parent.remove();
  });

  it("hides only ordinary names while every status stays mounted and visible", () => {
    const parent = document.createElement("div");
    const masteryStars = document.createElement("div");
    masteryStars.dataset.masteryStars = "NUM.S";
    parent.appendChild(masteryStars);
    document.body.appendChild(parent);
    const ordinary = skillLabelTargets(MOCK_SKILL_PLACEMENTS)[0];
    expect(ordinary).toBeDefined();
    if (!ordinary) throw new Error("mock city produced no ordinary skill label");
    const statusTargets = (Object.keys(LABEL_TEXT) as LabelState[]).map(
      (status, index) => ({
        ...ordinary,
        nodeId: `status-${status}`,
        text: LABEL_TEXT[status],
        status,
        x: ordinary.x + index + 1,
      }),
    );
    const layer = createSkillLabelLayer(parent, [ordinary, ...statusTargets], false);
    const labelsBefore = [...layer.elements.values()];

    expect(layer.host.hidden).toBe(false);
    expect(labelsBefore).toHaveLength(1 + statusTargets.length);

    layer.setVisible(false);
    expect(layer.host.hidden).toBe(false);
    expect([...layer.elements.values()]).toEqual(labelsBefore);
    expect(layer.elements.get(ordinary.nodeId)?.hidden).toBe(true);
    for (const target of statusTargets) {
      const element = layer.elements.get(target.nodeId);
      expect(element, target.status).toBeDefined();
      expect(element?.hidden, target.status).toBe(false);
      expect(element?.dataset.labelStatus, target.status).toBe(target.status);
      expect(element?.textContent, target.status).toBe(LABEL_TEXT[target.status]);
    }
    expect(parent.querySelector("[data-mastery-stars]")).toBe(masteryStars);

    layer.setVisible(true);
    expect(layer.host.hidden).toBe(false);
    expect([...layer.elements.values()]).toEqual(labelsBefore);
    expect(layer.elements.get(ordinary.nodeId)?.hidden).toBe(false);

    layer.dispose();
    parent.remove();
  });

  it("uses the app's OWN display face, not a three.js or system fallback", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const layer = createSkillLabelLayer(
      parent,
      skillLabelTargets(MOCK_SKILL_PLACEMENTS),
      false,
    );
    const rendered = Array.from(parent.querySelectorAll<HTMLElement>("[data-skill-label]"));
    expect(rendered).toHaveLength(6);
    for (const element of rendered) {
      // The token, not a literal family name: `styles.css` owns which face that is
      // (Fredoka today), so the label cannot drift off the app's type pairing.
      expect(element.style.fontFamily).toContain("--font-display");
    }
    layer.dispose();
    parent.remove();
  });

  it("caches its box sizes, so the frame loop never forces a layout", () => {
    // The one expensive thing this shape of overlay can do is read `offsetWidth` between
    // its own transform writes, which forces a synchronous reflow per label per frame.
    // The sizes therefore have to be readable WITHOUT touching the elements.
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const targets = skillLabelTargets(MOCK_SKILL_PLACEMENTS);
    const layer = createSkillLabelLayer(parent, targets, false);
    expect(targets).toHaveLength(6);
    expect(layer.sizes.size).toBe(6);
    for (const target of targets) {
      expect(layer.sizes.has(target.nodeId), target.nodeId).toBe(true);
    }
    layer.dispose();
    parent.remove();
  });

  it("stays decorative, and honours reduced motion by not transitioning", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const targets = skillLabelTargets(MOCK_SKILL_PLACEMENTS);

    const motion = createSkillLabelLayer(parent, targets, false);
    expect(motion.host.getAttribute("aria-hidden")).toBe("true");
    const animated = Array.from(
      motion.host.querySelectorAll<HTMLElement>("[data-skill-label]"),
    );
    expect(animated).toHaveLength(6);
    expect(animated.every((el) => el.style.transition.includes("opacity"))).toBe(true);
    motion.dispose();

    const still = createSkillLabelLayer(parent, targets, true);
    const stillLabels = Array.from(
      still.host.querySelectorAll<HTMLElement>("[data-skill-label]"),
    );
    expect(stillLabels).toHaveLength(6);
    expect(stillLabels.some((el) => el.style.transition !== "")).toBe(false);
    still.dispose();
    parent.remove();
  });
});
