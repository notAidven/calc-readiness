import { ERA_SEQUENCE, eraNumber } from "@cr/skill-graph";
import {
  createContext,
  Fragment,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "../auth/session";
import { interleavedPoolItems } from "../lessons/interleavedPool";
import { seedReviewMistakesOnce } from "../lessons/mistakeStore";
import { clearPresenterStorage } from "../storage/runtimeStorage";
import { slidesHref } from "./PresenterDeck";
import { PresenterWorkFixture } from "./PresenterWorkFixture";
import {
  type PresenterRequest,
  presenterEntryEraId,
  presenterHref,
  resolvePresenterRequest,
} from "./presenterMode";
import type { PresenterEraBuildResult } from "./presenterState";

import "./presenter-shell.css";

interface PresenterRegistration {
  readonly enabled: boolean;
  readonly request: PresenterRequest | null;
  readonly navigationToken: number;
  readonly eraBuild:
    | ((eraId: PresenterRequest["eraId"]) => Promise<PresenterEraBuildResult>)
    | null;
  readonly reset: (() => Promise<void>) | null;
  readonly navigate: (
    next: Pick<PresenterRequest, "preset" | "surface"> &
      Partial<Pick<PresenterRequest, "eraId">>,
    options?: { readonly replace?: boolean },
  ) => void;
  readonly setEraBuild: (
    build: ((eraId: PresenterRequest["eraId"]) => Promise<PresenterEraBuildResult>) | null,
  ) => void;
  readonly setResetAction: (reset: (() => Promise<void>) | null) => void;
  readonly showReward: (message: string) => void;
}

const PresenterRegistrationContext = createContext<PresenterRegistration>({
  enabled: false,
  request: null,
  navigationToken: 0,
  eraBuild: null,
  reset: null,
  navigate: () => undefined,
  setEraBuild: () => undefined,
  setResetAction: () => undefined,
  showReward: () => undefined,
});

export function usePresenterRegistration(): PresenterRegistration {
  return useContext(PresenterRegistrationContext);
}

function PresenterActionBar(): ReactElement | null {
  const presenter = usePresenterRegistration();
  const request = presenter.request;
  if (!presenter.enabled || !request) {
    return null;
  }

  const navigate = (surface: PresenterRequest["surface"]) =>
    presenter.navigate({
      preset: request.preset,
      surface,
    });

  return (
    <nav
      className="presenter-control-tray presenter-bottom-bar"
      aria-label="Presenter actions"
      data-testid="presenter-bottom-bar"
      data-surface={request.surface}
    >
      <button
        type="button"
        onClick={() => {
          window.history.pushState(null, "", slidesHref(window.location.href));
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
      >
        Slides
      </button>
      <button type="button" onClick={() => navigate("lesson")}>
        Lesson
      </button>
      <button type="button" onClick={() => navigate("practice")}>
        Practice
      </button>
      <button type="button" onClick={() => navigate("review")}>
        Review
      </button>
      <button type="button" onClick={() => navigate("work")}>
        AI work
      </button>
      <button type="button" onClick={() => navigate("bay")}>
        Bay
      </button>
    </nav>
  );
}

export function PresenterModeMenuEntry({
  onClose,
}: {
  readonly onClose: () => void;
}): ReactElement {
  const eraId =
    typeof window === "undefined"
      ? presenterEntryEraId("")
      : presenterEntryEraId(window.location.search);
  const href =
    typeof window === "undefined"
      ? "/demo"
      : slidesHref(
          presenterHref(window.location.href, {
            preset: "bronze-city",
            surface: "city",
            eraId,
          }),
        );
  return (
    <section
      className="city-menu-section presenter-menu-entry"
      aria-labelledby="presenter-menu-entry-title"
      data-testid="presenter-mode-menu-entry"
    >
      <header className="city-menu-section-heading">
        <h3 id="presenter-menu-entry-title">Presentation</h3>
      </header>
      <p className="presenter-menu-era__note">
        Open the retained slide deck and live presenter controls.
      </p>
      <a
        className="city-action city-action-primary presenter-menu-entry__launch"
        aria-label="Open Presenter mode"
        href={href}
        onClick={onClose}
      >
        Presenter mode
      </a>
    </section>
  );
}

export function PresenterMenuEraControl({
  onClose,
}: {
  readonly onClose: () => void;
}): ReactElement | null {
  const presenter = usePresenterRegistration();
  const [targetEraId, setTargetEraId] = useState<PresenterRequest["eraId"]>(
    presenter.request?.eraId ?? "bronze_age",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (presenter.request?.eraId) {
      setTargetEraId(presenter.request.eraId);
    }
  }, [presenter.request?.eraId]);

  if (!presenter.enabled) {
    return null;
  }

  const afterMenuCloses = (action: () => void) => {
    onClose();
    window.setTimeout(action, 0);
  };

  return (
    <section
      className="city-menu-section presenter-menu-era"
      aria-labelledby="presenter-menu-era-title"
      data-testid="presenter-era-menu"
    >
      <header className="city-menu-section-heading">
        <h3 id="presenter-menu-era-title">Presenter mode</h3>
      </header>
      <p className="presenter-menu-era__note">
        Disposable live-demo setup. These controls never appear for learners.
      </p>
      <label className="presenter-menu-era__target">
        <span>Target era</span>
        <select
          aria-label="Presenter target era"
          value={targetEraId}
          onChange={(event) =>
            setTargetEraId(event.currentTarget.value as PresenterRequest["eraId"])
          }
        >
          {ERA_SEQUENCE.map((era) => (
            <option key={era.id} value={era.id}>
              {eraNumber(era.id)} · {era.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="city-action city-action-primary presenter-menu-era__build"
        disabled={busy || presenter.eraBuild === null}
        onClick={() => {
          const build = presenter.eraBuild;
          if (build === null) {
            return;
          }
          setBusy(true);
          void build(targetEraId)
            .then((result) => {
              const eraName =
                ERA_SEQUENCE.find((era) => era.id === result.eraId)?.name ?? result.eraId;
              presenter.showReward(
                `${eraName} ready · ${result.skillCount} skills · ${result.civicCount} civics`,
              );
              afterMenuCloses(() =>
                presenter.navigate({
                  preset: "bronze-city",
                  surface: "city",
                  eraId: targetEraId,
                }),
              );
            })
            .catch((error: unknown) => {
              console.error("Presenter era build failed.", error);
              presenter.showReward("Era build could not run");
            })
            .finally(() => setBusy(false));
        }}
      >
        Unlock &amp; build era
      </button>
      <button
        type="button"
        className="city-action city-action-ghost presenter-menu-era__reset"
        disabled={busy || presenter.reset === null}
        onClick={() => {
          const reset = presenter.reset;
          if (reset === null) {
            return;
          }
          setBusy(true);
          afterMenuCloses(() => {
            void reset().finally(() => setBusy(false));
          });
        }}
      >
        Reset presenter demo
      </button>
    </section>
  );
}

export function PresenterShell({
  request,
  children,
  focusRequest = 0,
}: {
  readonly request: PresenterRequest;
  readonly children: ReactNode;
  readonly focusRequest?: number;
}): ReactElement {
  const [activeRequest, setActiveRequest] = useState(request);
  const session = useSession();
  const [navigationToken, setNavigationToken] = useState(0);
  const [eraBuild, setEraBuild] = useState<
    ((eraId: PresenterRequest["eraId"]) => Promise<PresenterEraBuildResult>) | null
  >(null);
  const [resetAction, setResetAction] = useState<(() => Promise<void>) | null>(null);
  const [reward, setReward] = useState("");
  const [resetToken, setResetToken] = useState(0);
  const seededReviewRequestRef = useRef("");
  const previousSurfaceRef = useRef<PresenterRequest["surface"]>(
    request.surface === "work" ? "city" : request.surface,
  );

  const navigate = useCallback(
    (
      next: Pick<PresenterRequest, "preset" | "surface"> &
        Partial<Pick<PresenterRequest, "eraId">>,
      options: { readonly replace?: boolean } = {},
    ) => {
      const resolved: PresenterRequest = {
        enabled: true,
        legacy: false,
        eraId: activeRequest.eraId,
        ...next,
      };
      if (resolved.surface === "work" && activeRequest.surface !== "work") {
        previousSurfaceRef.current = activeRequest.surface;
      }
      setActiveRequest(resolved);
      setNavigationToken((token) => token + 1);
      if (typeof window !== "undefined") {
        window.history[options.replace ? "replaceState" : "pushState"](
          null,
          "",
          presenterHref(window.location.href, resolved),
        );
      }
    },
    [activeRequest.eraId, activeRequest.surface],
  );

  useEffect(() => {
    const onPopState = () => {
      const next = resolvePresenterRequest(
        window.location.pathname,
        window.location.search,
      );
      if (next) {
        setActiveRequest(next);
        setNavigationToken((token) => token + 1);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (focusRequest <= 0) {
      return;
    }
    let attempts = 0;
    let frame = 0;
    const focusMenu = () => {
      const menu = document.querySelector<HTMLButtonElement>(".hud-menu-toggle");
      if (menu) {
        menu.focus({ preventScroll: true });
        return;
      }
      attempts += 1;
      if (attempts < 60) {
        frame = window.requestAnimationFrame(focusMenu);
      }
    };
    focusMenu();
    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest]);

  useEffect(() => {
    const learnerId = session.studentId ?? "local-demo";
    const seedRequest = `${learnerId}:${activeRequest.eraId}`;
    if (seededReviewRequestRef.current === seedRequest) {
      return;
    }
    seededReviewRequestRef.current = seedRequest;
    seedReviewMistakesOnce(
      learnerId,
      activeRequest.eraId,
      interleavedPoolItems(activeRequest.eraId, "all").slice(0, 3),
    );
    // A direct `surface=review` URL mounts the real queue in the same commit as this shell.
    // Advance the canonical CitySurface activity token once so ReviewMistakes remounts from the
    // now-initialized store; city-first entry already reads the queue when Review is pressed.
    setNavigationToken((token) => token + 1);
  }, [activeRequest.eraId, session.studentId]);

  const registerEraBuild = useCallback(
    (
      build:
        | ((eraId: PresenterRequest["eraId"]) => Promise<PresenterEraBuildResult>)
        | null,
    ) => setEraBuild(() => build),
    [],
  );
  const registerResetAction = useCallback(
    (reset: (() => Promise<void>) | null) => setResetAction(() => reset),
    [],
  );
  const showReward = useCallback((message: string) => {
    setReward(message);
    window.setTimeout(() => setReward(""), 3200);
  }, []);

  const reset = useCallback(async () => {
    if (typeof localStorage !== "undefined") {
      clearPresenterStorage(localStorage);
    }
    seedReviewMistakesOnce(
      session.studentId ?? "local-demo",
      activeRequest.eraId,
      interleavedPoolItems(activeRequest.eraId, "all").slice(0, 3),
    );
    await resetAction?.();
    setResetToken((token) => token + 1);
    navigate(
      {
        preset: "bronze-city",
        surface: "city",
        eraId: activeRequest.eraId,
      },
      { replace: true },
    );
  }, [activeRequest.eraId, navigate, resetAction, session.studentId]);

  const registration = useMemo<PresenterRegistration>(
    () => ({
      enabled: true,
      request: activeRequest,
      navigationToken,
      eraBuild,
      reset: resetAction ? reset : null,
      navigate,
      setEraBuild: registerEraBuild,
      setResetAction: registerResetAction,
      showReward,
    }),
    [
      activeRequest,
      eraBuild,
      navigate,
      navigationToken,
      registerEraBuild,
      registerResetAction,
      reset,
      resetAction,
      showReward,
    ],
  );

  return (
    <PresenterRegistrationContext.Provider value={registration}>
      <div
        className="presenter-app-layer"
        inert={activeRequest.surface === "work"}
        aria-hidden={activeRequest.surface === "work" || undefined}
      >
        <Fragment key={resetToken}>{children}</Fragment>
      </div>
      <PresenterActionBar />
      {activeRequest.surface === "work" && (
        <PresenterWorkFixture
          onExit={() =>
            navigate({
              preset: activeRequest.preset,
              surface: previousSurfaceRef.current,
            })
          }
        />
      )}
      {reward && (
        <div className="presenter-reward" role="status" aria-live="polite">
          {reward}
        </div>
      )}
    </PresenterRegistrationContext.Provider>
  );
}
