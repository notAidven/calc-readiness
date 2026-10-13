import type { StudentNodeState } from "@cr/state-schema";
import { type ReactElement, useRef } from "react";

import { CitySurface } from "../city/CitySurface";
import { type CityDevSession, createCityDevSession } from "../city/citySession";
import { d1LessonHost } from "../city/d1LessonHost";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";

export const PRESENTER_LESSON_NODE_ID = "LF.1";
export const PRESENTER_LF1_INITIAL_TEACHING_STEP = {
  index: 1,
  section: "example",
} as const;

const LF1_LESSON_STATE: StudentNodeState = {
  student_id: "presenter-learning-demo",
  node_id: PRESENTER_LESSON_NODE_ID,
  placement_estimate: 0,
  mastery: 0,
  mastery_updated_at: null,
  completion_status: "locked",
  lesson_stage: "not_started",
  last_practiced_at: null,
};

const LF1_PRACTICE_STATE: StudentNodeState = {
  student_id: "presenter-learning-demo",
  node_id: PRESENTER_LESSON_NODE_ID,
  placement_estimate: 0,
  mastery: 2,
  mastery_updated_at: "2026-08-12T00:00:00.000Z",
  completion_status: "complete",
  lesson_stage: "done",
  last_practiced_at: "2026-08-12T00:00:00.000Z",
};

export function createPresenterLf1Session(surface: "lesson" | "practice"): CityDevSession {
  return createCityDevSession(null, {
    nodeStates: [surface === "lesson" ? LF1_LESSON_STATE : LF1_PRACTICE_STATE],
    placements: [{ nodeId: PRESENTER_LESSON_NODE_ID, col: 4, row: 0, rot: 0 }],
    townHall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
  });
}

/** Isolated LF.1 host used when the selected Presenter city is not Atomic Age. */
export function PresenterLessonDemo({
  surface,
  onExit,
  onPracticeReceipt,
}: {
  readonly surface: "lesson" | "practice";
  readonly onExit: () => void;
  readonly onPracticeReceipt: (mastery: 3, evidenceId: string) => void | Promise<void>;
}): ReactElement {
  const sessionRef = useRef<CityDevSession | null>(null);
  if (sessionRef.current === null) {
    sessionRef.current = createPresenterLf1Session(surface);
  }
  const session = sessionRef.current;
  const readLf1 = async () => {
    const state = (await session.load()).node_states.find(
      (candidate) => candidate.node_id === PRESENTER_LESSON_NODE_ID,
    );
    if (!state) {
      throw new Error("The disposable Presenter session lost LF.1.");
    }
    return state;
  };

  return (
    <div
      className="presenter-lesson-demo"
      data-testid="presenter-lesson-demo"
      data-presenter-learning="true"
    >
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo={false}
        loadCity={session.load}
        eraId="atomic_age"
        initialSelectedNodeId={PRESENTER_LESSON_NODE_ID}
        initialEntry={
          surface === "lesson"
            ? {
                kind: "lesson",
                nodeId: PRESENTER_LESSON_NODE_ID,
                initialTeachingStep: PRESENTER_LF1_INITIAL_TEACHING_STEP,
              }
            : { kind: "practice", nodeId: PRESENTER_LESSON_NODE_ID }
        }
        activityToken={surface === "lesson" ? 1 : 2}
        onActivityExit={onExit}
        onLessonTaught={async (nodeId) => {
          await session.markLessonTaught(nodeId);
          if ((await readLf1()).lesson_stage !== "practice") {
            throw new Error("LF.1 lesson completion did not commit before exit.");
          }
        }}
        onPracticeComplete={session.advanceMasteryDev}
        onPracticeReceipt={async (_nodeId, mastery, evidenceId) => {
          if ((mastery ?? 0) >= 2) {
            const state = await readLf1();
            if (state.mastery !== 3) {
              throw new Error("LF.1 practice completion did not commit mastery 3.");
            }
            await onPracticeReceipt(state.mastery, evidenceId);
          }
        }}
        suppressAchievementNotes
        suppressCrisisCalls
        lessonHost={d1LessonHost}
      />
    </div>
  );
}
