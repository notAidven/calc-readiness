import type {
  CivicBuildingDefinition,
  MaterialBalances,
  MaterialId,
  MaterialIdentity,
} from "@cr/economy";
import { materialForEraOrThrow } from "@cr/economy";
import { roadHappinessCoverage } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";

export type CompletionRewardContext =
  | "Lesson complete"
  | "Practice complete"
  | "Skill building complete"
  | "Building complete"
  | "Mastery complete"
  | "Road connected"
  | "Civic ready";

export type CompletionRewardGain =
  | {
      readonly kind: "material";
      readonly amount: number;
      readonly label: string;
      readonly materialId: MaterialId;
    }
  | {
      readonly kind: "mastery" | "population" | "livability" | "happiness";
      readonly amount: number;
      readonly label: string;
    };

export interface CompletionRewardDetail {
  readonly amount: number;
  readonly label: string;
}

export interface CompletionRewardCost {
  readonly amount: number;
  readonly label: string;
  readonly materialId: MaterialId;
}

/**
 * One committed completion transaction. Economic receipts express only positive deltas
 * plus separately-labelled costs; the lesson-completion acknowledgement is deliberately
 * gainless because finishing teaching does not grant mastery or resources.
 */
export interface CompletionRewardReceipt {
  readonly id: string;
  /** Receipts from different observers of one transaction coalesce on this key. */
  readonly groupKey: string;
  readonly context: CompletionRewardContext;
  readonly subject: string | null;
  readonly gains: readonly CompletionRewardGain[];
  readonly details: readonly CompletionRewardDetail[];
  readonly costs: readonly CompletionRewardCost[];
  readonly primaryLine: string;
  /** A completion-first headline; exact gains remain itemized beneath it. */
  readonly headline: string | null;
}

export interface CompletionCityTotals {
  readonly population: number;
  readonly livability: number;
  readonly happiness: number;
}

/**
 * Acknowledge the committed teaching/CFU transition without pretending it is the later
 * mastery/practice transaction. Its group is intentionally different from the economy's
 * `lesson_complete:{nodeId}` group, which belongs to a scored practice result.
 */
export function lessonCompletionReward(input: {
  readonly nodeId: string;
  readonly subject?: string | null;
}): CompletionRewardReceipt {
  const id = `lesson_taught:${input.nodeId}`;
  return {
    id,
    groupKey: id,
    context: "Lesson complete",
    subject: input.subject ?? null,
    gains: [],
    details: [],
    costs: [],
    primaryLine: "Lesson complete!",
    headline: "Lesson complete!",
  };
}

function materialIdentity(materialId: MaterialId): MaterialIdentity {
  for (const era of ERA_SEQUENCE) {
    const material = materialForEraOrThrow(era.id);
    if (material.id === materialId) {
      return material;
    }
  }
  throw new Error(`Era material identity is missing for ${materialId}.`);
}

function positiveAmount(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : 0;
}

function gainKey(gain: CompletionRewardGain): string {
  return gain.kind === "material" ? `material:${gain.materialId}` : gain.kind;
}

function primaryGain(gains: readonly CompletionRewardGain[]): CompletionRewardGain {
  const priority: Readonly<Record<CompletionRewardGain["kind"], number>> = {
    mastery: 5,
    material: 4,
    population: 3,
    livability: 2,
    happiness: 1,
  };
  const primary = [...gains].sort((a, b) => priority[b.kind] - priority[a.kind])[0];
  if (!primary) {
    throw new Error("A completion receipt must carry at least one positive gain.");
  }
  return primary;
}

/** A verified mastery-tier increase, used when no city/economy total was mutated. */
export function masteryStarReward(input: {
  readonly id: string;
  readonly groupKey: string;
  readonly subject: string;
  readonly before: number;
  readonly after: number;
  readonly total: number;
}): CompletionRewardReceipt | null {
  const amount = positiveAmount(input.after - input.before);
  if (amount === 0) {
    return null;
  }
  return receipt({
    id: input.id,
    groupKey: input.groupKey,
    context: "Mastery complete",
    subject: input.subject,
    gains: [
      {
        kind: "mastery",
        amount,
        label: amount === 1 ? "Mastery star" : "Mastery stars",
      },
    ],
    details: [{ amount: input.after, label: `of ${input.total} gold stars` }],
    costs: [],
  });
}

