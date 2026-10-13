/**
 * The lesson-side "Reveal answer" is free. The practice-side one costs the slot.
 *
 * Those two rules only stay true while the two mechanics stay apart, and the failure mode
 * is quiet: a widget that reached for the practice session to "resolve" a revealed step
 * would start marking practice slots, and `Mastery_Scoring_Spec` §4 (a revealed slot is
 * never correct) would be broken without a single visible symptom in the lesson.
 *
 * So this pins the boundary structurally, from both ends. `interactivePractice.browser
 * .test.tsx` already proves the scoring rule itself (4 correct + 1 revealed scores 2, not
 * 3); what is proved here is that nothing in the teaching layer can reach the code that
 * rule lives in.
 */

import { describe, expect, it } from "vitest";

/** Anything that can write, score or close a practice slot. */
const PRACTICE_ONLY = [
  "@cr/lesson",
  "@cr/mastery-service",
  "./practiceSession",
  "../practiceSession",
  "./LessonPractice",
  "../LessonPractice",
  "./InfiniteDrill",
  "../InfiniteDrill",
];

const WIDGET_SOURCES = import.meta.glob("./interactive/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const SHARED_SOURCES = import.meta.glob(
  ["./widgetFeedback.tsx", "./LessonPractice.tsx", "./cfu.tsx"],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

function practiceImportsIn(source: string): string[] {
  return Array.from(source.matchAll(/from\s+"([^"]+)"/g))
    .map((m) => m[1] as string)
    .filter((spec) => PRACTICE_ONLY.includes(spec));
}

const WIDGET_FILES = Object.keys(WIDGET_SOURCES).filter((p) => !p.includes(".test."));

describe("the teaching reveal cannot reach practice scoring", () => {
  it("the sweep actually found the widgets", () => {
    expect(WIDGET_FILES.length).toBeGreaterThan(60);
  });

  it("the shared widget mechanics import nothing from the practice lane", () => {
    const source = SHARED_SOURCES["./widgetFeedback.tsx"] ?? "";
    expect(source.length).toBeGreaterThan(0);
    expect(practiceImportsIn(source)).toEqual([]);
  });

  it.each(WIDGET_FILES)("%s imports nothing from the practice lane", (path) => {
    expect(practiceImportsIn(WIDGET_SOURCES[path] ?? "")).toEqual([]);
  });

  it("the end-of-lesson check imports nothing from the practice lane either", () => {
    // The check now offers the same reveal, and it is the one teaching surface that already
    // grades an answer, which makes it the likeliest place for someone to reach for the
    // practice session's "resolve" and start marking slots with it. Its own checker
    // (`cfuChecker.ts`) is content plus grading and nothing else; what must stay out is the
    // session, which is where `@cr/lesson` and `@cr/mastery-service` enter.
    const source = SHARED_SOURCES["./cfu.tsx"] ?? "";
    expect(source.length).toBeGreaterThan(0);
    expect(practiceImportsIn(source)).toEqual([]);
  });

  it("practice still reveals through the engine, so a revealed slot still scores zero", () => {
    // The other half of the boundary: the practice path was not quietly repointed at the
    // free lesson reveal while the lesson one was being built.
    const practice = SHARED_SOURCES["./LessonPractice.tsx"] ?? "";
    expect(practice).toContain("session.reveal()");
    expect(practice).toContain("skipRevealedSlot");
    expect(practice).not.toContain("widgetFeedback");
  });
});
