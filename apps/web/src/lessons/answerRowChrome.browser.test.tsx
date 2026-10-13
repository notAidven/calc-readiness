import {
  createGraphComparator,
  GRAPH_COMPARATOR_VERSION,
  type GraphExpected,
  GraphInput,
  getInteractiveModule,
  toGraphWorkspace,
} from "@cr/components";
import type { FrozenItem } from "@cr/item-bank";
import { cleanup, render } from "@testing-library/react";
import { page } from "@vitest/browser/context";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { LessonPractice } from "./LessonPractice";
import { fixedSource, INTERACTIVE_SERVED_ITEMS } from "./practiceSurfaceFixture";

import "../styles.css";

/**
 * How the answer row is DRAWN, over every interactive widget a practice surface serves.
 *
 * `practicePromptOnce` established what the row says; this is the other half, and it needed
 * saying because three of these widgets shipped with class names and no stylesheet behind
 * them. Nothing in `apps/web/src/styles.css` matched `cr-expr-builder-input`,
 * `cr-number-line-input` or `cr-graph-input`, and `packages/shared-components` ships no CSS
 * at all, so what a learner met on a hard EXP.1 was drawn by the user agent and by rules
 * written for a single bare `<input>`:
 *
 *   - the browser's own `<fieldset>` frame boxing "Base" and "Exponent";
 *   - `base^exponent` printed over a group whose fields already say Base and Exponent;
 *   - the two fields jammed edge to edge, because `<span>Base</span><input>` is bare inline
 *     flow and nothing spaced it;
 *   - a Check button stretched into a full-height slab beside the widget column.
 *
 * All four are geometry or text over the SHIPPED stylesheet, so they need real Chromium and
 * `styles.css` imported LAST, exactly as `main.tsx` imports it (see
 * lessonVisualSurd.browser.test.tsx for why the order matters).
 *
 * WHY THESE FOUR TOGETHER. They are one defect — "no one ever styled this widget" — with
 * four visible faces, and each face was separately invisible to every existing test. A file
 * per face would have made four populations to keep in step.
 */

afterEach(cleanup);

/**
 * A desktop answer row, because "are these two fields far enough apart" is only a question
 * where they are on one line. The default iframe is narrower than the row needs, and every
 * field wrapped onto a line of its own there — which does not make the spacing correct, it
 * makes it unmeasured, and the floors below would have failed rather than pass vacuously.
 * A phone stacks these fields on purpose, and the row gap that separates them there is
 * `--space-md` on the fieldset, not this.
 */
beforeAll(async () => {
  await page.viewport(1000, 800);
});

/** `--space-sm`, the tightest gap in the sheet that still reads as a gap. */
const MIN_GAP = 8;

/** `--space-xs`, which is all a name needs to sit clear of the box it labels. */
const MIN_LABEL_GAP = 4;

/** Two boxes are on one visual row if their tops agree within this, in px. */
const SAME_ROW = 4;

/** The widget subtree and the Check button that submits it, from a mounted surface. */
function row(container: HTMLElement): { widget: HTMLElement; check: HTMLButtonElement } {
  const form = container.querySelector<HTMLElement>("form.lesson-player__row");
  if (form === null) {
    throw new Error("the surface mounted no answer row");
  }
  const widget = form.querySelector<HTMLElement>(
    ".cr-expr-builder-input, .cr-number-line-input, .cr-graph-input",
  );
  const check = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (widget === null || check === null) {
    throw new Error("the answer row holds no interactive widget with a Check beside it");
  }
  return { widget, check };
}

/**
 * The layout template the widget's own workspace carries, where it has one.
 *
 * Read from the module the surface itself dispatches to, not from a list here, so the
 * string being asserted absent is the string that widget would print if it printed one.
 */
function templateOf(item: FrozenItem): string | null {
  const module = getInteractiveModule(item.answer.answer_spec.answer_type);
  if (module === undefined || item.answer.interactive_spec === undefined) {
    return null;
  }
  const workspace = module.toWorkspace(item.answer.interactive_spec) as {
    template?: unknown;
  };
  return typeof workspace.template === "string" && workspace.template.trim() !== ""
    ? workspace.template
    : null;
}

