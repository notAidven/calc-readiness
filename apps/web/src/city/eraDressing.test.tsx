import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { buildingName, D1_SKILL_IDS } from "./buildingAssets";
import { CitySurface } from "./CitySurface";
import { buildingDisplayName, buildingSubtitle, ERA_DRESSINGS } from "./eraDressing";
import { openBuiltShelf } from "./test/openBuiltShelf";
import { TOWN_HALL_ID, TOWN_HALL_LABEL } from "./townHall";

/**
 * D-ERA29: a building has a STABLE name plus a PER-ERA dressing subtitle, and the
 * accessible name is `"{stable}, {subtitle}"` — the subtitle is announced, not
 * `aria-hidden`, so a sighted user and a screen-reader user say the same words.
 *
 * WHAT THIS FILE IS FOR, since D-ERA9 exists to stop exactly this: D-ERA9's reason is
 * that the canvas is `aria-hidden`, so the name is a screen-reader user's only handle
 * on a building. D-ERA29 keeps that requirement by keeping the handle FIXED as the
 * LEADING token of the announced name. The one thing that would reintroduce the harm
 * is the era flavour getting in FRONT of the handle, so that is what is asserted here,
 * read out of the rendered DOM rather than out of the source.
 */

/** A building whose roster row is placed and clickable in the default mock city. */
const NODE = "NUM.3";

/**
 * The accessible name of the building callout, read the way a screen reader computes
 * it: follow `aria-labelledby` to the labelling element and take its text. Read from
 * the DOM, never composed from the source under test.
 */
function calloutAccessibleName(dialog: HTMLElement): string {
  const id = dialog.getAttribute("aria-labelledby");
  if (!id) {
    throw new Error("The callout has no aria-labelledby, so it has no accessible name");
  }
  const label = document.getElementById(id);
  if (!label) {
    throw new Error(`aria-labelledby points at #${id}, which is not in the document`);
  }
  return label.textContent ?? "";
}

/** The handle: everything before the first comma. A suffix may move; this may not. */
function leadingToken(accessibleName: string): string {
  return (accessibleName.split(",")[0] ?? accessibleName).trim();
}

