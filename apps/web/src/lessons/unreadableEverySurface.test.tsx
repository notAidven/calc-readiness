import type { FrozenItem } from "@cr/item-bank";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LessonCfu } from "./cfu";
import { gradeCfuAnswer } from "./cfuChecker";
import { gradeCrisisAnswer } from "./crisisAnswer";
import { allLessons } from "./domains";
import { InfiniteDrill } from "./InfiniteDrill";
import { createRandomScheduler } from "./infiniteScheduler";
import { LessonPractice } from "./LessonPractice";
import {
  checkerVersionForItem,
  practiceChecker,
  practiceItemsById,
} from "./practiceChecker";
import { fixedSource } from "./practiceSurfaceFixture";
import { UNREADABLE_LEAD } from "./unreadableAnswer";

/**
 * ONE CASE PER AFFECTED SURFACE, driven through the real component.
 *
 * `answerUnreadableEverywhere.test.tsx` owns the POPULATION — which sources grade a typed answer,
 * and that each reaches the shared decision. This file owns the BEHAVIOUR on the surfaces a jsdom
 * mount can reach: type something the checker cannot read, press the surface's own submit, and
 * assert two things that are different claims.
 *
 *  1. **The learner is told**, in words that say what to do next.
 *  2. **They are not told they were wrong.** Every one of these surfaces has a miss treatment
 *     (`data-status="incorrect"`, "Not quite", a broken streak, a revealed answer, a banked
 *     verdict), and an unreadable answer wearing any of it is the surface asserting a verdict on
 *     an answer nobody graded.
 *
 * Each also carries its no-leak control in the same test: a wrong-but-READABLE answer produces no
 * unreadable note at all, so the note cannot be standing in for feedback.
 *
 * The era ceremony and the Hard Winter are driven in `ceremonyAnswerRow.browser.test.tsx`, where
 * the drivers for their board state already exist. The plague, the succession and the intrusion
 * share ONE grader with the winter (`gradeCrisisAnswer`) and one note element, which the
 * population guard asserts per file; the shared grader's own `correct: null` contract is driven
 * below so the thing all four depend on is not taken on trust.
 */

afterEach(cleanup);

/** The report's own keystroke, headed first; each is checked against the item before use. */
const CANDIDATES = ["a", "√2", "#"] as const;

function verdictFor(item: FrozenItem, typed: string): string {
  return practiceChecker({
    raw_answer: typed,
    item_version_id: item.item_version_id,
    equivalence_checker_version: checkerVersionForItem(item),
  }).status;
}

/** An item the checker refuses to READ for some candidate, plus that candidate. */
function unreadablePair(): { item: FrozenItem; typed: string } {
  for (const item of practiceItemsById.values()) {
    if (item.answer.answer_spec.answer_type !== "expression") {
      continue;
    }
    for (const candidate of CANDIDATES) {
      if (verdictFor(item, candidate) === "invalid_input") {
        return { item, typed: candidate };
      }
    }
  }
  throw new Error("no served item refuses any candidate keystroke");
}

/** The same item's wrong-but-readable answer, for the no-leak control. */
function wrongButReadable(item: FrozenItem): string {
  for (const candidate of ["-987654", "0", "1/7", "x + 987"]) {
    if (verdictFor(item, candidate) === "incorrect") {
      return candidate;
    }
  }
  throw new Error(`${item.item_version_id} grades no candidate as a readable miss`);
}

function typeAndSubmit(value: string, submitName: RegExp): void {
  const field = screen.getAllByRole("textbox")[0] as HTMLElement;
  fireEvent.change(field, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: submitName }));
}

function noteText(): string | null {
  return document.querySelector(".cr-unreadable-note")?.textContent ?? null;
}

/** Anything on screen that asserts a verdict, which an unreadable answer must not produce. */
function missTreatment(): string[] {
  return [...document.querySelectorAll('[data-status="incorrect"]')].map(
    (el) => el.textContent ?? "",
  );
}

describe("lesson practice", () => {
  it("tells the learner what to do, and does not mark the slot wrong", () => {
    const { item, typed } = unreadablePair();
    render(<LessonPractice nodeId={item.node_id} source={fixedSource(item)} />);

    typeAndSubmit(typed, /^check$/i);

    const note = noteText();
    expect(note, "lesson practice swallowed an unreadable answer").not.toBeNull();
    expect(note).toContain(UNREADABLE_LEAD);
    // The FIX, which is the half a bare "we could not read that" leaves out.
    expect(
      (note ?? "").length,
      "the note says nothing about how to fix it",
    ).toBeGreaterThan(UNREADABLE_LEAD.length + 20);
    // NOT a miss: the old wording lived in `lesson-player__feedback[data-status="incorrect"]`.
    expect(missTreatment(), "an unreadable answer is painted as a wrong one").toEqual([]);
    // And the slot is still live: the Check button is still there to press.
    expect(screen.getByRole("button", { name: /^check$/i })).toBeInTheDocument();
  });

  it("says nothing at all about a wrong answer it COULD read", () => {
    const { item } = unreadablePair();
    render(<LessonPractice nodeId={item.node_id} source={fixedSource(item)} />);

    typeAndSubmit(wrongButReadable(item), /^check$/i);

    expect(noteText(), "a readable miss produced an unreadable note").toBeNull();
    // It IS graded, which is what makes the silence above meaningful rather than inert.
    expect(missTreatment().join(" ")).not.toBe("");
  });
});

