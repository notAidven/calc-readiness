import type { EraId } from "@cr/skill-graph";
import { useCallback, useSyncExternalStore } from "react";

import { clearEraId, loadEraId, nextEraId, saveEraId } from "./eraState";

/**
 * THE REACT VIEW OF THE ERA STATE — one store, so every surface re-dresses together.
 *
 * `eraState.ts` is the state and is deliberately framework-free; this is the subscription
 * around it. It is a module-level store rather than a context because the advance has to
 * reach surfaces that are not inside one provider: the ceremony sets the era, and the city
 * behind it, its roster, its hall and its build menu all have to be showing the new era by
 * the time the ceremony closes. A context would work and would mean threading a provider
 * through `App.tsx`, which is a file this change has no business in.
 *
 * `useSyncExternalStore` rather than an effect-plus-state pair: the era is read during
 * render by everything that dresses off it, so a tearing-safe read is the right primitive
 * and it removes the mount-flash where the city paints era one for one frame before the
 * stored era arrives.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * The snapshot. Cached because `useSyncExternalStore` requires `getSnapshot` to return a
 * value that is referentially stable between notifications — reading `localStorage` on
 * every call returns an equal string, which is fine for a primitive, but the cache also
 * keeps the read off the hot render path.
 */
let snapshot: EraId | null = null;

function getSnapshot(): EraId {
  if (snapshot === null) {
    snapshot = loadEraId();
  }
  return snapshot;
}

/** The server/SSR snapshot: era one, never a stored value there is no storage for. */
function getServerSnapshot(): EraId {
  return loadEraId(null);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Move the city to an era, persist it, and re-render everything dressing off it.
 *
 * Exported as a plain function as well as through the hook so a non-component caller (a
 * test, a dev control outside the tree) can drive it. No gate: see `eraState.ts` for why
 * the absence of one is the design and not an omission.
 */
export function setCityEra(eraId: EraId): void {
  snapshot = eraId;
  saveEraId(eraId);
  publish();
}

/**
 * Dress the current mount as an era without changing the saved city.
 *
 * The public demo's clearly labelled era previews use this before constructing a temporary
 * session. Leaving the preview and reloading `/demo` therefore restores the learner's saved
 * era instead of letting a showcase shortcut become progression.
 */
export function setCityEraForPreview(eraId: EraId): void {
  snapshot = eraId;
  publish();
}

/**
 * Advance one era and return the era now being worn, or `null` at the end of the sequence
 * — in which case nothing moves. The return value is what a caller should narrate, so a
 * ceremony cannot announce an advance that did not happen.
 */
export function advanceCityEra(from: EraId): EraId | null {
  const next = nextEraId(from);
  if (next === null) {
    return null;
  }
  setCityEra(next);
  return next;
}

/** Put the city back in era one and forget the stored value. The dev control's reset. */
export function resetCityEra(): void {
  clearEraId();
  snapshot = null;
  publish();
}

/**
 * The era the city is standing in, read OUTSIDE React — the store's own snapshot, not a
 * second opinion about it.
 *
 * The two mutators above are already exported as plain functions *"so a non-component
 * caller can drive them"*; this is the missing read, and it landed because the economy
 * adapter needed one. `economySession.ts` is a plain module, so it cannot call the hook,
 * and it had `CURRENT_ERA_ID` hard-wired instead — which meant every lesson completed from
 * era two onward credited that era's material while the wallet reported era ONE's, so the
 * credit was real and unspendable (measured at `03d5a2b9`: era two grants `{grain: 240}`
 * and the wallet answers `spendable: 0, spendableMaterial: stone`).
 *
 * **It reads {@link getSnapshot} rather than `loadEraId()` directly, and that is the
 * point.** `loadEraId` is the PERSISTENCE, and the two come apart wherever there is no
 * storage: `saveEraId` is a no-op under SSR and in a bare unit test, so after
 * `setCityEra("neolithic")` the store says neolithic and `localStorage` says nothing at
 * all. A reader on the storage would then disagree with every surface rendering off the
 * hook, in exactly the environment where the disagreement is hardest to see. Sharing the
 * cached snapshot makes them one value by construction.
 */
export function cityEraId(): EraId {
  return getSnapshot();
}

/**
 * Run `listener` whenever the city's era moves, OUTSIDE React. Returns the remover.
 *
 * The symmetric partner to {@link cityEraId}, and it landed for the same kind of caller:
 * the soundtrack is driven by an imperative reconciler in `audio/useAudio.ts` that
 * already subscribes to the audio preferences, the gesture gate and the tab visibility,
 * and the era is a fourth input of exactly that kind. Subscribing here rather than
 * calling {@link useCityEra} in `App` is the point: the hook would re-render the whole
 * app on an advance to change which file an `<audio>` element streams, and nothing on
 * screen depends on the answer.
 */
export function subscribeCityEra(listener: () => void): () => void {
  return subscribe(listener);
}

/** The era the city is standing in, re-rendering the caller when it moves. */
export function useCityEra(): EraId {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The era, plus the two ways to move it. */
export function useCityEraControls(): {
  eraId: EraId;
  setEra: (eraId: EraId) => void;
  advance: () => EraId | null;
  reset: () => void;
} {
  const eraId = useCityEra();
  const advance = useCallback(() => advanceCityEra(eraId), [eraId]);
  return { eraId, setEra: setCityEra, advance, reset: resetCityEra };
}