/** Open the Buildings disclosure, select a roster row, and return its callout's name. */
async function announcedNameInEra(
  eraId: EraId,
  nodeId: string = NODE,
): Promise<{
  callout: string;
  rosterRow: HTMLElement;
}> {
  const user = userEvent.setup();
  const view = render(<CitySurface enableCanvas={false} eraId={eraId} />);
  await openBuiltShelf(user);
  const rosterRow = document.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`);
  if (!rosterRow) {
    throw new Error(`No roster row rendered for ${nodeId}`);
  }
  await user.click(rosterRow);
  const dialog = await screen.findByRole("dialog");
  const callout = calloutAccessibleName(dialog);
  view.unmount();
  return { callout, rosterRow };
}

describe("D-ERA29 — the era dressing subtitle, and the handle that must not move", () => {
  it("keeps the accessible name's leading token identical across an era switch, and moves only the suffix", async () => {
    // THE HUB is the vehicle for this, because it is the ONE building that re-dresses (R3).
    // A skill building was used here until era two was wired, and it could not go on being
    // the vehicle: it is now era one's Tool Shelter in every era, which is the ruling, so it
    // has no era switch left to demonstrate.
    const eraOne = await announcedNameInEra("prehistoric", TOWN_HALL_ID);
    expect(eraOne.callout).toBe(`${TOWN_HALL_LABEL}, Stone Circle`);

    // ERA TWO re-dresses the hub to its own ratified name, so the announced name really does
    // change between eras — without this the leading-token assertion below could pass on two
    // identical strings and assert nothing at all.
    const eraTwo = await announcedNameInEra("neolithic", TOWN_HALL_ID);
    expect(eraTwo.callout).toBe(`${TOWN_HALL_LABEL}, the Elders' Hearth`);
    expect(eraTwo.callout).not.toBe(eraOne.callout);

    // THE INVARIANT: the handle is the leading token in both, and it is the stable
    // name. This is the assertion that fails if the flavour ever gets in front of the
    // handle ("the Elders' Hearth, Civic Center"), which is the harm D-ERA9 was written
    // against and the one thing D-ERA29 may not reintroduce.
    expect(leadingToken(eraOne.callout)).toBe(TOWN_HALL_LABEL);
    expect(leadingToken(eraTwo.callout)).toBe(TOWN_HALL_LABEL);
    expect(leadingToken(eraOne.callout)).toBe(leadingToken(eraTwo.callout));

    // The roster row is the other surface a screen-reader user navigates by, and its
    // accessible name is a concatenation rather than a single label — so the
    // requirement there is that it STARTS with the handle, in both eras.
    expect(eraOne.rosterRow).toHaveAccessibleName(new RegExp(`^${TOWN_HALL_LABEL}\\b`));
    expect(eraTwo.rosterRow).toHaveAccessibleName(new RegExp(`^${TOWN_HALL_LABEL}\\b`));
    // And each era's own flavour is genuinely on the row, and the other era's is not — the
    // row is where a sighted learner reads it.
    expect(eraOne.rosterRow).toHaveAccessibleName(/Stone Circle/);
    expect(eraOne.rosterRow).not.toHaveAccessibleName(/the Elders' Hearth/);
    expect(eraTwo.rosterRow).toHaveAccessibleName(/the Elders' Hearth/);
    expect(eraTwo.rosterRow).not.toHaveAccessibleName(/Stone Circle/);
  });

  /**
   * R3 (`docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md`): skill buildings
   * do not re-dress when the era turns; each is drawn once, in the era it is raised, and
   * kept. The hub is the only BUILDING an era advance touches.
   *
   * This test replaces one that asserted the OPPOSITE — that `NUM.3` announces the bare
   * handle in era two — and the change is a bug fix rather than a loosening, so it owes the
   * evidence a fix owes. The defect: dropping "Tool Shelter" when the city advances IS a
   * re-dress, of an era-one building, which R3 forbids. `eraDressing.ts`'s own header
   * predicted it by name and left it to *"whoever wires era two"*.
   *
   * The guard is written so it cannot be satisfied by a lookup that ignores the era
   * argument: it also asserts the hub DOES move over the same two eras, so a
   * `buildingSubtitle` that returned era one's row for everything fails at the hub.
   */
  it("keeps era one's six buildings in era one's clothes in every one of the ten eras", () => {
    for (const era of ERA_SEQUENCE) {
      for (const nodeId of D1_SKILL_IDS) {
        expect(buildingSubtitle(nodeId, era.id), `${era.id}/${nodeId}`).toBe(
          buildingSubtitle(nodeId, "prehistoric"),
        );
      }
    }

    // Era one's six really are dressed, so the equality above is over real strings rather
    // than over ten nulls.
    const eraOneDressings = D1_SKILL_IDS.map((id) => buildingSubtitle(id, "prehistoric"));
    expect(eraOneDressings.filter((d) => d !== null)).toHaveLength(6);

    // AND THE HUB MOVES over the same two eras, which is what stops this from passing on a
    // lookup that has stopped reading the era at all.
    expect(buildingSubtitle(TOWN_HALL_ID, "prehistoric")).toBe("Stone Circle");
    expect(buildingSubtitle(TOWN_HALL_ID, "neolithic")).toBe("the Elders' Hearth");
  });

  it("leads with the stable handle for every building in every era, with a floor under the sweep", () => {
    const ids = [...D1_SKILL_IDS, TOWN_HALL_ID];
    let dressed = 0;

    for (const era of ERA_SEQUENCE) {
      for (const nodeId of ids) {
        const display = buildingDisplayName(nodeId, era.id);
        const stable = nodeId === TOWN_HALL_ID ? TOWN_HALL_LABEL : buildingName(nodeId);
        expect(leadingToken(display), `${era.id}/${nodeId}`).toBe(stable);

        const subtitle = buildingSubtitle(nodeId, era.id);
        if (subtitle) {
          dressed += 1;
          expect(display, `${era.id}/${nodeId}`).toBe(`${stable}, ${subtitle}`);
        } else {
          expect(display, `${era.id}/${nodeId}`).toBe(stable);
        }
      }
    }

    // THE FLOOR. Every assertion above holds trivially if nothing is ever dressed, so the
    // sweep needs a count behind it. DERIVED rather than transcribed: era one's six skill
    // buildings keep their dressing in all ten eras (R3), plus one hub dressing per era that
    // has authored a row for it. A hardcoded number here would go stale the day era three's
    // row is ratified, and would go stale in the flattering direction. **That day came** — the
    // derivation absorbed it and only the census below moved.
    const hubDressedEras = ERA_SEQUENCE.filter(
      (era) => buildingSubtitle(TOWN_HALL_ID, era.id) !== null,
    );
    expect(dressed).toBe(D1_SKILL_IDS.length * ERA_SEQUENCE.length + hubDressedEras.length);
    // With a floor under the DERIVATION too, so it cannot be satisfied by nothing being
    // dressed anywhere: six eras dress the hub today, and there are six era-one skill buildings.
    expect(hubDressedEras.map((era) => era.id)).toEqual([
      "prehistoric",
      "neolithic",
      "bronze_age",
      "classical",
      "medieval",
      "industrial",
      "atomic_age",
      "information_age",
      "cyberpunk",
    ]);
    expect(D1_SKILL_IDS).toHaveLength(6);
  });

  it("degrades to the stable name alone where no dressing is authored", () => {
    // SIX eras have authored rows now, each the RATIFIED one its style guide calls "ready to
    // wire". Asserted by set equality both ways, so an era added to the table without a
    // ratified row fails here rather than shipping unratified strings into the accessible name,
    // AND an era whose ratified row is removed fails here rather than silently regressing to
    // the bare handle. Era three joined on 2026-07-31 and this is the line that had to move.
    expect(Object.keys(ERA_DRESSINGS)).toEqual([
      "prehistoric",
      "neolithic",
      "bronze_age",
      "classical",
      "medieval",
      "industrial",
      "atomic_age",
      "information_age",
      "cyberpunk",
    ]);
    // In play order, which is what makes the equality above a census rather than an unordered
    // membership check: a row inserted out of sequence is a row whose author did not read the
    // table, and `ERA_SEQUENCE` is the only authority on the order (INV-ERA-5).
    expect(Object.keys(ERA_DRESSINGS)).toEqual(
      ERA_SEQUENCE.filter((era) => era.id in ERA_DRESSINGS).map((era) => era.id),
    );

    const undressed = ERA_SEQUENCE.filter((era) => !(era.id in ERA_DRESSINGS));
    // A floor here too: four eras still owe a subtitle row, and this is the number that makes
    // the loop below mean something. It is NOT a decrement of the eight that stood here —
    // the two halves are asserted to PARTITION the sequence, so this count cannot drift on
    // its own: dropping a row moves both numbers and dropping an era moves this one.
    expect(undressed).toEqual([
      expect.objectContaining({
        id: "renaissance",
      }),
    ]);
    expect(undressed.length + Object.keys(ERA_DRESSINGS).length).toBe(ERA_SEQUENCE.length);

    for (const era of undressed) {
      // The HUB is what an unauthored era leaves bare — never a placeholder and never the
      // previous era's dressing. Era one's six are NOT checked here: they carry era one's
      // dressing in every era by R3, which the sweep above pins.
      expect(buildingSubtitle(TOWN_HALL_ID, era.id), era.id).toBeNull();
      expect(buildingDisplayName(TOWN_HALL_ID, era.id), era.id).toBe(TOWN_HALL_LABEL);
    }
  });

  it("names the hub through the sentinel guard rather than leaking `town-hall`", () => {
    expect(buildingDisplayName(TOWN_HALL_ID, "prehistoric")).toBe(
      `${TOWN_HALL_LABEL}, Stone Circle`,
    );
    expect(buildingDisplayName(TOWN_HALL_ID, "neolithic")).toBe(
      `${TOWN_HALL_LABEL}, the Elders' Hearth`,
    );
    expect(buildingDisplayName(TOWN_HALL_ID, "classical")).toBe(
      `${TOWN_HALL_LABEL}, the Senate House`,
    );
    expect(buildingDisplayName(TOWN_HALL_ID, "medieval")).toBe(
      `${TOWN_HALL_LABEL}, the Court House`,
    );
    expect(buildingDisplayName(TOWN_HALL_ID, "industrial")).toBe(
      `${TOWN_HALL_LABEL}, the Engine House`,
    );
    expect(buildingDisplayName(TOWN_HALL_ID, "prehistoric")).not.toContain(TOWN_HALL_ID);
  });

  /**
   * Era two's row is ratified for SEVEN slots and six of them are wired, because `dwelling`
   * has no era-two node to key on. Pinned as a set both ways so the row cannot drift from
   * the guide it was transcribed from: an entry added without a ratified name fails, and a
   * ratified name dropped from the table fails.
   */
  it("wires era two's ratified subtitle row, and only its own nodes", () => {
    expect(ERA_DRESSINGS.neolithic).toEqual({
      "EXP.1": "the Bee House",
      "RAD.1": "the Potter's Kiln",
      "RAD.2": "the Sheep Pen",
      "RAD.3": "the Meeting House",
      "RAD.4": "the Stone Tower",
      [TOWN_HALL_ID]: "the Elders' Hearth",
    });

    // Every skill key in era two's row is one of era two's OWN nodes, derived from
    // `ERA_SEQUENCE` rather than transcribed — an era-one node appearing here would be the
    // re-dress R3 withdrew.
    const eraTwoNodes = new Set(
      ERA_SEQUENCE.find((era) => era.id === "neolithic")?.nodes ?? [],
    );
    expect(eraTwoNodes.size).toBe(5);
    const skillKeys = Object.keys(ERA_DRESSINGS.neolithic ?? {}).filter(
      (key) => key !== TOWN_HALL_ID,
    );
    expect(skillKeys).toHaveLength(5);
    for (const key of skillKeys) {
      expect(eraTwoNodes.has(key), key).toBe(true);
    }
  });

  /**
   * Era three's row is ratified for SEVEN slots and six of them are wired, because `dwelling`
   * has no era-three node to key on — the same arithmetic era two's row has, and for the same
   * reason. Pinned as a set both ways so the row cannot drift from the guide it was transcribed
   * from: an entry added without a ratified name fails, and a ratified name dropped from the
   * table fails.
   *
   * **The seven-against-five mismatch is resolved HERE, in assertions, rather than in a
   * comment.** The guide names seven masses; era three introduces five nodes. The three lines
   * below say where the other two went: one is the hub (which re-themes, R3), and one is
   * `dwelling`, whose ratified name "the Gallery Court" is deliberately unwired because era
   * three puts no node on that mass and this table is keyed by node. A name for a mass with no
   * node would be a string in the accessible name of nothing.
   */
  it("wires era three's ratified subtitle row, and only its own nodes", () => {
    expect(ERA_DRESSINGS.bronze_age).toEqual({
      "LIN.1": "the Merchants' Hall",
      "LIN.3": "the Bronze Foundry",
      "LIN.4": "the Treasury",
      "LIN.5": "the Ingot Yard",
      "LIN.6": "the Stronghold",
      [TOWN_HALL_ID]: "the Council Hall",
    });

    // Every skill key is one of era three's OWN nodes, derived from `ERA_SEQUENCE` rather than
    // transcribed — an earlier era's node appearing here would be the re-dress R3 withdrew.
    const eraThreeNodes = new Set(
      ERA_SEQUENCE.find((era) => era.id === "bronze_age")?.nodes ?? [],
    );
    expect(eraThreeNodes.size).toBe(5);
    const skillKeys = Object.keys(ERA_DRESSINGS.bronze_age ?? {}).filter(
      (key) => key !== TOWN_HALL_ID,
    );
    expect(skillKeys).toHaveLength(5);
    for (const key of skillKeys) {
      expect(eraThreeNodes.has(key), key).toBe(true);
    }

    // THE UNWIRED SEVENTH, asserted as an absence rather than left to the docblock: no key in
    // this row carries the `dwelling` dressing, and `LIN.2` — retired from the domain — has no
    // key at all. Both are the kind of entry a well-meaning transcription of the guide's
    // seven-row table would add.
    expect(Object.values(ERA_DRESSINGS.bronze_age ?? {})).not.toContain(
      "the Gallery Court",
    );
    expect(ERA_DRESSINGS.bronze_age).not.toHaveProperty("LIN.2");
    // And era three's dressings are distinct from every other era's, which is the cross-run
    // uniqueness rule the header states: eras stand on the island together now, so two
    // dressings that collided would be two buildings a screen-reader user cannot tell apart.
    const earlier = Object.entries(ERA_DRESSINGS)
      .filter(([eraId]) => eraId !== "bronze_age")
      .flatMap(([, row]) => Object.values(row ?? {}));
    expect(earlier.length).toBeGreaterThanOrEqual(12);
    for (const name of Object.values(ERA_DRESSINGS.bronze_age ?? {})) {
      expect(earlier, name).not.toContain(name);
    }
  });

  it("wires Classical's ratified subtitle row, and only its five nodes plus the hub", () => {
    const expected = {
      "POL.1": "the Stonecutters' Shop",
      "POL.2": "the Barracks",
      "POL.3": "the Custom's House",
      "POL.4": "the Wine Cellars",
      "POL.8": "the Surveyor's Shop",
      [TOWN_HALL_ID]: "the Senate House",
    };
    expect(ERA_DRESSINGS.classical).toEqual(expected);

    const classicalNodes = new Set(
      ERA_SEQUENCE.find((era) => era.id === "classical")?.nodes ?? [],
    );
    expect(classicalNodes.size).toBe(5);
    const skillKeys = Object.keys(ERA_DRESSINGS.classical ?? {}).filter(
      (key) => key !== TOWN_HALL_ID,
    );
    expect(skillKeys).toHaveLength(5);
    expect([...skillKeys].sort()).toEqual([...classicalNodes].sort());

    for (const [nodeId, subtitle] of Object.entries(expected)) {
      expect(buildingSubtitle(nodeId, "classical"), nodeId).toBe(subtitle);
      expect(buildingDisplayName(nodeId, "classical"), nodeId).toBe(
        `${nodeId === TOWN_HALL_ID ? TOWN_HALL_LABEL : buildingName(nodeId)}, ${subtitle}`,
      );
    }
  });

  it("wires Medieval's ratified subtitle row, and only its five nodes plus the hub", () => {
    const expected = {
      "RAT.1": "the Weaver's Shop",
      "RAT.2": "the Wool Store",
      "RAT.3": "the Guild Hall",
      "RAT.4": "the Tower House",
      "RAT.6": "the Timber Houses",
      [TOWN_HALL_ID]: "the Court House",
    };
    expect(ERA_DRESSINGS.medieval).toEqual(expected);

    const medievalNodes = new Set(
      ERA_SEQUENCE.find((era) => era.id === "medieval")?.nodes ?? [],
    );
    expect(medievalNodes.size).toBe(5);
    const skillKeys = Object.keys(ERA_DRESSINGS.medieval ?? {}).filter(
      (key) => key !== TOWN_HALL_ID,
    );
    expect(skillKeys).toHaveLength(5);
    expect([...skillKeys].sort()).toEqual([...medievalNodes].sort());

    for (const [nodeId, subtitle] of Object.entries(expected)) {
      expect(buildingSubtitle(nodeId, "medieval"), nodeId).toBe(subtitle);
      expect(buildingDisplayName(nodeId, "medieval"), nodeId).toBe(
        `${nodeId === TOWN_HALL_ID ? TOWN_HALL_LABEL : buildingName(nodeId)}, ${subtitle}`,
      );
    }
  });

  it("wires Industrial's ratified subtitle row, and only its six nodes plus the hub", () => {
    const expected = {
      "FUN.1": "the Spinning Mill",
      "FUN.2": "the Cotton Warehouse",
      "FUN.3": "the Locomotive Shop",
      "FUN.7": "the Exhibition Hall",
      "FUN.8": "the Cannon Factory",
      "POL.5": "the Water Tower",
      [TOWN_HALL_ID]: "the Engine House",
    };
    expect(ERA_DRESSINGS.industrial).toEqual(expected);

    const industrialNodes = new Set(
      ERA_SEQUENCE.find((era) => era.id === "industrial")?.nodes ?? [],
    );
    expect(industrialNodes.size).toBe(6);
    const skillKeys = Object.keys(ERA_DRESSINGS.industrial ?? {}).filter(
      (key) => key !== TOWN_HALL_ID,
    );
    expect(skillKeys).toHaveLength(6);
    expect([...skillKeys].sort()).toEqual([...industrialNodes].sort());

    for (const [nodeId, subtitle] of Object.entries(expected)) {
      expect(buildingSubtitle(nodeId, "industrial"), nodeId).toBe(subtitle);
      expect(buildingDisplayName(nodeId, "industrial"), nodeId).toBe(
        `${nodeId === TOWN_HALL_ID ? TOWN_HALL_LABEL : buildingName(nodeId)}, ${subtitle}`,
      );
    }
  });

  /**
   * THE DEFECT THIS LANE CLOSED, read out of the rendered DOM. A learner in era three met build
   * cards headlined with the raw registry id — literally `"LIN.1"` — and no subtitle, because
   * `buildingName` returns the id verbatim for an unmapped node and `buildingSubtitle` returned
   * `null` for an era with no row.
   *
   * A source-level assertion cannot carry this: the claim is about the string on the card, and it
   * is composed by a surface this file does not import. So the row is read out of the mounted
   * DOM, and the absence of the id is asserted as well as the presence of the name — a card
   * reading "Assembly Hall, the Merchants' Hall (LIN.1)" would pass a presence check alone.
   *
   * ## ⚑ THE ROW HAS THREE NAME SPANS AND THIS CHANGE OWNS TWO OF THEM
   *
   * MEASURED at this tip, era three's row is
   * `"Assembly Hall" + "the Merchants' Hall" + "LIN.1" + "Not built" + "Ready to build"`,
   * against era one's `"Workshop" + "Tool Shelter" + "Field properties & the distributive law"`.
   * So the third span — the SKILL's name, from `diagnostic/skillNames.ts` through
   * `skillDisplayName` — **still shows the raw id for D3**, and that is a DIFFERENT table with a
   * different owner, not this row's building name.
   *
   * The assertion is scoped to the two spans this lane wired, and it is scoped by POSITION
   * rather than by whole-row absence: the id must not appear in the headline-and-subtitle prefix.
   * Written the other way — "the row nowhere contains `LIN.1`" — it would be asserting somebody
   * else's fix, and written as "the row still contains `LIN.1`" it would pin the residual defect
   * open. It is deliberately neither, so it passes now and keeps passing when D3's skill names
   * land.
   */
  it("headlines era three's cards with real names instead of the raw node id", async () => {
    // The ROSTER ROW rather than the callout, and the difference is not a weakening: era
    // three's buildings are not PLACED in the default mock city, so there is no callout to
    // open — a placed building is what `announcedNameInEra` needs and only era one's are. The
    // row is the surface that carries the defect anyway. It is what the build card is, it is
    // rendered for every node in the era's roster whether placed or not, and it is the surface
    // the audit measured the era-two version of this defect on ("the roster read Store / the
    // Seed House / EXP.1").
    const user = userEvent.setup();
    const view = render(<CitySurface enableCanvas={false} eraId="bronze_age" />);
    await openBuiltShelf(user);

    // All five of era three's, so this is the era's row and not one lucky node. The expected
    // headline is read from `buildingName` and the expected dressing from `buildingSubtitle`,
    // so this asserts the two reach the SURFACE rather than re-transcribing the guide — the
    // literal strings are pinned against the guide in the row census above.
    let checked = 0;
    for (const nodeId of ["LIN.1", "LIN.3", "LIN.4", "LIN.5", "LIN.6"]) {
      const row = document.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`);
      expect(row, `era three's ${nodeId} has no roster row to headline`).not.toBeNull();

      const stable = buildingName(nodeId);
      const subtitle = buildingSubtitle(nodeId, "bronze_age");
      expect(subtitle, `${nodeId} has no dressing to show`).not.toBeNull();

      // THE HANDLE LEADS AND THE DRESSING FOLLOWS IT, as one prefix, which is what makes this
      // a claim about order and not two independent substring hits.
      const prefix = `${stable}${subtitle as string}`;
      const text = row?.textContent ?? "";
      expect(text.startsWith(prefix), `${nodeId} reads ${JSON.stringify(text)}`).toBe(true);

      // THE ID IS GONE FROM THAT PREFIX, which is the half that fails on the pre-fix tree,
      // where the headline WAS the id and there was no subtitle behind it. Scoped to the
      // prefix because the skill-name span after it is another table's gap (see the docblock).
      expect(prefix, `${nodeId}'s headline still shows its registry id`).not.toContain(
        nodeId,
      );
      // The id survives only as the hook this row was found by, which is the rule
      // `CitySurface`'s roster comment states.
      expect(row?.dataset.nodeId).toBe(nodeId);
      // And it is era THREE's dressing, never an earlier era's on the same mass.
      expect(prefix).not.toMatch(/Roundhouse|Hide Shed|Tool Shelter|Clearing|Lookout/);
      expect(prefix).not.toMatch(/the Bee House|the Potter's Kiln|the Meeting House/);
      checked += 1;
    }
    // Floor: the loop above is vacuous if the roster stops rendering era three at all, which is
    // exactly what a regression in the era roster would look like from here.
    expect(checked).toBe(5);
    view.unmount();
  });

  /**
   * D-ERA31: the hub wears era one's ROUND dressing and `NUM.S` wears the Roundhouse.
   * Pinned as a pair rather than as two independent strings, because the defect this
   * guards is the two swapping back — a single-sided assertion would still pass if the
   * Stone Circle were handed to both.
   */
  it("gives the Stone Circle to the hub and the Roundhouse to NUM.S, and to neither twice", () => {
    expect(buildingSubtitle(TOWN_HALL_ID, "prehistoric")).toBe("Stone Circle");
    expect(buildingSubtitle("NUM.S", "prehistoric")).toBe("Roundhouse");

    // No dressing is used twice in era one, which is what stops a swap from being
    // half-applied: seven buildings, seven distinct subtitles.
    const subtitles = [...D1_SKILL_IDS, TOWN_HALL_ID].map((id) =>
      buildingSubtitle(id, "prehistoric"),
    );
    expect(subtitles.filter((s) => s !== null)).toHaveLength(7);
    expect(new Set(subtitles).size).toBe(7);
  });

  /**
   * The hub's callout title had NO dressing until D-ERA31: it hard-coded
   * `TOWN_HALL_LABEL` where every skill callout goes through `buildingDisplayName`.
   * D-ERA29 names the callout title as one of the two surfaces the subtitle belongs on,
   * so the hub was the one building silently missing it — and it is now the building
   * wearing the era's headline dressing, which is what made the gap worth closing.
   *
   * Read out of the rendered DOM through `aria-labelledby`, the way a screen reader
   * computes it, rather than from the source under test.
   */
  it("announces the hub's dressing in its callout title, and drops it in an undressed era", async () => {
    const eraOne = await announcedNameInEra("prehistoric", TOWN_HALL_ID);
    expect(eraOne.callout).toBe(`${TOWN_HALL_LABEL}, Stone Circle`);
    expect(leadingToken(eraOne.callout)).toBe(TOWN_HALL_LABEL);

    const classical = await announcedNameInEra("classical", TOWN_HALL_ID);
    expect(classical.callout).toBe(`${TOWN_HALL_LABEL}, the Senate House`);

    const medieval = await announcedNameInEra("medieval", TOWN_HALL_ID);
    expect(medieval.callout).toBe(`${TOWN_HALL_LABEL}, the Court House`);

    const industrial = await announcedNameInEra("industrial", TOWN_HALL_ID);
    expect(industrial.callout).toBe(`${TOWN_HALL_LABEL}, the Engine House`);

    // Early Modern has authored no dressing, so the hub degrades to the bare handle. Without
    // this the dressed assertions above could hold on hard-coded strings and mean nothing.
    const undressed = await announcedNameInEra("renaissance", TOWN_HALL_ID);
    expect(undressed.callout).toBe(TOWN_HALL_LABEL);
    expect(undressed.callout).not.toBe(eraOne.callout);
  });
});
