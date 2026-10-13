import { isInteractiveAnswerType } from "@cr/components";
import type { FrozenItem } from "@cr/item-bank";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WINTER_ITEM_POOL } from "../winter/hardWinterItems";
import { InfiniteDrill } from "./InfiniteDrill";
import { createRandomScheduler } from "./infiniteScheduler";
import { LessonPractice } from "./LessonPractice";
import { practiceItemsById } from "./practiceChecker";
import {
  fixedSource,
  INTERACTIVE_SERVED_ITEMS,
  itemsOfType,
} from "./practiceSurfaceFixture";

/**
 * A practice surface prints its problem ONCE, typeset.
 *
 * The report, on EXP.1: the learner saw the problem twice, the second time as the LaTeX
 * source it was authored in, dollar signs and backslashes included. Both lines came from
 * `frozen.prompt`. The host renders it through `LessonProse`, and `PracticeAnswer` also
 * handed the same string to the interactive widget as its plain-text `label`, which the
 * widget printed in a `<p>` of its own. Typesetting that second copy would not have fixed
 * anything: the defect is the sentence appearing twice, not the raw-ness of the repeat.
 *
 * SCOPE. The population is every SERVED practice instance whose answer type is
 * interactive, taken from `practiceItemsById` (the registry the surfaces themselves read)
 * rather than from a list written here. That is deliberately wider than the one widget the
 * report named: `expr_builder` and `number_line` are separate components that had
 * separately copied the same "print the label in a paragraph" mechanic, so a guard scoped
 * to the reported widget would have passed over the other one. The floors below fail if
 * that filter ever derives the wrong set.
 *
 * WHY A NON-MATH PHRASE IS COUNTED. KaTeX emits `htmlAndMathml`, so every math glyph
 * already appears twice in `textContent` when the page is correct. Only the plain-language
 * part of a prompt can be counted, so each item is checked on the longest run of its own
 * prompt that sits outside the `$...$` delimiters.
 */

afterEach(cleanup);

/**
 * The longest stretch of a prompt that is NOT inside `$...$`, with any punctuation that
 * `glueTrailingPunctuation` pulls into the preceding math span trimmed off the front so
 * the phrase matches both the typeset render and a raw echo of the source.
 */
function plainPhrase(prompt: string): string {
  const outsideMath = prompt.split("$").filter((_, index) => index % 2 === 0);
  const phrases = outsideMath
    .map((piece) => piece.replace(/^[\s.,;:!?]+/, "").trim())
    .filter((piece) => piece.length >= 10)
    .sort((a, b) => b.length - a.length);
  const longest = phrases[0];
  if (longest === undefined) {
    throw new Error(`prompt has no plain-language phrase to count: ${prompt}`);
  }
  return longest;
}

function occurrences(haystack: string, needle: string): number {
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) {
      return count;
    }
    count += 1;
    from = at + needle.length;
  }
}

/**
 * The region a prompt could be printed in: the question and the answer row it belongs to,
 * never the whole mounted page.
 *
 * The `$` check below is an assertion about a DELIMITER, and the character is also ordinary
 * currency. A surface that grows a "3 credits" tally or a money-shaped practice item elsewhere
 * on the page would fail a document-wide scan for a `$` that was never a delimiter and was
 * never near this prompt, and the cheapest way to quiet that is to weaken the check. Scoping it
 * to the form the widget sits in keeps it strict where it matters instead.
 */
function answerRegion(container: HTMLElement): HTMLElement {
  return container.querySelector<HTMLElement>("form") ?? container;
}

/** Everything wrong with how one mounted surface printed one item's prompt. */
function promptDefects(container: HTMLElement, item: FrozenItem): string[] {
  const text = container.textContent ?? "";
  const defects: string[] = [];
  if (text.includes(item.prompt)) {
    defects.push(`${item.item_version_id}: authored source on screen: ${item.prompt}`);
  }
  if ((answerRegion(container).textContent ?? "").includes("$")) {
    defects.push(`${item.item_version_id}: a literal $ reached the learner`);
  }
  const phrase = plainPhrase(item.prompt);
  const seen = occurrences(text, phrase);
  if (seen !== 1) {
    defects.push(`${item.item_version_id}: "${phrase}" shown ${seen} times, wanted 1`);
  }
  return defects;
}

/**
 * The other half of the fix, and the half a text count cannot see. Deleting the widget's
 * printed prompt only stays correct while the widget still takes its accessible name from
 * the prompt the host drew: drop the id the host passes down and the sweep above is still
 * green over a control group a screen-reader user cannot identify. So every name reference
 * made from inside the answer row has to resolve to an element that exists and reads.
 *
 * Counted as well as checked, because a reference that has stopped being made resolves
 * vacuously: a mount that names nothing is itself the defect.
 *
 * ASKED OF EVERY INTERACTIVE ANSWER TYPE, not just the one the bug was reported on. This
 * used to exempt `number_line` on the reasoning that it groups nothing, each of its controls
 * carrying its own `aria-label`. That was true and it was the wrong test: per-control names
 * say what each field IS ("Point 1 position"), and none of them says what the learner is
 * being asked, which is the whole content of the prompt the widget stopped printing. The
 * exemption also made the guard's population the same shape as the defect report, which is
 * exactly the narrowing that let one widget be fixed while its neighbour kept the mechanic.
 * `isInteractiveAnswerType` decides who is in, so a third widget is asked the day it is
 * served rather than the day somebody remembers.
 */