function fields(root: ParentNode): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      ".cr-expr-builder-input__field, .cr-number-line-input__field, .cr-graph-input__field",
    ),
  );
}

/** Whether an element paints a frame a learner can see on any side. */
function paintsBorder(el: HTMLElement): string | null {
  const style = getComputedStyle(el);
  for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
    const lineStyle = style[`border${side}Style` as "borderTopStyle"];
    const width = Number.parseFloat(style[`border${side}Width` as "borderTopWidth"]);
    if (lineStyle !== "none" && lineStyle !== "hidden" && width > 0) {
      return `border-${side.toLowerCase()}: ${width}px ${lineStyle}`;
    }
  }
  return null;
}

/** What one mounted answer row gets wrong, plus what it was able to measure. */
interface Reading {
  readonly defects: readonly string[];
  readonly fieldsets: number;
  readonly gaps: number;
  readonly labelGaps: number;
}

function readRow(widget: HTMLElement, check: HTMLButtonElement, id: string): Reading {
  const defects: string[] = [];

  // 1. No fieldset paints a frame. `<fieldset>` is the right grouping element and its UA
  //    border is not the right drawing of it, which the answer column's own `<fieldset>`
  //    knew and these three never did.
  const fieldsets = Array.from(widget.querySelectorAll<HTMLElement>("fieldset"));
  for (const fieldset of fieldsets) {
    const painted = paintsBorder(fieldset);
    if (painted !== null) {
      defects.push(`${id}: a fieldset still paints the UA frame (${painted})`);
    }
  }

  // 2. Adjacent fields are separated, and each field's name is clear of its own box.
  let gaps = 0;
  let labelGaps = 0;
  const all = fields(widget);
  for (const [index, field] of all.entries()) {
    const name = field.querySelector<HTMLElement>("span");
    const box = field.querySelector<HTMLElement>("input");
    if (name !== null && box !== null) {
      const between = box.getBoundingClientRect().left - name.getBoundingClientRect().right;
      labelGaps += 1;
      if (between < MIN_LABEL_GAP) {
        defects.push(
          `${id}: "${(name.textContent ?? "").trim()}" sits ${between.toFixed(1)}px from its box`,
        );
      }
    }
    const next = all[index + 1];
    if (next === undefined) {
      continue;
    }
    const here = field.getBoundingClientRect();
    const there = next.getBoundingClientRect();
    if (Math.abs(here.top - there.top) > SAME_ROW) {
      continue; // different rows; the row gap is a separate measurement
    }
    gaps += 1;
    if (there.left - here.right < MIN_GAP) {
      defects.push(
        `${id}: two fields are ${(there.left - here.right).toFixed(1)}px apart, so they read as one control`,
      );
    }
  }

  // 3. The Check button is one control tall, not the widget column's slab. Measured against
  //    a field inside the widget rather than against a constant, since the button and the
  //    field carry the same padding and font on purpose.
  const sample = widget.querySelector<HTMLElement>("input");
  const buttonH = check.getBoundingClientRect().height;
  const widgetH = widget.getBoundingClientRect().height;
  if (sample !== null) {
    const fieldH = sample.getBoundingClientRect().height;
    if (buttonH > fieldH + 4) {
      defects.push(
        `${id}: the Check button is ${buttonH.toFixed(1)}px tall beside a ${fieldH.toFixed(1)}px field`,
      );
    }
  }
  // ...and the claim is not trivially true: the column really is taller than one control,
  // so a button matching it would be the slab this asserts against.
  if (widgetH <= buttonH + 10) {
    defects.push(
      `${id}: the widget column is only ${widgetH.toFixed(1)}px tall, so "the button is not a slab" measured nothing`,
    );
  }

  return { defects, fieldsets: fieldsets.length, gaps, labelGaps };
}

