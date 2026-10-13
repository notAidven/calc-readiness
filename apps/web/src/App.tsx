import type { CivicBuildingId } from "@cr/economy";
import { type CrisisDamageReport, diagnosticEraPlacement } from "@cr/game";
import { ERA_SEQUENCE, type EraId, getEraNodes } from "@cr/skill-graph";
import type { Mastery, StudentNodeState, UUID } from "@cr/state-schema";
import {
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiBaseUrl, isServerBacked } from "./api";
import { archipelagoAvailable, archipelagoEnabled } from "./archipelago/archipelagoFlag";
import { createArchipelagoStore } from "./archipelago/archipelagoPersistence";
import {
  createArchipelagoSession,
  isArchipelagoSession,
} from "./archipelago/archipelagoSession";
import { AudioSettings } from "./audio/AudioSettings";
import { playSfx } from "./audio/soundEffects";
import { useGameAudio } from "./audio/useAudio";
import type { AuthenticatedAccount } from "./auth/AccountBoundary";
import { AccountShell } from "./auth/AccountShell";
import { LocalSessionProvider } from "./auth/LocalSessionProvider";
import { useDeclareScreenTakeover } from "./auth/screenTakeover";
import { bootstrapCityFromApi, loadCityFromApi } from "./city/apiCityLoad";
import {
  cityWriteFromLoad,
  createApiCitySession,
  resetIslandOnApi,
  saveCityToApi,
} from "./city/apiCitySession";
import { CitySurface } from "./city/CitySurface";
import {
  type CityDevSession,
  type CivicPurchaseResult,
  createCityDevSession,
  type RoadCommitResult,
  type RoadRemoveResult,
} from "./city/citySession";
import { createCivicMaterialEconomy } from "./city/civicEconomy";
import {
  type CrisisRepairResult,
  type RepairTarget,
  repairCrisisDamage,
  repairPriceFor,
} from "./city/crisisRepair";
import { d1LessonHost } from "./city/d1LessonHost";
import { CURRENT_ERA_ID } from "./city/eraDressing";
import type { IslandUnlockExamResponseRequest } from "./city/islandUnlockAuthority";
import {
  MOCK_CITY_LOAD,
  MOCK_MASTERED_NODE_STATES,
  MOCK_NODE_STATES,
  MOCK_PATH_HAPPINESS_ROADS,
} from "./city/mockCity";
import type { RoadCell } from "./city/roads";
import { createRoadSpendEconomy } from "./city/roadsEconomy";
import type { CityEntrySurface, CityLoad, CityLoader } from "./city/types";
import { UnsavedChangesNotice } from "./city/UnsavedChangesNotice";
import { cityEraId, setCityEra, setCityEraForPreview } from "./city/useCityEra";
import { useReducedMotion } from "./city/useReducedMotion";
import type { PlacedTransform } from "./city/worldLayout";
import { resolveCrisisCapability, withoutCrisisState } from "./crisisCapability";
import { requestedCrisisPreview } from "./crisisPreviewRoutes";
import { DemoModeNotice } from "./demo/DemoModeNotice";
import { isDemoMode } from "./demo/demoMode";
import { isPresenterDeckSearch, liveDemoHref, PresenterDeck } from "./demo/PresenterDeck";
import {
  PRESENTER_LESSON_NODE_ID,
  PRESENTER_LF1_INITIAL_TEACHING_STEP,
  PresenterLessonDemo,
} from "./demo/PresenterLessonDemo";
import {
  PresenterMenuEraControl,
  PresenterModeMenuEntry,
  PresenterShell,
  usePresenterRegistration,
} from "./demo/PresenterShell";
import { presenterFixtureFor, presenterUnbuiltNodeId } from "./demo/presenterFixtures";
import {
  PRESENTER_DEFAULT_ERA_ID,
  type PresenterRequest,
  presenterHref,
  resolvePresenterRequest,
} from "./demo/presenterMode";
import { buildPresenterEra } from "./demo/presenterState";
import {
  consumeDevResetRequest,
  createDevSessionStore,
  defaultDevStorage,
  isDevPersistenceEnabled,
  isLocalPersistenceEnabled,
  readDevUserKey,
  stripDevResetParam,
  withDevPersistence,
} from "./devPersistence/devSession";
import type { PlacementSeed } from "./diagnostic/placementRosters";
import { EconomyHud } from "./economy/EconomyHud";
import { createEconomyClient, type EconomyClient } from "./economy/economyClient";
import { createServerEconomyClient } from "./economy/economyServerClient";
import { createInMemoryEconomyClient } from "./economy/economySession";
import { useEconomy } from "./economy/useEconomy";
import {
  cityHrefFromIntrusion,
  INTRUSION_FIXTURE_QUERY_PARAM,
} from "./intrusion/IntrusionEntryChip";
import { INTRUSION_PREVIEW_CITY } from "./intrusion/intrusionPreviewCity";
import { LessonPlayer } from "./LessonPlayer";
import { LaunchScreen } from "./launch/LaunchScreen";
import { LaunchStatus } from "./launch/LaunchStatus";
import { useAccountLaunch } from "./launch/useAccountLaunch";
import { postLessonStage } from "./lessons/apiMasteryService";
import { d1Lessons } from "./lessons/d1";
import { configureApiMasteryService } from "./lessons/practiceSession";
import type { LessonContent } from "./lessons/types";
import { cityHrefFromPlague } from "./plague/PlagueEntryChip";
import {
  createApiPlagueSession,
  createLocalPlagueSession,
} from "./plague/plaguePersistence";
import { createLocalRelaySession } from "./relay/relayPersistence";
import {
  CompletionRewardProvider,
  useCompletionRewards,
} from "./rewards/CompletionRewardProvider";
import { masteryStarReward } from "./rewards/completionRewards";
import { type PlayRuntimeMode, resolveRuntimeMode } from "./runtimeMode";
import { createSuccessionQaCitySeed } from "./succession/successionQaCity";
import { isSuccessionRouteRequest } from "./succession/successionRoute";
import {
  createApiSuccessionSession,
  createLocalSuccessionSession,
} from "./succession/successionSession";
import { TitleScreen } from "./TitleScreen";

/**
 * DEV-ONLY preview hatch: `?mock` runs the in-memory session SEEDED with the
 * fully-placed demo city, so the whole place / move / dev loop is exercisable
 * live against a mutable session (a static seed would revert every place/move on
 * the next read). Compiled out of production builds.
 */
function isMockPreview(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("mock")
  );
}

/**
 * DEV-ONLY direct Plague door. It needs a disposable, fully placed city just as the public demo
 * does: a fresh persisted dev city contains only its Town Hall, while the authored outbreak maps
 * onto four real skill placements. Keeping this preview session out of dev persistence also means
 * reviewing the crisis cannot seed or move the presenter's ordinary city.
 */
function isPlaguePreview(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    requestedCrisisPreview(window.location.search)?.param === "plague"
  );
}

/** Canonical local/demo Intrusion door: a disposable real city, never a persisted learner city. */
function isIntrusionCityPreview(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const allowed = (import.meta.env.DEV && import.meta.env.MODE !== "test") || isDemoMode();
  const requested = requestedCrisisPreview(window.location.search);
  return allowed && requested?.param === "intrusion" && requested.destination === "city";
}

/**
 * DEV-ONLY `?mock&paths`: same preview city, fully mastered, with the settling-sized
 * dirt-path network pre-laid so the City Life HUD can show path happiness. Opt-in so
 * plain `?mock` screenshots stay unpaved.
 */
function isMockPathHappinessPreview(): boolean {
  return (
    isMockPreview() &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("paths")
  );
}

/**
 * DEV-ONLY `?mock&mastered`: the fully mastered preview city with NO roads laid.
 *
 * It exists because `?paths` conflates two things that need separating now that civic
 * buildings are buyable. That hatch masters the city *and* pre-lays 18 tiles, which is
 * already enough coverage for `Settling in` — so it cannot show what a PURCHASE does to
 * the band. This one is the mastered city at the bottom of the range (44 people, 9
 * coverage from the skill buildings, so the happiness row is in its restless band),
 * which is where buying a Campfire is visible. `?paths` still implies mastery, so nothing about it changes.
 */
function isMockMasteredPreview(): boolean {
  return (
    isMockPathHappinessPreview() ||
    (isMockPreview() &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("mastered"))
  );
}

/**
 * Presenter/demo preview: the era a temporary city starts in, from `?era=<slug>`.
 *
 * It sets the STARTING era and nothing else, which is the limit worth knowing before reaching
 * for it: a city opened at `?era=neolithic` was never in era one, so the hatch cannot show
 * what an ADVANCE does. The two controls that can are the ceremony in the ☰ Menu
 * (`EraAdvanceDoor.tsx`) and, on a dev server, the skip beside it (`DevEraSkip.tsx`), both of
 * which move the stored era through `advanceCityEra`.
 *
 * A local dev server retains the presenter hatch. An explicit frontend-only demo build also
 * accepts it because the title-screen showcase labels the destination as a temporary preview.
 * Ordinary production accepts neither. Vitest's ambient `DEV` remains excluded unless the test
 * is explicitly built with demo mode, so learner assertions are not silently reseeded.
 *
 * The slug is validated against `ERA_SEQUENCE` rather than cast, so a typo opens the ordinary
 * era-one city instead of handing an unknown slug to a resolver.
 */
