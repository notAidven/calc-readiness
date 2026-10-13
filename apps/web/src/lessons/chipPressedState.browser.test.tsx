/**
 * A CHOSEN CHIP LOOKS CHOSEN, AND A SETTLED CHIP THAT IS STILL TEACHING IS NOT DIMMED.
 *
 * Two claims about `.lesson-interactive__chip`, both of them about a state the stylesheet had no
 * rule for, and both of them measured on the board rather than read out of the source.
 *
 * ## 1. THE PRESSED STATE
 *
 * `aria-pressed` was set correctly on every chip in the tree and nothing anywhere drew it.
 * `.lesson-sorter__chip[aria-pressed="true"]` exists; `.lesson-interactive__chip[aria-pressed]`
 * did not, so four widgets each swapped an inline `borderColor` between `--line` and `--ink-soft`
 * to stand in for it — two greys, 1.5px wide, on a white button. On LIN.4 that is the whole of
 * the feedback for "which way does this range run", and a learner cannot see it.
 *
 * Asserted twice, because the two halves fail in different ways:
 *
 *  - THE RULE EXISTS AND SAYS MORE THAN ONE THING. Measured on a probe pair in the live
 *    document, two chips identical but for `aria-pressed`, so the reading is a DIFFERENCE rather
 *    than a value somebody copied out of the stylesheet. Colour alone would be one channel; a
 *    fill, an edge colour and an inset edge are three, and a learner who cannot separate two
 *    greys still gets the fill.
 *  - AND IT REACHES THE BOARDS. A rule that every widget overrides inline is a rule that changes
 *    nothing, which is exactly the state `interactive-visuals`' `--mixed` opt-out was in when the
 *    case-transform sweep found it unapplied on the two classes it was invented for. So the
 *    second claim mounts every placed visual, presses a chip, and measures THAT chip.
 *
 * BORDER WIDTH IS DELIBERATELY EXCLUDED from the pressed treatment and asserted to be unchanged.
 * `classifyChipFit.browser.test.tsx` measures painted labels against chip content boxes, and its
 * floors were taken against the boxes these borders produce; a heavier border is a narrower box
 * on every classify board at once. An inset shadow reads as a heavier edge and occupies no space.
 *
 * ## 2. THE SETTLED MARK
 *
 * `.lesson-interactive__chip:disabled` dims every settled control to 40%, and on a missed
 * classify row one of those settled controls is the answer: the dashed tick on the call the
 * learner did not make is the entire teaching of that row. The escape hatch
 * `.lesson-interactive__chip[data-mark]:disabled { opacity: 1 }` has been in the stylesheet since
 * the binary-row family needed it, and `abs-count-classify` — which has just migrated onto the
 * same subgrid — never opted in, so its standing tick was drawn at 40%.
 *
 * The population is DERIVED FROM WHAT IS PAINTED rather than from `data-mark`, which is the
 * attribute under test: a settled option carrying a mark GLYPH is one that has something to say,
 * whatever attribute it does or does not carry. Scoping it to the widgets that already set
 * `data-mark` would be scoping the guard by the fix and could never have found this board.
 *
 * Real Chromium and the real stylesheet, because every number here is a computed style.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { allLessons } from "./domains";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window, and the viewport every frame in this file is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

let h: Harness | null = null;

beforeAll(async () => {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Every visual id any lesson places, across every registered domain. */
function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

/**
 * The channels a chip may report "chosen" in, apart from its width.
 *
 * Read as computed values so the comparison is of what the browser resolved, not of what the
 * stylesheet asked for.
 */
function treatment(chip: HTMLElement): Record<string, string> {
  const style = getComputedStyle(chip);
  return {
    "background-color": style.backgroundColor,
    "border-color": style.borderTopColor,
    "box-shadow": style.boxShadow,
    outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
    "font-weight": style.fontWeight,
  };
}

/** The property names on which two chips are drawn differently. */
function differences(a: HTMLElement, b: HTMLElement): string[] {
  const left = treatment(a);
  const right = treatment(b);
  return Object.keys(left).filter((key) => left[key] !== right[key]);
}

/** The four border widths, which the pressed state may not touch. */
function borderWidths(chip: HTMLElement): string {
  const style = getComputedStyle(chip);
  return [
    style.borderTopWidth,
    style.borderRightWidth,
    style.borderBottomWidth,
    style.borderLeftWidth,
  ].join("/");
}

/**
 * THE RULE ITSELF, measured as a difference between two chips in the live document.
 *
 * A probe pair rather than a real board, because a real board's chip carries inline colours and
 * per-widget state, and this claim is about the shared layer alone: it fails when the rule is
 * absent, and it cannot be satisfied by one widget styling itself. `binaryRowMarks` uses the same
 * shape for the same reason.
 */
