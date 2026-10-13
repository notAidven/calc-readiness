import { type EraId, getEraOfNode } from "@cr/skill-graph";
import { useCallback, useState } from "react";

import { usePresenterRegistration } from "../demo/PresenterShell";
import { AdvisorLesson, type DevSkipOffer } from "../lessons/AdvisorLesson";
import { lessonByNode } from "../lessons/domains";
import type { LessonContent } from "../lessons/types";
import { buildingName } from "./buildingAssets";
import { buildingSubtitle } from "./eraDressing";
import { type LessonHost, type LessonHostContext, stubLessonHost } from "./lessonHost";
import { WorldScene } from "./WorldScene";

export const PRESENTER_NEUTRAL_LESSON_LABEL = "Next lesson";

/**
 * Presenter copy names the era-authored building rather than the stable shared mass.
 *
 * Several eras legitimately reuse the `hall` mass, whose stable handle is "Assembly Hall".
 * That handle is useful in the ordinary learner city, but using it as the Presenter prompt
 * made Industrial, Atomic and Information Age transitions look as though Era 3 had leaked
 * forward. The subtitle registry is the canonical era-specific identity already used by the
 * city. If that registry has no authored row (Renaissance today), the honest prompt is a
 * neutral next lesson, not a node id or another era's building.
 */
export function lessonEyebrow(nodeId: string, presenterEraId: EraId | null): string {
  if (presenterEraId !== null) {
    return `${buildingSubtitle(nodeId, presenterEraId) ?? PRESENTER_NEUTRAL_LESSON_LABEL} · mini-lesson`;
  }
  return `${buildingName(nodeId)} · mini-lesson`;
}

function D1LessonHostScene({
  context,
  lesson,
}: {
  context: LessonHostContext;
  lesson: LessonContent;
}) {
  const [devSkipOffer, setDevSkipOffer] = useState<DevSkipOffer | null>(null);
  const [presenterCompleting, setPresenterCompleting] = useState(false);
  const devEnabled = Boolean(context.onDevComplete);
  const presenter = usePresenterRegistration();
  const completeLesson = useCallback(async () => {
    await context.onLessonTaught?.();
  }, [context.onLessonTaught]);

  return (
    <WorldScene
      eyebrow={lessonEyebrow(
        context.nodeId,
        presenter.enabled
          ? (getEraOfNode(context.nodeId)?.id ?? presenter.request?.eraId ?? null)
          : null,
      )}
      title={lesson.title}
      tone="lesson"
      size="large"
      soundToggle
      onExit={context.onExit}
      actions={
        presenter.enabled || devEnabled ? (
          <>
            {presenter.enabled && (
              <button
                type="button"
                className="city-action city-action-primary presenter-surface-action"
                disabled={presenterCompleting}
                onClick={() => {
                  setPresenterCompleting(true);
                  void completeLesson()
                    .then(() => context.onExit())
                    .catch((error: unknown) => {
                      console.error("Presenter lesson completion failed.", error);
                      presenter.showReward("lesson completion could not run");
                    })
                    .finally(() => setPresenterCompleting(false));
                }}
              >
                {presenterCompleting ? "Completing lesson…" : "Complete lesson"}
              </button>
            )}
            {devSkipOffer?.canSkip && (
              <button
                type="button"
                className="city-action"
                onClick={devSkipOffer.skipToCfu}
              >
                Skip to check (dev only)
              </button>
            )}
            {devEnabled && (
              <button
                type="button"
                className="city-action city-action-primary"
                onClick={() => {
                  context.onDevComplete?.();
                  context.onExit();
                }}
              >
                Simulate completing this lesson (dev only)
              </button>
            )}
          </>
        ) : undefined
      }
    >
      {/* The lesson entry opens the TAUGHT lesson: Oru, one page at a time, each
          page's interactive visual gating "Next". Deliberately no
          `hasCompletedPractice` — it is what a building's mastery used to be spent on
          here, and paired with `skipMenu` it routed the shell to its combined
          all-paragraphs reread instead, so entering an already-practiced building's
          lesson dumped every page and every widget into one ungated scroll with no
          advisor and no controls. Nothing is lost: that reread is still one click away
          from the check ("Review lesson"), and the revisit CHOICE the flag used to buy
          is the city's own building popup, which has already been shown by the time we
          get here. `lessonMountSteps.test.tsx` holds this over every pack at every
          mastery. */}
      <AdvisorLesson
        content={lesson}
        onComplete={context.onPracticeComplete}
        onEnterPractice={context.onLessonTaught}
        onFinishLesson={context.onFinishLesson}
        resumeAtPractice={context.resumePractice}
        resumeAtInfinite={context.resumeInfinite}
        skipMenu={context.skipMenu}
        initialTeachingStep={context.initialTeachingStep}
        devControlsEnabled={devEnabled}
        onDevSkipOfferChange={setDevSkipOffer}
      />
    </WorldScene>
  );
}

/**
 * The real in-world lesson host: entering a building opens that node's mini-lesson
 * inside the shared `WorldScene` frame (so it matches the storm UX and gets
 * Escape/focus/"Back to city" for free). It reads teaching text only — no practice
 * items and no mastery write; the dev-complete action is preserved so the demo loop
 * can still be driven. Nodes without authored lessons fall back to the stub.
 *
 * The lookup is DOMAIN-AGNOSTIC: it reads the all-domains registry, so every registered
 * domain's buildings host their lessons through this one host. Do not add a parallel
 * per-domain host — register the domain in `lessons/domains.ts` instead. (The export
 * keeps its original name so the city lane's references stay put.)
 */
export const d1LessonHost: LessonHost = {
  render(context) {
    const lesson = lessonByNode[context.nodeId];
    if (!lesson) {
      return stubLessonHost.render(context);
    }

    return <D1LessonHostScene context={context} lesson={lesson} />;
  },
};