function previewStartEra(): EraId | null {
  if (typeof window === "undefined") {
    return null;
  }
  const localPresenter = import.meta.env.DEV && import.meta.env.MODE !== "test";
  if (!localPresenter && !isDemoMode()) {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const crisis = requestedCrisisPreview(window.location.search);
  if (crisis?.destination === "city") {
    return crisis.eraId;
  }
  // Validated against the authored sequence, never cast: a typo opens the ordinary era-one
  // city instead of handing an unknown slug to a resolver.
  const requested = params.get("era")?.trim();
  if (!requested) {
    return null;
  }
  return ERA_SEQUENCE.find((era) => era.id === requested)?.id ?? null;
}

/**
 * The node states the `?era=` hatch seeds: **the previous era finished, and this era's
 * buildings OFFERED rather than already standing.**
 *
 * The expansion era's own nodes start not-started and unplaced, which is what makes the hatch
 * worth having — the whole loop is exercisable: pick the building out of the build menu, place
 * it, open its lesson, page through it with the era's advisor, pass the check, run the practice
 * set, watch mastery land on the model. Pre-building them would show a picture of a city and
 * prove nothing about the lessons.
 *
 * **Era one is seeded MASTERED, and that is required rather than decorative.** The build menu
 * locks a card whose prerequisite buildings in this city are not complete
 * (`buildMenuEntries`), and era two's roster hangs off era one's — `EXP.1` and `RAD.1` both
 * require `NUM.4`. With era one untouched, every era-two card would be correctly locked and the
 * hatch would open onto five buildings nobody can place. So this seeds the city a learner
 * arriving in era two would actually have: era one complete, era two ahead of them, and era
 * two's own internal gates (`RAD.2` behind `RAD.1`, `RAD.3` behind `EXP.1` + `RAD.1`) left to
 * the real rule.
 *
 * `createCityDevSession` seeds node states UNCONDITIONALLY (its `seed.nodeStates` loop does not
 * filter on the MVP set the way `restoreFrom` does), so the expansion era's rows exist in the
 * session alongside era one's six and every mastery write lands on them normally.
 */
function eraExpansionSeedStates(eraId: EraId): readonly StudentNodeState[] {
  const offered: readonly StudentNodeState[] = getEraNodes(eraId).map((nodeId) => ({
    student_id: ERA_EXPANSION_STUDENT_ID,
    node_id: nodeId,
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "in_progress",
    lesson_stage: "not_started",
    last_practiced_at: null,
  }));
  // Era one's six, mastered — the MVP roster's own seed, reused rather than restated.
  return eraId === CURRENT_ERA_ID ? offered : [...MOCK_MASTERED_NODE_STATES, ...offered];
}

/**
 * The dev session's own student id, matching `citySession`'s module-private
 * `DEMO_STUDENT_ID`. Mirrored rather than exported for one dev hatch; a drift cannot desync
 * the checkpoint writer's owner check, because the session re-stamps the owner on every row it
 * restores and every row it writes.
 */
const ERA_EXPANSION_STUDENT_ID = "demo-student" as UUID;

/** A signed-in student whose city reads real state from the API (`GET /api/city`). */
interface AuthedCity {
  studentId: UUID;
  getAccessToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const CheckerLab = lazy(() =>
  import("./CheckerLab").then((module) => ({ default: module.CheckerLab })),
);
const DiagnosticSurface = lazy(() =>
  import("./diagnostic/DiagnosticSurface").then((module) => ({
    default: module.DiagnosticSurface,
  })),
);
const AccountBoundary = lazy(() =>
  import("./auth/AccountBoundary").then((module) => ({
    default: module.AccountBoundary,
  })),
);

// DEV / PREVIEW ONLY — a single-model bench for the Gridwork GLBs, with a free-orbit
// camera the live city does not allow. Lazy so it never loads for the normal city;
// reached with `?three` on the dev URL. See city/three/GridworkModelPreview.
const GridworkModelPreview = lazy(() => import("./city/three/GridworkModelPreview"));

// DEV ONLY — a full-screen list of every lesson, reached with `?dev`. Lazy so it
// stays out of the normal city bundle. See DevLessons.
const DevLessons = lazy(() =>
  import("./DevLessons").then((module) => ({ default: module.DevLessons })),
);

// DEV ONLY — the §8 graph-answer probe (Gabe's diagnostic lane), reached with
// `?graph`. Lazy so the scored-SVG widget stays out of the normal city bundle.
// See diagnostic/GraphProbe.
const GraphProbe = lazy(() =>
  import("./diagnostic/GraphProbe").then((module) => ({ default: module.GraphProbe })),
);

// DEV ONLY — the interactive number_line practice demo, reached with `?interactive`.
// Runs the REAL LessonPractice / InfinitePractice over the number_line demo pool,
// proving the second interactive answer type end to end without touching shipped
// D1 practice. Lazy so it stays out of the normal city bundle.
const InteractivePracticeProbe = lazy(() =>
  import("./diagnostic/InteractivePracticeProbe").then((module) => ({
    default: module.InteractivePracticeProbe,
  })),
);
const SuccessionFixtureRoute = lazy(() =>
  import("./succession/SuccessionFixtureRoute").then((module) => ({
    default: module.SuccessionFixtureRoute,
  })),
);
const IntrusionFixtureRoute = lazy(() =>
  import("./relay/RelayRoute").then((module) => ({
    default: module.RelayRoute,
  })),
);

/**
 * Every takeover surface the city can open, with the chrome copy it opens under.
 *
 * EXPORTED FOR THE CENSUS, not for reuse. `Record<CityEntrySurface, …>` makes this the one
 * exhaustive runtime list of the app's surfaces — a new member of the union does not compile
 * until it has a row here — so `city/learnerMenuHoldsNoDevSurface.test.tsx` can ask "is every
 * surface either offered to a learner or named as a development one" against the app's own
 * enumeration rather than against a list written down in the guard. Nothing else imports it.
 */
export const surfaceMeta: Record<CityEntrySurface, { eyebrow: string; title: string }> = {
  diagnostic: { eyebrow: "Diagnostic", title: "Find your starting point" },
  lessons: { eyebrow: "Construction plan", title: "Six skills, six lessons" },
  checker: { eyebrow: "Capability probe", title: "The D1 answer checker" },
};

function Glyph({
  children,
  viewBox = "0 0 24 24",
}: {
  children: ReactNode;
  viewBox?: string;
}) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function LessonSurface() {
  const [active, setActive] = useState<LessonContent | null>(null);

  if (active) {
    return <LessonPlayer content={active} onExit={() => setActive(null)} />;
  }

  return (
    <section className="lesson-roadmap" aria-labelledby="lesson-title">
      <div className="lesson-intro">
        <span className="section-index">01</span>
        <h2 id="lesson-title">The D1 learning path</h2>
        <p>
          A short mini-lesson introduces each of the six foundational skills. Practice and
          checks for understanding come later; for now, read through the teaching text.
        </p>
      </div>

      <div className="lesson-track">
        {d1Lessons.map((lesson, index) => (
          <article className="lesson-stop" key={lesson.node_id}>
            <div className="lesson-rail">
              <span>{index + 1}</span>
            </div>
            <div className="lesson-copy">
              <div className="lesson-heading">
                <h3>{lesson.node_id}</h3>
                <span>Mini-lesson</span>
              </div>
              <p>{lesson.title}</p>
              <button
                className="primary-action"
                type="button"
                onClick={() => setActive(lesson)}
              >
                Read mini-lesson
                <Glyph>
                  <path d="M5 12h14M14 7l5 5-5 5" />
                </Glyph>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CheckerSurface() {
  return (
    <Suspense
      fallback={
        <section className="checker-lab checker-lab--loading" aria-live="polite">
          Loading the D1 checker probe…
        </section>
      }
    >
      <CheckerLab />
    </Suspense>
  );
}

/**
 * A full-screen overlay hosting the secondary in-world surfaces reached from the
 * city menu. Lessons / Checker keep the immersive city visible behind a blurred
 * scrim, but the DIAGNOSTIC takes over the whole viewport (opaque, no city
 * bleeding through) so onboarding feels like its own focused step; its hand-off
 * CTA closes the overlay back onto the freshly seeded city. A real accessible
 * dialog either way (Escape to close, focus moved in).
 */
/**
 * Whether this is the learner's first-ever lesson (not diagnostic, not checker):
 * a `cr.*` "seen" flag, matching every other first-run hint in the app, so a dev
 * server restart clears it the same way it clears the rest (`App.tsx`'s own
 * reset-on-boot note). Read once per mount rather than reactively -- the hint is
 * a one-time visual, not state anything else depends on.
 */
const FIRST_LESSON_EXIT_HINT_KEY = "cr.seen.firstLessonExitHint";

function isFirstLessonEntry(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(FIRST_LESSON_EXIT_HINT_KEY) !== "true";
  } catch {
    return false;
  }
}

function markFirstLessonEntrySeen(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(FIRST_LESSON_EXIT_HINT_KEY, "true");
  } catch {
    // Storage unavailable (private mode, quota) -- the hint just shows again
    // next time, which is the safe direction to fail in.
  }
}

function SurfaceOverlay({
  surface,
  onClose,
  onPretestComplete,
}: {
  surface: CityEntrySurface;
  onClose: () => void;
  onPretestComplete: (
    placement: PlacementSeed,
    unlockedNodeIds: readonly string[],
  ) => void | Promise<void>;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const meta = surfaceMeta[surface];
  const isDiagnostic = surface === "diagnostic";
  /*
    A LEARNER'S FIRST LESSON, AND ONLY THE FIRST: ringed so they notice it is there
    before reading the whole lesson end to end looking for a way out. Read once at
    mount (not on every render) so the ring does not flicker off mid-lesson the
    instant the flag is marked seen.
  */
  const [showExitHint] = useState(() => surface === "lessons" && isFirstLessonEntry());
  useEffect(() => {
    if (showExitHint) {
      markFirstLessonEntrySeen();
    }
  }, [showExitHint]);

  // This overlay owns the screen while it is mounted, so the app-wide account chrome — which is
  // fixed above every surface at a higher z-index than this one — stands down for its duration.
  // See `auth/screenTakeover.ts`.
  useDeclareScreenTakeover();

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      className={
        isDiagnostic
          ? "surface-overlay surface-overlay--diagnostic"
          : "surface-overlay surface-overlay--learning"
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="surface-overlay-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div
        className={
          isDiagnostic
            ? "surface-overlay-frame surface-overlay-frame--diagnostic"
            : "surface-overlay-frame"
        }
      >
        <header
          className={
            isDiagnostic
              ? "surface-overlay-head surface-overlay-head--diagnostic"
              : "surface-overlay-head"
          }
        >
          {isDiagnostic ? (
            <span className="surface-overlay-brand" id="surface-overlay-title">
              Diagnostic
            </span>
          ) : (
            <div>
              <span className="micro-label">{meta.eyebrow}</span>
              <h1 id="surface-overlay-title">{meta.title}</h1>
            </div>
          )}
          <button
            type="button"
            className={
              showExitHint ? "city-action city-action--first-lesson-hint" : "city-action"
            }
            onClick={onClose}
            ref={closeRef}
          >
            Back to city
          </button>
        </header>
        <div
          className={
            isDiagnostic
              ? "surface-overlay-body surface-overlay-body--diagnostic"
              : "surface-overlay-body"
          }
        >
          <Suspense
            fallback={
              <p className="diagnostic-note" aria-live="polite">
                Loading…
              </p>
            }
          >
            {surface === "diagnostic" && (
              <DiagnosticSurface onPretestComplete={onPretestComplete} onExit={onClose} />
            )}
            {surface === "lessons" && <LessonSurface />}
            {surface === "checker" && <CheckerSurface />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/** The top-level app phase: the title screen gates the normal city/diagnostic entry. */
type AppPhase = "title" | "city";

type CanonicalCityHandoff =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string };

function RuntimeUnavailable({
  reason,
  configurationErrors,
}: {
  readonly reason: "rollout_disabled" | "invalid_configuration";
  readonly configurationErrors: readonly string[];
}) {
  return (
    <AccountShell status>
      <section className="account-status" role="alert">
        <h1>Account app unavailable</h1>
        <p>
          {reason === "rollout_disabled"
            ? "Account access is currently disabled for this release."
            : "This production build is missing required account configuration."}
        </p>
        {configurationErrors.length > 0 && (
          <p className="account-status__code">
            Configuration: {configurationErrors.join(", ")}
          </p>
        )}
        <p>Account access remains closed, with local fallback disabled.</p>
      </section>
    </AccountShell>
  );
}

export function App() {
  return (
    <CompletionRewardProvider>
      <AppContent />
    </CompletionRewardProvider>
  );
}

function AppContent() {
  const [location, setLocation] = useState(() => ({
    pathname: typeof window === "undefined" ? "/" : window.location.pathname,
    search: typeof window === "undefined" ? "" : window.location.search,
  }));
  const [presenterFocusRequest, setPresenterFocusRequest] = useState(0);
  useEffect(() => {
    const sync = () =>
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const runtime = resolveRuntimeMode(location.pathname, import.meta.env);
  const presenterRequest =
    runtime.mode === "demo" && typeof window !== "undefined"
      ? resolvePresenterRequest(location.pathname, location.search)
      : null;
  const presenterDeckOpen =
    presenterRequest !== null && isPresenterDeckSearch(location.search);
  const [presenterLiveStarted, setPresenterLiveStarted] = useState(
    () => !presenterDeckOpen,
  );
  useEffect(() => {
    if (presenterRequest?.legacy && typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        presenterHref(window.location.href, presenterRequest),
      );
    }
  }, [presenterRequest]);
  if (runtime.mode === "unavailable") {
    return (
      <RuntimeUnavailable
        reason={runtime.reason}
        configurationErrors={runtime.configurationErrors}
      />
    );
  }
  if (presenterRequest) {
    return (
      <>
        {presenterLiveStarted && (
          <div
            className="presenter-live-app"
            inert={presenterDeckOpen ? true : undefined}
            aria-hidden={presenterDeckOpen ? true : undefined}
          >
            <LocalSessionProvider>
              <PresenterShell
                request={presenterRequest}
                focusRequest={presenterFocusRequest}
              >
                <GameApp runtimeMode={runtime.mode} presenterRequest={presenterRequest} />
              </PresenterShell>
            </LocalSessionProvider>
          </div>
        )}
        {presenterDeckOpen && (
          <PresenterDeck
            onEnterLiveDemo={() => {
              window.history.replaceState(null, "", liveDemoHref(window.location.href));
              setPresenterLiveStarted(true);
              setPresenterFocusRequest((request) => request + 1);
              setLocation({
                pathname: window.location.pathname,
                search: window.location.search,
              });
            }}
          />
        )}
      </>
    );
  }
  if (runtime.mode === "demo" || runtime.mode === "local") {
    return (
      <LocalSessionProvider>
        <GameApp runtimeMode={runtime.mode} />
      </LocalSessionProvider>
    );
  }
  return (
    <Suspense
      fallback={
        <AccountShell status busy>
          <section className="account-status" aria-live="polite">
            <h1>Opening secure account access…</h1>
          </section>
        </AccountShell>
      }
    >
      <AccountBoundary config={runtime.config}>
        {(account) => <GameApp runtimeMode="account" accountIdentity={account} />}
      </AccountBoundary>
    </Suspense>
  );
}

function GameApp({
  runtimeMode,
  accountIdentity = null,
  presenterRequest: initialPresenterRequest = null,
}: {
  readonly runtimeMode: PlayRuntimeMode;
  readonly accountIdentity?: AuthenticatedAccount | null;
  readonly presenterRequest?: PresenterRequest | null;
}) {
  const demoMode = runtimeMode === "demo";
  const accountMode = runtimeMode === "account";
  const requestedCrisis =
    typeof window === "undefined" ? null : requestedCrisisPreview(window.location.search);
  const crisisCapability = resolveCrisisCapability({
    runtimeMode,
    explicitReviewRoute: requestedCrisis !== null,
    env: import.meta.env,
  });
  const successionRequested =
    crisisCapability.enabled &&
    typeof window !== "undefined" &&
    isSuccessionRouteRequest(requestedCrisis, window.location.search);
  const successionQaPreview =
    !accountMode && successionRequested && (demoMode || import.meta.env.DEV);
  const presenter = usePresenterRegistration();
  const completionRewards = useCompletionRewards();
  const presenterRequest = presenter.request ?? initialPresenterRequest;
  const presenterMode = presenterRequest !== null;
  const presenterCompletionSurface =
    presenterRequest?.surface === "lesson" || presenterRequest?.surface === "practice";
  const presenterDisposableLearningSurface =
    presenterCompletionSurface && presenterRequest?.eraId !== "atomic_age"
      ? presenterRequest.surface
      : null;
  useEffect(() => {
    if (!presenterCompletionSurface) {
      return;
    }
    // The real target city now owns Presenter learning. Hold a receipt while that
    // takeover is active, then reveal it when navigation returns the same city scene.
    return completionRewards.hold();
  }, [completionRewards, presenterCompletionSurface]);
  const presenterFixture = useMemo(
    () => (presenterRequest ? presenterFixtureFor(presenterRequest) : null),
    [presenterRequest],
  );
  // Show the "Remedial Calculus" start menu FIRST; Start / Take Diagnostic enter
  // the city. The `?dev` / `?three` escape hatches short-circuit this entirely.
  const [phase, setPhase] = useState<AppPhase>(() => (presenterMode ? "city" : "title"));
  const [entry, setEntry] = useState<CityEntrySurface | null>(() =>
    presenterRequest?.surface === "diagnostic" ? "diagnostic" : null,
  );
  const surfaceReturnFocusRef = useRef<HTMLElement | null>(null);

  // One in-app city session for the component's lifetime (created once, even
  // under StrictMode's double-invoke). It drives the demo loop from an in-memory
  // node-state seed + the game-owned checkpoint writer — no auth, no network. See
  // `citySession.ts`.
  //
  // DEV-ONLY refresh survival (`devPersistence/devSession.ts`): the session opens
  // on whatever the last visit saved and saves itself after each change, so a
  // reload keeps the city instead of resetting the island. `?reset` wipes it
  // first. The store is INERT whenever the app could be server-backed, and then
  // `withDevPersistence` returns this very session untouched — Contracts §3 keep
  // the Lambda the only writer of real student state.
  /**
   * PREVIEW: WHICH ERA THE CITY IS WEARING, held as STATE and threaded — never written back into
   * `CURRENT_ERA_ID`.
   *
   * That constant derives from `ERA_SEQUENCE[0]` and throws rather than falling back, because
   * INV-ERA-5 bans a second opinion about which era it is. So the dev control moves this
   * `useState` and everything downstream takes it as a prop: `CitySurface`'s `eraId` (which
   * already existed for D-ERA29's dressings) carries it to the hub's model, the road
   * surfacing, the interleaved pool and every display name, and `AdvisorLesson` derives the
   * advisor from the LESSON's own era independently.
   *
   * `?era=` seeds the initial value; the Advance button steps it. `null` means era one.
   */
  const seededEraRef = useRef<EraId | null>(
    presenterFixture?.city.eraId ?? previewStartEra(),
  );

  /**
   * `?era=` also sets the era store once, so the session and its dressing cannot disagree.
   *
   * The era-advance lane owns which era the city WEARS — `eraState.ts` stores it and
   * `CitySurface` reads it through `useCityEra()`, which is also what the Advance ceremony
   * moves. Since #311 the stored era decides the ROSTER too (`era_id` → `cityRosterNodeIds`,
   * this era's nodes and every earlier era's), so writing it here is the WHOLE hatch: one
   * setter makes `?era=neolithic` show era two's hall, roads, dressings AND its buildings.
   * There is no longer a second prop to keep in step with it.
   *
   * A local presenter keeps the historical persisted hatch. The public demo uses the
   * non-persisting setter because its showcase explicitly promises a temporary preview; leaving
   * `/demo?era=…` must not silently advance the saved city.
   */
  useEffect(() => {
    if (presenterFixture) {
      setCityEraForPreview(presenterFixture.city.eraId);
      return;
    }
    const seeded = seededEraRef.current;
    if (seeded !== null) {
      if (demoMode) {
        setCityEraForPreview(seeded);
      } else if (import.meta.env.DEV) {
        setCityEra(seeded);
      }
    }
  }, [demoMode, presenterFixture]);

  const economyClientRef = useRef<EconomyClient | null>(null);
  const fallbackEconomyRef = useRef<EconomyClient | null>(null);
  if (!accountMode && fallbackEconomyRef.current === null) {
    if (presenterMode) {
      const presenterEconomy = createInMemoryEconomyClient();
      // Presenter cities are disposable, already-built fixtures. Fund each era through the
      // economy's canonical reset transaction instead of reconciling their pre-completed
      // mastery rows as if the presenter had just practised them. This leaves LF.1's real
      // lesson-complete event unused until Complete practice commits it on stage.
      for (const era of ERA_SEQUENCE) {
        void presenterEconomy.resetIslandWallet({ eraId: era.id });
      }
      fallbackEconomyRef.current = presenterEconomy;
    } else {
      fallbackEconomyRef.current = createEconomyClient();
    }
  }
  const fallbackEconomy = fallbackEconomyRef.current;
  const devSessionStoreRef = useRef<ReturnType<typeof createDevSessionStore> | null>(null);
  if (!accountMode && devSessionStoreRef.current === null) {
    devSessionStoreRef.current = createDevSessionStore({ enabled: true });
  }
  const devSessionStore = devSessionStoreRef.current;
  const archipelagoStoreRef = useRef<ReturnType<typeof createArchipelagoStore> | null>(
    null,
  );
  if (!accountMode && archipelagoStoreRef.current === null) {
    archipelagoStoreRef.current = createArchipelagoStore({ enabled: true });
  }
  const archipelagoStore = archipelagoStoreRef.current;
  const devSessionRef = useRef<CityDevSession | null>(null);
  if (!accountMode && presenterFixture !== null && devSessionRef.current === null) {
    devSessionRef.current = createCityDevSession(null, presenterFixture.city.seed);
  } else if (!accountMode && devSessionRef.current === null) {
    if (successionQaPreview) {
      const restored = devSessionStore?.load() ?? null;
      devSessionRef.current = withDevPersistence(
        createCityDevSession(restored, createSuccessionQaCitySeed()),
        devSessionStore as ReturnType<typeof createDevSessionStore>,
      );
    } else if (isIntrusionCityPreview()) {
      // Canonical `?intrusion`: the production CitySurface on a deterministic, disposable
      // Information Age city. The seed carries the actual trigger prefix and relay prerequisite;
      // it does not read or write the presenter's saved island.
      devSessionRef.current = createCityDevSession(null, {
        ...INTRUSION_PREVIEW_CITY,
        nodeStates: [
          ...MOCK_MASTERED_NODE_STATES,
          ...(INTRUSION_PREVIEW_CITY.nodeStates ?? []),
        ],
      });
    } else if (seededEraRef.current !== null && !isMockPreview()) {
      // `?era=` preview: a fresh session carrying era one finished and this era's buildings
      // offered, with era one's six PLACED so the island is a city rather than bare ground,
      // and the hub pre-founded exactly as the live session pre-seeds it.
      //
      // NOT wrapped in dev persistence, for the reason `?mock` is not — and here the reason is
      // sharper: a saved blob's node set is filtered to the MVP six on restore
      // (`citySession`'s `restoreFrom` drops unknown ids), so an era-two city would come back
      // with its era-one half intact and its era-two half silently gone. That is the exact
      // half-load `devSession.ts`'s header calls worse than no persistence at all.
      devSessionRef.current = createCityDevSession(null, {
        nodeStates: eraExpansionSeedStates(seededEraRef.current),
        placements: MOCK_CITY_LOAD.placements,
        townHall: MOCK_CITY_LOAD.town_hall,
      });
    } else if (isMockPreview()) {
      // DEV `?mock`: a fresh, fully-placed preview session so the place / move /
      // dev flows are exercisable live. Deliberately NOT wrapped in dev
      // persistence — the preview should not read from or pollute the saved dev
      // session; each load starts from the same demo city. (No snapshot to
      // restore; the seed is the second argument.) `?paths` opts into a mastered
      // city with a settling-sized road network for the happiness HUD.
      const pathDemo = isMockPathHappinessPreview();
      // `?mock&bare` leaves the skill buildings OFF the island while keeping their node
      // states, so the economy still pays its lesson lumps and there is open ground to put
      // a bought building on where nothing else stands. It exists for photography: on a
      // fully built island every free plot is in among the six skill buildings, and a
      // still cannot show a purchase apart from them.
      const bare =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).has("bare");
      devSessionRef.current = createCityDevSession(null, {
        nodeStates: isMockMasteredPreview() ? MOCK_MASTERED_NODE_STATES : MOCK_NODE_STATES,
        placements: bare ? [] : MOCK_CITY_LOAD.placements,
        townHall: MOCK_CITY_LOAD.town_hall,
        roads: pathDemo ? MOCK_PATH_HAPPINESS_ROADS : undefined,
      });
    } else if (isPlaguePreview()) {
      // The direct Care House reviewer door needs the same real, fully placed city as the
      // production demo. It is intentionally a disposable session: opening or leaving a crisis
      // must not turn a review visit into a city-layout write.
      devSessionRef.current = createCityDevSession(null, {
        nodeStates: MOCK_NODE_STATES,
        placements: MOCK_CITY_LOAD.placements,
        townHall: MOCK_CITY_LOAD.town_hall,
      });
    } else {
      // DEV-ONLY refresh survival: open on whatever the last visit saved and save
      // after each change. `?reset` wipes it first. Inert when server-backed
      // (withDevPersistence then returns this very session untouched).
      consumeDevResetRequest(devSessionStore as ReturnType<typeof createDevSessionStore>);
      // ⚑ `?reset` WIPES THE BAY TOO, through the same one hatch. `consumeDevResetRequest` is
      // typed on `clear()` alone precisely so every dev store honours it, and a reset that
      // emptied the city while leaving nine other islands standing would be the worst of both.
      consumeDevResetRequest(archipelagoStore as ReturnType<typeof createArchipelagoStore>);
      const restored = devSessionStore?.load() ?? null;
      const island = withDevPersistence(
        createCityDevSession(
          restored,
          demoMode && restored === null
            ? {
                nodeStates: MOCK_NODE_STATES,
                placements: MOCK_CITY_LOAD.placements,
                townHall: MOCK_CITY_LOAD.town_hall,
              }
            : undefined,
        ),
        devSessionStore as ReturnType<typeof createDevSessionStore>,
      );
      /**
       * ⚑ **THE ARCHIPELAGO, BEHIND `?bay` AND NOWHERE ELSE.**
       *
       * `archipelagoEnabled()` wants `import.meta.env.DEV` — the literal `false` after any
       * `vite build` — AND an explicit `?bay`, which the demo runbook's `?reset` does not
       * carry. So on the demo path and in a learner's build this branch is not taken and
       * `session` is byte-for-byte the session that ships.
       *
       * The wrapper is a `CityDevSession`, so every prop below it is unchanged. What it adds
       * is that the era store now swaps the ground: `withDevPersistence` keeps saving whichever
       * island is under the learner's feet, and `archipelagoStore` keeps the rest of the bay.
       */
      devSessionRef.current = isLocalPersistenceEnabled()
        ? createArchipelagoSession({
            initial: island,
            makeIsland: (restoreFrom) =>
              withDevPersistence(
                createCityDevSession(restoreFrom),
                devSessionStore as ReturnType<typeof createDevSessionStore>,
              ),
            stashed: archipelagoStore?.read(cityEraId()) ?? [],
            onChange: (state) => archipelagoStore?.write(state),
            onFound: async (eraId, authority) => {
              await economyClientRef.current?.reportIslandFounded({ eraId, authority });
            },
            onReset: (eraId) => economyClientRef.current?.resetIslandWallet({ eraId }),
          })
        : island;
    }
  }
  // Preview and demo seeds take earlier branches, but the unlock exam still needs the same
  // founded-island authority. Wrap any remaining local session once, without changing its
  // standing layout or letting a preview write account state. The canonical Intrusion city is
  // the exception: it is a disposable single-island fixture already seeded in era nine, and
  // wrapping it while the era effect lands would correctly create a NEW empty era-nine island
  // and strand the relay prerequisite on the old one.
  if (
    !accountMode &&
    devSessionRef.current !== null &&
    !isArchipelagoSession(devSessionRef.current) &&
    !successionQaPreview &&
    isLocalPersistenceEnabled() &&
    !isIntrusionCityPreview()
  ) {
    const island = devSessionRef.current;
    devSessionRef.current = createArchipelagoSession({
      initial: island,
      standingEra: presenterFixture?.city.eraId,
      makeIsland: (restoreFrom) => createCityDevSession(restoreFrom),
      stashed:
        presenterFixture?.archipelago.islands ?? archipelagoStore?.read(cityEraId()) ?? [],
      onChange: presenterFixture ? undefined : (state) => archipelagoStore?.write(state),
      onFound: presenterFixture
        ? undefined
        : async (eraId, authority) => {
            await economyClientRef.current?.reportIslandFounded({ eraId, authority });
          },
      onReset: presenterFixture
        ? undefined
        : (eraId) => economyClientRef.current?.resetIslandWallet({ eraId }),
      presenterMutationsEnabled: presenterMode,
    });
  }
  const devSession = devSessionRef.current;

  // Account composition reaches this component only after Cognito restored a verified
  // subject. Demo/local composition supplies no identity and never imports the auth client.
  const authedCity: AuthedCity | null = accountIdentity;

  /**
   * THE SIGNED-IN CITY'S SESSION — hydrated from `GET /api/city`, mirrored to
   * `POST /api/city`, and null on every other path.
   *
   * It cannot live in the ref above. That ref is filled on the FIRST render, and
   * `authedCity` is null then by construction (the Cognito identity resolves behind
   * a lazy import), so a session built there would be the dev one for a signed-in
   * learner forever — the same shape of defect `createEconomyClient` was fixed for.
   * A memo keyed on the identity is what lets the real session arrive when the
   * identity does.
   */
  const apiCityBundle = useMemo(() => {
    const base = apiBaseUrl();
    // `?mock` overrides auth so the preview always shows the demo city (and is
    // compiled out of production). `?era=` overrides it for the same reason and on
    // the same line: the hatch is only worth having if the buildings it seeds can be
    // placed and mastered live, which needs the seeded dev session rather than the
    // server's city. This is where `loadCity` used to make that call, and it has to
    // be made here now that `loadCity` is unconditionally `session.load`.
    if (isMockPreview() || seededEraRef.current !== null || !authedCity || !base) {
      return null;
    }
    const fetchCity = loadCityFromApi(`${base}/city`, authedCity.getAccessToken);
    let loaded: Promise<CityLoad> | null = null;
    const load = (): Promise<CityLoad> => {
      loaded ??= fetchCity().then((city) => {
        if (city.current_island) {
          setCityEra(city.current_island);
        }
        return city;
      });
      return loaded;
    };
    const saveToApi = saveCityToApi(`${base}/city`, authedCity.getAccessToken);
    const save = async (city: Parameters<typeof saveToApi>[0]): Promise<void> => {
      await saveToApi(city);
      loaded = null;
    };
    // THE LEARNING-RECORD LANE, pointed at the account it belongs to. Both halves are
    // configured here and only here, so the one fact that decides them — that this app was
    // launched signed in against a real API — is read once. Practice evidence goes straight
    // from the practice surface to `POST /api/mastery/evidence`; the stage goes through the
    // city session, because it is the city that knows a lesson was taught.
    const masteryApi = { baseUrl: base, getToken: authedCity.getAccessToken };
    const bootstrapFromApi = bootstrapCityFromApi(
      `${base}/city`,
      authedCity.getAccessToken,
    );
    const citySession = createApiCitySession({
      studentId: authedCity.studentId,
      load,
      save,
      saveLessonStage: (nodeId, stage) => postLessonStage(masteryApi, nodeId, stage),
    });
    return {
      base,
      load,
      bootstrap: async () => {
        const canonical = await bootstrapFromApi();
        await citySession.rehydrate(canonical);
        loaded = Promise.resolve(canonical);
        if (canonical.current_island) {
          setCityEra(canonical.current_island);
        }
        return canonical;
      },
      save,
      invalidate: () => {
        loaded = null;
      },
      cancelPending: () => {
        fetchCity.cancelPending();
        bootstrapFromApi.cancelPending();
      },
      masteryApi,
      reset: resetIslandOnApi(`${base}/city`, authedCity.getAccessToken),
      session: citySession,
    };
  }, [authedCity]);
  const apiCity = apiCityBundle?.session ?? null;
  const currentApiCityBundleRef = useRef(apiCityBundle);
  currentApiCityBundleRef.current = apiCityBundle;
  const apiCityCleanupGenerationRef = useRef(0);
  useEffect(() => {
    const owned = apiCityBundle;
    const generation = apiCityCleanupGenerationRef.current + 1;
    apiCityCleanupGenerationRef.current = generation;
    return () => {
      // StrictMode immediately re-runs an effect after its development-only cleanup. Defer one
      // microtask so that replay can claim the same bundle before it is mistaken for unmount.
      queueMicrotask(() => {
        if (
          apiCityCleanupGenerationRef.current === generation ||
          currentApiCityBundleRef.current !== owned
        ) {
          owned?.cancelPending();
        }
      });
    };
  }, [apiCityBundle]);

  // Point practice submissions at the account, or (with no bundle) leave them in the page.
  // An effect rather than a line in the memo above, because it is a side effect and a memo
  // that performs one runs twice under StrictMode. Ordering is not delicate: a practice set
  // is reached by entering a building, which is many renders after mount.
  useEffect(() => {
    configureApiMasteryService(apiCityBundle?.masteryApi ?? null);
    return () => configureApiMasteryService(null);
  }, [apiCityBundle]);

  const [apiArchipelagoLoad, setApiArchipelagoLoad] = useState<CityLoad | null>(null);
  useEffect(() => {
    let active = true;
    setApiArchipelagoLoad(null);
    void apiCityBundle?.load().then(
      (city) => {
        if (active) {
          setApiArchipelagoLoad(city);
        }
      },
      () => {
        // The session's own load exposes the retryable error surface.
      },
    );
    return () => {
      active = false;
    };
  }, [apiCityBundle]);

  const apiArchipelago = useMemo(() => {
    if (
      !apiCityBundle ||
      !apiArchipelagoLoad ||
      !archipelagoAvailable({
        rolloutEnabled: archipelagoEnabled(),
        serverBacked: true,
        serverVersion: apiArchipelagoLoad.archipelago_version,
      }) ||
      !apiArchipelagoLoad.islands
    ) {
      return null;
    }
    const current = apiArchipelagoLoad.current_island ?? cityEraId();
    return createArchipelagoSession({
      initial: apiCityBundle.session,
      requireExplicitFoundingAuthority: true,
      stashed: apiArchipelagoLoad.islands
        .filter((island) => island.era_id !== current)
        .map((island) => ({
          eraId: island.era_id,
          layout: {
            placements: island.placements,
            roads: island.roads,
            road_gold_spent: island.road_gold_spent,
            town_hall: island.town_hall,
            civic: island.civic,
            civic_material_spent: island.civic_material_spent,
            crisis_damage: island.crisis_damage,
          },
        })),
      makeIsland: (snapshot) => {
        const islandEra = cityEraId();
        return createApiCitySession({
          studentId: apiCityBundle.session.studentId,
          load: async () => ({
            node_states: snapshot.node_states,
            neighborhood_state: snapshot.neighborhood_states[0] ?? null,
            placements: snapshot.placements,
            roads: snapshot.roads,
            road_gold_spent: snapshot.road_gold_spent,
            town_hall: snapshot.town_hall,
            civic: snapshot.civic,
            civic_material_spent: snapshot.civic_material_spent,
            crisis_damage: snapshot.crisis_damage,
          }),
          save: apiCityBundle.save,
          eraId: () => islandEra,
        });
      },
      onFound: async (eraId, authority) => {
        await economyClientRef.current?.reportIslandFounded({ eraId, authority });
      },
      onReset: (eraId) => apiCityBundle.reset(eraId),
      onLand: (eraId, snapshot) =>
        apiCityBundle.save(
          cityWriteFromLoad(
            {
              node_states: snapshot.node_states,
              neighborhood_state: snapshot.neighborhood_states[0] ?? null,
              placements: snapshot.placements,
              roads: snapshot.roads,
              road_gold_spent: snapshot.road_gold_spent,
              town_hall: snapshot.town_hall,
              civic: snapshot.civic,
              civic_material_spent: snapshot.civic_material_spent,
              crisis_damage: snapshot.crisis_damage,
            },
            eraId,
            eraId,
            eraId,
          ),
        ),
    });
  }, [apiArchipelagoLoad, apiCityBundle]);
  useEffect(() => () => apiArchipelago?.dispose(), [apiArchipelago]);

  const plagueSession = useMemo(() => {
    if (presenterMode || !crisisCapability.enabled) {
      return null;
    }
    const base = apiBaseUrl();
    if (authedCity !== null && base !== null) {
      return createApiPlagueSession({
        url: `${base}/plague`,
        getToken: authedCity.getAccessToken,
      });
    }
    if (!isLocalPersistenceEnabled()) {
      return null;
    }
    const storage = defaultDevStorage();
    return storage === null
      ? null
      : createLocalPlagueSession({ storage, userKey: readDevUserKey(storage) });
  }, [authedCity, crisisCapability.enabled, presenterMode]);

  const successionSession = useMemo(() => {
    if (presenterMode || !crisisCapability.enabled) {
      return null;
    }
    const base = apiBaseUrl();
    if (base && authedCity) {
      return createApiSuccessionSession(`${base}/succession`, authedCity.getAccessToken);
    }
    return isLocalPersistenceEnabled() ? createLocalSuccessionSession() : null;
  }, [authedCity, crisisCapability.enabled, presenterMode]);

  const relaySession = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const storage = window.localStorage;
      return createLocalRelaySession({
        storage,
        userKey: authedCity?.studentId ?? readDevUserKey(storage),
      });
    } catch {
      return null;
    }
  }, [authedCity]);

  // ONE SESSION FOR BOTH PATHS, which is the fix and not a tidy-up: the surface
  // computes placement validity from what `loadCity` returned and sends the write
  // to `session`, so while those were two different objects for a signed-in
  // learner they disagreed about what stood on the island and the first placement
  // was refused for overlapping a building nothing had drawn.
  // Runtime composition guarantees exactly one authority: API in account mode, local in
  // demo/dev. The account boundary does not mount this component without identity/config.
  const session = (apiArchipelago ?? apiCity ?? devSession) as CityDevSession;

  useEffect(() => {
    // Land any debounced save before the tab goes away, and drop `?reset` from
    // the address bar so the next refresh keeps the session it just started. Both
    // stores flush: `devSessionStore` is inert when server-backed and `apiCity` is
    // null when it is not, so exactly one of them ever has anything queued.
    stripDevResetParam();
    const flush = () => {
      devSessionStore?.flush();
      void apiCity?.flush();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
    };
  }, [apiCity, devSessionStore]);

  // Bumping this remounts the city so it re-reads. Combined with the auth key it
  // reloads after a pretest (dev: in-memory seed; server: re-read the DB seed).
  const [cityEpoch, setCityEpoch] = useState(0);
  const [canonicalCityHandoff, setCanonicalCityHandoff] = useState<CanonicalCityHandoff>({
    kind: "idle",
  });
  const diagnosticHandoffRequiredRef = useRef(false);
  const diagnosticHandoffInFlightRef = useRef<Promise<void> | null>(null);
  const diagnosticHandoffAttemptRef = useRef(0);
  const focusCityAfterHandoffRef = useRef(false);
  const [presenterRefreshToken, setPresenterRefreshToken] = useState(0);
  const presenterFocusNodeId = presenterFixture?.city.focusNodeId ?? null;
  const presenterBuildingFocusNodeId =
    presenterRequest?.eraId === "neolithic" ? presenterUnbuiltNodeId("neolithic") : null;
  const handleBuildPresenterEra = useCallback(
    async (eraId: EraId) => {
      if (!isArchipelagoSession(session)) {
        throw new Error("The presenter Bay session is unavailable.");
      }
      const result = await buildPresenterEra(session, eraId);
      setPresenterRefreshToken((token) => token + 1);
      return result;
    },
    [session],
  );
  const handleResetPresenterCity = useCallback(async () => {
    if (!presenterRequest || !isArchipelagoSession(session)) {
      return;
    }
    await buildPresenterEra(session, presenterRequest.eraId);
    setPresenterRefreshToken((token) => token + 1);
  }, [presenterRequest, session]);
  const handleRemovePresenterBuilding = useCallback(
    async (nodeId: string) => {
      if (!presenter.enabled || !isArchipelagoSession(session)) {
        throw new Error("Presenter building removal is unavailable.");
      }
      const result = await session.removeBuildingForPresenter(nodeId);
      setPresenterRefreshToken((token) => token + 1);
      return result;
    },
    [presenter.enabled, session],
  );
  useEffect(() => {
    if (!presenter.enabled) {
      return;
    }
    presenter.setResetAction(handleResetPresenterCity);
    return () => presenter.setResetAction(null);
  }, [handleResetPresenterCity, presenter]);
  useEffect(() => {
    if (!presenter.enabled) {
      presenter.setEraBuild(null);
      return;
    }
    presenter.setEraBuild(handleBuildPresenterEra);
    return () => presenter.setEraBuild(null);
  }, [handleBuildPresenterEra, presenter.enabled, presenter.setEraBuild]);

  /**
   * THE LATEST PRETEST'S PLACEMENT, whole, and it is the ONLY reading held here.
   *
   * Two lanes arrived at the same conclusion from opposite ends and this is the merge of them.
   * The catch-up lane added this beside `unlockedNodeIds` because that list is `placement >= 2`
   * flattened to node ids, so an era the diagnostic CLEARED and an era it never PROBED both
   * read as "not in the list", and the era decision is a conjunction that has to tell them
   * apart. The reward-screen lane removed `unlockedNodeIds` for the same reason one layer up:
   * handing the city a pre-filtered list left its "you tested out of N of M" with nothing to
   * denominate over but era one's roster, and it read "2 of 6" to a learner who had tested out
   * of 4 of 20.
   *
   * So there is one prop rather than two, and `CitySurface` derives the per-node reading where
   * it needs it (`diagnostic/placementRosters.ts`). `{}` is "no pretest yet", which the
   * catch-up reads as an empty `skipped` and the celebration reads as nothing unlocked.
   */
  const [pretestPlacement, setPretestPlacement] = useState<PlacementSeed>({});

  // The era-material economy (plan P2). One client for the app's lifetime — the
  // in-memory core today (no backend), server-backed later. The HUD reads it;
  // `reconcileProgress` observes progression one-way to fire idempotent earn grants.
  // It reads learning state and never gates it (INV-COS-1).
  //
  // NOTHING ABOUT AUTH IS PASSED, and nothing may be. This call is made on the FIRST
  // render, while the Cognito identity is still resolving behind the lazy import
  // below, so `authedCity` is `null` here by construction — and the ref null-check
  // means this line never runs again to see it change. It used to hand
  // `createEconomyClient(authedCity !== null)`, i.e. `false`, to every signed-in
  // learner on a deployed build. The client asks the deployment shape itself
  // (`isEconomyServerBacked(true)`, the way `isDevPersistenceEnabled` does); read its
  // docblock before adding an argument back.
  const economyBase = useMemo<EconomyClient>(
    () =>
      apiCityBundle && authedCity
        ? createServerEconomyClient({
            apiBase: apiCityBundle.base,
            getToken: authedCity.getAccessToken,
          })
        : (fallbackEconomy as EconomyClient),
    [apiCityBundle, authedCity, fallbackEconomy],
  );
  const economyClient = useMemo(
    () =>
      apiCityBundle && authedCity
        ? economyBase
        : createCivicMaterialEconomy(
            createRoadSpendEconomy(economyBase, () => session.roadGoldSpent()),
            () => session.civicMaterialSpent(),
            cityEraId,
          ),
    [apiCityBundle, authedCity, economyBase, session],
  );
  economyClientRef.current = economyClient;
  const economy = useEconomy(economyClient);
  const reducedMotion = useReducedMotion();
  const handlePracticeReceipt = useCallback(
    async (nodeId: string, mastery: Mastery, evidenceId: string) => {
      await economy.reportPracticeSetComplete({ nodeId, mastery, evidenceId });
    },
    [economy],
  );
  const handleDisposableLf1PracticeReceipt = useCallback(
    async (mastery: Mastery, evidenceId: string) => {
      if (mastery !== 3) {
        throw new Error(
          `Presenter LF.1 practice committed mastery ${mastery}, expected 3.`,
        );
      }
      // Presenter bottom-bar Practice is deliberately separate LF.1 content. Its mastery
      // stays in the disposable lesson host and its economy event stays LF.1/Atomic, even
      // when navigation returns to an Era 2 city. Do not adapt this to the visible skill:
      // doing so would mint Grain and advance a building the presenter never practised.
      const outcome = await economy.reportPracticeSetComplete({
        nodeId: PRESENTER_LESSON_NODE_ID,
        mastery,
        evidenceId,
      });
      if (outcome?.rewardKind === "skill_completion") {
        completionRewards.enqueue(
          masteryStarReward({
            id: `${outcome.eventId}:mastery-3`,
            groupKey: outcome.groupKey,
            subject: "LF.1 building",
            before: 2,
            after: mastery,
            total: 3,
          }),
        );
      }
    },
    [completionRewards, economy],
  );

  // Arm the autoplay gate, keep the soundtrack in step with the saved preferences, and
  // pause it whenever the tab is hidden. Nothing plays until the learner interacts, and
  // music additionally waits until they ask for it (see `audio/audioPrefs.ts`).
  useGameAudio();

  /**
   * **WHETHER TO OFFER THE DEVELOPER STAND-IN CONTROLS, KEYED ON THE DEPLOYMENT SHAPE
   * RATHER THAN ON AUTH.** This is a defused landmine, not a tidy-up.
   *
   * The three `onDev…` props below were keyed on the live auth state (`authedCity`) until
   * now, which was a serviceable proxy for *"don't show stand-ins to a real learner"* only
   * while anonymous play existed. Sign-in is now required (ruling 2026-07-31), so
   * `authedCity` is non-null for everyone the day the wall ships — and the WHOLE Developer
   * stand-in panel hangs off these three props: `CitySurface` builds `crisisSeedPlan` only when
   * `onPlaceSkill && onDevAdvanceMastery`, and renders the panel only when
   * `onSeedCrisis && crisisSeedPlan`. The team would have lost the panel, the crisis seed
   * control included, on the day the wall landed — and would have lost it silently, to a
   * line nobody would have thought to look at.
   *
   * `isDevPersistenceEnabled()` is `!isServerBacked(true)`, i.e. no `VITE_DIAGNOSTIC_API_URL`
   * configured. That preserves the intent exactly — production withholds, local and CI show
   * — and puts the dev controls on the same predicate as the dev persistence they drive,
   * which is the coherence `devSession.ts` asks for (*"deliberately has no second notion of
   * environment"*). Guarded by `city/devControlsAreNotAuthGated.test.tsx`, which fails if a
   * dev control is keyed on auth state again.
   */
  const devControlsEnabled = isDevPersistenceEnabled();

  const openSurface = useCallback((surface: CityEntrySurface) => {
    surfaceReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEntry(surface);
  }, []);
  const closeSurface = useCallback(() => setEntry(null), []);
  useEffect(() => {
    if (entry !== null || surfaceReturnFocusRef.current === null) {
      return;
    }
    const requested = surfaceReturnFocusRef.current;
    surfaceReturnFocusRef.current = null;
    const target = requested.isConnected
      ? requested
      : document.querySelector<HTMLElement>(".city-viewport");
    target?.focus({ preventScroll: true });
  }, [entry]);

  // Title-screen entry. Start drops straight into the city; Take Diagnostic enters
  // the city AND opens the diagnostic takeover overlay, whose completion seeds the
  // city via `handlePretestComplete` (the test-out hand-off) exactly as the in-city
  // "Survey" entry does today — so the seeding + "You've unlocked N buildings" popup
  // still fire when arriving via the title screen.
  const startCity = useCallback(() => setPhase("city"), []);
  const startDiagnostic = useCallback(() => {
    setPhase("city");
    setEntry("diagnostic");
  }, []);

  /**
   * **THE ORDINARY ROUTE'S FIRST DECISION**, and it is asked of a first-time learner only.
   *
   * It reads `apiCityBundle` rather than opening its own `GET /api/city`: that bundle
   * memoises the in-flight read, so this shares the request the archipelago effect below
   * already makes and there is exactly one answer to "has this account begun". On every
   * non-account path it resolves to `unavailable` and the demo/dev title screen is drawn
   * unchanged. See `launch/useAccountLaunch.ts`.
   */
  const launch = useAccountLaunch({
    subject: accountMode ? (accountIdentity?.studentId ?? null) : null,
    reader: apiCityBundle,
    setEra: setCityEra,
  });

  // ALWAYS THE SESSION'S OWN READ, on every path. For a signed-in learner that
  // session is `apiCity`, whose first `load()` is the server's city and whose every
  // later one is that city plus the mutations since — so a refresh after a
  // placement shows the placement, and the occupancy the ghost is validated
  // against is the occupancy the write lands in. The API read has not moved; it is
  // now `apiCity`'s hydration (`createApiCitySession`) rather than a second,
  // independent reader of the same endpoint.
  //
  // This subsumes the `?mock` / `?era=` special cases this memo used to carry: both
  // now bail out one level up, in `apiCity`, so `session` is already the seeded dev
  // session by the time it is read here.
  const loadCity = useMemo<CityLoader>(() => {
    if (crisisCapability.enabled) {
      return session.load;
    }
    return async () => withoutCrisisState(await session.load());
  }, [crisisCapability.enabled, session]);
  const resetIsland =
    "resetIsland" in session
      ? (session as { resetIsland: (eraId: EraId) => Promise<void> }).resetIsland
      : undefined;

  /**
   * A successful account diagnostic wrote learning state outside the already-hydrated city
   * session. Do not expose that stale session: flush any earlier layout gesture, invalidate the
   * one shared city memo, fetch the canonical account exactly once, and install that body in the
   * session before the overlay can close.
   *
   * The ref is the double-click lock. State cannot fill that role because two click callbacks can
   * run before React commits either update. A failed attempt deliberately leaves `required` set,
   * so Try again repeats the read; a successful one clears it before entry.
   */
  const closeDiagnostic = useCallback(() => {
    if (!diagnosticHandoffRequiredRef.current || !apiCityBundle || !apiCity) {
      closeSurface();
      return;
    }
    if (diagnosticHandoffInFlightRef.current !== null) {
      return;
    }

    const attempt = diagnosticHandoffAttemptRef.current + 1;
    diagnosticHandoffAttemptRef.current = attempt;
    setCanonicalCityHandoff({ kind: "loading" });
    const handoff = (async () => {
      await apiCity.flush();
      if (apiCity.hasUnsavedChanges()) {
        throw new Error(
          "Your earlier city changes are still waiting to save. Check your connection and try again.",
        );
      }
      apiCityBundle.invalidate();
      const canonical = await apiCityBundle.load();
      await apiCity.rehydrate(canonical);
      setApiArchipelagoLoad(canonical);
      if (diagnosticHandoffAttemptRef.current !== attempt) {
        return;
      }
      diagnosticHandoffRequiredRef.current = false;
      focusCityAfterHandoffRef.current = true;
      setCityEpoch((epoch) => epoch + 1);
      setCanonicalCityHandoff({ kind: "idle" });
      setEntry(null);
    })().catch((error: unknown) => {
      if (diagnosticHandoffAttemptRef.current !== attempt) {
        return;
      }
      setCanonicalCityHandoff({
        kind: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "We could not reload your diagnostic results.",
      });
    });
    diagnosticHandoffInFlightRef.current = handoff.finally(() => {
      if (diagnosticHandoffAttemptRef.current === attempt) {
        diagnosticHandoffInFlightRef.current = null;
      }
    });
  }, [apiCity, apiCityBundle, closeSurface]);

  useEffect(() => {
    if (
      !focusCityAfterHandoffRef.current ||
      canonicalCityHandoff.kind !== "idle" ||
      entry !== null
    ) {
      return;
    }
    focusCityAfterHandoffRef.current = false;
    document
      .querySelector<HTMLElement>(".city-shell__world .city-viewport")
      ?.focus({ preventScroll: true });
  }, [canonicalCityHandoff.kind, entry]);

  useEffect(
    () => () => {
      diagnosticHandoffAttemptRef.current += 1;
    },
    [],
  );

  const handlePretestComplete = useCallback(
    async (placement: PlacementSeed, unlocked: readonly string[]) => {
      // The pretest persists placement to `student_node_state` only when the
      // session is server-backed (a signed-in Cognito user AND a configured
      // diagnostic API); a remount then re-reads that DB seed. Otherwise the
      // diagnostic ran on the in-memory client, so seed the dev session the
      // remounted city reads. This shares `createDiagnosticClient`'s gate, so a
      // Cognito user without the API URL still seeds locally instead of remounting
      // an empty, unseeded city.
      //
      // Test-out unlock: the dev/in-memory seed also pre-builds the passed
      // (placement >= 2) buildings via `seedFromPlacement`. In BOTH paths we hold
      // the unlocked node ids and hand them to the city so it can celebrate and
      // drop those buildings in already complete — INCLUDING the server-backed
      // path where `seedFromPlacement` is skipped (there completion is pre-seeded
      // on placement in `citySession`; real persistence flows through Anthony's
      // mastery-service as a follow-up).
      if (isServerBacked(authedCity !== null)) {
        const foundPrefix = economyClientRef.current?.foundDiagnosticPrefix;
        if (!foundPrefix) {
          throw new Error("Account diagnostic placement is temporarily unavailable.");
        }
        await foundPrefix();
        // The guarded close handoff below re-reads the committed account exactly once, then
        // installs that same canonical body in both City and the Bay/Atlas projection.
        diagnosticHandoffRequiredRef.current = true;
      } else {
        session.seedFromPlacement(placement, unlocked);
        if (isArchipelagoSession(session)) {
          const canonical = diagnosticEraPlacement(
            Object.entries(placement).map(([node_id, placement_estimate]) => ({
              node_id,
              placement_estimate,
            })),
          );
          await session.unlockDiagnosticPrefix(canonical.unlockedPrefix);
        }
        setCityEpoch((epoch) => epoch + 1);
      }
      // Both readings come off this one object; see the state's docblock.
      setPretestPlacement(placement);
    },
    [authedCity, session],
  );

  // Roads (the repeatable gold sink). Commit spends ATOMICALLY through the shared
  // wallet: read the authoritative (road-net) spendable balance, lay all-or-nothing
  // (insufficient gold lays nothing), then refresh so the HUD shows the debit.
  // Removal frees the cells and refunds their full price through the same wallet, so
  // the balance simply returns to where it was. Both are in-app session writes, never
  // a game write — and roads only ever occupy a cell, so they can't gate learning
  // (INV-COS-1).
  const economyRefresh = economy.refresh;
  const recordIslandExamResponse = useCallback(
    (eraId: EraId, request: IslandUnlockExamResponseRequest) => {
      const record = economyClientRef.current?.recordIslandExamResponse;
      if (!record) {
        return Promise.reject(new Error("Account exam authority is unavailable."));
      }
      return record({ eraId, ...request });
    },
    [],
  );
  const landAccountIsland = useCallback(
    async (eraId: EraId): Promise<void> => {
      const land = economyClientRef.current?.landOnIsland;
      if (!land || !apiCityBundle) {
        throw new Error("Account island travel is unavailable.");
      }
      await land({ eraId });
      apiCityBundle.invalidate();
      setCityEra(eraId);
      setCityEpoch((epoch) => epoch + 1);
    },
    [apiCityBundle],
  );
  const sailArchipelagoIsland = useCallback(
    async (eraId: EraId): Promise<void> => {
      if (!isArchipelagoSession(session)) {
        throw new Error("Island travel is unavailable.");
      }
      await session.sailTo(eraId);
      if (presenterMode) {
        presenter.navigate(
          {
            preset: presenterRequest?.preset ?? "bronze-city",
            surface: "city",
            eraId,
          },
          { replace: true },
        );
      }
    },
    [presenter, presenterMode, presenterRequest?.preset, session],
  );
  const commitRoads = useCallback(
    async (cells: readonly RoadCell[]): Promise<RoadCommitResult> => {
      const client = economyClientRef.current;
      const wallet = client ? await client.getWallet() : null;
      const result = await session.layRoads(cells, wallet?.spendable ?? 0);
      await economyRefresh();
      return result;
    },
    [session, economyRefresh],
  );
  const removeRoads = useCallback(
    async (cells: readonly RoadCell[]): Promise<RoadRemoveResult> => {
      const result = await session.removeRoads(cells);
      await economyRefresh();
      return result;
    },
    [session, economyRefresh],
  );

  // Buying a civic building: read the AUTHORITATIVE stockpile (already net of prior
  // civic spend, see `createCivicMaterialEconomy`), hand it to the session, and refresh
  // the wallet so the strip and the menu agree with what was spent. The session decides
  // — affordability against the catalogue price, then the same reachability gate every
  // other layout write goes through — so this composes the two lanes and rules on
  // nothing. Never a game write, and a refusal gates nothing (INV-COS-1).
  const placeCivic = useCallback(
    async (
      buildingId: CivicBuildingId,
      transform: PlacedTransform,
    ): Promise<CivicPurchaseResult> => {
      const client = economyClientRef.current;
      if (client === null) {
        return {
          status: "unavailable",
          cost: 0,
          refusal: null,
          placementId: null,
          economyStatus: null,
        };
      }
      const result = await session.placeCivic(buildingId, transform, (ask) =>
        client.purchaseCivicBuilding(ask),
      );
      // Small stones landing dry: the era's material leaving the stockpile. Fired on
      // `built` alone, which is the only status that actually spends anything — a
      // refusal or a short wallet must not sound like a payment. It is a separate
      // event from the building arriving, which is what `place-building` says a moment
      // later once the layout has been re-read.
      if (result.status === "built") {
        playSfx("civic-purchase");
      }
      await economyRefresh();
      return result;
    },
    [session, economyRefresh],
  );

  /**
   * REPAIR ONE PIECE OF CRISIS DAMAGE — the composition root joining the two halves.
   *
   * The wallet and the ruin live in different lanes on purpose (`@cr/economy` knows nothing
   * about a grid; the city session knows nothing about material), so this is the only place
   * both are in scope. `repairCrisisDamage` owns the ORDERING — read the ruin's damage id,
   * spend under it, clear only on a spend that landed — and this hands it the two seams.
   */
  const repairRuin = useCallback(
    async (target: RepairTarget): Promise<CrisisRepairResult> => {
      const client = economyClientRef.current;
      if (client === null) {
        return {
          status: "era_material_unauthored",
          repaired: false,
          cost: repairPriceFor(target, CURRENT_ERA_ID),
          spendable: null,
          damageId: null,
        };
      }
      const result = await repairCrisisDamage(
        {
          damage: session.crisisDamage,
          economy: client,
          clearBuilding: session.repairRuinedBuilding,
          clearCell: session.reclaimRuinedCell,
          // The third clear, and the third set of `CrisisDamage`. Withholding it would
          // leave a suspension priced and offered with nothing behind the press — the
          // optional-prop shape #527 found the hard way.
          clearCivic: session.liftSuspendedCivic,
          // THE ECONOMY'S ERA, deliberately the same one `createCivicMaterialEconomy` is
          // built on above rather than the era the island is dressed in: a lift is a spend
          // from the era material's stockpile, and pricing it in an era the wallet does not
          // mint would quote a bill nobody can pay. `?era=` moves the dressing and does not
          // move the ladder.
          eraId: CURRENT_ERA_ID,
        },
        target,
      );
      await economyRefresh();
      return result;
    },
    [session, economyRefresh],
  );

  /**
   * **CARRY A CRISIS'S DAMAGE INTO THE CITY THE LEARNER IS LOOKING AT.**
   *
   * The winter used to write the saved blob itself, and this callback is the whole of why it
   * no longer does: the city session is built ONCE on this component's first render, so a
   * write that went round it left `CitySurface` drawing an undamaged island until a reload —
   * and then had that island written back over the damage by the session's own next save.
   *
   * It goes to `session`, so a signed-in learner's ruins are mirrored to their account and a
   * dev one's land in `localStorage`, without the crisis knowing which it got.
   *
   * The flush keeps `scarLiveCity`'s own durability promise, made at the moment of the press:
   * the player is one click from navigating back to their island, and a debounce window is a
   * window for a closing tab to fall into. Both stores flush for the reason the `pagehide`
   * handler gives — exactly one of them ever has anything queued — and `withDevPersistence`
   * awaits this mutator's capture, so there IS something queued by the time this runs.
   */
  const carryCrisisDamage = useCallback(
    async (report: CrisisDamageReport): Promise<void> => {
      await session.recordCrisisDamage(report);
      devSessionStore?.flush();
      await apiCity?.flush();
    },
    [session, apiCity, devSessionStore],
  );

  // DEV/PREVIEW escape hatch: `?three` swaps the whole app for the standalone model
  // bench. Checked after all hooks so hook order is stable; no effect on the live
  // city or tests (which never mount App with that query).
  const showThreePreview =
    devControlsEnabled &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("three");
  if (showThreePreview) {
    return (
      <Suspense fallback={<div className="city-shell" />}>
        <GridworkModelPreview />
      </Suspense>
    );
  }

  // DEV/PREVIEW escape hatch: `?dev` swaps the whole app for a list of every lesson
  // so a developer can open any options menu without placing buildings. Checked
  // after all hooks so hook order is stable; no effect on the live city or tests.
  const showDevLessons =
    devControlsEnabled &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("dev");
  if (showDevLessons) {
    return (
      <Suspense fallback={<div className="city-shell" />}>
        <DevLessons />
      </Suspense>
    );
  }

  // DEV/PREVIEW escape hatch: `?graph` swaps the whole app for the §8 graph-answer
  // probe so a graph-type item can be answered + graded in the diagnostic flow.
  // Checked after all hooks so hook order is stable; no effect on the live city.
  const showGraphProbe =
    devControlsEnabled &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("graph");
  if (showGraphProbe) {
    return (
      <Suspense fallback={<div className="city-shell" />}>
        <GraphProbe />
      </Suspense>
    );
  }

  // DEV/PREVIEW escape hatch: `?interactive` swaps the whole app for the number_line
  // practice demo so the interactive answer type can be exercised through the real
  // graded + infinite practice surfaces. Checked after all hooks so hook order stays
  // stable; no effect on the live city.
  const showInteractiveProbe =
    devControlsEnabled &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("interactive");
  if (showInteractiveProbe) {
    return (
      <Suspense fallback={<div className="city-shell" />}>
        <InteractivePracticeProbe />
      </Suspense>
    );
  }

  const showSuccessionFixture =
    devControlsEnabled &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("succession-fixture");
  if (showSuccessionFixture) {
    return (
      <Suspense fallback={<div className="city-shell" />}>
        <SuccessionFixtureRoute />
      </Suspense>
    );
  }

  const showIntrusionFixture =
    devControlsEnabled &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has(INTRUSION_FIXTURE_QUERY_PARAM);
  if (showIntrusionFixture) {
    return (
      <main aria-label="Intrusion fixture preview" data-testid="intrusion-fixture-route">
        <Suspense fallback={<div className="city-shell" />}>
          <IntrusionFixtureRoute />
        </Suspense>
      </main>
    );
  }

  /**
   * Every built crisis destination, from the canonical registry shared with the demo showcase.
   *
   * Local presenters retain these preview addresses. The explicit frontend-only demo adds the
   * same learner-visible destinations without opening the developer probes above. Succession
   * retains its authenticated production door only when the canonical crisis capability is
   * restored; its command service still rechecks progression before starting the battle.
   */
  const requestedPreview = crisisCapability.enabled ? requestedCrisis : null;
  const intrusionRequested =
    requestedPreview?.destination === "city" &&
    requestedPreview.param === "intrusion" &&
    (demoMode || devControlsEnabled);
  const crisisPreview =
    requestedPreview?.destination === "page" && (demoMode || devControlsEnabled)
      ? requestedPreview
      : null;
  const plagueRequested = crisisPreview?.param === "plague";
  if (crisisPreview !== null && !plagueRequested) {
    const CrisisPreview = crisisPreview.component;
    return (
      <main
        aria-label={`${crisisPreview.label} preview`}
        data-testid={`demo-crisis-route-${crisisPreview.param}`}
      >
        <Suspense
          fallback={<div className="city-shell" data-testid="demo-crisis-route-loading" />}
        >
          <CrisisPreview />
        </Suspense>
      </main>
    );
  }

  // The launch surface gates the NORMAL entry only. Capability-approved review/demo crisis
  // routes and the developer probes above short-circuit first; ordinary crisis query strings
  // do not bypass launch or auth.
  if (canonicalCityHandoff.kind === "loading") {
    return <LaunchStatus kind="loading" />;
  }
  if (canonicalCityHandoff.kind === "error") {
    return (
      <LaunchStatus
        kind="error"
        message={canonicalCityHandoff.message}
        onRetry={closeDiagnostic}
      />
    );
  }
  if (
    phase === "title" &&
    !successionRequested &&
    !intrusionRequested &&
    !plagueRequested
  ) {
    /**
     * ⚑ **TWO LAUNCH SURFACES, AND THE SPLIT IS THE ISOLATION.**
     *
     * The exact `/demo` showcase and a local dev server keep `TitleScreen` exactly as it
     * shipped, because that demo URL is already out with reviewers and a redesign would
     * change what they open. The ordinary account route gets `LaunchScreen`, which is asked
     * once and then never again — `launch.kind` is `resume` for a learner who has already
     * chosen a door or whose account shows any progression, and the city below is drawn
     * without a question. `demoEntryIsolation.test.tsx` holds both halves.
     */
    if (launch.kind === "unavailable") {
      return (
        <>
          <TitleScreen
            onStart={startCity}
            onTakeDiagnostic={startDiagnostic}
            // The cross-device sentence, and ONLY on the path where a city is actually
            // mirrored to an account (`apiCitySession` → `POST /api/city`). Demo and local
            // cities live in this browser's storage, where the same sentence is a lie.
            accountMode={accountMode}
          />
          {demoMode && !presenterMode && <DemoModeNotice />}
        </>
      );
    }
    if (launch.kind === "loading") {
      return <LaunchStatus kind="loading" />;
    }
    if (launch.kind === "error") {
      return <LaunchStatus kind="error" message={launch.message} onRetry={launch.retry} />;
    }
    if (launch.kind === "launcher") {
      const { choose } = launch;
      return (
        <LaunchScreen
          onTakeDiagnostic={() => {
            choose("diagnostic");
            startDiagnostic();
          }}
          onStartEraOne={() => {
            // The launch state machine stays on its loading surface until the authenticated,
            // idempotent bootstrap returns and the API city session has rehydrated that exact
            // canonical response. Failure remains a Retry and writes no local completion note.
            choose("era-one");
          }}
        />
      );
    }
    // `resume`: this account has already answered, so fall through into its city.
  }

  return (
    <div className="city-shell">
      <div
        className="city-shell__world"
        inert={entry !== null || presenterDisposableLearningSurface !== null}
        aria-hidden={
          entry !== null || presenterDisposableLearningSurface !== null || undefined
        }
        hidden={presenterDisposableLearningSurface !== null || undefined}
        style={
          presenterDisposableLearningSurface !== null ? { display: "none" } : undefined
        }
        data-presenter-learning={presenterCompletionSurface ? "true" : undefined}
      >
        <CitySurface
          key={`${authedCity?.studentId ?? "dev"}:${cityEpoch}`}
          account={accountIdentity}
          loadCity={loadCity}
          refreshToken={presenterRefreshToken}
          presenterMenuTools={
            demoMode
              ? (closeMenu) =>
                  presenterMode ? (
                    <PresenterMenuEraControl onClose={closeMenu} />
                  ) : (
                    <PresenterModeMenuEntry onClose={closeMenu} />
                  )
              : undefined
          }
          initialSelectedNodeId={presenterFocusNodeId ?? undefined}
          presenterAtlasHomeEraId={presenterMode ? PRESENTER_DEFAULT_ERA_ID : undefined}
          initialEntry={
            presenterRequest?.surface === "lesson" &&
            presenterFocusNodeId &&
            presenterDisposableLearningSurface === null
              ? {
                  kind: "lesson",
                  nodeId: presenterFocusNodeId,
                  ...(presenterFocusNodeId === "LF.1"
                    ? {
                        initialTeachingStep: PRESENTER_LF1_INITIAL_TEACHING_STEP,
                      }
                    : {}),
                }
              : presenterRequest?.surface === "practice" &&
                  presenterFocusNodeId &&
                  presenterDisposableLearningSurface === null
                ? { kind: "practice", nodeId: presenterFocusNodeId }
                : presenterRequest?.surface === "review"
                  ? { kind: "review" }
                  : presenterRequest?.surface === "interleaving"
                    ? { kind: "interleaving" }
                    : presenterRequest?.surface === "bay"
                      ? { kind: "bay" }
                      : undefined
          }
          activityToken={presenter.navigationToken}
          archipelagoMetrics={presenterMode}
          buildEntryCategory={presenterMode ? "lessons" : undefined}
          presenterReferenceFraming={presenterMode}
          presenterBuildingFocusNodeId={presenterBuildingFocusNodeId ?? undefined}
          onActivityExit={
            presenterMode
              ? () =>
                  presenter.navigate({
                    preset: presenterRequest?.preset ?? "bronze-city",
                    surface: "city",
                  })
              : undefined
          }
          bayAvailable={
            apiCityBundle
              ? archipelagoAvailable({
                  rolloutEnabled: archipelagoEnabled(),
                  serverBacked: true,
                  serverVersion: apiArchipelagoLoad?.archipelago_version,
                })
              : archipelagoAvailable({
                  rolloutEnabled: archipelagoEnabled(),
                  serverBacked: false,
                }) && isLocalPersistenceEnabled()
          }
          onResetIsland={resetIsland}
          onUnlockIsland={isArchipelagoSession(session) ? session.unlockIsland : undefined}
          onRecordIslandExamResponse={apiCityBundle ? recordIslandExamResponse : undefined}
          onSailIsland={
            isArchipelagoSession(session)
              ? sailArchipelagoIsland
              : apiCityBundle
                ? landAccountIsland
                : undefined
          }
          // First-run onboarding is learner-facing frontend behavior, including in the
          // frontend-only demo. The diagnostic takeover still defers it.
          enableOnboardingDemo={
            !presenterMode && entry === null && !successionQaPreview && !intrusionRequested
          }
          suppressAchievementNotes={presenterMode}
          suppressCrisisCalls={presenterMode || !crisisCapability.enabled}
          crisisCapabilityEnabled={crisisCapability.enabled}
          onAttemptStorm={session.attemptStorm}
          onMoveTownHall={session.moveTownHall}
          onPlaceSkill={session.placeSkill}
          onMoveSkill={session.moveSkill}
          onPresenterRemoveBuilding={
            presenterMode && isArchipelagoSession(session)
              ? handleRemovePresenterBuilding
              : undefined
          }
          // THE PRETEST'S OWN PLACEMENT, feeding both readings: the reward screen denominates
          // over its key count, and the test-out catch-up walks the eras it cleared (§10.14 of
          // `docs/superpowers/specs/2026-08-01-test-out-experience-review.md`). It is the raw seed
          // rather than either derivation, because the conjunction over an era's nodes must have
          // exactly one implementation or the surface can hand over an age the accuracy record
          // never measured.
          pretestPlacement={pretestPlacement}
          onDevAdvanceMastery={devControlsEnabled ? session.advanceMasteryDev : undefined}
          onDevLessonTaught={devControlsEnabled ? session.markLessonTaught : undefined}
          onDevSetStage={devControlsEnabled ? session.setStageDev : undefined}
          // NOT gated, and that is the fix rather than an oversight. These are the lesson's
          // own write-backs — CFU passed, practice finished — and they rode on the two dev
          // props above until now, which meant they were withheld from exactly the
          // deployments that have somewhere to write TO. A signed-in learner passed the check
          // and their building stayed at Foundation, so the practice set was unreachable. The
          // three `onDev…` props still decide whether to offer the Developer panel; these two
          // decide what happens when a learner finishes part of a lesson, and the session
          // behind them persists or does not according to how the app was launched.
          onLessonTaught={session.markLessonTaught}
          onPracticeComplete={session.advanceMasteryDev}
          onPracticeReceipt={handlePracticeReceipt}
          onOpenSurface={openSurface}
          onOnboardingCivicMoment={economy.reportCivicBootstrap}
          onCityLoad={presenterMode ? undefined : economy.reconcileProgress}
          onInterleavedClear={economy.reportInterleavedClear}
          goldAvailable={economy.wallet?.spendable ?? null}
          // ⚑ THE PER-ERA PICTURE, for the bay overview and nothing else. `spendable` above is
          // the LIVE era's stockpile by design; `materials` is what a per-island readout wants,
          // so an overview does not report one number against ten islands. Unread with the
          // archipelago flag off, where no component receives it.
          walletMaterials={economy.wallet?.materials}
          getArchipelagoSnapshot={
            isArchipelagoSession(session)
              ? session.snapshot
              : presenterFixture
                ? () => presenterFixture.archipelago
                : undefined
          }
          onCommitRoads={commitRoads}
          onRemoveRoads={removeRoads}
          materialAvailable={economy.wallet?.spendable ?? null}
          materialLabel={
            economy.wallet?.spendableMaterial?.display_name.toLowerCase() ?? "material"
          }
          onPlaceCivic={placeCivic}
          // Straight to the session, with no wallet in between: relocating a bought building
          // spends nothing, so unlike `placeCivic` above there is no purchase to sequence.
          onMoveCivic={session.moveCivic}
          // Civic-only demolition. The session preserves sunk material; account composition
          // resolves only after the whole-city save lands (or rolls the placement back).
          onRemoveCivic={session.removeCivic}
          // ...and so does the catch-up's inherited seeding, for the same reason twice over: a
          // building the learner's earlier city already bought is not being bought again here,
          // and `placeCivic` would refuse every one of them anyway (`wrong_era` — they all come
          // from ages the walk has already passed). The session still gates each seat.
          onSeedCivics={async (seats) => {
            await session.seedCivicBuildings(seats);
          }}
          onRepairRuin={crisisCapability.enabled ? repairRuin : undefined}
          // ...and the direction that puts damage IN. The crisis is played over this island
          // by a mount `CitySurface` owns, so its damage has to land in the session the
          // island is drawn from rather than beside it; see `carryCrisisDamage`.
          onCarryCrisisDamage={crisisCapability.enabled ? carryCrisisDamage : undefined}
          onVerifyOverwrittenRecord={
            crisisCapability.enabled ? session.verifyOverwrittenRecord : undefined
          }
          plagueSession={plagueSession}
          successionSession={successionSession}
          relaySession={relaySession}
          autoOpenSuccession={crisisCapability.enabled && successionRequested}
          initialIntrusionInCity={crisisCapability.enabled && intrusionRequested}
          onIntrusionExit={
            intrusionRequested
              ? () => {
                  window.history.replaceState(
                    null,
                    "",
                    cityHrefFromIntrusion(window.location.href),
                  );
                }
              : undefined
          }
          initialPlagueInCity={crisisCapability.enabled && plagueRequested}
          onPlagueExit={
            plagueRequested
              ? () => {
                  window.history.replaceState(
                    null,
                    "",
                    cityHrefFromPlague(window.location.href),
                  );
                }
              : undefined
          }
          lessonHost={d1LessonHost}
          // NEITHER ERA PROP IS PASSED, which is #311's shape and not an omission. The surface
          // follows the era the city is STANDING in (`useCityEra`), and the `?era=` hatch
          // reaches it by writing that stored era below rather than by overriding a prop — so
          // one answer to "which era is it", and a hatch that cannot disagree with the city.
          // The ECONOMY deliberately stays on `CURRENT_ERA_ID` above: era material and the
          // civic catalogue are another lane's ladder, and dragging the wallet into a
          // lesson-wiring hatch would change prices nobody asked to change.
        />
        {/* The always-on economy HUD (plan P2). Hidden while a takeover surface
            (diagnostic/lessons/checker) is open so it never overlaps them. The cosmetics
            Shop was mounted here beside it until the 2026-08-03 sunset. */}
        {entry === null && <EconomyHud economy={economy} reducedMotion={reducedMotion} />}
      </div>
      {presenterDisposableLearningSurface !== null && (
        <PresenterLessonDemo
          key={presenterDisposableLearningSurface}
          surface={presenterDisposableLearningSurface}
          onPracticeReceipt={handleDisposableLf1PracticeReceipt}
          onExit={() => {
            presenter.navigate({
              preset: presenterRequest?.preset ?? "bronze-city",
              surface: "city",
            });
            window.requestAnimationFrame(() => {
              document
                .querySelector<HTMLElement>(".city-shell__world .city-viewport")
                ?.focus({ preventScroll: true });
            });
          }}
        />
      )}
      {entry && (
        <SurfaceOverlay
          surface={entry}
          onClose={entry === "diagnostic" ? closeDiagnostic : closeSurface}
          onPretestComplete={handlePretestComplete}
        />
      )}
      {/* The city owns Sound inside Menu → Environment. Takeover surfaces do not expose
          that Menu, so they retain this compact shell-level access to the same settings. */}
      {entry !== null && <AudioSettings placement="overlay" />}
      {/* Same reasoning, higher stakes: a save can fail while a lesson is open and the
          tab can be closed from there. Renders nothing unless a save has actually come
          back rejected, and nothing at all on the dev island (`apiCity` is null). */}
      <UnsavedChangesNotice session={apiCity} />
      {demoMode && !presenterMode && !successionQaPreview && !intrusionRequested && (
        <DemoModeNotice />
      )}
    </div>
  );
}
