import {
  createPlague,
  isPlagueState,
  PLAGUE_STATE_VERSION,
  type PlagueEvent,
  type PlagueState,
  plagueReducer,
} from "@cr/game";

export interface PlagueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PlagueSession {
  load(): Promise<PlagueState | null>;
  start(): Promise<PlagueState>;
  dispatch(event: PlagueEvent): Promise<PlagueState>;
}

const LOCAL_KEY = "cr.plague-care-house";

function parseLocal(raw: string | null): PlagueState | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; state?: unknown };
    return parsed.version === PLAGUE_STATE_VERSION && isPlagueState(parsed.state)
      ? parsed.state
      : null;
  } catch {
    return null;
  }
}

export function createLocalPlagueSession(input: {
  readonly storage: PlagueStorage;
  readonly userKey: string;
}): PlagueSession & { readonly storageKey: string } {
  const { storage } = input;
  const storageKey = `${LOCAL_KEY}.v${PLAGUE_STATE_VERSION}.${input.userKey}`;

  function read(): PlagueState | null {
    let raw: string | null = null;
    try {
      raw = storage.getItem(storageKey);
    } catch {
      return null;
    }
    const state = parseLocal(raw);
    if (raw !== null && state === null) {
      try {
        storage.removeItem(storageKey);
      } catch {
        // A store that cannot clear remains untrusted.
      }
    }
    return state;
  }

  function write(state: PlagueState): void {
    storage.setItem(storageKey, JSON.stringify({ version: PLAGUE_STATE_VERSION, state }));
  }

  return {
    storageKey,
    load: async () => read(),
    start: async () => {
      const saved = read();
      if (saved !== null) {
        return saved;
      }
      const state = createPlague();
      write(state);
      return state;
    },
    dispatch: async (event) => {
      const current = read();
      if (current === null) {
        throw new Error("The Care House has not been started.");
      }
      const next = plagueReducer(current, event);
      if (next !== current) {
        write(next);
      }
      return next;
    },
  };
}

async function apiState(
  fetcher: typeof globalThis.fetch,
  url: string,
  token: string | null,
  init?: RequestInit,
): Promise<PlagueState | null> {
  const response = await fetcher(url, {
    ...init,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.body === undefined ? {} : { "content-type": "application/json" }),
    },
  });
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const error = body as { error?: unknown };
    throw new Error(
      typeof error?.error === "string" ? error.error : `Care House ${response.status}`,
    );
  }
  if (body === null) {
    return null;
  }
  if (!isPlagueState(body)) {
    throw new Error("The Care House service returned an invalid state.");
  }
  return body;
}

export function createApiPlagueSession(input: {
  readonly url: string;
  readonly getToken: () => Promise<string | null>;
  readonly fetch?: typeof globalThis.fetch;
}): PlagueSession {
  const fetcher = input.fetch ?? globalThis.fetch.bind(globalThis);
  const post = async (body: unknown): Promise<PlagueState> => {
    const state = await apiState(fetcher, input.url, await input.getToken(), {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (state === null) {
      throw new Error("The Care House service saved no state.");
    }
    return state;
  };
  return {
    load: () => input.getToken().then((token) => apiState(fetcher, input.url, token)),
    start: () => post({ type: "start" }),
    dispatch: (event) => post(event),
  };
}