test("the shared layer draws a pressed chip differently from an unpressed one", () => {
  const holder = document.createElement("div");
  holder.className = "lesson-interactive__controls";
  document.body.appendChild(holder);
  const make = (pressed: boolean): HTMLElement => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "lesson-interactive__chip";
    chip.setAttribute("aria-pressed", pressed ? "true" : "false");
    chip.textContent = "Runs downward";
    holder.appendChild(chip);
    return chip;
  };
  const off = make(false);
  const on = make(true);

  try {
    const said = differences(on, off);
    expect(
      said.join(", "),
      "a pressed chip and an unpressed one are drawn identically, so nothing on screen says which one the learner chose",
    ).not.toBe("");
    // More than one channel, so the state survives a learner who cannot separate two hues.
    expect(
      said.length,
      `the pressed state is carried by ${said.join(", ") || "nothing"} alone, which is one channel`,
    ).toBeGreaterThan(1);
    // And a fill specifically: an edge treatment alone is what the two greys already were.
    expect(
      said,
      "the pressed state changes no fill, so it is still only an edge on a white button",
    ).toContain("background-color");

    // THE CONSTRAINT. `classifyChipFit`'s floors were measured against these content boxes.
    expect(
      borderWidths(on),
      "the pressed state changed the border WIDTH, which narrows the content box of every classify chip and moves the floors classifyChipFit was measured at",
    ).toBe(borderWidths(off));
  } finally {
    holder.remove();
  }
});

/** One board where a chip could be pressed, and what pressing it changed. */
interface PressReading {
  readonly visual: string;
  /** The channels the pressed chip differs from an unpressed sibling on. */
  readonly said: string[];
  readonly widthsHeld: boolean;
}

async function mountVisual(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, `${id} mounts`);
  await document.fonts.ready;
  return host;
}

/**
 * Press one chip on every placed board that offers a pressable one, and measure it.
 *
 * The population is derived at RUNTIME rather than from the sources, because what this claim
 * needs is not "the widget writes `aria-pressed`" but "a learner can press this and see it": a
 * chip that latches and disables itself on the same tap is a different state with its own rules,
 * and a board whose chips are all held by a drag pickup never reports `false` to begin with. So
 * a board joins the population exactly when a tap on it turns an enabled chip from unpressed to
 * pressed and leaves an unpressed sibling to compare it against.
 */
async function sweep(): Promise<PressReading[]> {
  const readings: PressReading[] = [];

  for (const id of liveVisualIds()) {
    const host = await mountVisual(id);
    const offered = all<HTMLButtonElement>(
      host,
      '.lesson-interactive__chip[aria-pressed="false"]:not(:disabled)',
    );
    if (offered.length > 1) {
      offered[0]?.click();
      // Past the 120ms background transition on `.lesson-interactive__chip`: a computed style
      // read mid-transition is a colour nobody wrote.
      await pause(200);
      const pressed = all<HTMLElement>(
        host,
        '.lesson-interactive__chip[aria-pressed="true"]:not(:disabled)',
      )[0];
      const unpressed = all<HTMLElement>(
        host,
        '.lesson-interactive__chip[aria-pressed="false"]:not(:disabled)',
      )[0];
      if (pressed !== undefined && unpressed !== undefined) {
        readings.push({
          visual: id,
          said: differences(pressed, unpressed),
          widthsHeld: borderWidths(pressed) === borderWidths(unpressed),
        });
      }
    }
    h?.cleanup();
    h = null;
  }

  return readings;
}

let pressed: Promise<PressReading[]> | null = null;
function sweepOnce(): Promise<PressReading[]> {
  pressed ??= sweep();
  return pressed;
}

/**
 * A floor, not a count. Seven placed boards let a learner press a chip and leave another
 * unpressed beside it — `equivalent-fraction-play`, `common-denominator-multiples`,
 * `inequality-endpoint-drag`, `negative-flip-play`, `interval-write-builder`,
 * `rational-subtract-sign-play` and `log-domain-builder`, all seven of which reported one
 * channel or none before the rule above existed. The floor is what stops the claim reading green
 * over a sweep that pressed nothing, which is what a renamed class would produce.
 */
const PRESSABLE_BOARD_FLOOR = 7;

