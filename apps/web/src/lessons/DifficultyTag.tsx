import type { ItemDifficulty } from "@cr/item-bank";

const LABELS: Record<ItemDifficulty, { text: string; variant: string }> = {
  1: { text: "Easy", variant: "easy" },
  2: { text: "Medium", variant: "medium" },
  3: { text: "Hard", variant: "hard" },
};

/** A small colored pill naming a practice item's difficulty (Easy / Medium / Hard). */
export function DifficultyTag({ difficulty }: { difficulty: ItemDifficulty }) {
  const { text, variant } = LABELS[difficulty];
  return <span className={`difficulty-tag difficulty-tag--${variant}`}>{text}</span>;
}
