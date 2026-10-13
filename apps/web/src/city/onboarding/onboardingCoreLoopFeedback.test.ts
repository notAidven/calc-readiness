import { INTERLEAVED_PRACTICE_MIN_COMPLETED } from "@cr/economy";
import { describe, expect, it } from "vitest";

import { materialWord } from "../../economy/materialWord";
import { COACH_MARKS } from "../coachmarks/coachMarksCore";
import { CURRENT_ERA_ID } from "../eraDressing";
import {
  type OnboardingMoment,
  onboardingBriefingFor,
  onboardingBriefingLines,
} from "./onboardingScript";

const BRIEFING = onboardingBriefingFor(CURRENT_ERA_ID, { bay: true });
const MOMENTS = BRIEFING.moments;

function moment(id: string): OnboardingMoment {
  const found = MOMENTS.find((candidate) => candidate.id === id);
  expect(found, `the onboarding has no "${id}" moment`).toBeDefined();
  return found as OnboardingMoment;
}

function spoken(id: string): string {
  const found = moment(id);
  return `${found.lead} ${found.body}`;
}

describe("the first-run core loop requested after the island-unlock merge", () => {
  it("removes the crisis beat and the rejected promotional register", () => {
    const lines = onboardingBriefingLines(BRIEFING);
    const interleaved = COACH_MARKS.find((mark) => mark.id === "interleaved");
    const corpus = [
      ...lines,
      interleaved?.text(CURRENT_ERA_ID) ?? "",
      interleaved?.reference?.(CURRENT_ERA_ID) ?? "",
    ];

    expect(MOMENTS.map((entry) => entry.id)).not.toContain("crisis");
    expect(corpus.length, "the copy sweep is empty").toBeGreaterThan(20);
    for (const line of corpus) {
      expect(line, `rejected phrase in "${line}"`).not.toMatch(
        /\b(?:bare island|and it pays|your turn,? leader|good!|look at that|what a fine sight|never stops being a joy)\b/i,
      );
    }
    // Two named exceptions carry an exclamation mark on explicit product instruction
    // (2026-08-21): the advisor's own opening, and the "resources" moment's reward line.
    const EXCLAIMED = new Set([
      "Hello! I'm Oru, your advisor. I'll walk you through how the game works.",
      `Completing a practice set successfully grants you mastery of that skill and a reward of ${materialWord(CURRENT_ERA_ID)}!`,
      "You're all set, start building!",
    ]);
    for (const line of lines) {
      if (!EXCLAIMED.has(line)) {
        expect(line, `punchy exclamation in "${line}"`).not.toContain("!");
      }
    }
  });

  it("explains the skill-building construction and real reward rules", () => {
    expect(spoken("lessons")).toMatch(/\bstart lesson\b|\bopen\b[^.]*\blesson\b/i);
    expect(spoken("lessons")).toMatch(/\bconstruction\b/i);

    // Rewritten to the product's own exact reward sentence (2026-08-21), which states the
    // payout without the star count or "one-time" that the old copy spelled out.
    const resources = spoken("resources");
    expect(resources).toMatch(/\bpractice set\b[^.]*\brecords?\b[^.]*\bmastery\b/i);
    expect(resources).toMatch(
      new RegExp(`\\bgrants?\\b[^.]*\\breward\\b[^.]*\\b${materialWord(CURRENT_ERA_ID)}\\b`, "i"),
    );
    expect(resources).not.toMatch(/\bevery practice problem\b[^.]*\bpay/i);
  });

  it("distinguishes bought civic infrastructure from learned skill buildings", () => {
    const civic = spoken("civic");
    const cityLife = spoken("cityLife");

    expect(civic).toMatch(
      /\bcivic buildings?\b[^.]*\bseparate\b[^.]*\bskill buildings?\b/i,
    );
    expect(civic).toContain(materialWord(CURRENT_ERA_ID));
    expect(civic).toMatch(/\bbuy\b[^.]*\bcivic buildings?\b[^.]*\broads?\b/i);
    expect(cityLife).toMatch(/\blivability\b/i);
    expect(cityLife).toMatch(/\bhappiness\b/i);
    expect(cityLife).toMatch(/\bcivic buildings?\b[^.]*\braise\b/i);
    expect(cityLife).toMatch(/\broads?\b[^.]*\bhappiness\b/i);
  });

  it("names the Town Hall's exact live practice and bounded payout", () => {
    const townHall = spoken("townhall");

    expect(townHall).toMatch(/\bTown Hall\b/i);
    expect(townHall).toMatch(/\bInterleaved practice\b/);
    expect(townHall).toMatch(
      new RegExp(
        `\\bpractice sets?\\b[^.]*\\b${INTERLEAVED_PRACTICE_MIN_COMPLETED}\\b|\\b${INTERLEAVED_PRACTICE_MIN_COMPLETED}\\b[^.]*\\bskills?\\b`,
        "i",
      ),
    );
    expect(townHall).toMatch(
      new RegExp(`\\b(?:can|may) award\\b[^.]*\\b${materialWord(CURRENT_ERA_ID)}\\b`, "i"),
    );
    expect(townHall).toMatch(/\ballowance\b/i);
  });

  it("explains both directions of the real Bay", () => {
    const bay = spoken("bay");
    expect(bay).toMatch(/\b(?:completed|founded)\b[^.]*\bislands?\b/i);
    expect(bay).toMatch(/\bpreview\b[^.]*\blocked\b[^.]*\b(?:future )?islands?\b/i);
    expect(bay).toMatch(/\bopen\b[^.]*\bBay\b/i);
    expect(bay).toMatch(/\b(?:move|navigate|arrows?)\b/i);
    expect(bay).toMatch(/\breturn to (?:the )?tour\b/i);
  });
});