test("pressing a chip changes how it is drawn, on every board that offers one", async () => {
  const readings = await sweepOnce();

  const silent = readings.filter((r) => r.said.length < 2);
  expect(
    silent
      .map(
        (r) =>
          `${r.visual}: pressed and unpressed differ on ${r.said.length === 0 ? "nothing" : r.said.join(" and ")}`,
      )
      .join("; "),
    "these boards say which chip the learner chose in one channel or none, so an inline colour is beating the shared rule",
  ).toBe("");

  expect(
    readings
      .filter((r) => !r.widthsHeld)
      .map((r) => r.visual)
      .join("; "),
    "these boards change a chip's border WIDTH when it is pressed, which moves the content box classifyChipFit measures labels against",
  ).toBe("");

  expect(
    readings.length,
    "no placed board let a chip be pressed, so this sweep measured nothing",
  ).toBeGreaterThanOrEqual(PRESSABLE_BOARD_FLOOR);
}, 300_000);

/** One settled option that carries a mark, and whether it is still legible. */
interface MarkReading {
  readonly where: string;
  readonly opacity: number;
  /** True when this is the call the learner did NOT make: the standing mark. */
  readonly standing: boolean;
}

/** The cross on a wrong pick. Every board in this family marks with the same two glyphs. */
const WRONG_GLYPH = "\u2717";

function glyphOf(chip: Element): string {
  return (chip.querySelector(".lesson-classify__mark")?.textContent ?? "").trim();
}

/**
 * Answer every row on a classify board, rotating which option is taken.
 *
 * Deliberately not "answer them correctly": a row answered right marks one option, and a row
 * answered WRONG marks two — the learner's pick and the call that was standing. The standing one
 * is the state this claim is about, so the sweep has to miss some rows on purpose.
 *
 * Rotating by row index rather than always taking the first: with the first option every time,
 * a board whose answers happen to sit in column one is answered perfectly and contributes no
 * standing mark at all, and the floors below would then be measuring which boards got lucky.
 */
async function settleBoard(host: HTMLElement, id: string): Promise<void> {
  const rows = all(host, ".lesson-classify__row").length;
  for (let at = 0; at < rows; at += 1) {
    for (let option = 0; option < 4; option += 1) {
      const row = all<HTMLElement>(host, ".lesson-classify__row")[at];
      if (row === undefined) {
        break;
      }
      const open = all<HTMLButtonElement>(row, ".lesson-interactive__chip:not(:disabled)");
      if (open.length === 0) {
        break;
      }
      open[at % open.length]?.click();
      await waitFor(
        () => {
          const now = all<HTMLElement>(host, ".lesson-classify__row")[at];
          return (
            now !== undefined &&
            now.querySelector(".lesson-interactive__chip:not(:disabled)") === null
          );
        },
        `${id} row ${at + 1} settles`,
        400,
      ).catch(() => {});
    }
  }
}

async function markSweep(): Promise<{
  marks: MarkReading[];
  missedRows: number;
  dimmable: number;
}> {
  const marks: MarkReading[] = [];
  let missedRows = 0;
  let dimmable = 0;

  for (const id of liveVisualIds()) {
    const host = await mountVisual(id);
    if (all(host, ".lesson-classify__row").length === 0) {
      h?.cleanup();
      h = null;
      continue;
    }
    await settleBoard(host, id);

    all<HTMLElement>(host, ".lesson-classify__row").forEach((row, at) => {
      const chips = all<HTMLButtonElement>(row, ".lesson-interactive__chip");
      const marked = chips.filter((chip) => glyphOf(chip) !== "");
      // A row the learner MISSED, read off the paint rather than off an attribute: it is the one
      // carrying a cross. `aria-pressed` would not do here — most of this family never sets it,
      // and `data-mark` is the attribute under test.
      const missed = marked.some((chip) => glyphOf(chip) === WRONG_GLYPH);
      if (missed) {
        missedRows += 1;
      }
      for (const chip of marked) {
        if (!chip.disabled) {
          continue;
        }
        marks.push({
          where: `${id} row ${at + 1} "${(chip.textContent ?? "").trim()}"`,
          opacity: Number(getComputedStyle(chip).opacity),
          standing: missed && glyphOf(chip) !== WRONG_GLYPH,
        });
      }
      // The other direction: an option nobody marked has nothing to say on a settled row, and
      // the generic dimming is correct for it. Without this the claim above is satisfied by a
      // stylesheet that simply stopped dimming anything.
      dimmable += chips.filter(
        (chip) =>
          chip.disabled &&
          glyphOf(chip) === "" &&
          Number(getComputedStyle(chip).opacity) < 1,
      ).length;
    });

    h?.cleanup();
    h = null;
  }

  return { marks, missedRows, dimmable };
}

/**
 * Floors over the classify family once every row has been answered. Measured on this tree: 38
 * settled options carrying a mark, 6 of them standing on 6 missed rows, and 70 settled options
 * carrying no mark and still dimmed. Set a little under, because `useWidgetVariants` hands each
 * mount one of a board's variants and they do not all run to the same number of rows.
 */
