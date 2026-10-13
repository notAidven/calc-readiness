import { randomUuid } from "@cr/diagnostic-runtime";
import type { UUID } from "@cr/state-schema";
import { type ReactNode, useMemo } from "react";

import { runtimeStorage } from "../storage/runtimeStorage";
import { SessionContext, type SessionValue } from "./session";

export const DEV_STUDENT_KEY = "cr.dev-student-id";
const FALLBACK_LOCAL_STUDENT = "00000000-0000-4000-8000-0000000000d1" as UUID;

function localStudentId(): UUID {
  const storage = runtimeStorage();
  if (!storage) {
    return FALLBACK_LOCAL_STUDENT;
  }
  const existing = storage.getItem(DEV_STUDENT_KEY);
  if (existing) {
    return existing as UUID;
  }
  const created = randomUuid() as UUID;
  storage.setItem(DEV_STUDENT_KEY, created);
  return created;
}

export function LocalSessionProvider({ children }: { readonly children: ReactNode }) {
  const value = useMemo<SessionValue>(
    () => ({
      mode: "dev",
      status: "authenticated",
      studentId: localStudentId(),
      email: null,
      signInWithPassword: async () => ({ ok: false }),
      signUp: async () => ({ ok: false }),
      forgotPassword: async () => ({ ok: false }),
      confirmForgotPassword: async () => ({ ok: false }),
      signOut: async () => undefined,
      restoreSession: async () => undefined,
      getAccessToken: async () => null,
    }),
    [],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
