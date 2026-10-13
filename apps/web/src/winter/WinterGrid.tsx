import {
  HARD_WINTER,
  type HardWinterView,
  type WinterActionTier,
  type WinterBuilding,
  type WinterCellView,
  winterMendCost,
} from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import type { ReactElement } from "react";
import { buildingSubtitle } from "../city/eraDressing";
import { placementLabel } from "../city/townHall";
import { materialWord } from "../economy/materialWord";

/**
 * THE ISLAND AS A 2D GRID — the whole visual of this prototype, and deliberately not the
 * 3D city.
 *
 * The brief's reasoning, kept here because it is the reason this file looks cheap: if the
 * loop is fun on a grid it will be fun in the city, and if it is not, we have learned
 * that for the price of some CSS instead of an art pipeline. So this touches nothing
 * under `city/three/`, adds no model, and renders 100 divs.
 *
 * The grid is era one's REAL island: a 10x10 bounding box with the twelve corner cells as
 * open water, which is exactly the 88 cells `isCellBuildable` yields at the era's
 * authored radius of 22. Every visual state comes off `hardWinterView`, so the picture
 * cannot disagree with the rules.
 *
 * ## What each state is for
 *
 * - **rim depth** shades the clear ground, so the player can see the frost's timetable
 *   before it arrives. This is what makes "light it ahead of the line" a plannable
 *   decision rather than a guess.
 * - **the frost line** is drawn on frozen cells that still touch clear ground — the
 *   leading edge, which is the only part of the frozen region that will move.
 * - **a ward** is drawn over the frost, because a fire on frozen ground is a real rescue:
 *   the building inside stops taking cold even though the ground stays frozen.
 * - **a ruin** keeps its cell and its glyph. It is a state, not a deletion, and it stays
 *   clickable so the learner never loses access to the lesson behind it.
 * - **a damaged building** is FROST CLIMBING THE BUILDING — see below.
 * - **the tier preview** is the nested footprint of the fire being aimed: the ground each
 *   accuracy tier would hold, from the cell under consideration. It is the only PROVISIONAL
 *   state on the board; the pull-back's ring preview and the abandoned-ground state it
 *   previewed both went with that action on 2026-08-02.
 *
 * ## How damage reads, and why it costs no art
 *
 * A damaged building is a third appearance beside standing and ruined, and it is drawn out
 * of what the board already has rather than out of anything new: the ICE TONE the ground
 * already uses, rising up the building's own cell in `HARD_WINTER.damage.stages` steps.
 * Frost climbing a building is the same picture as frost taking ground, one scale down, so
 * a player who has learnt to read the board already reads it, and nothing has to be drawn.
 *
 * NEVER HUE ALONE, and here the frost tone is the redundant channel rather than the
 * carrying one, because a damaged cell is often ON ice already. The two channels that
 * carry it are the HEIGHT of the rime (a third, two thirds, nearly full) and a NUMBER —
 * the stage, out of the stages there are — on the same badge slot the fire preview uses.
 * `winterDamageStage` decides the step, so the board cannot disagree with the rules about
 * how hurt something is.
 *
 * **THIS NEEDS NOTHING FROM EVAN.** It is one CSS gradient over an existing token. The 3D
 * city is the other question and it is not this file's: a ruin there is a geometry swap
 * (`apps/web/src/city/three/ruinStage.ts`, in flight on #287), and damage should be a
 * surface treatment on the BUILT model rather than a second geometry — rime on the roof,
 * not a different building — which is why it is drawn here as an overlay and not as a
 * different glyph.
 *
 * ## The preview is the fifth ground state, and the only PROVISIONAL one
 *
 * `frozen`, `warded` and the frost line are all facts about the board. The
 * preview is a hypothesis about a declaration nobody has made, so it is drawn in a
 * deliberately different register rather than as a fifth colour: **an outline and a
 * number, over ground that keeps whatever it already was.** A warded cell is a solid warm
 * FILL; a previewed cell keeps its ice or its grass and gains a ring, so the two can never
 * be confused and a preview over frozen ground still reads as frozen.
 *
 * THE NUMBER IS THE POINT, and it is why this does not rely on hue. Each previewed cell
 * carries the count of correct answers that would reach it — 1, 2 or 3 — so the nesting
 * is legible in greyscale, to a colour-blind player, and at a glance. The three rings also
 * differ in STROKE (solid, dashed, dotted), which is a second non-colour channel: the repo
 * holds the never-hue-alone rule everywhere, and two independent cues is what it takes for
 * a nested three-band figure where adjacent bands touch.
 *
 * ## Accessibility
 *
 * Every cell that can be acted on is a real `<button>` carrying a spoken label that names
 * what is there, where it is and what the ground is doing, so the whole encounter is
 * playable from the keyboard and findable by role. Inert ground is `aria-hidden`: 82
 * announced "empty tundra, two from the shore" cells would bury the six that matter, and
 * the shape of the island is already carried by the labels of the cells a player can act
 * on. No ARIA grid roles — a `role="grid"` promises two-dimensional arrow-key navigation
 * that this does not implement, and claiming it would be worse than not claiming it.
 */

