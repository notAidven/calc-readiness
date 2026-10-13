import type { EraId } from "@cr/skill-graph";
import { useEffect, useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();
let running: EraId | null = null;

function publish(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Declare the island unlock exam/reveal currently owning the learner surface. */
export function setActiveIslandUnlock(eraId: EraId | null): void {
  if (running === eraId) {
    return;
  }
  running = eraId;
  publish();
}

export function activeIslandUnlockEraId(): EraId | null {
  return running;
}

export function subscribeActiveIslandUnlock(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useActiveIslandUnlock(): EraId | null {
  return useSyncExternalStore(
    subscribeActiveIslandUnlock,
    activeIslandUnlockEraId,
    () => null,
  );
}

/** Mount-scoped declaration, so every exit path clears the transition soundtrack. */
export function useDeclareActiveIslandUnlock(eraId: EraId | null): void {
  useEffect(() => {
    if (eraId === null) {
      return;
    }
    setActiveIslandUnlock(eraId);
    return () => setActiveIslandUnlock(null);
  }, [eraId]);
}
