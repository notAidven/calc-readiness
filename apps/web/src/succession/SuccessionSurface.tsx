import {
  SUCCESSION,
  type SuccessionActionOffer,
  type SuccessionDistrictPlan,
  type SuccessionState,
  successionActionOffers,
  successionMeaningfulChoice,
} from "@cr/game";
import {
  lazy,
  type ReactElement,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { eraMaterialSfx, playSfx } from "../audio/soundEffects";
import { useDeclareActiveCrisis } from "../city/activeCrisis";
import type { SuccessionSceneCue } from "../city/three/SuccessionIsland";
import { practicePlaceholder } from "../lessons/answerFormat";
import { playCorrectChime } from "../lessons/lessonSound";
import { PracticeAnswer, type PracticeAnswerValue } from "../lessons/PracticeAnswer";
import { LessonProse } from "../lessons/prose";
import { UnreadableAnswerNote } from "../lessons/UnreadableAnswerNote";
import { WorkedSolution } from "../lessons/WorkedSolution";
import { SuccessionConclusion } from "./SuccessionConclusion";
import { SuccessionDevSkip } from "./SuccessionDevSkip";
import { type SuccessionDrawSet, successionFrozenItem } from "./successionItems";
import { SuccessionSlab } from "./SuccessionRail";
import {
  createLocalSuccessionSession,
  type SuccessionBattleSnapshot,
  type SuccessionSession,
} from "./successionSession";
import { successionView } from "./successionView";

import "./succession.css";

const SuccessionIsland = lazy(() =>
  import("../city/three/SuccessionIsland").then((module) => ({
    default: module.SuccessionIsland,
  })),
);
const MIN_ACTION_COST = Math.min(
  ...Object.values(SUCCESSION.actions).map((action) => action.cost),
);

export interface SuccessionSurfaceProps {
  readonly presentation?: "learner" | "prototype";
  readonly session?: SuccessionSession;
  readonly initial?: SuccessionState;
  /** Legacy harness override; the session now owns the authoritative draw. */
  readonly drawSet?: SuccessionDrawSet;
  readonly enableCanvas?: boolean;
  readonly reducedMotion?: boolean;
  readonly binding?: "authored" | "city";
  /** Real placement roster used by the local authority and as the in-city display map. */
  readonly districts?: readonly SuccessionDistrictPlan[];
  /** Replace the standalone forum with the city canvas bridge. */
  readonly renderWorld?: (slot: SuccessionWorldSlot) => ReactNode;
  readonly onStateChange?: (state: SuccessionState) => void;
  readonly onExit?: () => void;
  readonly advisorName?: string | null;
  readonly onTalkToAdvisor?: () => void;
}

export interface SuccessionWorldSlot {
  readonly state: SuccessionState;
  readonly view: ReturnType<typeof successionView>;
  readonly cue: SuccessionSceneCue | null;
}

interface RevealedAnswer {
  readonly itemVersionId: string;
  readonly correct: boolean;
}

interface SuccessionCityBeat {
  readonly token: string;
  readonly kind: "rival-claim" | "rally" | "reopen";
  readonly districtId: string;
  readonly headline: string;
  readonly detail: string;
}

export function SuccessionSurface({
  presentation = "learner",
  session,
  initial,
  enableCanvas = true,
  reducedMotion = false,
  binding = "authored",
  districts,
  renderWorld,
  onStateChange,
  onExit,
  advisorName = null,
  onTalkToAdvisor,
}: SuccessionSurfaceProps): ReactElement {
  useDeclareActiveCrisis("classical");
  const client = useMemo(
    () => session ?? createLocalSuccessionSession({ storage: null, initial }),
    [session, initial],
  );
  const [battle, setBattle] = useState<SuccessionBattleSnapshot | null>(() =>
    initial
      ? {
          revision: 1,
          state: initial,
          active_batch: null,
          verdicts: [],
        }
      : null,
  );
  const [loading, setLoading] = useState(initial === undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<PracticeAnswerValue>(null);
  const [revealed, setRevealed] = useState<RevealedAnswer | null>(null);
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [cityBeat, setCityBeat] = useState<SuccessionCityBeat | null>(null);
  const commitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const loaded = await client.load();
        const result =
          binding === "city"
            ? await client.command({ type: "start", binding, districts })
            : loaded.battle === null
              ? await client.command({ type: "start", binding })
              : loaded;
        if (active) {
          setBattle(result.battle);
          setLoading(false);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "The battle could not be loaded.",
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [binding, client, districts]);

  useEffect(() => {
    if (battle?.state.proposal !== null) {
      commitRef.current?.focus({ preventScroll: true });
    }
  }, [battle?.state.proposal]);

  useEffect(() => {
    if (battle) {
      onStateChange?.(battle.state);
    }
  }, [battle, onStateChange]);

  async function command(
    input: Parameters<SuccessionSession["command"]>[0],
  ): Promise<SuccessionBattleSnapshot | null> {
    setPending(true);
    setError(null);
    try {
      const result = await client.command(input);
      setBattle(result.battle);
      return result.battle;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That action did not land.");
      return null;
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <main className="sx-shell sx-shell--loading" aria-busy="true">
        <p>Loading the forum…</p>
      </main>
    );
  }
  if (battle === null) {
    return (
      <main className="sx-shell sx-shell--loading">
        <p role="alert">{error ?? "The Succession is not available."}</p>
      </main>
    );
  }

  const state = battle.state;
  const displayById = new Map((districts ?? []).map((district) => [district.id, district]));
  const projected = successionView(state);
  const displayDistricts = projected.districts.map((district) => {
    const display = displayById.get(district.id);
    return display
      ? {
          ...district,
          label: display.label,
          civic_label: display.civic.label,
          placement_id: display.civic.placement_id,
        }
      : district;
  });
  const displayThreat = displayDistricts.find((district) => district.decides_next);
  const view = {
    ...projected,
    districts: displayDistricts,
    rail: {
      ...projected.rail,
      threat_sentence:
        displayThreat === undefined
          ? "Every district has decided."
          : displayThreat.suspendable
            ? `After the next three-question batch, the rival will claim the ${displayThreat.label}. ${displayThreat.civic_label} closes.`
            : `After the next three-question batch, the rival will claim the ${displayThreat.label}.`,
    },
  };
  const active = battle.active_batch?.status === "ready" ? battle.active_batch : null;
  const prompt = active?.prompts[battle.verdicts.length];
  const item = prompt ? successionFrozenItem(prompt.item_version_id) : undefined;
  const revealedItem = revealed ? successionFrozenItem(revealed.itemVersionId) : undefined;
  const offers = successionActionOffers(state);
  const choice = successionMeaningfulChoice(state);
  const rivalDistrict = state.last_batch
    ? view.districts.find((district) => district.id === state.last_batch?.rival_claimed)
    : undefined;
  const landedRivalBeat: SuccessionCityBeat | null =
    state.phase === "response" && state.last_batch && rivalDistrict
      ? {
          token: `rival-${state.last_batch.batch}-${rivalDistrict.id}`,
          kind: "rival-claim",
          districtId: rivalDistrict.id,
          headline: `${rivalDistrict.label} has fallen`,
          detail: rivalDistrict.suspendable
            ? `${rivalDistrict.civic_label} is shuttered. The rival assembly holds this ward.`
            : "The rival assembly now holds this ward.",
        }
      : null;
  const visibleBeat = cityBeat ?? landedRivalBeat;
  const sceneCue: SuccessionSceneCue | null = state.proposal
    ? {
        token: `proposal-${state.batch}-${state.proposal.kind}-${state.proposal.district_id}`,
        kind: "proposal",
        districtId: state.proposal.district_id,
        label: state.proposal.kind === "rally" ? "Your claim" : "Reopen this civic",
      }
    : visibleBeat
      ? {
          token: visibleBeat.token,
          kind: visibleBeat.kind,
          districtId: visibleBeat.districtId,
          label:
            visibleBeat.kind === "rival-claim"
              ? "Ward lost"
              : visibleBeat.kind === "rally"
                ? "Your ward"
                : "Civic reopened",
        }
      : null;

  async function startBatch(): Promise<void> {
    const next = await command({ type: "start_batch" });
    if (next) {
      setCityBeat(null);
      setAnnouncement("Three questions. Then the rival acts and the board changes.");
    }
  }

  async function checkAnswer(): Promise<void> {
    if (!prompt || answer === null) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await client.command({
        type: "answer",
        item_version_id: prompt.item_version_id,
        raw_answer: answer,
      });
      setBattle(result.battle);
      if (result.verdict?.correct === null) {
        setUnreadable(result.verdict.unreadable ?? "That answer could not be read.");
        return;
      }
      const correct = result.verdict?.correct ?? false;
      setUnreadable(null);
      setRevealed({ itemVersionId: prompt.item_version_id, correct });
      const closed = result.battle?.state.last_batch;
      if (correct) {
        playCorrectChime();
      }
      if (closed && result.battle?.state.phase === "response") {
        const district = result.battle.state.districts.find(
          (candidate) => candidate.id === closed.rival_claimed,
        );
        if (district) {
          const display = displayById.get(district.id);
          const districtLabel = display?.label ?? district.label;
          const civicLabel = display?.civic.label ?? district.civic.label;
          const beat: SuccessionCityBeat = {
            token: `rival-${closed.batch}-${district.id}`,
            kind: "rival-claim",
            districtId: district.id,
            headline: `${districtLabel} has fallen`,
            detail:
              district.civic.suspendable === false
                ? "The rival assembly now holds this ward."
                : `${civicLabel} is shuttered. The rival assembly holds this ward.`,
          };
          setCityBeat(beat);
          playSfx("crowd-gather");
          setAnnouncement(
            `${correct ? "Correct." : "The batch is complete."} ${beat.headline}. ${beat.detail} You earned ${closed.influence_earned} influence.`,
          );
        }
      } else {
        setAnnouncement(
          correct
            ? "Correct. One influence will be added when the batch ends."
            : "The question is checked. The rival still waits for the end of the batch.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The answer could not be checked.");
    } finally {
      setPending(false);
    }
  }

  async function advanceFromResponse(): Promise<void> {
    const finished = await command({ type: "finish_response" });
    if (finished?.state.phase === "ready") {
      await startBatch();
    } else if (finished?.state.phase === "settled") {
      setCityBeat(null);
    }
  }

  async function commitAction(): Promise<void> {
    const proposal = state.proposal;
    if (!proposal) {
      return;
    }
    const next = await command({ type: "commit_action" });
    if (!next) {
      return;
    }
    const display = displayById.get(proposal.district_id);
    const districtLabel = display?.label ?? proposal.district_label;
    const civicLabel = display?.civic.label ?? proposal.civic_label;
    const beat: SuccessionCityBeat =
      proposal.kind === "rally"
        ? {
            token: `rally-${next.state.batch}-${proposal.district_id}`,
            kind: "rally",
            districtId: proposal.district_id,
            headline: `Your assembly takes ${districtLabel}`,
            detail: "Your standing statue is raised. The rival cannot take this ward.",
          }
        : {
            token: `reopen-${next.state.batch}-${proposal.district_id}`,
            kind: "reopen",
            districtId: proposal.district_id,
            headline: `${civicLabel} opens again`,
            detail: "The shutters are down. The rival statue remains in the ward.",
          };
    setCityBeat(beat);
    playSfx(eraMaterialSfx("crisis-commit", "classical"));
    setAnnouncement(`${beat.headline}. ${beat.detail}`);
  }

  function actionLabel(offer: SuccessionActionOffer): string {
    const display = displayById.get(offer.district_id);
    return offer.kind === "rally"
      ? `Rally ${display?.label ?? offer.district_label}`
      : `Reopen ${display?.civic.label ?? offer.civic_label}`;
  }

  return (
    <main
      className="sx-shell"
      data-succession="true"
      data-phase={state.phase}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <div className="sx-viewport" data-testid="sx-viewport" aria-hidden="true">
        {renderWorld ? (
          renderWorld({ state, view, cue: sceneCue })
        ) : enableCanvas ? (
          <Suspense fallback={<div className="sx-viewport__fallback" />}>
            <SuccessionIsland
              view={view}
              reducedMotion={reducedMotion}
              cue={sceneCue}
              phase={state.phase}
            />
          </Suspense>
        ) : (
          <div className="sx-viewport__fallback" data-testid="sx-canvas-fallback" />
        )}
      </div>
      {visibleBeat && (
        <div
          className="sx-city-beat"
          data-testid="sx-city-beat"
          data-kind={visibleBeat.kind}
          role="status"
          aria-live="polite"
        >
          <strong>{visibleBeat.headline}</strong>
          <span>{visibleBeat.detail}</span>
        </div>
      )}

      <aside className="sx-side" data-testid="sx-side" aria-label="Succession controls">
        <header className="sx-masthead">
          <div>
            <p className="sx-masthead__eyebrow">The Succession · Classical civil war</p>
            <h1>Hold the city together</h1>
          </div>
          <div className="sx-masthead__tools">
            {advisorName && onTalkToAdvisor && (
              <button type="button" onClick={onTalkToAdvisor}>
                Ask {advisorName}
              </button>
            )}
            {onExit && (
              <button type="button" data-testid="sx-exit" onClick={onExit}>
                Leave
              </button>
            )}
          </div>
        </header>

        <section className="sx-status" aria-label="Battle status">
          <p
            className="sx-threat"
            data-testid="sx-threat"
            data-district={view.districts.find((district) => district.decides_next)?.id}
            role="status"
            aria-live="polite"
          >
            {view.rail.threat_sentence}
          </p>
          <div className="sx-scoreline">
            <strong>
              <SuccessionSlab
                banked={state.influence}
                seats={Math.max(3, state.influence)}
                label={`${state.influence} influence`}
              />{" "}
              {state.influence} influence
            </strong>
            <span>Your statues {view.rail.player}</span>
            <span>Rival {view.rail.rival}</span>
            <span>Undecided {view.rail.undecided}</span>
          </div>
        </section>

        {state.phase === "ready" && (
          <section className="sx-ready" data-testid="sx-ready">
            <button
              type="button"
              className="primary-action"
              data-testid="sx-answer-batch"
              disabled={pending}
              onClick={() => void startBatch()}
            >
              Answer {SUCCESSION.batch_size} questions
            </button>
            <p>
              When the third answer lands, the marked ward falls. Nothing runs on a timer.
            </p>
          </section>
        )}

        {((state.phase === "answering" && active !== null) ||
          (revealed !== null && revealedItem !== undefined)) && (
          <section
            className="sx-batch"
            data-testid="sx-batch"
            aria-labelledby="sx-batch-title"
          >
            {revealed && revealedItem ? (
              <>
                <h2 id="sx-batch-title">
                  {revealed.correct ? "Correct" : "Review the worked path"}
                </h2>
                <WorkedSolution
                  templateId={revealedItem.template_id}
                  params={revealedItem.template_params}
                  steps={revealedItem.worked_solution}
                />
                <button
                  type="button"
                  className="primary-action"
                  data-testid="sx-next-question"
                  onClick={() => {
                    setRevealed(null);
                    setAnswer(null);
                  }}
                >
                  {state.phase === "response" ? "See the changed board" : "Next question"}
                </button>
              </>
            ) : active ? (
              <>
                <h2 id="sx-batch-title">
                  Question {battle.verdicts.length + 1} of {active.prompts.length}
                </h2>
                {prompt && item && (
                  <>
                    <div
                      id="sx-question-prompt"
                      className="sx-question lesson-player__prose"
                    >
                      <LessonProse markdown={item.prompt} />
                    </div>
                    <form
                      className="sx-answer-row"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void checkAnswer();
                      }}
                    >
                      <PracticeAnswer
                        key={prompt.item_version_id}
                        frozen={item}
                        value={answer}
                        onChange={setAnswer}
                        disabled={pending}
                        promptId="sx-question-prompt"
                        placeholder={practicePlaceholder(
                          item.answer.answer_spec,
                          item.answer.allowed_symbols,
                          item.answer.answer_key,
                        )}
                      />
                      <button
                        type="submit"
                        data-testid="sx-check"
                        disabled={answer === null || pending}
                      >
                        Check
                      </button>
                    </form>
                    <UnreadableAnswerNote note={unreadable} />
                  </>
                )}
              </>
            ) : (
              <p>The next question is loading…</p>
            )}
          </section>
        )}

        {state.phase === "response" && revealed === null && (
          <section className="sx-response" data-testid="sx-response">
            {state.proposal ? (
              <div className="sx-proposal" data-testid="sx-proposal">
                <p className="sx-proposal__eyebrow">Your one response this batch</p>
                <h2>{actionLabel(state.proposal)}</h2>
                <p>
                  {state.proposal.kind === "rally"
                    ? `Raise your standing statue before the rival reaches this ward. Spend ${state.proposal.cost} influence.`
                    : `Take the shutters down. The rival statue stays. Spend ${state.proposal.cost} influence.`}
                </p>
                <div className="sx-proposal__actions">
                  <button
                    ref={commitRef}
                    type="button"
                    className="primary-action"
                    data-testid="sx-commit-action"
                    disabled={pending}
                    onClick={() => void commitAction()}
                  >
                    Commit this response
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void command({ type: "cancel_proposal" })}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <>
                {offers.length > 0 && (
                  <div
                    className="sx-actions"
                    data-testid="sx-actions"
                    data-choice={choice.length === 2 ? "true" : "false"}
                  >
                    <h2>
                      {choice.length === 2 ? "Choose one response" : "One response fits"}
                    </h2>
                    <p className="sx-actions__stakes">
                      You may act once before the rival pressures the next ward.
                    </p>
                    {offers.map((offer) => (
                      <button
                        key={offer.kind}
                        type="button"
                        data-testid={`sx-action-${offer.kind}`}
                        disabled={pending}
                        onClick={() =>
                          void command({ type: "propose_action", kind: offer.kind })
                        }
                      >
                        <strong>{actionLabel(offer)}</strong>
                        <small>
                          {offer.kind === "rally"
                            ? `Take the next ward · ${offer.cost} influence`
                            : `Restore its civic · ${offer.cost} influence`}
                        </small>
                      </button>
                    ))}
                  </div>
                )}
                {offers.length === 0 &&
                  state.last_action?.committed_after_batch === state.batch && (
                    <p className="sx-response-set" data-testid="sx-response-set">
                      Your response is set. The rival moves only after the next three
                      questions.
                    </p>
                  )}
                {offers.length === 0 &&
                  state.last_action?.committed_after_batch !== state.batch && (
                    <p className="sx-actions__none" data-testid="sx-no-response">
                      Your {state.influence} influence stays banked. Responses cost at least{" "}
                      {MIN_ACTION_COST} influence. Start the next batch to earn more.
                    </p>
                  )}
                <button
                  type="button"
                  className="sx-continue"
                  data-testid="sx-finish-response"
                  disabled={pending}
                  onClick={() => void advanceFromResponse()}
                >
                  {view.rail.undecided === 0 ? "See the result" : "Start the next batch"}
                </button>
              </>
            )}
          </section>
        )}

        {state.phase === "settled" && state.outcome && (
          <SuccessionConclusion
            outcome={state.outcome}
            onLeave={onExit}
            cityBound={binding === "city"}
          />
        )}

        {state.phase !== "answering" && state.phase !== "settled" && (
          <DistrictStrip state={state} districts={view.districts} />
        )}

        {error && (
          <p className="sx-error" role="alert">
            {error}
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </aside>

      {presentation === "prototype" && (
        <SuccessionDevSkip
          state={state}
          onSkipped={(next) =>
            setBattle({
              ...battle,
              revision: battle.revision + 1,
              state: next,
              active_batch: null,
              verdicts: [],
            })
          }
        />
      )}
    </main>
  );
}

function DistrictStrip({
  state,
  districts,
}: {
  readonly state: SuccessionState;
  readonly districts: ReturnType<typeof successionView>["districts"];
}): ReactElement {
  return (
    <ul className="sx-districts" aria-label="District control">
      {state.districts.map((district) => {
        const display = districts.find((candidate) => candidate.id === district.id);
        const controlLabel =
          district.control === "undecided"
            ? "Undecided, no statue"
            : district.control === "player"
              ? "Your standing chevron statue"
              : "Rival seated ring statue";
        const civic =
          district.civic_state === "open"
            ? `${display?.civic_label ?? district.civic.label} open`
            : `${display?.civic_label ?? district.civic.label} shuttered`;
        return (
          <li
            key={district.id}
            className="sx-district"
            data-testid={`sx-district-${district.id}`}
            data-control={district.control}
            data-civic={district.civic_state}
            data-proposed={state.proposal?.district_id === district.id ? "true" : "false"}
            aria-label={`${display?.label ?? district.label}. ${controlLabel}. ${civic}.`}
          >
            <span className="sx-district__mark" aria-hidden="true">
              {district.control === "undecided"
                ? "○"
                : district.control === "player"
                  ? "⌃"
                  : "◎"}
            </span>
            <strong>{(display?.label ?? district.label).replace(/\s+ward$/i, "")}</strong>
            {district.civic_state === "closed" && (
              <span className="sx-district__closed" aria-hidden="true">
                ×
              </span>
            )}
            <span className="sr-only">
              {controlLabel}. {civic}.
            </span>
          </li>
        );
      })}
    </ul>
  );
}
