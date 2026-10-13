import { resolvePresenterRequest } from "../demo/presenterMode";
import { isExactDemoPath } from "../runtimeMode";
import {
  isSuccessionEntry,
  SUCCESSION_QA_STORAGE_PREFIX,
} from "../succession/successionRoute";

export const DEMO_STORAGE_PREFIX = "cr.demo.";
export const PRESENTER_STORAGE_PREFIX = "cr.presenter.v1.";

export interface BrowserStorage {
  readonly length: number;
  clear(): void;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

function demoKey(key: string): string {
  return key.startsWith("cr.")
    ? `${DEMO_STORAGE_PREFIX}${key.slice("cr.".length)}`
    : `${DEMO_STORAGE_PREFIX}${key}`;
}

function logicalDemoKey(key: string): string | null {
  return key.startsWith(DEMO_STORAGE_PREFIX)
    ? `cr.${key.slice(DEMO_STORAGE_PREFIX.length)}`
    : null;
}

export function demoStorage(storage: BrowserStorage): BrowserStorage {
  function keys(): string[] {
    const result: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const physical = storage.key(index);
      if (physical?.startsWith(DEMO_STORAGE_PREFIX)) {
        result.push(physical);
      }
    }
    return result;
  }

  return {
    get length() {
      return keys().length;
    },
    clear() {
      for (const key of keys()) {
        storage.removeItem(key);
      }
    },
    getItem(key) {
      return storage.getItem(demoKey(key));
    },
    key(index) {
      const physical = keys()[index];
      return physical ? logicalDemoKey(physical) : null;
    },
    removeItem(key) {
      storage.removeItem(demoKey(key));
    },
    setItem(key, value) {
      storage.setItem(demoKey(key), value);
    },
  };
}

function presenterKey(key: string): string {
  return key.startsWith("cr.")
    ? `${PRESENTER_STORAGE_PREFIX}${key.slice("cr.".length)}`
    : `${PRESENTER_STORAGE_PREFIX}${key}`;
}

export function presenterStorage(storage: BrowserStorage): BrowserStorage {
  const keys = (): string[] => {
    const result: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(PRESENTER_STORAGE_PREFIX)) {
        result.push(key);
      }
    }
    return result;
  };
  return {
    get length() {
      return keys().length;
    },
    clear() {
      for (const key of keys()) {
        storage.removeItem(key);
      }
    },
    getItem(key) {
      return storage.getItem(presenterKey(key));
    },
    key(index) {
      const physical = keys()[index];
      return physical ? `cr.${physical.slice(PRESENTER_STORAGE_PREFIX.length)}` : null;
    },
    removeItem(key) {
      storage.removeItem(presenterKey(key));
    },
    setItem(key, value) {
      storage.setItem(presenterKey(key), value);
    },
  };
}

function namespacedStorage(storage: BrowserStorage, prefix: string): BrowserStorage {
  const keys = (): string[] => {
    const result: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) {
        result.push(key);
      }
    }
    return result;
  };

  return {
    get length() {
      return keys().length;
    },
    clear() {
      for (const key of keys()) {
        storage.removeItem(key);
      }
    },
    getItem(key) {
      return storage.getItem(`${prefix}${key}`);
    },
    key(index) {
      return keys()[index]?.slice(prefix.length) ?? null;
    },
    removeItem(key) {
      storage.removeItem(`${prefix}${key}`);
    },
    setItem(key, value) {
      storage.setItem(`${prefix}${key}`, value);
    },
  };
}

function pathAwareStorage(storage: BrowserStorage): BrowserStorage {
  const active = (): BrowserStorage => {
    if (typeof window === "undefined") {
      return storage;
    }
    if (resolvePresenterRequest(window.location.pathname, window.location.search)) {
      return presenterStorage(storage);
    }
    return isExactDemoPath(window.location.pathname) ? demoStorage(storage) : storage;
  };
  return {
    get length() {
      return active().length;
    },
    clear() {
      active().clear();
    },
    getItem(key) {
      return active().getItem(key);
    },
    key(index) {
      return active().key(index);
    },
    removeItem(key) {
      active().removeItem(key);
    },
    setItem(key, value) {
      active().setItem(key, value);
    },
  };
}

/** Best-effort app storage, namespaced when and only when the exact demo route is open. */
export function runtimeStorage(): BrowserStorage | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    if (
      typeof window !== "undefined" &&
      isSuccessionEntry(window.location.search) &&
      (isExactDemoPath(window.location.pathname) || import.meta.env.DEV) &&
      typeof sessionStorage !== "undefined"
    ) {
      return namespacedStorage(sessionStorage, SUCCESSION_QA_STORAGE_PREFIX);
    }
    return pathAwareStorage(localStorage);
  } catch {
    return null;
  }
}

/** Clear only exact-demo keys. Cognito and ordinary account/device keys are out of scope. */
export function clearExactDemoStorage(
  storage: Pick<BrowserStorage, "length" | "key" | "removeItem">,
): readonly string[] {
  const removed: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(DEMO_STORAGE_PREFIX)) {
      removed.push(key);
    }
  }
  for (const key of removed) {
    storage.removeItem(key);
  }
  return removed;
}

export function clearPresenterStorage(
  storage: Pick<BrowserStorage, "length" | "key" | "removeItem">,
): readonly string[] {
  const removed: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(PRESENTER_STORAGE_PREFIX)) {
      removed.push(key);
    }
  }
  for (const key of removed) {
    storage.removeItem(key);
  }
  return removed;
}