export function gainLine(gain: CompletionRewardGain): string {
  return `+${gain.amount} ${gain.label}`;
}

function receipt(
  input: Omit<CompletionRewardReceipt, "primaryLine" | "headline"> & {
    readonly headline?: string | null;
  },
): CompletionRewardReceipt {
  const gains = input.gains.filter((gain) => positiveAmount(gain.amount) > 0);
  const headline = input.headline ?? null;
  const primaryLine =
    gains.length > 0
      ? gainLine(primaryGain(gains))
      : input.context === "Lesson complete" && headline !== null
        ? headline
        : null;
  if (primaryLine === null) {
    throw new Error(
      "A completion receipt must carry at least one positive gain or acknowledge a lesson.",
    );
  }
  return {
    ...input,
    gains,
    primaryLine,
    headline,
  };
}

/**
 * Build a material receipt from the post-commit grant result. No recipe amount is
 * accepted here, so the UI cannot restate an economy constant or announce a request
 * that idempotency/capping did not actually credit.
 */
export function materialGrantReward(input: {
  readonly id: string;
  readonly groupKey: string;
  readonly context:
    | "Practice complete"
    | "Building complete"
    | "Mastery complete"
    | "Civic ready";
  readonly subject?: string | null;
  readonly grantedMaterials: MaterialBalances;
}): CompletionRewardReceipt | null {
  const gains: CompletionRewardGain[] = [];
  for (const [rawMaterialId, rawAmount] of Object.entries(input.grantedMaterials)) {
    const amount = positiveAmount(rawAmount);
    if (amount === 0) {
      continue;
    }
    const materialId = rawMaterialId as MaterialId;
    const material = materialIdentity(materialId);
    gains.push({
      kind: "material",
      amount,
      label: material.display_name,
      materialId,
    });
  }
  if (gains.length === 0) {
    return null;
  }
  return receipt({
    id: input.id,
    groupKey: input.groupKey,
    context: input.context,
    subject: input.subject ?? null,
    gains,
    details: [],
    costs: [],
  });
}

/** Positive city readout changes caused by one committed skill transition. */
export function skillCompletionReward(input: {
  readonly id: string;
  readonly groupKey: string;
  readonly context: "Skill building complete" | "Building complete" | "Mastery complete";
  readonly subject: string;
  readonly headline?: string | null;
  readonly before: CompletionCityTotals;
  readonly after: CompletionCityTotals;
}): CompletionRewardReceipt | null {
  const gains: CompletionRewardGain[] = [];
  const population = positiveAmount(input.after.population - input.before.population);
  const livability = positiveAmount(input.after.livability - input.before.livability);
  const happiness = positiveAmount(input.after.happiness - input.before.happiness);
  if (population > 0) {
    gains.push({
      kind: "population",
      amount: population,
      label: population === 1 ? "person" : "people",
    });
  }
  if (livability > 0) {
    gains.push({ kind: "livability", amount: livability, label: "Livability" });
  }
  if (happiness > 0) {
    gains.push({ kind: "happiness", amount: happiness, label: "Happiness" });
  }
  if (gains.length === 0) {
    return null;
  }
  return receipt({
    id: input.id,
    groupKey: input.groupKey,
    context: input.context,
    subject: input.subject,
    gains,
    details: [],
    costs: [],
    headline: input.headline,
  });
}

interface CivicCompletionResult {
  readonly status: string;
  readonly cost: number;
  readonly placementId: string | null;
  readonly economyStatus: string | null;
}

