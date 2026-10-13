/**
 * D6's NAME SLOTS HOLD THE TERM THEIR PACK DEFINES, AND ITS MISS COPY DOES NOT LEAD ON THE COST.
 *
 * Six boards, one QA round, and the reason they are guarded together is that the defect is one
 * defect: a slot whose job is to NAME something was holding a paraphrase of it (R21), a sibling
 * set was answering two different questions (R22), and a finished board opened its line on the
 * penalty and then coached about an attempt that was over (R33).
 *
 * ## Why the assertions are on the RENDERED slot and not on the source
 *
 * `qa-verification.mdc` allows a grep as evidence of a deletion and of nothing else. Every claim
 * here is that a learner MEETS a particular word in a particular place, so each one is read off
 * the mounted board: a `<th scope="col">`'s text, a row's stage caption, a field's own label, a
 * chip's words, the status line after a board has been played to the end. Adding a string to a
 * module is not evidence that the string reaches a column heading.
 *
 * Each board is also asserted in BOTH directions where there is a paraphrase to keep out. The
 * positive half fails on the tree these fixes were written against; the negative half is what
 * stops the paraphrase drifting back in beside the term, which a "contains the term" assertion
 * on its own would happily allow.
 *
 * ## What this file deliberately does NOT claim
 *
 * `feature-interval-classify` still gates on `complete && !missed`, so its board really is spent
 * once a leg is missed and its line must not tell the learner otherwise. That is R29's business
 * and not this file's: what is asserted below is only that the line names the miss on the way
 * past rather than instead of it, points at the reveal, and names the way out. The R29 family
 * sweep is `widgetMissedBoardGate.browser.test.tsx`, whose population is four boards and none of
 * them D6.
 */

import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import fun4 from "../../../../content/lessons/d6/FUN.4.json";
import { LessonVisual, type LessonVisualId } from "./visuals";

/**
 * Mount one board and return a getter for it rather than the element.
 *
 * A restart remounts the widget's body on a fresh key, so a handle taken before it points at
 * a detached node and every query through it reads the board the learner has just left.
 */
function mount(id: LessonVisualId): () => HTMLElement {
  const { container } = render(<LessonVisual id={id} onComplete={() => {}} />);
  return () => {
    const widget = container.querySelector<HTMLElement>(".lesson-interactive");
    if (widget === null) {
      throw new Error(`${id} did not mount a board`);
    }
    return widget;
  };
}

function textsOf(root: HTMLElement, selector: string): string[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).map((node) =>
    (node.textContent ?? "").replace(/\s+/g, " ").trim(),
  );
}