/** How a cell may be used right now. `null` = the grid is not taking input. */
export type WinterGridMode = "fire" | "reinforce" | null;

/**
 * How many of the batch a tier costs — the number a previewed cell wears.
 *
 * Derived from the tier's own rung on the ladder rather than written out, so a retune of
 * `HARD_WINTER.tiers` or of `batch_size` moves the badge with it: `min_ratio` times the
 * batch, rounded up, is the smallest score that reaches the tier.
 */
export function correctNeededFor(tier: WinterActionTier): number {
  const rung = HARD_WINTER.tiers.find((entry) => entry.tier === tier);
  if (!rung) {
    return 0;
  }
  return Math.ceil(rung.min_ratio * HARD_WINTER.batch_size);
}

function cellClassName(cell: WinterCellView, selected: boolean): string {
  const parts = ["hw-cell"];
  if (!cell.land) {
    parts.push("hw-cell--water");
  } else {
    parts.push(`hw-cell--depth-${cell.rim_depth}`);
    if (cell.frozen) {
      parts.push("hw-cell--frozen");
    }
    if (cell.frost_line) {
      parts.push("hw-cell--line");
    }
    // The ground THIS round takes, which at round one is the only frost state on the board at
    // all: nothing is frozen until `end_round` runs, so without this the tuning board opens on
    // an island with no threat drawn anywhere on it.
    if (cell.frost_next) {
      parts.push("hw-cell--next");
    }
    if (cell.warded) {
      parts.push("hw-cell--warded");
    }
    if (cell.preview_tier !== null) {
      // Two classes, not one: the generic marker carries the provisional treatment (the
      // ring and the badge) and the per-tier one only varies the stroke, so the three
      // bands cannot drift apart in anything but the cue that distinguishes them.
      //
      // IT IS THE ONLY PROVISIONAL STATE NOW. There was a second, `hw-cell--preview-abandon`,
      // which showed the ring a pull-back would give up; it went with that action on 2026-08-02
      // (see `WinterAction` in `hard-winter.ts`), along with `hw-cell--abandoned` above it.
      parts.push("hw-cell--preview", `hw-cell--preview-${cell.preview_tier}`);
    }
  }
  if (cell.building) {
    parts.push("hw-cell--built");
    if (cell.building.state === "ruin") {
      parts.push("hw-cell--ruin");
    } else if (cell.damage_stage > 0) {
      // Two classes, the same way the tier preview does it: the generic marker carries the
      // rime and the badge, and the per-stage one only varies how high the frost has got.
      parts.push("hw-cell--hurt", `hw-cell--hurt-${cell.damage_stage}`);
    }
  }
  if (selected) {
    parts.push("hw-cell--selected");
  }
  return parts.join(" ");
}