/** Gains from the catalogue row that was actually placed; a debit is a cost row. */
export function civicCompletionReward(input: {
  readonly id: string;
  readonly groupKey: string;
  readonly result: CivicCompletionResult;
  readonly building: CivicBuildingDefinition;
  readonly material: MaterialIdentity;
}): CompletionRewardReceipt | null {
  if (input.result.status !== "built" || input.result.placementId === null) {
    return null;
  }
  const gains: CompletionRewardGain[] = [];
  if (input.building.provides.livability > 0) {
    gains.push({
      kind: "livability",
      amount: input.building.provides.livability,
      label: "Livability",
    });
  }
  if (input.building.provides.happiness > 0) {
    gains.push({
      kind: "happiness",
      amount: input.building.provides.happiness,
      label: "Happiness",
    });
  }
  if (gains.length === 0) {
    return null;
  }
  const spentNow =
    input.result.economyStatus === "spent" ? positiveAmount(input.result.cost) : 0;
  return receipt({
    id: input.id,
    groupKey: input.groupKey,
    context: "Building complete",
    subject: input.building.name,
    gains,
    details: [],
    costs:
      spentNow > 0
        ? [
            {
              amount: spentNow,
              label: input.material.display_name,
              materialId: input.material.id,
            },
          ]
        : [],
  });
}

interface RoadCompletionResult {
  readonly status: string;
  readonly laidCount: number;
  readonly cost: number;
}

/**
 * A road's only canonical positive city effect is Happiness coverage. Connected
 * tile count is context, while material leaving the wallet stays a cost.
 */
export function roadCompletionReward(input: {
  readonly id: string;
  readonly groupKey: string;
  readonly result: RoadCompletionResult;
  readonly material: MaterialIdentity;
}): CompletionRewardReceipt | null {
  if (input.result.status !== "committed" || input.result.laidCount <= 0) {
    return null;
  }
  const happiness = positiveAmount(roadHappinessCoverage(input.result.laidCount));
  if (happiness === 0) {
    return null;
  }
  const laidCount = Math.max(0, Math.trunc(input.result.laidCount));
  const cost = positiveAmount(input.result.cost);
  return receipt({
    id: input.id,
    groupKey: input.groupKey,
    context: "Road connected",
    subject: null,
    gains: [{ kind: "happiness", amount: happiness, label: "Happiness" }],
    details: [
      {
        amount: laidCount,
        label: laidCount === 1 ? "road tile connected" : "road tiles connected",
      },
    ],
    costs:
      cost > 0
        ? [
            {
              amount: cost,
              label: input.material.display_name,
              materialId: input.material.id,
            },
          ]
        : [],
  });
}

const CONTEXT_PRIORITY: Readonly<Record<CompletionRewardContext, number>> = {
  "Skill building complete": 6,
  "Civic ready": 5,
  "Practice complete": 4,
  "Mastery complete": 3,
  "Building complete": 2,
  "Road connected": 1,
  "Lesson complete": 0,
};

/** Merge observers of one transaction without turning duplicate observation into gain. */
export function mergeCompletionRewards(
  left: CompletionRewardReceipt,
  right: CompletionRewardReceipt,
): CompletionRewardReceipt {
  if (left.groupKey !== right.groupKey) {
    throw new Error("Only completion receipts for one transaction may be coalesced.");
  }
  const gains = new Map<string, CompletionRewardGain>();
  for (const gain of [...left.gains, ...right.gains]) {
    const key = gainKey(gain);
    const held = gains.get(key);
    if (!held || gain.amount > held.amount) {
      gains.set(key, gain);
    }
  }
  const details = new Map<string, CompletionRewardDetail>();
  for (const detail of [...left.details, ...right.details]) {
    const key = detail.label;
    const held = details.get(key);
    if (!held || detail.amount > held.amount) {
      details.set(key, detail);
    }
  }
  const costs = new Map<MaterialId, CompletionRewardCost>();
  for (const cost of [...left.costs, ...right.costs]) {
    const held = costs.get(cost.materialId);
    if (!held || cost.amount > held.amount) {
      costs.set(cost.materialId, cost);
    }
  }
  const context =
    CONTEXT_PRIORITY[right.context] > CONTEXT_PRIORITY[left.context]
      ? right.context
      : left.context;
  return receipt({
    id: left.id === right.id ? left.id : `${left.id}|${right.id}`,
    groupKey: left.groupKey,
    context,
    subject: left.subject ?? right.subject,
    gains: [...gains.values()],
    details: [...details.values()],
    costs: [...costs.values()],
    headline: left.headline ?? right.headline,
  });
}