/** KaTeX duplicates every glyph into MathML, so a line's words are read with runs collapsed. */
function said(node: Element | null): string {
  return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * The tell R21 gives for a paraphrase: a name slot whose words are built around a verb.
 *
 * Not a general English test and not trying to be. It is the specific set of verbs the four
 * offending slots were built from, so the negative half of each claim fails if one of them
 * comes back rather than only if the exact old string does.
 */
const PARAPHRASE_VERBS = [
  "hands over",
  "returns",
  "crosses",
  "reached at",
  "works",
  "thrown out",
];

function paraphrasesIn(labels: readonly string[]): string[] {
  return labels.filter((label) =>
    PARAPHRASE_VERBS.some((verb) => label.toLowerCase().includes(verb)),
  );
}

describe("FUN.7 compose-series-explore", () => {
  it("heads its columns with input and output, the two terms its own slide names", () => {
    const board = mount("compose-series-explore");
    const headings = textsOf(board(), "th[scope='col']");

    expect(headings, "the composition table is not the three columns this guards").toEqual([
      "input",
      "the first machine's output",
      "the pair's output",
    ]);
    expect(
      paraphrasesIn(headings),
      "a column heading is a verb-built description of a term rather than the term",
    ).toEqual([]);
  });

  it("says the same two words to a screen reader on the row it is asking about", () => {
    const board = mount("compose-series-explore");
    const slot = board().querySelector<HTMLElement>(".lesson-table__slot");

    // Board 1 multiplies by 4, and its first blank row is the setting 5, so the row the
    // learner is on is announced as the input 5 and the first machine's output 20.
    expect(
      slot?.getAttribute("aria-label"),
      "the open row is announced in the words the headings no longer use",
    ).toBe("Value for the row input 5, first machine's output 20");
  });

  it("names the table itself for the column a screen reader will then land in", () => {
    const board = mount("compose-series-explore");
    const table = board().querySelector<HTMLElement>("table");

    // The accessible name is read BEFORE any heading, so a name still built on the old
    // gloss would announce a table of dial settings whose first column is called input.
    expect(
      table?.getAttribute("aria-label") ?? "",
      "the table's accessible name is out of step with the columns underneath it",
    ).toMatch(/^A table of four inputs run through a machine/);
  });
});

describe("CG.1 coordinate-intercept-builder", () => {
  it("names its two rows for the intercepts CG.1 defines", () => {
    const board = mount("coordinate-intercept-builder");

    expect(
      textsOf(board(), ".lesson-equation__stage"),
      "the two rows are not named for the two intercepts",
    ).toEqual(["x-intercept", "y-intercept"]);
  });

  it("still declines to name the FIELD, which would hand over which coordinate is zero", () => {
    const board = mount("coordinate-intercept-builder");
    const field = board().querySelector<HTMLElement>("input.lesson-equation__slot");
    const label = field?.getAttribute("aria-label") ?? "";

    // The row name and the blank's own name are different slots and the widget's header says
    // why. Asserted so that "put the term in the name slot" cannot creep into the box.
    expect(label, "the open blank has no accessible name at all").not.toBe("");
    expect(
      label.toLowerCase(),
      "the blank itself is labelled with the term, which says which coordinate is already zero",
    ).not.toContain("intercept");
  });
});

describe("CG.1 coordinate-distance-walkthrough", () => {
  it("names its rows midpoint and distance, not center and length", () => {
    const board = mount("coordinate-distance-walkthrough");
    const stages = textsOf(board(), ".lesson-equation__stage");

    expect(stages, "the three rows are not the ones this guards").toEqual([
      "midpoint",
      "legs",
      "distance",
    ]);
    expect(
      stages.filter((stage) => stage === "center" || stage === "length"),
      "a row is still named by CG.1's plain-language gloss instead of by its term",
    ).toEqual([]);
  });
});

describe("FUN.4 feature-table", () => {
  /** The four field labels of whichever board is dealt, in the order they are drawn. */
  function labels(widget: HTMLElement): string[] {
    return textsOf(widget, ".lesson-interactive__field-label");
  }

  it("names the extremum row for the term FUN.4 bolds, on both boards", () => {
    const board = mount("feature-table");

    expect(labels(board()), "the peak board's rows are not the four this guards").toEqual([
      "increasing on",
      "decreasing on",
      "maximum",
      "hour of the maximum",
    ]);
    expect(
      paraphrasesIn(labels(board())),
      "a row is named by what the learner does to the chart rather than by the feature",
    ).toEqual([]);

    // The second board is the trough, and it carries its own copies of both strings, so the
    // claim is only about the board in front of the learner until this board is finished and
    // the next one dealt.
    for (const [label, value] of [
      ["increasing on", "(0, 4)"],
      ["decreasing on", "(4, 9)"],
      ["maximum", "8"],
      ["hour of the maximum", "4"],
    ] as const) {
      const field = Array.from(
        board().querySelectorAll<HTMLElement>(".lesson-interactive__field"),
      ).find(
        (node) => said(node.querySelector(".lesson-interactive__field-label")) === label,
      );
      expect(field, `no row is labelled "${label}"`).toBeDefined();
      const row = field?.closest<HTMLElement>(".lesson-interactive__row") as HTMLElement;
      fireEvent.change(within(row).getByRole("textbox"), { target: { value } });
      fireEvent.click(within(row).getByRole("button", { name: "Check" }));
    }

    fireEvent.click(
      within(board()).getByRole("button", { name: "Start over with a different chart" }),
    );

    expect(labels(board()), "the trough board's rows are not the four this guards").toEqual(
      ["decreasing on", "increasing on", "minimum", "hour of the minimum"],
    );
    expect(
      paraphrasesIn(labels(board())),
      "the trough board still names a row by what the learner does to the chart",
    ).toEqual([]);
  });
});

describe("FUN.4 feature-trace-walkthrough", () => {
  /**
   * Run the pen the length of the shift, which is what opens the two answers.
   *
   * The control advances one leg per press and stops at the last, so pressing it more times
   * than there are legs is safe and does not depend on which board was dealt.
   */
  function sweep(board: () => HTMLElement): void {
    for (let leg = 0; leg < 8; leg += 1) {
      fireEvent.click(within(board()).getByRole("button", { name: "Step" }));
    }
  }

  it("names its two answers for the extreme FUN.4 slide 3 defines, not for a reading", () => {
    const board = mount("feature-trace-walkthrough");
    sweep(board);
    const labels = textsOf(board(), ".lesson-interactive__field-label");

    // Slide 3 is where **absolute** is earned, and this board mounts after it. The plain term
    // would be the wrong one here rather than merely a weaker one: every turn the sweep just
    // named IS a maximum or a minimum, and the question is which of them wins over the shift.
    expect(labels, "the two answers are not named for the absolute extremes").toEqual([
      "absolute maximum",
      "absolute minimum",
    ]);
    expect(
      paraphrasesIn(labels),
      "an answer is named by the reading it is read off rather than by the feature",
    ).toEqual([]);
  });

  it("says the same two terms to a screen reader, on the boxes and on the reveals", () => {
    const board = mount("feature-trace-walkthrough");
    sweep(board);
    const spoken = Array.from(
      board().querySelectorAll<HTMLElement>("input.lesson-interactive__input"),
    ).map((input) => input.getAttribute("aria-label") ?? "");

    expect(spoken, "the two boxes are not announced by the terms").toEqual([
      "the absolute maximum of the whole shift",
      "the absolute minimum of the whole shift",
    ]);

    // A reveal is only offered on a part that has been missed, so the button's own name is
    // only reachable through one. Missing the maximum leaves the minimum outstanding, which
    // is the state the reveal beside it is written for.
    const rows = board().querySelectorAll<HTMLElement>(".lesson-interactive__row");
    const highRow = rows[0] as HTMLElement;
    fireEvent.change(within(highRow).getByRole("textbox"), { target: { value: "0" } });
    fireEvent.click(within(highRow).getByRole("button", { name: "Check" }));

    // One reveal, and only the part of its name this widget owns: the shared layer appends
    // its own warning about the re-ask ("…, then try a new set") and that suffix is not this
    // file's to pin.
    const reveals = textsOf(board(), ".lesson-interactive__reveal-button");
    expect(reveals.length, "the missed part offered no reveal to read the name off").toBe(
      1,
    );
    expect(reveals[0], "the reveal is still offered under the name of a reading").toMatch(
      /^Reveal the absolute maximum\b/,
    );
  });
});

describe("FUN.4 feature-interval-classify", () => {
  /**
   * Play board 1's three legs, missing the first and calling the other two correctly.
   *
   * Board 1 climbs to hour 3, holds to hour 6 and falls to hour 10, so calling the climb
   * decreasing is one miss and the two calls after it are right. That is the case R33 is
   * about: a board the learner finished, with a miss recorded on it.
   */
  function playWithOneMiss(board: () => HTMLElement): void {
    const takes: readonly [string, string][] = [
      ["the stretch from hour 0 to hour 3", "decreasing"],
      ["the stretch from hour 3 to hour 6", "constant"],
      ["the stretch from hour 6 to hour 10", "decreasing"],
    ];
    for (const [leg, call] of takes) {
      fireEvent.click(within(board()).getByRole("button", { name: leg }));
      fireEvent.click(
        within(board()).getByRole("button", { name: `call it ${call} on this stretch` }),
      );
    }
  }

  it("does not open its finished line on the penalty, and does not coach retrospectively", () => {
    const board = mount("feature-interval-classify");
    playWithOneMiss(board);
    const line = said(board().querySelector(".lesson-interactive__status"));

    // R33's two halves, as the rejected copy had them: the cost first, then instruction about
    // an attempt that is over.
    expect(line, "the finished line still opens on what the miss cost").not.toMatch(
      /^One leg is wrong/,
    );
    expect(
      line,
      "the finished line still tells the learner the chart is spent first",
    ).not.toContain("this chart is spent");
    expect(
      line,
      "the finished line still instructs on how the leg should have been read",
    ).not.toContain("Read a leg by comparing");
  });

  it("names the missed leg on the way past, and points at the reveal and the way out", () => {
    const board = mount("feature-interval-classify");
    playWithOneMiss(board);
    const line = said(board().querySelector(".lesson-interactive__status"));

    expect(line, "the finished line does not say what the learner got done").toMatch(
      /^Every leg is called/,
    );
    expect(line, "the finished line does not name the leg the miss was on").toContain(
      "is not what the chart does across it",
    );
    expect(line, "the finished line points at nothing that explains the miss").toContain(
      "The reveal explains that leg, and starting over deals a fresh chart for a clean run",
    );

    // And the two things it points at are on the board, so the sentence is not describing
    // controls the learner has not been given.
    expect(
      board().querySelector(".lesson-interactive__reveal-button"),
      "the line offers a reveal the finished board does not carry",
    ).not.toBeNull();
    expect(
      within(board()).queryByRole("button", { name: "Start over with a different chart" }),
      "the line offers a fresh chart the finished board does not carry",
    ).not.toBeNull();
  });
});

describe("FUN.2 domain-restriction-classify", () => {
  it("offers three calls that all answer how much of the line the rule refuses", () => {
    const board = mount("domain-restriction-classify");
    const row = board().querySelector<HTMLElement>(".lesson-classify__row") as HTMLElement;
    const calls = textsOf(row, "button.lesson-interactive__chip");

    expect(calls, "the row's calls are not the three this guards").toEqual([
      "No inputs refused",
      "One input refused",
      "A stretch refused",
    ]);
    // The R22 property itself, rather than only the strings: a sibling set is coherent when
    // every member answers the question the task poses, and the task asks how much is refused.
    // Floored, because "every member ends in refused" holds trivially over an empty set.
    expect(calls.length, "the board offers fewer calls than the slide has cases").toBe(3);
    for (const call of calls) {
      expect(call, `"${call}" does not answer how much of the line is refused`).toMatch(
        /\brefused$/,
      );
    }
    expect(
      paraphrasesIn(calls),
      "a call describes what kind of thing is refused rather than how much of the line",
    ).toEqual([]);
  });
});

/**
 * FUN.4's WHOLE BOARD LIST, taken from the pack rather than from the two files QA named.
 *
 * Everything above this line is a per-widget pin: it fails when a named slot on a named board
 * changes, and it says nothing at all about a board nobody thought to add. That is how this
 * defect got its second life — the first pass fixed the extremum labels on the two widgets in
 * the finding and left the identical paraphrase standing on a third that mounts between them.
 *
 * So the population here is `FUN.4.json`'s own `visuals` array. A board added to the pack
 * joins this sweep without anyone remembering to add it, which is the property the list above
 * cannot have.
 */
const FUN4_BOARDS = (fun4.visuals as readonly { after: number; id: string }[]).map(
  (visual) => visual.id as LessonVisualId,
);

/**
 * What FUN.4's terms get paraphrased INTO, which is the shape rather than the four strings.
 *
 * Matching "highest reading" alone would pass the moment someone wrote "greatest reading",
 * so the sweep is keyed on the construction: a superlative over a word for a chart value.
 */
const FUN4_PARAPHRASE =
  /\b(highest|lowest|greatest|smallest|biggest|top|bottom)\s+(reading|point|mark|value)|\breached at\b/i;

/**
 * Where FUN.4 is allowed to keep plain wording: a sentence the learner is JUDGING.
 *
 * `feature-extremum-spot` hands over a shift report and asks which line does not follow from
 * the chart, and the line it is about quotes an hour where a reading belongs. Restating that
 * sentence in the term would change what the item tests, and the board mounts one slide before
 * **absolute** is earned besides. A judged sentence is not a name slot, so it is excluded by
 * the selector set rather than by a string exception — and the exclusion is asserted below in
 * both directions so it cannot quietly become an excuse for a real defect.
 */
const JUDGED_SENTENCE = ".lesson-spot__line-button";

/** Every slot on a board whose job is to NAME something. */
const NAME_SLOTS = [
  "th[scope='col']",
  ".lesson-interactive__field-label",
  ".lesson-equation__stage",
  "button.lesson-interactive__chip",
].join(", ");

/**
 * Boards in the population that legitimately render no name slot at all.
 *
 * Asserted both ways below: a listed board that grows one fails, and an unlisted board that
 * has none fails. Without the second direction a board could contribute nothing to the sweep
 * and the total floor would still be met by its neighbours.
 */
const NO_NAME_SLOTS: readonly string[] = ["feature-extremum-spot"];

describe("FUN.4's name slots, over the boards the pack itself lists", () => {
  it("has a population that is the pack's, and is not empty", () => {
    expect(FUN4_BOARDS, "FUN.4's visuals list did not resolve to a board list").toEqual([
      "feature-interval-classify",
      "feature-extremum-spot",
      "feature-trace-walkthrough",
      "feature-table",
    ]);
  });

  it("names nothing on any of them with a superlative over a reading", () => {
    let counted = 0;
    const empty: string[] = [];

    for (const id of FUN4_BOARDS) {
      const board = mount(id);
      // The walkthrough opens its answers only once the pen has run the shift, and the
      // control is the same one on every board that has it, so the opener stays generic.
      for (let press = 0; press < 8; press += 1) {
        const step = within(board()).queryAllByRole("button", { name: "Step" })[0];
        if (step === undefined) {
          break;
        }
        fireEvent.click(step);
      }

      const slots = textsOf(board(), NAME_SLOTS);
      counted += slots.length;
      if (slots.length === 0) {
        empty.push(id);
      }
      for (const slot of slots) {
        expect(
          slot,
          `${id} names a slot "${slot}" instead of using FUN.4's term`,
        ).not.toMatch(FUN4_PARAPHRASE);
      }
    }

    // The floor, set at what the four boards actually render today: four rows on the table,
    // two answers on the walkthrough, three calls on the classify. A selector set that stopped
    // matching, or an opener that stopped opening the walkthrough, would leave the loop above
    // passing over an empty derivation.
    expect(
      counted,
      "the sweep read too few name slots to have measured the boards",
    ).toBeGreaterThanOrEqual(9);

    // And the exception, both ways round.
    expect(
      empty,
      "a board renders no name slot without being declared, so it is in the sweep and measured by it",
    ).toEqual([...NO_NAME_SLOTS]);
  });

  it("keeps its one exclusion load-bearing: the judged sentence still carries the paraphrase", () => {
    const board = mount("feature-extremum-spot");
    const judged = textsOf(board(), JUDGED_SENTENCE);

    // Direction one: the excluded slot exists and still says the thing the sweep would flag,
    // so the exclusion is excusing something real rather than describing nothing.
    expect(
      judged.length,
      "the board this exclusion is written for renders no judged lines",
    ).toBeGreaterThanOrEqual(3);
    expect(
      judged.filter((line) => FUN4_PARAPHRASE.test(line)).length,
      "no judged line paraphrases any more, so the exclusion has stopped excusing anything and should go",
    ).toBeGreaterThanOrEqual(1);

    // Direction two: a judged line is not also a name slot, so excluding it cannot be
    // silently exempting a heading or a chip that happens to sit inside one.
    const names = Array.from(board().querySelectorAll(NAME_SLOTS));
    for (const line of Array.from(board().querySelectorAll(JUDGED_SENTENCE))) {
      expect(
        names.some((name) => name === line || name.contains(line) || line.contains(name)),
        "a judged sentence and a name slot are the same element, so the exclusion covers both",
      ).toBe(false);
    }
  });
});