function nameDefects(container: HTMLElement, item: FrozenItem): string[] {
  const defects: string[] = [];
  let references = 0;
  for (const element of container.querySelectorAll("form [aria-labelledby]")) {
    for (const id of (element.getAttribute("aria-labelledby") ?? "").split(/\s+/)) {
      if (id === "") {
        continue;
      }
      references += 1;
      const named = container.ownerDocument.getElementById(id);
      if (named === null) {
        defects.push(`${item.item_version_id}: names a missing element "${id}"`);
      } else if ((named.textContent ?? "").trim() === "") {
        defects.push(`${item.item_version_id}: names an empty element "${id}"`);
      }
    }
  }
  if (references === 0) {
    defects.push(
      `${item.item_version_id}: nothing in its answer row is named by the prompt (${item.answer.answer_spec.answer_type})`,
    );
  }
  return defects;
}

/** Sweep one host over the whole population, collecting every defect it shows. */
function sweep(mount: (item: FrozenItem) => HTMLElement): string[] {
  const defects: string[] = [];
  for (const item of INTERACTIVE_SERVED_ITEMS) {
    const container = mount(item);
    defects.push(...promptDefects(container, item));
    defects.push(...nameDefects(container, item));
    cleanup();
  }
  return defects;
}

describe("the population this guard sweeps", () => {
  /**
   * The floor. A containment or absence assertion is true of an empty collection, so a
   * filter that stopped matching would turn every sweep below green while measuring
   * nothing. Six is the count `packages/item-bank/src/d2.test.ts` pins for the D2
   * `expr_builder` pool, and the served set includes its retry variants on top.
   */
  it("holds at least the six D2 expr_builder shapes", () => {
    expect(itemsOfType("expr_builder").length).toBeGreaterThanOrEqual(6);
  });

  /**
   * A floor constrains size, not shape. The reported defect was found in `expr_builder`,
   * and the guard is only genuinely wider than that widget if the population still holds
   * items answered by the OTHER interactive widget, which reimplemented the same mechanic.
   */
  it("reaches past the reported widget to the other interactive answer type", () => {
    expect(itemsOfType("number_line").length).toBeGreaterThanOrEqual(1);
  });

  /**
   * Which widgets the sweep can actually speak for. `nameDefects` now demands an accessible
   * name from EVERY interactive answer type, but a demand is only met by the types that are
   * SERVED: `GraphInput` also takes `labelledBy`, and stripping that wiring leaves this file
   * green, because no practice item is answered by a graph. So pin the composition rather
   * than a count. A third type arriving fails here, which is the point — it says the new
   * widget's naming has never been measured and someone has to go and measure it.
   */
  it("is exactly the interactive answer types the surfaces serve", () => {
    const served = new Set(
      INTERACTIVE_SERVED_ITEMS.map((item) => item.answer.answer_spec.answer_type),
    );
    expect(
      [...served].sort(),
      "an interactive answer type has started or stopped being served, so this sweep's coverage claim needs re-reading before it can be trusted",
    ).toEqual(["expr_builder", "number_line"]);
  });

  /** Every D2 node that authors a build/convert shape is represented, not just EXP.1. */
  it("covers every node that authors a build shape", () => {
    const nodes = new Set(itemsOfType("expr_builder").map((item) => item.node_id));
    for (const nodeId of ["EXP.1", "RAD.1", "RAD.2", "RAD.3"]) {
      expect([...nodes], nodeId).toContain(nodeId);
    }
  });

  /**
   * The third host, `HardWinterSurface`, is a DECLARED EXCEPTION rather than an omission:
   * it draws from `D1_PRACTICE_ITEMS`, which holds no interactive item, so no mount of it
   * can reach a widget to duplicate a prompt. It is wired the same way as the other two
   * hosts all the same. This assertion is what stops the exemption becoming permanent by
   * neglect: the day the winter batch can serve an interactive item, it fails here and
   * someone has to add the render sweep it then owes.
   */
  it("excludes the hard-winter surface, whose pool serves no interactive item", () => {
    const winterInteractive = WINTER_ITEM_POOL.filter((candidate) => {
      const item = practiceItemsById.get(candidate.item_version_id);
      return (
        item !== undefined && isInteractiveAnswerType(item.answer.answer_spec.answer_type)
      );
    });
    expect(WINTER_ITEM_POOL.length).toBeGreaterThan(0);
    expect(winterInteractive).toEqual([]);
  });
});

describe("a practice surface prints its prompt once, typeset", () => {
  it("graded practice (LessonPractice)", () => {
    const defects = sweep(
      (item) =>
        render(<LessonPractice nodeId={item.node_id} source={fixedSource(item)} />)
          .container,
    );
    expect(
      defects.slice(0, 3),
      `${defects.length} defects over ${INTERACTIVE_SERVED_ITEMS.length} served interactive items`,
    ).toEqual([]);
  }, 240_000);

  it("endless drill (InfiniteDrill)", () => {
    const defects = sweep(
      (item) =>
        render(
          <InfiniteDrill
            scheduler={createRandomScheduler([item])}
            storageKey={`cr.test.promptOnce.${item.item_version_id}`}
            backLabel="Back"
            onExit={() => {}}
          />,
        ).container,
    );
    expect(
      defects.slice(0, 3),
      `${defects.length} defects over ${INTERACTIVE_SERVED_ITEMS.length} served interactive items`,
    ).toEqual([]);
  }, 240_000);
});
