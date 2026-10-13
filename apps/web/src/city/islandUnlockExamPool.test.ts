import type { FrozenItem } from "@cr/item-bank";
import { ERA_SEQUENCE, getEraNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { createInterleavedScheduler } from "../lessons/infiniteScheduler";
import { practiceItemsById } from "../lessons/practiceChecker";
import { islandUnlockExamPool } from "./islandUnlockExamPool";

const BANK = [...practiceItemsById.values()];

describe("the unlock exam pool is the complete current island", () => {
  it("covers ERA_SEQUENCE exactly, with real floors and exact per-island composition", () => {
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    let coveredSkills = 0;

    for (const era of ERA_SEQUENCE) {
      const pool = islandUnlockExamPool(era.id);
      expect(pool.status, era.id).toBe("ready");
      expect(pool.skillIds, era.id).toEqual(getEraNodes(era.id));
      expect(pool.skillIds.length, era.id).toBeGreaterThanOrEqual(5);
      expect(new Set(pool.items.map((item) => item.node_id)), era.id).toEqual(
        new Set(getEraNodes(era.id)),
      );
      coveredSkills += pool.skillIds.length;
    }

    expect(coveredSkills).toBeGreaterThanOrEqual(50);
  });

  it("refuses safely and names a missing island skill instead of serving a shorter exam", () => {
    const era = ERA_SEQUENCE[0];
    expect(era).toBeDefined();
    if (!era) {
      return;
    }
    const missing = era.nodes[0] as string;
    const source = BANK.filter((item) => item.node_id !== missing);
    const pool = islandUnlockExamPool(era.id, source);

    expect(pool.status).toBe("unavailable");
    if (pool.status !== "unavailable") {
      return;
    }
    expect(pool.missingSkillIds).toEqual([missing]);
    expect(pool.message).toContain(missing);
    expect(pool.message).toContain(era.name);
  });

  it("drops an injected cross-era item and never leaks it into this island's exam", () => {
    const current = ERA_SEQUENCE[0];
    const other = ERA_SEQUENCE[1];
    expect(current).toBeDefined();
    expect(other).toBeDefined();
    if (!current || !other) {
      return;
    }
    const leaked = BANK.find((item) => item.node_id === other.nodes[0]);
    expect(leaked).toBeDefined();
    if (!leaked) {
      return;
    }

    const currentItems = BANK.filter((item) => current.nodes.includes(item.node_id));
    const pool = islandUnlockExamPool(current.id, [...currentItems, leaked]);

    expect(pool.status).toBe("ready");
    expect(pool.items).not.toContain(leaked);
    expect(pool.items.every((item) => current.nodes.includes(item.node_id))).toBe(true);
    expect(pool.skillIds).toEqual(current.nodes);
  });

  it("serves every island skill before any skill repeats, including the unmastered 20%", () => {
    const era = ERA_SEQUENCE.find((entry) => entry.nodes.length === 5);
    expect(era).toBeDefined();
    if (!era) {
      return;
    }
    const pool = islandUnlockExamPool(era.id);
    expect(pool.status).toBe("ready");
    if (pool.status !== "ready") {
      return;
    }

    const scheduler = createInterleavedScheduler(pool.items, () => 0);
    const firstCycle = era.nodes.map(() => scheduler.next());
    const secondCycle = era.nodes.map(() => scheduler.next());

    expect(new Set(firstCycle.map((item) => item.node_id))).toEqual(new Set(era.nodes));
    expect(new Set(secondCycle.map((item) => item.node_id))).toEqual(new Set(era.nodes));
    expect(firstCycle.at(-1)?.node_id).not.toBe(secondCycle[0]?.node_id);
  });

  it("avoids immediate item repeats when a skill has alternatives", () => {
    const era = ERA_SEQUENCE[0];
    expect(era).toBeDefined();
    if (!era) {
      return;
    }
    const skill = era.nodes.find(
      (nodeId) => BANK.filter((item) => item.node_id === nodeId).length > 1,
    );
    expect(skill).toBeDefined();
    if (!skill) {
      return;
    }
    const items = BANK.filter((item) => item.node_id === skill) as FrozenItem[];
    const scheduler = createInterleavedScheduler(items, () => 0);

    const first = scheduler.next();
    const second = scheduler.next();
    expect(second.item_version_id).not.toBe(first.item_version_id);
  });
});
