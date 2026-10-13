import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { useReducedMotion } from "../city/useReducedMotion";
import { MaterialIcon } from "../economy/MaterialIcon";
import {
  type CompletionRewardReceipt,
  gainLine,
  mergeCompletionRewards,
} from "./completionRewards";

interface CompletionRewardQueue {
  readonly active: CompletionRewardReceipt | null;
  readonly pending: readonly CompletionRewardReceipt[];
}

type QueueAction =
  | { readonly type: "enqueue"; readonly receipt: CompletionRewardReceipt }
  | { readonly type: "dismiss" };

const EMPTY_QUEUE: CompletionRewardQueue = { active: null, pending: [] };

export function completionRewardQueue(
  state: CompletionRewardQueue,
  action: QueueAction,
): CompletionRewardQueue {
  if (action.type === "dismiss") {
    const [active = null, ...pending] = state.pending;
    return { active, pending };
  }
  const incoming = action.receipt;
  if (state.active === null) {
    return { active: incoming, pending: state.pending };
  }
  if (state.active.groupKey === incoming.groupKey) {
    return {
      active: mergeCompletionRewards(state.active, incoming),
      pending: state.pending,
    };
  }
  const queuedIndex = state.pending.findIndex(
    (receipt) => receipt.groupKey === incoming.groupKey,
  );
  if (queuedIndex >= 0) {
    return {
      active: state.active,
      pending: state.pending.map((receipt, index) =>
        index === queuedIndex ? mergeCompletionRewards(receipt, incoming) : receipt,
      ),
    };
  }
  return { active: state.active, pending: [...state.pending, incoming] };
}

interface CompletionRewards {
  readonly enqueue: (receipt: CompletionRewardReceipt | null) => void;
  /**
   * Keep newly queued receipts off the current transient surface. The returned
   * release reveals them after that surface unmounts (Presenter completion).
   */
  readonly hold: () => () => void;
}

const CompletionRewardContext = createContext<CompletionRewards>({
  enqueue: () => undefined,
  hold: () => () => undefined,
});

export function useCompletionRewards(): CompletionRewards {
  return useContext(CompletionRewardContext);
}

export function CompletionRewardProvider({
  children,
  reducedMotion: reducedMotionOverride,
}: {
  readonly children: ReactNode;
  readonly reducedMotion?: boolean;
}) {
  const [queue, dispatch] = useReducer(completionRewardQueue, EMPTY_QUEUE);
  const [holdCount, setHoldCount] = useState(0);
  const mediaReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? mediaReducedMotion;
  const enqueue = useCallback((receipt: CompletionRewardReceipt | null) => {
    if (receipt !== null) {
      dispatch({ type: "enqueue", receipt });
    }
  }, []);
  const hold = useCallback(() => {
    let released = false;
    setHoldCount((count) => count + 1);
    return () => {
      if (!released) {
        released = true;
        setHoldCount((count) => Math.max(0, count - 1));
      }
    };
  }, []);
  const value = useMemo(() => ({ enqueue, hold }), [enqueue, hold]);
  const visibleReward = holdCount === 0 ? queue.active : null;

  return (
    <CompletionRewardContext.Provider value={value}>
      <div
        className="completion-reward-content"
        inert={visibleReward !== null}
        aria-hidden={visibleReward !== null || undefined}
      >
        {children}
      </div>
      {visibleReward !== null && (
        <CompletionRewardDialog
          key={visibleReward.groupKey}
          receipt={visibleReward}
          queuedCount={queue.pending.length}
          reducedMotion={reducedMotion}
          onDismiss={() => dispatch({ type: "dismiss" })}
        />
      )}
    </CompletionRewardContext.Provider>
  );
}

function CompletionRewardDialog({
  receipt,
  queuedCount,
  reducedMotion,
  onDismiss,
}: {
  readonly receipt: CompletionRewardReceipt;
  readonly queuedCount: number;
  readonly reducedMotion: boolean;
  readonly onDismiss: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (restoreFocusRef.current === null && document.activeElement instanceof HTMLElement) {
      restoreFocusRef.current = document.activeElement;
    }
    continueRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(
    () => () => {
      const target = restoreFocusRef.current;
      if (target?.isConnected) {
        target.focus({ preventScroll: true });
      }
    },
    [],
  );

  const primaryIndex = receipt.gains.findIndex(
    (gain) => gainLine(gain) === receipt.primaryLine,
  );
  const primary = receipt.gains[primaryIndex];
  const secondary = receipt.gains.filter((_, index) => index !== primaryIndex);
  const itemizedGains = receipt.headline === null ? secondary : receipt.gains;
  // A coalesced skill receipt can headline the building and prioritize the mastery gain,
  // but the spendable material is what an audience must be able to spot. Keep its era icon
  // in the seal whenever the transaction credited one.
  const materialGain = receipt.gains.find((gain) => gain.kind === "material");
  const materialId =
    materialGain?.kind === "material"
      ? materialGain.materialId
      : primary?.kind === "material"
        ? primary.materialId
        : null;

  return (
    <div
      className="completion-reward-layer"
      data-testid="completion-reward-layer"
      data-context={receipt.context}
    >
      <section
        className="completion-reward-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-context={receipt.context}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDismiss();
          } else if (event.key === "Tab") {
            event.preventDefault();
            continueRef.current?.focus();
          }
        }}
      >
        <div className="completion-reward-seal" aria-hidden="true">
          {materialId ? <MaterialIcon material={materialId} /> : <span />}
        </div>
        <p className="completion-reward-context">{receipt.context}</p>
        <h2 id={titleId}>{receipt.headline ?? receipt.primaryLine}</h2>
        <div id={descriptionId} className="completion-reward-description">
          {receipt.headline === null && receipt.subject !== null && (
            <p className="completion-reward-subject">{receipt.subject}</p>
          )}
          {(itemizedGains.length > 0 ||
            receipt.details.length > 0 ||
            receipt.costs.length > 0) && (
            <ul className="completion-reward-rows">
              {itemizedGains.map((gain) => (
                <li
                  key={`${gain.kind}:${gainLine(gain)}`}
                  data-kind="gain"
                  data-gain-kind={gain.kind}
                >
                  {gainLine(gain)}
                </li>
              ))}
              {receipt.details.map((detail) => (
                <li key={`${detail.label}:${detail.amount}`} data-kind="detail">
                  <strong>{detail.amount}</strong> {detail.label}
                </li>
              ))}
              {receipt.costs.map((cost) => (
                <li key={cost.materialId} data-kind="cost">
                  <span aria-hidden="true">−</span>
                  <strong>{cost.amount}</strong> {cost.label} spent
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          ref={continueRef}
          type="button"
          className="completion-reward-continue"
          onClick={onDismiss}
        >
          Continue
        </button>
        {queuedCount > 0 && (
          <p className="completion-reward-queued">
            {queuedCount} more {queuedCount === 1 ? "completion" : "completions"} to show
          </p>
        )}
      </section>
    </div>
  );
}