const MARKED_FLOOR = 34;
const STANDING_FLOOR = 4;
const DIMMED_FLOOR = 60;

test("a settled option that is still teaching is drawn at full contrast", async () => {
  const { marks, missedRows, dimmable } = await markSweep();

  const faint = marks.filter((m) => m.opacity < 1);
  expect(
    faint.map((m) => `${m.where} is drawn at ${(m.opacity * 100).toFixed(0)}%`).join("; "),
    "these settled options carry the mark that answers the row and the generic disabled rule is dimming them, so the teaching is the faintest thing on it",
  ).toBe("");

  expect(
    marks.length,
    "no settled option carried a mark, so this claim measured nothing",
  ).toBeGreaterThanOrEqual(MARKED_FLOOR);
  // The composition, not just the size: a floor of forty is met by forty of the learner's own
  // picks, and the standing mark on a MISSED row is the case the escape hatch exists for.
  expect(
    marks.filter((m) => m.standing).length,
    "no board showed a mark on a call the learner did not make, so the standing mark is unmeasured",
  ).toBeGreaterThanOrEqual(STANDING_FLOOR);
  expect(
    missedRows,
    "no row was answered wrong, so no board reached the state this claim is about",
  ).toBeGreaterThanOrEqual(STANDING_FLOOR);
  // And the dimming is still doing its job where nothing is being said.
  expect(
    dimmable,
    "no settled option is dimmed any more, so the exemption above is exempting the whole family from a rule that no longer applies to anything",
  ).toBeGreaterThanOrEqual(DIMMED_FLOOR);
}, 300_000);

/**
 * Where this test's viewport sits inside the real browser window. Vitest scales its tester
 * iframe when the requested viewport does not match the window, so a clip written in the
 * requested viewport's pixels lands somewhere else on the real screen.
 */
function testViewportBox(): {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
} {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
    scale: box.height / window.innerHeight,
  };
}

/** One frame of the whole viewport, captured over CDP and clipped to where that viewport is. */
async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a ${VIEWPORT.width}x${VIEWPORT.height} screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, VIEWPORT.width),
      height: Math.min(box.height, VIEWPORT.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/${name}.png`, shot.data, { encoding: "base64" });
  }
}

/**
 * LIN.4 with one chip of each pair chosen, framed to show the whole board rather than the chips.
 *
 * The grouping claim is spatial and the frame is the evidence for it: two pairs, each pair on its
 * own line, rather than four chips in one wrapping row breaking 3 and 1.
 */
test("interval-write-builder: a frame of the chip rows with a choice made, at 1024x580", async () => {
  h = mount(
    <div style={{ width: "620px", margin: "12px auto" }}>
      <LessonVisual id="interval-write-builder" />
    </div>,
  );
  const host = h.host;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, "it mounts");
  await document.fonts.ready;

  // One of each pair on the first rule, so the frame shows a pressed chip beside an unpressed one
  // in both groups rather than only in one.
  const chips = all<HTMLButtonElement>(host, ".lesson-interactive__chip");
  chips.find((c) => (c.textContent ?? "").includes("Runs downward"))?.click();
  await pause(30);
  all<HTMLButtonElement>(host, ".lesson-interactive__chip")
    .find((c) => (c.textContent ?? "").includes("Endpoint in"))
    ?.click();
  await pause(30);

  expect(
    all(host, '.lesson-interactive__chip[aria-pressed="true"]').length,
    "the frame was taken with nothing chosen",
  ).toBeGreaterThan(0);
  await shoot(`item6-interval-write-builder-chips-${VIEWPORT.width}x${VIEWPORT.height}`);
});

/** LIN.5 with its rows answered, so the standing tick on a missed row is in the picture. */
test("abs-count-classify: a frame of the settled board, at 1024x580", async () => {
  h = mount(
    <div style={{ width: "620px", margin: "12px auto" }}>
      <LessonVisual id="abs-count-classify" />
    </div>,
  );
  const host = h.host;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, "it mounts");
  await document.fonts.ready;
  await settleBoard(host, "abs-count-classify");
  await document.fonts.ready;

  // Marks that SAY something, not mark elements. This board now renders an empty mark on every
  // option to hold the tick's slot open, so counting the elements would be satisfied by a board
  // nobody had answered, which is the one thing this precondition is here to rule out.
  expect(
    all(host, ".lesson-classify__mark").filter((m) => (m.textContent ?? "").trim() !== "")
      .length,
    "the frame was taken before any row was marked",
  ).toBeGreaterThan(0);
  await shoot(`item6-abs-count-classify-settled-${VIEWPORT.width}x${VIEWPORT.height}`);
});
