import { LEGACY_ERA_ONE_CIVIC_IDS } from "@cr/economy";
import { ERA_ONE_CIVIC_TYPES } from "@cr/game";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CitySurface } from "./CitySurface";
import { happinessReadout, UNHAPPY_WARNING } from "./CityVitalityPanel";
import { type CityDevSession, createCityDevSession } from "./citySession";
import { civicTestPayment } from "./civicTestSupport";
import { MOCK_MASTERED_NODE_STATES } from "./mockCity";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "./worldLayout";

/**
 * **BUYING A CIVIC BUILDING FROM THE HUD, AND THE BAND MOVING BECAUSE OF IT.**
 *
 * The end-to-end slice, on the surface a learner actually touches: open the build menu,
 * pick the Civic tab, choose a card, drop the ghost, and watch the City Life panel change
 * band. Nothing is stubbed except the wallet balance — the session is the real one, so
 * the price, the reachability gate and both capacity contributions are the shipped code's.
 *
 * ## Why the assertions are on the PANEL and the LIVE REGION rather than on the canvas
 *
 * Era one `civic-buildings.md` §6: *"Nothing carries meaning by art alone — the canvas is
 * `aria-hidden`, so every capacity, shortfall and count lives in the DOM."* A purchase
 * that only showed up as a new mass on the island would be invisible to the one surface
 * this city's state is legible on. So what is checked is the band's WORDS, the coverage
 * FIGURES, and the announced sentence — the three things a screen-reader user has.
 *
 * ## The number this test is really about
 *
 * A fully mastered era-one city is 48 people with 9 amenity coverage from its six skill
 * buildings, which is under 20% and `restless`. It could not leave that band, because the
 * one free civic row carries no happiness and nothing could be bought. One Campfire (100
 * stone, +20) takes it to 29 of 48 and `Settling in`; a second takes it to full coverage
 * and `Content`. Those figures are derived and asserted in
 * `engines/game/src/city-vitality-civic.test.ts`; here they are observed through the UI.
 */

/** A fully mastered, fully placed island — the city the band arithmetic is about. */
function masteredSession(): CityDevSession {
  const hall: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };
  return createCityDevSession(null, {
    nodeStates: MOCK_MASTERED_NODE_STATES,
    placements: defaultPlacements(
      MOCK_MASTERED_NODE_STATES.map((state) => state.node_id),
      [hall],
      BUILDABLE_RADIUS,
    ),
    townHall: hall,
  });
}

/** The City Life panel's happiness row, which carries the band words and the count. */
function happinessRow(): HTMLElement {
  return screen.getByTestId("vitality-happiness");
}

function bandWords(): string {
  return screen.getByTestId("vitality-happiness-terms").textContent ?? "";
}

/* -------------------------------------------------------------------------- */
/* Reading a glyph as a DRAWING, so two of them can be compared               */
/* -------------------------------------------------------------------------- */

/**
 * The geometry inside a glyph, in document order: every `d` and every circle's centre and
 * radius. Deliberately not `outerHTML` — the two glyphs being compared differ in class,
 * `data-testid` and size, none of which is the picture — and deliberately not the count of
 * elements, which two unrelated three-path icons would agree on.
 *
 * Takes either an `<svg>` or something containing one, because the panel puts its row icon
 * inside a `<dt>` and hangs its face `data-testid` on the `<svg>` itself.
 */
function shapeOf(host: Element | null | undefined): string[] {
  const svg = host?.tagName.toLowerCase() === "svg" ? host : host?.querySelector("svg");
  if (!svg) {
    return [];
  }
  return [...svg.querySelectorAll("path, circle")].map((node) =>
    node.tagName.toLowerCase() === "circle"
      ? `circle ${node.getAttribute("cx")},${node.getAttribute("cy")} r${node.getAttribute("r")}`
      : `path ${node.getAttribute("d")}`,
  );
}

/**
 * A face's outline and eyes: everything but the mouth, which is the last `path` in
 * `HappinessFace` and the one thing the card is allowed to set for itself.
 */
function withoutMouth(host: Element | null | undefined): string[] {
  return shapeOf(host).slice(0, -1);
}

function mouthOf(host: Element | null | undefined): string | undefined {
  const last = shapeOf(host).at(-1);
  return last?.replace(/^path /, "");
}

/**
 * Buy one civic building through the menu: open it, switch to Civic, choose the card,
 * and confirm the ghost where it opens (the seed is already a spot the rule accepts).
 */
