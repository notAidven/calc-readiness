import { useCallback, useEffect, useState } from "react";

export interface FullscreenControl {
  readonly active: boolean;
  readonly pending: boolean;
  readonly status: string | null;
  readonly supported: boolean;
  enter(): Promise<void>;
  toggle(): Promise<void>;
}

function supportsFullscreen(target: Document | null): target is Document {
  return (
    target !== null &&
    typeof target.documentElement.requestFullscreen === "function" &&
    typeof target.exitFullscreen === "function"
  );
}

/**
 * App-level Fullscreen API state.
 *
 * The document root is the target, so every current surface stays inside the
 * fullscreen element. Calls happen only from the consumer's click handler; this
 * hook never attempts to enter automatically or binds a keyboard shortcut.
 */
export function useFullscreen(): FullscreenControl {
  const target = typeof document === "undefined" ? null : document;
  const [supported] = useState(() => supportsFullscreen(target));
  const [active, setActive] = useState(() => Boolean(target?.fullscreenElement));
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!supported || target === null) {
      return;
    }
    const sync = () => {
      setActive(Boolean(target.fullscreenElement));
      setStatus(null);
    };
    target.addEventListener("fullscreenchange", sync);
    sync();
    return () => target.removeEventListener("fullscreenchange", sync);
  }, [supported, target]);

  const enter = useCallback(async () => {
    if (!supported || target === null) {
      setStatus("Full screen is unavailable in this browser.");
      return;
    }
    if (target.fullscreenElement) {
      setActive(true);
      setStatus(null);
      return;
    }

    setPending(true);
    setStatus(null);
    try {
      // Keep the API call in the consumer's gesture turn. In particular, do not
      // put an await before this request or browsers may reject the gesture.
      await target.documentElement.requestFullscreen();
      setActive(Boolean(target.fullscreenElement));
    } catch {
      setActive(Boolean(target.fullscreenElement));
      setStatus("Full screen was not allowed.");
    } finally {
      setPending(false);
    }
  }, [supported, target]);

  const toggle = useCallback(async () => {
    if (!supported || target === null) {
      setStatus("Full screen is unavailable in this browser.");
      return;
    }
    if (!target.fullscreenElement) {
      await enter();
      return;
    }

    setPending(true);
    setStatus(null);
    try {
      await target.exitFullscreen();
      setActive(Boolean(target.fullscreenElement));
    } catch {
      const stillActive = Boolean(target.fullscreenElement);
      setActive(stillActive);
      setStatus(
        stillActive ? "Could not exit full screen." : "Full screen was not allowed.",
      );
    } finally {
      setPending(false);
    }
  }, [enter, supported, target]);

  return { active, enter, pending, status, supported, toggle };
}