describe("the check for understanding", () => {
  /** The one CFU whose check the shared grader can refuse to read. */
  function cfuCase(): {
    nodeId: string;
    cfu: NonNullable<(typeof allLessons)[number]["cfu"]>;
  } {
    for (const lesson of allLessons) {
      const cfu = lesson.cfu;
      if (!cfu?.check) {
        continue;
      }
      for (const candidate of CANDIDATES) {
        const graded = gradeCfuAnswer({
          nodeId: lesson.node_id,
          cfu,
          index: 0,
          value: candidate,
        });
        if (graded.unreadable !== null) {
          return { nodeId: lesson.node_id, cfu };
        }
      }
    }
    throw new Error("no authored CFU refuses any candidate keystroke");
  }

  function candidateFor(nodeId: string, cfu: (typeof allLessons)[number]["cfu"]): string {
    for (const candidate of CANDIDATES) {
      if (
        cfu &&
        gradeCfuAnswer({ nodeId, cfu, index: 0, value: candidate }).unreadable !== null
      ) {
        return candidate;
      }
    }
    throw new Error(`${nodeId} reads every candidate`);
  }

  it("does not say 'Not quite' about an answer it never graded", () => {
    const { nodeId, cfu } = cfuCase();
    render(<LessonCfu cfu={cfu} nodeId={nodeId} />);

    typeAndSubmit(candidateFor(nodeId, cfu), /^check$/i);

    const note = noteText();
    expect(note, "the check card swallowed an unreadable answer").not.toBeNull();
    expect(note).toContain(UNREADABLE_LEAD);
    // THE HARSHEST INSTANCE OF THIS DEFECT: the card used to fall through to
    // `{ correct: false }` and print "Not quite. Try again, or reveal the hint." over an answer
    // the checker had refused to parse.
    expect(document.body.textContent ?? "").not.toMatch(/not quite/i);
    expect(missTreatment()).toEqual([]);
    /*
     * The attempt IS counted, and deliberately: `attempts` is what opens the hint and then the
     * reveal, so a learner whose every try comes back unreadable would otherwise have no way out
     * of the question. What the press must not do is read as a miss, which is the assertion above.
     * The try counter only PRINTS beside an incorrect verdict, so it is silent here either way.
     */
    expect(document.body.textContent ?? "").not.toMatch(/\d+ tries/);
  });

  it("still says 'Not quite' about a wrong answer it could read", () => {
    const { nodeId, cfu } = cfuCase();
    render(<LessonCfu cfu={cfu} nodeId={nodeId} />);

    // A readable miss on a CFU: a plain number the accepted list does not carry.
    typeAndSubmit("-987654", /^check$/i);

    expect(noteText(), "a readable miss produced an unreadable note").toBeNull();
    expect(document.body.textContent ?? "").toMatch(/not quite|try again/i);
  });
});

describe("the endless drill", () => {
  it("neither breaks the streak nor reveals the answer over input it could not read", () => {
    const { item, typed } = unreadablePair();
    render(
      <InfiniteDrill
        scheduler={createRandomScheduler([item])}
        storageKey={`cr.test.unreadable.${item.item_version_id}`}
        backLabel="Back"
        onExit={() => undefined}
      />,
    );

    typeAndSubmit(typed, /^check$/i);

    const note = noteText();
    expect(note, "the endless drill swallowed an unreadable answer").not.toBeNull();
    expect(note).toContain(UNREADABLE_LEAD);
    // THE TWO THINGS THIS SURFACE USED TO DO, and neither is a thing an unreadable answer has
    // earned: break the run, and hand over the solution.
    expect(document.body.textContent ?? "", "the drill revealed the answer").not.toMatch(
      /the answer was/i,
    );
    expect(missTreatment()).toEqual([]);
    // The question is still live rather than resolved: Check is still on screen.
    expect(screen.getByRole("button", { name: /^check$/i })).toBeInTheDocument();
  });
});

describe("the four crisis surfaces' shared grader", () => {
  /**
   * `gradeCrisisAnswer` is one function behind the Hard Winter, the plague, the succession and
   * the intrusion, and `correct: null` is the contract all four depend on: it is what leaves
   * `shown` null, keeps the field live and puts nothing in the banked verdict list.
   *
   * Before this, each of the four had its own copy of `practiceChecker(...).client_correct`, so an
   * unreadable answer arrived as `false` and the round banked it as a miss with the crisis
   * consequence attached.
   */
  it("returns no verdict at all for an answer it could not read", () => {
    const { item, typed } = unreadablePair();
    const graded = gradeCrisisAnswer(item.item_version_id, typed);
    expect(graded.correct, "an unreadable answer produced a bankable verdict").toBeNull();
    expect(graded.unreadable).toContain(UNREADABLE_LEAD);
  });

  it("still grades both ways for an answer it could read", () => {
    const { item } = unreadablePair();
    const right = gradeCrisisAnswer(item.item_version_id, item.answer.answer_key ?? "");
    expect(right.correct).toBe(true);
    expect(right.unreadable).toBeNull();

    const wrong = gradeCrisisAnswer(item.item_version_id, wrongButReadable(item));
    expect(wrong.correct).toBe(false);
    expect(wrong.unreadable, "a readable miss produced an unreadable note").toBeNull();
  });
});