async function buyFromMenu(
  user: ReturnType<typeof userEvent.setup>,
  cardTestId: string,
): Promise<void> {
  await user.click(await screen.findByRole("button", { name: "Build" }));
  await user.click(await screen.findByRole("tab", { name: /Civic/ }));
  await user.click(await screen.findByTestId(cardTestId));
  const bar = await screen.findByRole("group", { name: /Placing/ });
  await user.click(within(bar).getByRole("button", { name: /Build here/ }));
}

describe("buying a civic building moves the happiness band", () => {
  it("starts RESTLESS at 9 of 48 — the band a mastered city could not leave", async () => {
    render(<CitySurface enableCanvas={false} loadCity={masteredSession().load} />);

    await waitFor(() => {
      expect(happinessRow()).toBeInTheDocument();
    });
    expect(within(happinessRow()).getByText("9")).toBeInTheDocument();
    expect(within(happinessRow()).getByText("of 48")).toBeInTheDocument();
    // THE RESTLESS WORDING ON A CITY THAT IS LOSING PEOPLE is the lead's warning rather
    // than the mild band label: same band, said louder, because 9 of 48 is deep enough
    // under the departure line to take six people. `data-band` below is the band itself
    // and is what this case is really about.
    expect(bandWords()).toContain(UNHAPPY_WARNING);
    expect(happinessRow().querySelector("[data-band]")?.getAttribute("data-band")).toBe(
      "restless",
    );
  });

  it("reaches SETTLING on one Campfire, and says what it cost", async () => {
    const user = userEvent.setup();
    const session = masteredSession();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onMoveSkill={session.moveSkill}
        materialAvailable={600}
        materialLabel="stone"
        onPlaceCivic={(type, transform) =>
          session.placeCivic(type, transform, civicTestPayment(600))
        }
      />,
    );
    await waitFor(() => expect(bandWords()).toContain(UNHAPPY_WARNING));

    await buyFromMenu(user, "civic-card-prehistoric_campfire");

    // The band moved, in words and in the figures, and it moved because coverage went
    // from 9 to 29 — 9 from the skills plus the Campfire's authored 20.
    await waitFor(() => {
      expect(bandWords()).toContain("Settling in");
    });
    expect(within(happinessRow()).getByText("29")).toBeInTheDocument();
    expect(happinessRow().querySelector("[data-band]")?.getAttribute("data-band")).toBe(
      "settling",
    );
    expect(29 - 9).toBe(ERA_ONE_CIVIC_TYPES.campfire.happiness);

    // The purchase is SPOKEN, with its price and what it provides, because the building
    // appearing on an `aria-hidden` canvas says none of that.
    const spoken = screen.getByTestId("city-live-polite").textContent ?? "";
    expect(spoken).toContain("The Campfire");
    expect(spoken).toContain(`${ERA_ONE_CIVIC_TYPES.campfire.cost} stone`);
    expect(spoken).toContain("20 Happiness");

    // And the building is really on the island, at the price the catalogue set.
    const load = await session.load();
    expect(load.civic).toHaveLength(1);
    expect(load.civic_material_spent).toBe(0);
  });

  it("reaches CONTENT on a second Campfire, and the settled note appears", async () => {
    const user = userEvent.setup();
    const session = masteredSession();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        materialAvailable={600}
        materialLabel="stone"
        onPlaceCivic={(type, transform) =>
          session.placeCivic(type, transform, civicTestPayment(600))
        }
      />,
    );
    await waitFor(() => expect(bandWords()).toContain(UNHAPPY_WARNING));

    await buyFromMenu(user, "civic-card-prehistoric_campfire");
    await waitFor(() => expect(bandWords()).toContain("Settling in"));
    await buyFromMenu(user, "civic-card-prehistoric_campfire");

    await waitFor(() => {
      expect(bandWords()).toContain("Content");
    });
    // Full coverage, which is what `content` requires — era one §6's settled ending is
    // "everyone", not "most" — so the panel's settled note is now the true sentence.
    expect(within(happinessRow()).getByText("48")).toBeInTheDocument();
    expect(screen.getByTestId("vitality-settled")).toBeInTheDocument();
    expect((await session.load()).civic).toHaveLength(2);
    expect((await session.load()).civic_material_spent).toBe(0);
  });

  it("moves LIVABILITY for a Longhouse, on the panel's own row", async () => {
    const user = userEvent.setup();
    const session = masteredSession();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        materialAvailable={600}
        materialLabel="stone"
        onPlaceCivic={(type, transform) =>
          session.placeCivic(type, transform, civicTestPayment(600))
        }
      />,
    );
    const sustained = () =>
      within(screen.getByTestId("vitality-livability")).getByText("sustained")
        .previousElementSibling?.textContent ?? "";
    await waitFor(() => expect(sustained()).not.toBe(""));
    const before = Number(sustained());

    await buyFromMenu(user, "civic-card-prehistoric_longhouse");

    await waitFor(() => {
      expect(Number(sustained())).toBe(before + ERA_ONE_CIVIC_TYPES.longhouse.livability);
    });
    // The Longhouse carries BOTH dials (#236's rebalance is its 5 happiness), so the
    // happiness row moved too — which is what stops it reading as a Smokehouse that costs
    // a plot more.
    expect(within(happinessRow()).getByText("14")).toBeInTheDocument();
    expect(ERA_ONE_CIVIC_TYPES.longhouse.happiness).toBe(5);
  });
});

