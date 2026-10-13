import { useEffect, useRef } from "react";

import { ONBOARDING_ACTION_TASKS, type OnboardingActionMomentId } from "./onboardingScript";

import "./firstBuildingTask.css";

/** A compact handoff from the advisor to one of the city's existing live surfaces. */
export function OnboardingActionTask({
  moment,
  done,
  nudge,
  onOpen,
}: {
  readonly moment: OnboardingActionMomentId;
  readonly done: boolean;
  readonly nudge: number;
  readonly onOpen?: () => void;
}) {
  const copy = ONBOARDING_ACTION_TASKS[moment];
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (nudge > 0 && !done) {
      actionRef.current?.focus();
    }
  }, [done, nudge]);

  return (
    <div
      className="ob-task"
      data-testid={`onboarding-task-${moment}`}
      data-visited={done ? "true" : "false"}
    >
      {!done && onOpen && (
        <button
          type="button"
          className="city-action city-action-primary ob-task__open"
          data-testid={`onboarding-action-${moment}`}
          ref={actionRef}
          onClick={onOpen}
        >
          {copy.open}
        </button>
      )}
      {(done || nudge > 0) && (
        <p
          className="ob-task__status"
          data-state={done ? "solved" : "wrong"}
          aria-live="polite"
        >
          {done ? copy.done : copy.nudge}
        </p>
      )}
    </div>
  );
}
