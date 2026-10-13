import { type ReactNode, useContext } from "react";

import { LocalSessionProvider } from "./LocalSessionProvider";
import { SessionContext } from "./session";

/**
 * Compatibility wrapper for isolated lesson/diagnostic mounts. The root account provider wins;
 * otherwise the compile-time dev/test stand-in is installed. It imports no Cognito code.
 */
export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const existing = useContext(SessionContext);
  return existing ? children : <LocalSessionProvider>{children}</LocalSessionProvider>;
}
