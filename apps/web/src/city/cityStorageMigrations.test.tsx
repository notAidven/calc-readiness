import { ERA_SEQUENCE } from "@cr/skill-graph";
import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { CitySurface } from "./CitySurface";
import { ERA_STATE_STORAGE_KEY } from "./eraState";
import { LEGACY_CEREMONY_KEY_PREFIX } from "./islandUnlockExamPersistence";
import { resetCityEra, setCityEra } from "./useCityEra";

afterEach(() => {
  localStorage.clear();
  resetCityEra();
});

it("runs the narrow legacy cleanup while standing in the final era", async () => {
  const finalEra = ERA_SEQUENCE.at(-1);
  expect(finalEra).toBeDefined();
  if (!finalEra) {
    return;
  }
  setCityEra(finalEra.id);
  const preserved = new Map([
    [ERA_STATE_STORAGE_KEY, finalEra.id],
    ["cr.archipelago.v1.dev", '{"islands":["kept"]}'],
    ["cr.city.devSession.v7.dev", '{"roads":["kept"],"civic":["kept"]}'],
    ["cr.economy.v3.dev", '{"materials":{"stone":80}}'],
    ["cr.completion.ceremony.v1", "complete"],
    ["cr.infinitePractice.bestStreak.era.cyberpunk", "17"],
  ]);
  for (const [key, value] of preserved) {
    localStorage.setItem(key, value);
  }
  for (const era of ERA_SEQUENCE) {
    localStorage.setItem(`${LEGACY_CEREMONY_KEY_PREFIX}${era.id}`, "4");
  }

  render(<CitySurface enableCanvas={false} />);

  await waitFor(() => {
    for (const era of ERA_SEQUENCE) {
      expect(localStorage.getItem(`${LEGACY_CEREMONY_KEY_PREFIX}${era.id}`)).toBeNull();
    }
  });
  for (const [key, value] of preserved) {
    expect(localStorage.getItem(key), key).toBe(value);
  }
});
