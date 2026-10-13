import type { CityStormView, StormPrompt } from "@cr/game";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StormBattleScaffold } from "./StormBattleScaffold";

const readyStorm: CityStormView = {
  neighborhood_id: "D1",
  unlocked: true,
  checkpoint_cleared: false,
  phase: "ready",
  item_count: 2,
  clear_ratio: 0.8,
  required_correct: 2,
};

const prompts: StormPrompt[] = [
  { item_version_id: "a", node_id: "NUM.S", prompt: "1 + 1 = ?" },
  { item_version_id: "b", node_id: "NUM.F", prompt: "2 + 2 = ?" },
];

const noop = (): void => undefined;

describe("StormBattleScaffold", () => {
  it("keeps the entry CTA disabled until the neighborhood is ready", () => {
    render(
      <StormBattleScaffold
        storm={{ ...readyStorm, phase: "locked", unlocked: false }}
        prompts={prompts}
        onExit={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /begin the storm/i })).toBeDisabled();
  });

  it("runs entry -> battle -> result and clears with an always-correct checker", () => {
    render(
      <StormBattleScaffold
        storm={readyStorm}
        prompts={prompts}
        onExit={noop}
        checkAnswer={() => true}
        now={() => 0}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /begin the storm/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(screen.getByText(/storm cleared/i)).toBeInTheDocument();
  });
});