describe("the menu says what a purchase costs, and refuses without spending", () => {
  it("shows all four catalogue rows with their prices and both dials", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={masteredSession().load}
        materialAvailable={600}
        materialLabel="stone"
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Build" }));
    await user.click(await screen.findByRole("tab", { name: /Civic/ }));

    // Derived from the catalogue, and floored, so a fifth type is covered without an
    // edit here and an emptied catalogue cannot make this pass over nothing.
    const ids = Object.keys(ERA_ONE_CIVIC_TYPES) as (keyof typeof ERA_ONE_CIVIC_TYPES)[];
    expect(ids.length).toBeGreaterThanOrEqual(4);
    for (const id of ids) {
      const card = await screen.findByTestId(`civic-card-${LEGACY_ERA_ONE_CIVIC_IDS[id]}`);
      const row = ERA_ONE_CIVIC_TYPES[id];
      expect(card.textContent, id).toContain(row.name);
      expect(card.textContent, id).toContain(`${row.cost} stone`);
      /*
        A QUANTITY OF A NAMED STATISTIC, which is the wording the lead ruled on 2026-08-04
        off a running build: *"instead of saying 'sustains 40 more' it should say like '40
        Livability' with an associated livability icon."* It read `Sustains 40 more` and
        `Amenity for 10`, both of which describe an EFFECT without naming the dial it moves,
        so neither could be matched to a row of the CITY LIFE panel.

        The MIX is still on the card, both halves of it, because that is the axis the four
        types actually differ on (D-ERA24) and a card showing one dial would make two of
        them look identical.

        Shown red: restoring the old wording under the new icons fails here at *"smokehouse:
        expected 'The SmokehouseSustains 20 more2×1 plo…' to contain '20 Livability'"*, so
        this is a check on the words and not only on the number being present somewhere.
      */
      if (row.livability > 0) {
        expect(card.textContent, id).toContain(`${row.livability} Livability`);
      }
      if (row.happiness > 0) {
        expect(card.textContent, id).toContain(`${row.happiness} Happiness`);
      }
      // The plot size stays. It is the land half of the trade era two prices its steepest
      // premium against, and it is the one clause here that is not a city statistic.
      const [w, d] = row.footprint;
      expect(card.textContent, id).toContain(`${w}×${d} plot`);
    }
  });

  /**
   * **THE CARD'S ICON IS THE PANEL'S ICON, and this is what makes that a fact.**
   *
   * The lead's ask was for the glyph to tie the card to the readout — *"an associated
   * livability icon… likewise with happiness; it should have some kind of emoticon"* — and
   * the value of a tie is entirely in the two glyphs being the SAME drawing. A card that
   * merely has "an icon on it" satisfies the sentence and not the purpose: two similar
   * house outlines in two files drift on the next edit to either, and nothing would look
   * wrong at the moment the tie stopped being true.
   *
   * So the assertion compares the DRAWINGS, in one DOM that holds both — the build menu is
   * open over the live City Life panel, which is how a player meets them. The livability
   * glyph is required to match exactly. The happiness face is required to share its
   * outline, its eyes and its viewBox, with the MOUTH allowed to differ and required to be
   * the `content` mouth from the panel's own table: the panel's mouth is a reading of the
   * band the city is in, and a card quoting `+20 Happiness` has no band, so that one
   * difference is the design rather than a drift. This city is `restless`, so the mouths
   * really are different here and the exemption is doing something.
   *
   * **SHOWN RED, both halves.** Pointing the card's livability clause at `HudIcon
   * name="building"` — a plausible wrong answer, since that glyph is already on this very
   * card's price tag — fails at *"smokehouse livability: expected [ Array(1) ] to deeply
   * equal [ Array(1) ]"*. Giving the card's face `band="restless"`, which is this city's own
   * band and so passes the outline comparison, fails at *"longhouse mouth: expected 'M8.2
   * 16.4Q12 13 15.8 16.4' to be 'M8.2 14.4Q12 17.8 15.8 14.4'"*. The messages are quoted
   * rather than the line numbers, which move every time something is inserted above them.
   */
  it("draws the panel's own livability glyph and happiness face on the cards", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={masteredSession().load}
        materialAvailable={600}
        materialLabel="stone"
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Build" }));
    await user.click(await screen.findByRole("tab", { name: /Civic/ }));

    // The panel's two row labels, which are the glyphs being tied to.
    const panelLivability = screen.getByTestId("vitality-livability").querySelector("dt");
    const panelFace = screen.getByTestId("vitality-happiness-face");
    expect(
      shapeOf(panelLivability).length,
      "the panel's Livability row label draws nothing, so there is no glyph to tie to",
    ).toBeGreaterThan(0);
    expect(
      withoutMouth(panelFace).length,
      "the panel's happiness face draws nothing but a mouth",
    ).toBeGreaterThan(0);
    // The panel is RESTLESS here (9 of 48), so its mouth is not the card's — which is what
    // stops the mouth exemption below being satisfied by two identical faces.
    expect(panelFace.getAttribute("data-expression")).toBe("unhappy");

    const ids = Object.keys(ERA_ONE_CIVIC_TYPES) as (keyof typeof ERA_ONE_CIVIC_TYPES)[];
    expect(ids.length).toBeGreaterThanOrEqual(4);
    let livabilityGlyphs = 0;
    let happinessGlyphs = 0;
    for (const id of ids) {
      const card = await screen.findByTestId(`civic-card-${LEGACY_ERA_ONE_CIVIC_IDS[id]}`);
      const row = ERA_ONE_CIVIC_TYPES[id];
      const clauses = [...card.querySelectorAll(".build-card-stat")];
      // One clause per non-zero dial, so a card cannot pass by carrying a spare glyph.
      expect(clauses.length, id).toBe(
        (row.livability > 0 ? 1 : 0) + (row.happiness > 0 ? 1 : 0),
      );

      if (row.livability > 0) {
        const clause = clauses.find((node) =>
          (node.textContent ?? "").includes("Livability"),
        );
        expect(shapeOf(clause), `${id} livability`).toEqual(shapeOf(panelLivability));
        livabilityGlyphs += 1;
      }
      if (row.happiness > 0) {
        const clause = clauses.find((node) =>
          (node.textContent ?? "").includes("Happiness"),
        );
        const face = clause?.querySelector("svg");
        expect(face?.getAttribute("viewBox"), `${id} face`).toBe(
          panelFace.getAttribute("viewBox"),
        );
        // Outline and eyes: shared, exactly. Mouth: the `content` row of the panel's own
        // table, read from it rather than retyped here.
        expect(withoutMouth(face), `${id} face`).toEqual(withoutMouth(panelFace));
        expect(mouthOf(face), `${id} mouth`).toBe(happinessReadout("content").mouth);
        happinessGlyphs += 1;
      }
    }
    // FLOORS, because a `find` that stopped matching would leave both loops asserting
    // nothing at all. Era one's four rows are one pure-food, one blend, one amenity and
    // one dwelling, so both dials are genuinely covered more than once.
    expect(livabilityGlyphs, "no livability clause was compared").toBeGreaterThanOrEqual(3);
    expect(happinessGlyphs, "no happiness clause was compared").toBeGreaterThanOrEqual(3);
  });

  it("says what is short instead of opening a ghost nobody can confirm", async () => {
    const user = userEvent.setup();
    const session = masteredSession();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        materialAvailable={10}
        materialLabel="stone"
        onPlaceCivic={(type, transform) =>
          session.placeCivic(type, transform, civicTestPayment(10))
        }
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Build" }));
    await user.click(await screen.findByRole("tab", { name: /Civic/ }));

    // The card itself carries the shortfall, visibly, and it LEADS WITH THE STOCKPILE
    // rather than with the refusal: this sentence used to read "Not enough stone yet: you
    // have 10", which is what `test/cityCopyRegister.test.ts` exists to stop. Asserted
    // whole rather than by substring, because the property is which word comes first.
    expect(
      (await screen.findByTestId("civic-card-short-prehistoric_campfire")).textContent,
    ).toBe("You have 10 stone: 90 to go");

    await user.click(await screen.findByTestId("civic-card-prehistoric_campfire"));
    // No ghost, and the reason is ANNOUNCED — a disabled control the learner cannot
    // debug is the failure this avoids.
    expect(screen.queryByRole("group", { name: /Placing/ })).toBeNull();
    const spoken = screen.getByTestId("city-live-polite").textContent ?? "";
    expect(spoken).toContain("costs 100 stone and you have 10");
    expect(spoken).toContain("Nothing was spent");
    expect((await session.load()).civic).toEqual([]);
  });
});
