import type { StormPrompt } from "@cr/game";
import { type ReactNode, useState } from "react";

export interface StormBattleRoundProps {
  readonly prompt: StormPrompt;
  readonly answered: number;
  readonly total: number;
  readonly onSubmitAnswer: (response: string) => void;
  readonly onExit: () => void;
  /** Whether authoritative grading is wired; drives the honest "stubbed" banner. */
  readonly gradingWired?: boolean;
}

/**
 * Battle screen (SCAFFOLD). Presents one prompt at a time with a soft-timer note
 * and a plain answer field. The answer FIELD is real, but GRADING is injected via
 * `useStormBattle` — the scaffold default is fail-closed, so an unwired storm
 * cannot be passed by accident.
 *
 * TODO(evan): swap the plain text input for the shared math-input widget
 * (`@cr/components`), grade with the authoritative answer checker, and add a live
 * soft-timer countdown (respecting `prefers-reduced-motion`, design section 9).
 */
export function StormBattleRound({
  prompt,
  answered,
  total,
  onSubmitAnswer,
  onExit,
  gradingWired = false,
}: StormBattleRoundProps): ReactNode {
  const [response, setResponse] = useState("");

  return (
    <section className="storm-scaffold" aria-labelledby="storm-battle-title">
      <span className="micro-label" aria-live="polite">
        Storm · prompt {answered + 1} of {total}
      </span>
      <h2 id="storm-battle-title">Answer to hold back the storm</h2>
      <p className="storm-scaffold-prompt">{prompt.prompt}</p>
      <p className="storm-scaffold-note">
        From skill {prompt.node_id}. The soft timer is running — bonus only, no penalty.
      </p>
      {!gradingWired && (
        <p className="storm-scaffold-warning" role="note">
          Scaffold: answer grading is not wired yet, so answers record as incorrect.
        </p>
      )}
      <form
        className="storm-scaffold-answer"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitAnswer(response);
          setResponse("");
        }}
      >
        <label htmlFor="storm-answer">Your answer</label>
        <input
          id="storm-answer"
          type="text"
          value={response}
          autoComplete="off"
          onChange={(event) => setResponse(event.target.value)}
        />
        <div className="storm-scaffold-actions">
          <button type="submit" className="city-action city-action-primary">
            Submit answer
          </button>
          <button type="button" className="city-action" onClick={onExit}>
            Leave storm
          </button>
        </div>
      </form>
    </section>
  );
}
