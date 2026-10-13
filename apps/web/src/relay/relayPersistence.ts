import { createRelay, isRelayState, RELAY_STATE_VERSION, type RelayState } from "@cr/game";

export interface RelayStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RelaySession {
  load(): RelayState | null;
  start(initial?: RelayState): RelayState;
  save(state: RelayState): void;
  clear(): void;
}

const LOCAL_KEY = "cr.intrusion";

export function createLocalRelaySession(input: {
  readonly storage: RelayStorage;
  readonly userKey: string;
}): RelaySession & { readonly storageKey: string } {
  const storageKey = `${LOCAL_KEY}.v${RELAY_STATE_VERSION}.${input.userKey}`;

  function clear(): void {
    try {
      input.storage.removeItem(storageKey);
    } catch {
      // An unavailable store costs resume, never playability.
    }
  }

  function load(): RelayState | null {
    let raw: string | null;
    try {
      raw = input.storage.getItem(storageKey);
    } catch {
      return null;
    }
    if (raw === null) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as { version?: unknown; state?: unknown };
      if (parsed.version === RELAY_STATE_VERSION && isRelayState(parsed.state)) {
        return parsed.state;
      }
    } catch {
      // Cleared below with every other untrusted payload.
    }
    clear();
    return null;
  }

  function save(state: RelayState): void {
    try {
      input.storage.setItem(
        storageKey,
        JSON.stringify({ version: RELAY_STATE_VERSION, state }),
      );
    } catch {
      // The active in-memory encounter remains authoritative for this visit.
    }
  }

  return {
    storageKey,
    load,
    start(initial = createRelay()) {
      const resumed = load();
      if (resumed !== null) {
        return resumed;
      }
      save(initial);
      return initial;
    },
    save,
    clear,
  };
}
