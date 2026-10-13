import type { UUID } from "@cr/state-schema";

import { runtimeStorage } from "../storage/runtimeStorage";
import {
  type BrowserDiagnosticSnapshot,
  createInMemoryDiagnosticClient,
} from "./browserRuntime";
import type { DiagnosticClient } from "./session";

export const DEMO_DIAGNOSTIC_SCHEMA_VERSION = 1;
const KEY_PREFIX = "cr.demoDiagnostic";

interface DiagnosticStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function demoDiagnosticStorageKey(studentId: UUID): string {
  return `${KEY_PREFIX}.v${DEMO_DIAGNOSTIC_SCHEMA_VERSION}.${studentId}`;
}

function parseSnapshot(raw: string | null): BrowserDiagnosticSnapshot | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      snapshot?: {
        finalized?: unknown;
        completed?: unknown;
      };
    };
    if (
      parsed.version !== DEMO_DIAGNOSTIC_SCHEMA_VERSION ||
      !Array.isArray(parsed.snapshot?.finalized) ||
      !Array.isArray(parsed.snapshot.completed)
    ) {
      return null;
    }
    return {
      finalized: parsed.snapshot.finalized as BrowserDiagnosticSnapshot["finalized"],
      completed: parsed.snapshot.completed as BrowserDiagnosticSnapshot["completed"],
    };
  } catch {
    return null;
  }
}

function defaultStorage(): DiagnosticStorage | null {
  return runtimeStorage();
}

export function createBrowserLocalDiagnosticClient(
  studentId: UUID,
  storage: DiagnosticStorage | null = defaultStorage(),
): DiagnosticClient {
  const key = demoDiagnosticStorageKey(studentId);
  const restored = parseSnapshot(storage?.getItem(key) ?? null);
  const client = createInMemoryDiagnosticClient(studentId, {
    restored,
    mode: "browser-local",
    onSnapshot(snapshot) {
      try {
        storage?.setItem(
          key,
          JSON.stringify({
            version: DEMO_DIAGNOSTIC_SCHEMA_VERSION,
            snapshot,
          }),
        );
      } catch {
        // A blocked/quota-limited browser keeps the working in-memory diagnostic.
      }
    },
  });
  return {
    ...client,
    clearLocal() {
      try {
        storage?.removeItem(key);
      } catch {
        // Best effort; the app-wide demo reset offers the same clear from the title screen.
      }
    },
  };
}