/** The two-letter mark a building wears on the grid: "AH" for the Assembly Hall. */
export function buildingMark(nodeId: string): string {
  const words = placementLabel(nodeId).split(/\s+/);
  if (words.length === 1) {
    return (words[0] ?? nodeId).slice(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/** What a screen reader hears when it lands on a cell. */
export function cellLabel(cell: WinterCellView, era: EraId): string {
  if (!cell.land) {
    return `Open water at column ${cell.col}, row ${cell.row}`;
  }

  const ground =
    cell.warded && cell.frozen
      ? "frozen but sheltered by a fire"
      : cell.warded
        ? "sheltered by a fire"
        : cell.frozen
          ? "frozen"
          : `clear, ${cell.rim_depth} from the shore`;

  const here = cell.building
    ? `${describeBuilding(cell.building, era)}. `
    : "Empty ground. ";

  // The damage stage is announced as the step it is on, which is the same thing the rime's
  // height shows a sighted player. A frost line nobody can hear is not a read-out.
  const hurt =
    cell.building !== null && cell.building.state !== "ruin" && cell.damage_stage > 0
      ? ` Frost has climbed ${cell.damage_stage} of ${HARD_WINTER.damage.stages} steps up it.`
      : "";

  // The preview is announced as the SCORE that reaches it, which is the same thing the
  // badge shows a sighted player. A ring nobody can see is not a preview.
  const wouldHold =
    cell.preview_tier === null
      ? ""
      : ` The fire being aimed would hold this from ${correctNeededFor(cell.preview_tier)} of ${HARD_WINTER.batch_size} correct.`;

  // THE FRONT, IN WORDS. The island draws it as shove ice standing on the frost's edge with rime
  // reaching inward, and a mark nobody can hear is not a read-out — the same rule the damage
  // stage and the fire preview above are announced under. It is also the one clause that has
  // anything to say at round one, when nothing is frozen yet.
  const takenNext = cell.frost_next
    ? " The frost reaches this cell when this round ends."
    : "";

  return `${here}Column ${cell.col}, row ${cell.row}. Ground is ${ground}.${takenNext}${hurt}${wouldHold}`;
}

/**
 * The building's era-dressed name plus how the winter is treating it.
 *
 * A DAMAGED BUILDING SAYS SO IN WORDS, and in the same currency the outcome panel bills it
 * in, because "two cold rounds absorbed" told a player how much weather had happened and
 * not how much of the building was left. Frost climbing a cell is a picture; this is the
 * sentence a screen reader gets instead of it.
 */
export function describeBuilding(building: WinterBuilding, era: EraId): string {
  const subtitle = buildingSubtitle(building.node_id, era);
  const name = subtitle
    ? `${placementLabel(building.node_id)}, ${subtitle}`
    : placementLabel(building.node_id);
  if (building.state === "ruin") {
    return `${name}: a ruin since round ${building.ruined_in_round}`;
  }
  if (building.damage > 0) {
    return (
      `${name}: standing but frost-damaged, ${building.damage} of ` +
      `${HARD_WINTER.damage.ruin_at} points gone, ${winterMendCost(building.damage)} ` +
      `${materialWord(era)} to mend`
    );
  }
  return `${name}: standing and unmarked`;
}

export function WinterGrid({
  view,
  era,
  mode,
  selected,
  onPick,
}: {
  readonly view: HardWinterView;
  readonly era: EraId;
  readonly mode: WinterGridMode;
  /** The cell the player has aimed at, as `"col,row"`, or `null`. */
  readonly selected: string | null;
  readonly onPick: (cell: WinterCellView) => void;
}): ReactElement {
  return (
    <section
      className={mode === null ? "hw-grid" : `hw-grid hw-grid--aiming-${mode}`}
      aria-label={
        mode === "fire"
          ? "The island. Choose a cell to build the fire on."
          : mode === "reinforce"
            ? "The island. Choose a building to reinforce."
            : "The island"
      }
      style={{ "--hw-cols": view.rows[0]?.length ?? 0 } as Record<string, number>}
    >
      {view.rows.map((row) => (
        <div className="hw-grid__row" key={`row-${row[0]?.row ?? "empty"}`}>
          {row.map((cell) => {
            const key = `${cell.col},${cell.row}`;
            // A cell takes input when the grid is aiming at something it can be, or when
            // it holds a building (which is always inspectable — including a ruin, so the
            // lesson behind it never becomes unreachable).
            const actionable = cell.building !== null || (mode === "fire" && cell.land);

            if (!actionable) {
              return (
                <div
                  className={cellClassName(cell, selected === key)}
                  aria-hidden="true"
                  data-cell={key}
                  data-preview={cell.preview_tier ?? undefined}
                  key={key}
                >
                  {/*
                    Inert ground still shows the badge, because the preview's whole job is
                    to be a complete shape: a diamond with a bite out of it where the
                    abandoned ring falls would misdescribe what the fire would hold.
                  */}
                  {cell.preview_tier !== null && (
                    <span className="hw-cell__need">
                      {correctNeededFor(cell.preview_tier)}
                    </span>
                  )}
                </div>
              );
            }

            const label = cellLabel(cell, era);
            return (
              <button
                type="button"
                className={cellClassName(cell, selected === key)}
                key={key}
                aria-label={label}
                // The mark is two letters, so a sighted player needs the same sentence a
                // screen-reader user already gets. Same string, no second source of truth.
                title={label}
                data-cell={key}
                data-node={cell.building?.node_id}
                data-preview={cell.preview_tier ?? undefined}
                onClick={() => onPick(cell)}
              >
                {cell.building && (
                  <span className="hw-cell__mark" aria-hidden="true">
                    {cell.building.state === "ruin"
                      ? "\u2715"
                      : buildingMark(cell.building.node_id)}
                  </span>
                )}
                {/* The stage as a number, so the rime's height is not the only channel
                    carrying it. Suppressed under a fire preview, which owns the same slot
                    and is answering a different question about the same cell. */}
                {cell.building !== null &&
                  cell.building.state !== "ruin" &&
                  cell.damage_stage > 0 &&
                  cell.preview_tier === null && (
                    <span className="hw-cell__hurt" aria-hidden="true">
                      {cell.damage_stage}
                    </span>
                  )}
                {cell.preview_tier !== null && (
                  <span className="hw-cell__need" aria-hidden="true">
                    {correctNeededFor(cell.preview_tier)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}