/** Sweep the graded surface over the whole served interactive population. */
function sweep(): {
  defects: string[];
  fieldsets: number;
  gaps: number;
  labelGaps: number;
  templates: number;
} {
  const defects: string[] = [];
  let fieldsets = 0;
  let gaps = 0;
  let labelGaps = 0;
  let templates = 0;

  for (const item of INTERACTIVE_SERVED_ITEMS) {
    const container = render(
      <LessonPractice nodeId={item.node_id} source={fixedSource(item)} />,
    ).container;
    const { widget, check } = row(container);
    const reading = readRow(widget, check, item.item_version_id);
    defects.push(...reading.defects);
    fieldsets += reading.fieldsets;
    gaps += reading.gaps;
    labelGaps += reading.labelGaps;

    // Scoped to the WIDGET, because the claim is about what the widget draws. The page
    // around it may legitimately say the same thing: the answer-format guidance spells the
    // expected shape out in prose for four of the RAD.3 items, which is a sentence written
    // for the learner, not a widget echoing its own internals.
    const template = templateOf(item);
    if (template !== null) {
      templates += 1;
      if ((widget.textContent ?? "").includes(template)) {
        defects.push(
          `${item.item_version_id}: prints its workspace template "${template}" at the learner`,
        );
      }
    }
    cleanup();
  }

  return { defects, fieldsets, gaps, labelGaps, templates };
}

describe("the answer row's chrome, over every served interactive widget", () => {
  it("draws no frame, echoes no template, spaces its fields, and keeps Check one control tall", () => {
    const seen = sweep();
    expect(
      seen.defects.slice(0, 4),
      `${seen.defects.length} defects over ${INTERACTIVE_SERVED_ITEMS.length} served interactive items`,
    ).toEqual([]);
  }, 240_000);

  /**
   * Floors, because every assertion above is an absence or an inequality and all of them
   * hold over nothing. Each counts the thing its own claim needs to have existed: a
   * selector rename that stopped matching fieldsets, or a widget that stopped having two
   * fields to space, would otherwise leave the sweep green having measured neither.
   */
  it("measured a fieldset, a field gap, a label gap and a template on real mounts", () => {
    const seen = sweep();
    expect(seen.fieldsets, "no fieldset was measured for a frame").toBeGreaterThanOrEqual(
      INTERACTIVE_SERVED_ITEMS.length,
    );
    expect(seen.gaps, "no two adjacent fields were measured").toBeGreaterThanOrEqual(6);
    expect(seen.labelGaps, "no field name was measured against its box").toBeGreaterThan(6);
    expect(
      seen.templates,
      "no workspace carried a template, so the echo check asserted nothing",
    ).toBeGreaterThanOrEqual(6);
  }, 240_000);
});

/**
 * `GraphInput`, which the sweep above cannot reach.
 *
 * No practice item is graph-answered — the fact `practicePromptOnce`'s served-type census
 * pins — so the third widget carrying the same unstyled `__group` fieldsets would be
 * silently outside every claim in this file. It gets the same reading from a direct mount
 * in the row it would sit in.
 *
 * Mounted HERE rather than beside `graph-input.browser.test.tsx` in
 * `packages/shared-components`, for one reason: the stylesheet under test lives in
 * `apps/web`, and a package test reaching across the workspace to import an app's CSS
 * would put the rules and the thing measuring them in different places again, which is how
 * the widget came to have no rules in the first place.
 */
describe("GraphInput, which no served item reaches", () => {
  it("is drawn to the same contract as the widgets that are served", () => {
    const expected: GraphExpected = {
      domain: [-4, 4],
      features: [
        { kind: "vertex", point: { x: 1, y: -2 }, tolerance: 0.3, label: "vertex" },
        { kind: "x_intercept", point: { x: 3, y: 0 }, tolerance: 0.3, label: "root" },
      ],
    };
    const container = render(
      <form className="lesson-player__row">
        <GraphInput
          itemVersionId="chrome"
          checkerVersion={GRAPH_COMPARATOR_VERSION}
          comparator={createGraphComparator({
            itemVersions: [{ item_version_id: "chrome", node_id: "CHROME", expected }],
          })}
          workspace={toGraphWorkspace(expected)}
          label="Mark the features"
        />
        <button type="submit">Check</button>
      </form>,
    ).container;

    const widget = container.querySelector<HTMLElement>(".cr-graph-input");
    const check = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (widget === null || check === null) {
      throw new Error("the graph row did not mount");
    }
    const reading = readRow(widget, check, "graph_input");
    expect(reading.defects).toEqual([]);
    expect(reading.fieldsets, "the graph widget drew no fieldset").toBeGreaterThan(0);
    expect(reading.gaps, "the graph widget drew no two adjacent fields").toBeGreaterThan(0);
  });
});
