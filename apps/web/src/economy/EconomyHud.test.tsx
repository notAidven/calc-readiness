import { materialForEraOrThrow } from "@cr/economy";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EconomyHud } from "./EconomyHud";
import type { WalletView } from "./economyClient";
import type { UseEconomy } from "./useEconomy";

/**
 * **THE MATERIAL STOCKPILE IS ANNOUNCED WITH ITS UNIT.**
 *
 * Era one §6 puts every capacity, shortfall and count in the DOM because the 3D canvas
 * is `aria-hidden`, and §1 requires the stockpile to read as *"a count of worked pieces,
 * not a weight or a currency"* — so "300 pieces of Stone", not "Stone 300".
 *
 * The strip has room for a figure and a word, so the unit noun cannot be visible text and
 * has to reach the accessible tree some other way. The first attempt was an `aria-label`
 * on the value `<span>`, which does not work and cannot: a bare `<span>` has the GENERIC
 * role, a generic role takes no accessible name, so browsers and screen readers drop the
 * attribute. It read as fixed in review and announced nothing.
 *
 * **This file therefore asserts the ANNOUNCED text, not the attribute.** A test that
 * asserted `aria-label` would have passed for the whole time the unit was inaudible, which
 * is exactly the failure it is here to prevent. {@link announcedText} walks the subtree the
 * way an assistive tech does, skipping `aria-hidden` branches, so only text that genuinely
 * reaches the user counts.
 */

/**
 * What a screen reader reads out of a subtree: its text, minus every `aria-hidden`
 * branch. Deliberately does NOT honour `aria-label` — jsdom computes no accessible name,
 * and honouring it here would re-admit the defect this file exists for.
 */
function announcedText(root: HTMLElement): string {
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? "");
      return;
    }
    if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) {
      return;
    }
    if (node.getAttribute("aria-hidden") === "true") {
      return;
    }
    for (const child of Array.from(node.childNodes)) {
      walk(child);
    }
  };
  walk(root);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const STOCKPILE = 300;
/** Era one's material, read off the shipped table rather than transcribed here. */
const STONE = materialForEraOrThrow("prehistoric");

function wallet(spendableMaterial: WalletView["spendableMaterial"]): WalletView {
  return {
    materials: spendableMaterial === null ? {} : { [spendableMaterial.id]: STOCKPILE },
    spendable: STOCKPILE,
    spendableMaterial,
  };
}

function economy(spendableMaterial: WalletView["spendableMaterial"]): UseEconomy {
  return {
    wallet: wallet(spendableMaterial),
    reward: null,
    message: "",
    reconcileProgress: () => {},
    reportPracticeSetComplete: async () => null,
    reportInterleavedClear: async () => {},
    reportCivicBootstrap: async () => {},
    refresh: async () => {},
  };
}

function renderHud(spendableMaterial: WalletView["spendableMaterial"] = STONE) {
  render(<EconomyHud economy={economy(spendableMaterial)} reducedMotion />);
}

describe("the era material stockpile in the economy HUD", () => {
  it("announces the count WITH its unit noun, not the bare figure", () => {
    renderHud();
    const stat = screen.getByTestId("economy-material");

    // The whole claim, in the form the learner receives it. The unit noun and the name
    // both come off the shipped material table, so this cannot pass by transcription.
    expect(STONE.unit_noun).toBe("pieces");
    expect(announcedText(stat)).toContain(
      `${STOCKPILE} ${STONE.unit_noun} of ${STONE.display_name}`,
    );
  });

  it("keeps the VISIBLE strip a figure and a word, which is why the unit is hidden", () => {
    renderHud();
    // The strip itself is unchanged: the number alone, so the layout claim in the
    // component's own comment stays true and the phrase is additional, not visible.
    expect(screen.getByTestId("economy-material-value").textContent).toBe(
      String(STOCKPILE),
    );
  });

  it("draws the material itself in one ink instead of reusing the cut-gem HUD icon", () => {
    renderHud();
    const icon = screen.getByTestId("economy-material-icon");
    expect(icon).toHaveAttribute("data-material-id", STONE.id);
    expect(icon.querySelectorAll("path").length).toBeGreaterThanOrEqual(3);
    expect(icon.innerHTML).not.toContain("M6 3h12l3 6-9 12L3 9l3-6Z");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(STONE.display_name)).toBeInTheDocument();
  });

  it("announces the figure exactly once, so the count is not read twice", () => {
    renderHud();
    const announced = announcedText(screen.getByTestId("economy-material"));
    expect(announced.match(new RegExp(String(STOCKPILE), "g"))).toHaveLength(1);
  });

  it("shows the stockpile and NOTHING else — no XP meter, no Shop chip", () => {
    // The 2026-08-03 sunset, asserted on the rendered strip rather than on the source.
    // Both were siblings of the stat inside `.economy-hud-bar`, so their absence is a
    // claim about this component's output and not about an import list.
    renderHud();
    const hud = screen.getByTestId("economy-hud");
    expect(screen.queryByTestId("economy-xp")).toBeNull();
    expect(screen.queryByTestId("economy-shop-open")).toBeNull();
    expect(screen.queryByTestId("economy-xp-sub")).toBeNull();
    expect(hud.querySelector(".economy-meter")).toBeNull();
    // A floor under the absences: the strip is not empty, it is one stat.
    expect(hud.querySelectorAll(".economy-stat")).toHaveLength(1);
    expect(hud.querySelectorAll("button")).toHaveLength(0);
    expect(announcedText(hud)).not.toMatch(/\bxp\b|level|shop/i);
  });

  it("invents no unit noun in an era whose material nobody has authored", () => {
    // `spendableMaterial` is null for the nine `proposed` eras. The strip still shows a
    // number (it is the only currency), and it must not read out a unit it does not have.
    renderHud(null);
    const announced = announcedText(screen.getByTestId("economy-material"));

    expect(announced).toContain(`${STOCKPILE} Resource`);
    expect(announced).not.toContain(STONE.unit_noun);
    expect(announced).not.toContain(STONE.display_name);
    expect(screen.getByTestId("economy-material-icon")).toHaveAttribute(
      "data-material-id",
      "unknown",
    );
  });
});
