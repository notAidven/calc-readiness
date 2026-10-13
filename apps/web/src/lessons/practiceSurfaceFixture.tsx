import { isInteractiveAnswerType } from "@cr/components";
import type { FrozenItem } from "@cr/item-bank";
import { createLessonEngine } from "@cr/lesson";
import { createMasteryService } from "@cr/mastery-service";

import { checkerVersionForItem, practiceItemsById } from "./practiceChecker";
import type { PracticeSource } from "./practiceSession";

/**
 * The interactive practice population, and a source that serves one chosen item, shared by
 * the guards that sweep the answer row.
 *
 * ONE derivation, deliberately. Two files now make claims about "every served interactive
 * item" — `practicePromptOnce` about what the row PRINTS and `answerRowChrome` about how it
 * is DRAWN — and a population copied into the second of them is a population free to drift
 * out of step with the first. The floors and the composition assertion that prove this
 * filter derives the right set live in `practicePromptOnce.browser.test.tsx`, which is the
 * file that owns them; anything importing from here inherits that proof rather than
 * restating it.
 */

/** Every practice instance a surface can serve whose answer is an interactive widget. */
export const INTERACTIVE_SERVED_ITEMS: readonly FrozenItem[] = [
  ...practiceItemsById.values(),
].filter((item) => isInteractiveAnswerType(item.answer.answer_spec.answer_type));

export function itemsOfType(answerType: string): readonly FrozenItem[] {
  return INTERACTIVE_SERVED_ITEMS.filter(
    (item) => item.answer.answer_spec.answer_type === answerType,
  );
}

/**
 * A graded-practice source serving ONE chosen item in all five slots, through the real
 * engine and mastery service (the shape `answerSyntaxGuidance.test.tsx` uses). The shipped
 * sources randomize their opening set, so a test built on one could not name the item it
 * was asserting about.
 */
export function fixedSource(item: FrozenItem): PracticeSource {
  return {
    nodeId: item.node_id,
    createSession: () => {
      const engine = createLessonEngine(
        createMasteryService({
          store: {
            getMastery: () => null,
            setMastery: () => {},
            getEvidenceResult: () => null,
            recordEvidenceResult: () => {},
          },
          recomputeCorrectness: () => false,
        }),
      );
      const instance = {
        item_id: item.item_version_id,
        item_version: 1,
        item_version_id: item.item_version_id,
        equivalence_checker_version: checkerVersionForItem(item),
        template_id: item.template_id,
        template_params: item.template_params,
      };
      const session = engine.startLesson({
        node_id: item.node_id,
        items: [instance, instance, instance, instance, instance],
      });
      session.startTeaching();
      session.submitCheckForUnderstanding(true);
      session.startPractice();
      return { session, initialInstanceIds: [item.item_version_id] };
    },
    drawFresh: () => undefined,
  };
}
