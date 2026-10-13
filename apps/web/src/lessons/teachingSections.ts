import type { LessonContent, LessonWorkedExample } from "./types";

/**
 * The parts of ONE teaching slide, shown one at a time and always in this order.
 *
 * - `lecture` — the advisor's line for the slide, and nothing under it.
 * - `example` — the same line, with the slide's instance named and then worked in step cards.
 * - `activity` — the same line, with the slide's `visuals`; a gating widget withholds Next here.
 *
 * The advisor keeps speaking `mini_lesson[i]` throughout: an empty bubble under a step card
 * would read as a different slide rather than a later part of this one. What moves is what
 * sits BELOW the bubble, so the learner meets the idea, then a solved instance of it, then
 * the widget that asks them to do it.
 */
export type TeachingSection = "lecture" | "example" | "activity";

/** One step of the teaching walk: a slide index paired with one of its sections. */
export interface TeachingStep {
  index: number;
  section: TeachingSection;
}

/**
 * Slide `index`'s worked example, or `null` where it has none.
 *
 * ONE reader for the shape, because four callers have to agree about whether a slide has an
 * example: `sectionsFor` decides whether the walk contains an example section, and the
 * player, the review page and the `?dev` stepper each decide whether to render a card. A
 * walk that grants the section while a renderer finds nothing for it is a blank page with a
 * Next button, and that disagreement is invisible in each file on its own.
 *
 * An entry with a prompt but no steps counts as absent rather than as a malformed example:
 * the validator's rule 13 is where an author is told about it, and a renderer's job in the
 * meantime is to not show a titled card with nothing under it.
 */
export function workedExampleFor(
  content: LessonContent,
  index: number,
): LessonWorkedExample | null {
  const example = content.worked_examples?.[index];
  return example && example.steps.length > 0 ? example : null;
}

/**
 * The sections slide `index` actually has, in walk order.
 *
 * A slide with no `worked_examples` entry has no example to show, so it is two sections and
 * not three -- an unmigrated pack therefore costs exactly one extra Next per slide and
 * changes in no other way.
 *
 * Exported because the player and the `?dev` stepper both walk this sequence, and a stepper
 * that disagreed with the player about how many steps a slide has would be reviewing a
 * lesson nobody is served.
 */
export function sectionsFor(
  content: LessonContent,
  index: number,
): readonly [TeachingSection, ...TeachingSection[]] {
  return workedExampleFor(content, index)
    ? ["lecture", "example", "activity"]
    : ["lecture", "activity"];
}

/** The whole teaching walk, every slide's sections flattened in order. */
export function teachingSteps(content: LessonContent): readonly TeachingStep[] {
  return content.mini_lesson.flatMap((_paragraph, index) =>
    sectionsFor(content, index).map((section) => ({ index, section })),
  );
}

/** Learner-facing name for a section, used by slide headings and step labels. */
export function sectionLabel(section: TeachingSection): string {
  return section === "example" ? "worked example" : section;
}
