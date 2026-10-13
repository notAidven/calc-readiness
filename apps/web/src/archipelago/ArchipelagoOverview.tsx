import type { MaterialBalances } from "@cr/economy";
import { islandUnlockMasteryRequirement } from "@cr/game";
import { ERA_SEQUENCE, type EraId, eraNumber, getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { CURRENT_ERA_ID } from "../city/eraDressing";
import {
  describeEraTownHallArt,
  resolveEraTownHall,
  type TownHallStage,
} from "../city/townHall";
import {
  type ArchipelagoHeroMode,
  ArchipelagoHeroRenderer,
} from "./ArchipelagoHeroRenderer";
import {
  ARCHIPELAGO_NAV_INPUTS,
  type ArchipelagoCarouselIntent,
  type ArchipelagoNavInput,
  commandCarousel,
  initialCarouselState,
} from "./archipelagoCarouselModel";
import {
  type ArchipelagoCarouselIsland,
  archipelagoCarouselView,
} from "./archipelagoCarouselView";
import { ClassicIslandLock } from "./ClassicIslandLock";
import { EraHallMedallion } from "./EraHallGlyph";
import type { IslandLayout, IslandRecord } from "./islandState";

import "./archipelago.css";

export const OVERVIEW_FRAME = { width: 1024, height: 580 } as const;
export const ARCHIPELAGO_SELECTION_INPUTS = ARCHIPELAGO_NAV_INPUTS;

const FOCUSABLE =
  'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const SWIPE_TRAVEL = 56;
const SWIPE_VELOCITY = 0.45;

interface CeremonyReading {
  readonly eraId: EraId;
  readonly foundingStage: TownHallStage | null;
  readonly reveal: number;
  readonly ready: boolean;
  readonly onContinue: () => void;
}

export interface ArchipelagoOverviewProps {
  readonly nodeStates: readonly StudentNodeState[];
  readonly liveEraId?: EraId;
  readonly materials?: MaterialBalances;
  /** Durable founded records. Missing means only the standing island is known to exist. */
  readonly foundedIslands?: readonly IslandRecord[];
  /** Fresh standing layout, which wins over a snapshot captured before the overview opened. */
  readonly standingIslandLayout?: IslandLayout | null;
  readonly onEnterIsland: () => void;
  readonly onSailTo?: (eraId: EraId) => void;
  readonly onPreviewEra?: (eraId: EraId) => void;
  /** Observe real carousel navigation without changing island or learning state. */
  readonly onNavigate?: (eraId: EraId) => void;
  readonly onSettleIsland?: (eraId: EraId) => void;
  readonly onResetIsland?: (eraId: EraId) => void | Promise<void>;
  readonly onClose: () => void;
  /** Visible replacement for the close icon during a guided handoff. */
  readonly returnLabel?: string;
  readonly reducedMotion?: boolean;
  readonly enableCanvas?: boolean;
  readonly collectMetrics?: boolean;
  /** Presenter-only direct home route; absent from learner/account Bay mounts. */
  readonly presenterHome?: {
    readonly eraId: EraId;
    readonly onReturn: (eraId: EraId) => void;
  };
  /** Browser-evidence seam that holds the short-lived founding overlay. */
  readonly ceremonyOverlayHold?: boolean;
  readonly ceremony?: CeremonyReading | null;
}

function heroMode(island: ArchipelagoCarouselIsland): ArchipelagoHeroMode {
  switch (island.state) {
    case "settled":
      return "prior";
    case "closed":
      return "future";
    default:
      return island.state;
  }
}

function Chevron({ direction }: { readonly direction: "left" | "right" }): ReactElement {
  return (
    <svg viewBox="0 0 32 56" aria-hidden="true" focusable="false">
      <path
        d={direction === "left" ? "M24 5 7 28l17 23" : "M8 5l17 23L8 51"}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function hallSiteGeometry(footprint: { readonly w: number; readonly d: number }): {
  readonly points: readonly [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ];
  readonly label: string;
} {
  const width = footprint.w * 18;
  const depth = footprint.d * 12;
  const top = width * 0.72;
  return {
    points: [
      [512 - top / 2, 250 - depth / 2],
      [512 + top / 2, 250 - depth / 2],
      [512 + width / 2, 250 + depth / 2],
      [512 - width / 2, 250 + depth / 2],
    ],
    label: `Hall site · ${footprint.w} x ${footprint.d}`,
  };
}

function CeremonyRevealOverlay({
  reveal,
  reducedMotion,
  hold,
}: {
  readonly reveal: number;
  readonly reducedMotion: boolean;
  readonly hold: boolean;
}): ReactElement {
  const wakeGradientId = useId();
  return (
    <svg
      className="archipelago-state-overlay archipelago-ceremony-reveal"
      viewBox="0 0 1024 580"
      aria-hidden="true"
      data-testid="archipelago-ceremony-reveal"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-hold={hold ? "true" : "false"}
      style={{ "--ceremony-reveal": String(reveal) } as CSSProperties}
    >
      <defs>
        <linearGradient
          id={wakeGradientId}
          x1="120"
          y1="330"
          x2="320"
          y2="255"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--paper)" stopOpacity="0" />
          <stop offset="0.45" stopColor="var(--paper)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--paper)" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path
        className="archipelago-ceremony-reveal__shore-one"
        d="M210 365C275 145 749 145 814 365"
        data-shore-arc="true"
      />
      <path
        className="archipelago-ceremony-reveal__shore-two"
        d="M190 385C255 120 769 120 834 385"
        data-shore-arc="true"
      />
      {!reducedMotion && (
        <path
          className="archipelago-ceremony-reveal__wake"
          d="M120 330 C180 318 244 286 320 255"
          style={{ stroke: `url(#${wakeGradientId})` }}
        />
      )}
    </svg>
  );
}

function liveAnnouncement(
  island: ArchipelagoCarouselIsland,
  standingEraId: EraId,
  previewing: boolean,
): string {
  if (previewing) {
    return `Viewing ${island.name} terrain only. No unlocking, building, settling, sailing, or saving. Your city remains on Era ${eraNumber(standingEraId)}.`;
  }
  const consequence =
    island.state === "closed"
      ? `${island.sentence}. Preview is available`
      : island.state === "diagnostic"
        ? "Diagnostic pass. Settlement is available"
        : island.state === "ceremony"
          ? "Founding shore revealed. No route remains"
          : island.sentence;
  return `Era ${island.number} of ${ERA_SEQUENCE.length}, ${island.name}. ${island.topic}. ${island.description}. ${consequence}. Your city is on Era ${eraNumber(standingEraId)}.`;
}

export function ArchipelagoOverview({
  nodeStates,
  liveEraId = "prehistoric",
  materials = {},
  foundedIslands = [],
  standingIslandLayout = null,
  onEnterIsland,
  onSailTo,
  onPreviewEra,
  onNavigate,
  onSettleIsland,
  onResetIsland,
  onClose,
  returnLabel,
  reducedMotion = true,
  enableCanvas = true,
  collectMetrics = false,
  presenterHome,
  ceremonyOverlayHold = false,
  ceremony = null,
}: ArchipelagoOverviewProps): ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stateCardRef = useRef<HTMLElement>(null);
  const overflowTriggerRef = useRef<HTMLButtonElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const routeTriggerRef = useRef<HTMLButtonElement>(null);
  const routeMenuRef = useRef<HTMLDivElement>(null);
  const resetMenuItemRef = useRef<HTMLButtonElement>(null);
  const resetCancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const stateCardId = useId();
  const standingIndex = Math.max(
    0,
    ERA_SEQUENCE.findIndex((era) => era.id === liveEraId),
  );
  const [navigation, setNavigation] = useState(() => {
    const opened = initialCarouselState(standingIndex);
    const ceremonyIndex =
      ceremony === null ? -1 : ERA_SEQUENCE.findIndex((era) => era.id === ceremony.eraId);
    return ceremonyIndex < 0
      ? opened
      : {
          ...opened,
          requestedIndex: ceremonyIndex,
          renderedIndex: ceremonyIndex,
        };
  });
  const navigationRef = useRef(navigation);
  const phaseRef = useRef<"idle" | "cover" | "reveal">("idle");
  const pendingRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const startTransitionRef = useRef<(index: number) => void>(() => undefined);
  const swipeRef = useRef<{
    readonly x: number;
    readonly y: number;
    readonly at: number;
    readonly pointerId: number;
  } | null>(null);
  const [phase, setPhase] = useState<"idle" | "cover" | "reveal">("idle");
  const [previewingEraId, setPreviewingEraId] = useState<EraId | null>(null);
  const ceremonyEraId = ceremony?.eraId ?? null;
  const [ceremonyOverlayVisible, setCeremonyOverlayVisible] = useState(ceremony !== null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const selectedEraId = (ERA_SEQUENCE[navigation.renderedIndex] ?? ERA_SEQUENCE[0])
    ?.id as EraId;

  const view = archipelagoCarouselView({
    selectedEraId,
    standingEraId: liveEraId,
    nodeStates,
    foundedIslands,
    materials,
    ...(ceremony === null
      ? {}
      : {
          ceremonyEraId: ceremony.eraId,
          ceremonyReady: ceremony.ready,
        }),
  });
  const selectedLayout =
    view.selected.eraId === liveEraId && standingIslandLayout !== null
      ? standingIslandLayout
      : view.selected.layout;
  const selectedIndex = view.selected.number - 1;
  const previous = ERA_SEQUENCE[selectedIndex - 1] ?? null;
  const next = ERA_SEQUENCE[selectedIndex + 1] ?? null;
  const resetEligible =
    onResetIsland !== undefined &&
    view.selected.state === "settled" &&
    view.selected.number < view.standingNumber;
  const presenterHomeDisabled =
    presenterHome !== undefined &&
    liveEraId === presenterHome.eraId &&
    view.selected.eraId === presenterHome.eraId;

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }
    timersRef.current = [];
  }, []);

  const returnOverflowFocus = useCallback(() => {
    window.requestAnimationFrame(() => overflowTriggerRef.current?.focus());
  }, []);

  const closeOverflow = useCallback(
    (restoreFocus = true) => {
      setOverflowOpen(false);
      if (restoreFocus) {
        returnOverflowFocus();
      }
    },
    [returnOverflowFocus],
  );

  const closeRoute = useCallback((restoreFocus = true) => {
    setRouteOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => routeTriggerRef.current?.focus());
    }
  }, []);

  const cancelReset = useCallback(() => {
    setResetConfirmOpen(false);
    setResetError(null);
    returnOverflowFocus();
  }, [returnOverflowFocus]);

  const confirmReset = useCallback(async () => {
    if (!resetEligible || onResetIsland === undefined) {
      return;
    }
    setResetBusy(true);
    setResetError(null);
    try {
      await onResetIsland(view.selected.eraId);
      setResetConfirmOpen(false);
      returnOverflowFocus();
    } catch (error: unknown) {
      setResetError(
        error instanceof Error ? error.message : "The island could not be reset.",
      );
    } finally {
      setResetBusy(false);
    }
  }, [onResetIsland, resetEligible, returnOverflowFocus, view.selected.eraId]);

  const startTransition = useCallback((index: number) => {
    phaseRef.current = "cover";
    setPhase("cover");
    const swap = window.setTimeout(() => {
      const rendered = {
        ...navigationRef.current,
        renderedIndex: index,
      };
      navigationRef.current = rendered;
      setNavigation(rendered);
      phaseRef.current = "reveal";
      setPhase("reveal");
    }, 110);
    const finish = window.setTimeout(() => {
      phaseRef.current = "idle";
      setPhase("idle");
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending !== null && pending !== index) {
        startTransitionRef.current(pending);
      }
    }, 260);
    timersRef.current.push(swap, finish);
  }, []);
  startTransitionRef.current = startTransition;

  const issue = useCallback(
    (intent: ArchipelagoCarouselIntent, input: ArchipelagoNavInput) => {
      const previousTarget = navigationRef.current.requestedIndex;
      const nextState = commandCarousel(navigationRef.current, intent, input);
      navigationRef.current = nextState;
      setNavigation(nextState);
      setPreviewingEraId(null);
      const target = nextState.requestedIndex;
      if (target !== previousTarget) {
        const navigated = ERA_SEQUENCE[target]?.id;
        if (navigated) {
          onNavigate?.(navigated);
        }
      }
      if (reducedMotion) {
        clearTimers();
        pendingRef.current = null;
        const rendered = { ...nextState, renderedIndex: target };
        navigationRef.current = rendered;
        setNavigation(rendered);
        phaseRef.current = "idle";
        setPhase("idle");
        return;
      }
      if (phaseRef.current !== "idle") {
        pendingRef.current = target;
        return;
      }
      if (target !== nextState.renderedIndex) {
        startTransitionRef.current(target);
      }
    },
    [clearTimers, onNavigate, reducedMotion],
  );

  useEffect(() => {
    closeRef.current?.focus();
    return clearTimers;
  }, [clearTimers]);

  useEffect(() => {
    void selectedEraId;
    setOverflowOpen(false);
    setRouteOpen(false);
    setResetConfirmOpen(false);
    setResetError(null);
  }, [selectedEraId]);

  useEffect(() => {
    if (!overflowOpen) {
      return;
    }
    resetMenuItemRef.current?.focus();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        !(target instanceof Node) ||
        overflowMenuRef.current?.contains(target) ||
        overflowTriggerRef.current?.contains(target)
      ) {
        return;
      }
      closeOverflow();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [closeOverflow, overflowOpen]);

  useEffect(() => {
    if (!routeOpen) {
      return;
    }
    routeMenuRef.current
      ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
      ?.focus();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        !(target instanceof Node) ||
        routeMenuRef.current?.contains(target) ||
        routeTriggerRef.current?.contains(target)
      ) {
        return;
      }
      closeRoute(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [closeRoute, routeOpen]);

  useEffect(() => {
    if (resetConfirmOpen) {
      resetCancelRef.current?.focus();
    }
  }, [resetConfirmOpen]);

  useEffect(() => {
    if (ceremonyEraId === null) {
      setCeremonyOverlayVisible(false);
      return;
    }
    setCeremonyOverlayVisible(true);
    if (ceremonyOverlayHold) {
      return;
    }
    const timer = window.setTimeout(
      () => setCeremonyOverlayVisible(false),
      reducedMotion ? 350 : 700,
    );
    return () => window.clearTimeout(timer);
  }, [ceremonyEraId, ceremonyOverlayHold, reducedMotion]);

  useEffect(() => {
    if (ceremony === null || ceremony.eraId === selectedEraId) {
      return;
    }
    const index = ERA_SEQUENCE.findIndex((era) => era.id === ceremony.eraId);
    if (index >= 0) {
      issue({ type: "select", index }, "direct-list");
    }
  }, [ceremony, issue, selectedEraId]);

  const select = useCallback(
    (eraId: EraId) => {
      if (ceremony !== null && !ceremony.ready) {
        return;
      }
      const index = ERA_SEQUENCE.findIndex((era) => era.id === eraId);
      if (index >= 0) {
        if (routeOpen) {
          closeRoute();
        }
        issue({ type: "select", index }, "direct-list");
      }
    },
    [ceremony, closeRoute, issue, routeOpen],
  );

  const step = useCallback(
    (direction: -1 | 1, input: ArchipelagoNavInput) => {
      issue({ type: "step", delta: direction }, input);
    },
    [issue],
  );

  const activate = useCallback(() => {
    const island = view.selected;
    if (previewingEraId === island.eraId) {
      setPreviewingEraId(null);
      return;
    }
    switch (island.state) {
      case "standing":
        onEnterIsland();
        return;
      case "settled":
        if (onSailTo) {
          onSailTo(island.eraId);
        } else {
          setPreviewingEraId(island.eraId);
          onPreviewEra?.(island.eraId);
        }
        return;
      case "diagnostic":
        if (onSettleIsland) {
          onSettleIsland(island.eraId);
        } else {
          setPreviewingEraId(island.eraId);
          onPreviewEra?.(island.eraId);
        }
        return;
      case "ceremony":
        if (ceremony?.ready) {
          ceremony.onContinue();
        }
        return;
      default:
        setPreviewingEraId(island.eraId);
        onPreviewEra?.(island.eraId);
    }
  }, [
    ceremony,
    onEnterIsland,
    onPreviewEra,
    onSailTo,
    onSettleIsland,
    previewingEraId,
    view.selected,
  ]);

  const handleOverflowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeOverflow();
    }
  };

  const handleRouteKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeRoute();
    }
  };

  const handleResetKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelReset();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.repeat) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      issue({ type: "escape" }, "direct-list");
      onClose();
      return;
    }
    if (event.key === "Tab") {
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter((element) => element.closest("[hidden]") === null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(
        event.key === "ArrowLeft" ? -1 : 1,
        event.key === "ArrowLeft" ? "left-key" : "right-key",
      );
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      issue(
        { type: event.key === "Home" ? "first" : "last" },
        event.key === "Home" ? "home-key" : "end-key",
      );
      return;
    }
    if (
      event.key === "Enter" &&
      event.target === event.currentTarget &&
      view.selected.action !== null
    ) {
      event.preventDefault();
      activate();
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button")) {
      return;
    }
    swipeRef.current = {
      x: event.clientX,
      y: event.clientY,
      at: event.timeStamp,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start || start.pointerId !== event.pointerId) {
      return;
    }
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    const elapsed = Math.max(1, event.timeStamp - start.at);
    if (
      Math.abs(x) <= Math.abs(y) ||
      (Math.abs(x) < SWIPE_TRAVEL && Math.abs(x) / elapsed < SWIPE_VELOCITY)
    ) {
      return;
    }
    step(x < 0 ? 1 : -1, "swipe");
  };

  const isPreviewing = previewingEraId === view.selected.eraId;
  const usesCameraOnlyAction =
    view.selected.state === "closed" ||
    (view.selected.state === "settled" && !onSailTo) ||
    (view.selected.state === "diagnostic" && !onSettleIsland);
  const action = isPreviewing
    ? "End preview"
    : usesCameraOnlyAction
      ? `Explore ${view.selected.name.replace(/ Era$/, "")} terrain`
      : view.selected.action;
  const actionQualifier = isPreviewing
    ? "Return to locked shore"
    : usesCameraOnlyAction
      ? "Camera only"
      : null;
  const actionAccessibleName =
    action === null
      ? undefined
      : actionQualifier === null
        ? action
        : `${action}, ${actionQualifier.toLowerCase()}`;
  const unlockIsland = view.islands[selectedIndex - 1] ?? null;
  const remainingToUnlock =
    unlockIsland === null
      ? 0
      : Math.max(
          0,
          islandUnlockMasteryRequirement(unlockIsland.nodeCount) -
            unlockIsland.masteredCount,
        );
  const plotsOpen = Math.max(
    0,
    view.selected.nodeCount - (selectedLayout?.placements.length ?? 0),
  );
  const stateDetail = isPreviewing
    ? "Camera only · No unlocking, building, settling, sailing, or saving"
    : view.selected.state === "standing"
      ? `${view.selected.masteredCount} of ${view.selected.nodeCount} skills mastered · ${plotsOpen} plots still open`
      : view.selected.state === "settled"
        ? `${view.selected.masteredCount} of ${view.selected.nodeCount} skills mastered · Your city is on island ${String(
            view.standingNumber,
          ).padStart(2, "0")}`
        : view.selected.state === "closed"
          ? `Master ${remainingToUnlock} more ${
              remainingToUnlock === 1 ? "skill" : "skills"
            } on the ${unlockIsland?.name.replace(/ Era$/, "") ?? "previous island"} to sail here`
          : view.selected.state === "diagnostic"
            ? `${view.selected.passedCount} skills tested out · The hall stands, and nothing is placed`
            : "The arrival wake is fading · no route is left behind";
  const selectedHall = resolveEraTownHall(view.selected.eraId, CURRENT_ERA_ID);
  const hallStandIn = describeEraTownHallArt(
    selectedHall,
    getEraOrThrow(selectedHall.showing_era).name,
  );
  const landmarkPreview =
    view.selected.state === "closed" || view.selected.state === "diagnostic";

  return (
    <div
      className="archipelago"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="archipelago-overview"
      data-view="focus"
      data-selected-era={view.selected.eraId}
      data-requested-era={ERA_SEQUENCE[navigation.requestedIndex]?.id}
      data-standing-era={liveEraId}
      data-state={view.selected.state}
      data-transition={phase}
      data-ceremony={ceremony === null ? "false" : "true"}
      data-previewing={isPreviewing ? "true" : "false"}
      data-guided-return={returnLabel ? "true" : undefined}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      ref={dialogRef}
      onKeyDown={handleKeyDown}
    >
      <div
        className="archipelago-stage"
        data-testid="archipelago-stage"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          swipeRef.current = null;
        }}
      >
        <ArchipelagoHeroRenderer
          key={view.selected.eraId}
          eraId={view.selected.eraId}
          nodeStates={nodeStates}
          islandLayout={selectedLayout}
          mode={heroMode(view.selected)}
          reducedMotion={reducedMotion}
          enableCanvas={enableCanvas}
          collectMetrics={collectMetrics}
          unlockFoundingStage={
            view.selected.state === "ceremony" ? (ceremony?.foundingStage ?? null) : null
          }
        />
        {landmarkPreview && (
          <p className="archipelago-landmark-caption" aria-hidden="true">
            {view.selected.state === "closed"
              ? `${view.selected.name} terrain · locked shore`
              : `${view.selected.name} hall · ${
                  isPreviewing ? "viewing only" : "diagnostic landmark"
                }`}
          </p>
        )}
        {isPreviewing && (
          <p className="archipelago-preview-status">Viewing only · future terrain</p>
        )}

        <div className="archipelago-edge-scrim" aria-hidden="true" />
        {view.selected.state === "closed" && !isPreviewing && (
          <div
            className="archipelago-state-overlay archipelago-closed-landing"
            data-testid="archipelago-closed-landing"
          >
            <ClassicIslandLock
              label={`Locked island. Entry is unavailable. ${stateDetail}`}
              className="archipelago-classic-lock--landing"
              visibleLabel="Landing closed · nothing is founded here"
            />
          </div>
        )}
        {view.selected.state === "ceremony" &&
          ceremony !== null &&
          ceremonyOverlayVisible && (
            <CeremonyRevealOverlay
              reveal={ceremony.reveal}
              reducedMotion={reducedMotion}
              hold={ceremonyOverlayHold}
            />
          )}
        <div className="archipelago-transition-veil" aria-hidden="true" />

        <div className="archipelago-top-band" data-testid="archipelago-top-band">
          <header className="archipelago-island-banner">
            <div className="archipelago-context-line">
              <p
                className="archipelago-era-line"
                id={`${titleId}-era`}
                data-testid="archipelago-era-line"
              >
                Island {String(view.selected.number).padStart(2, "0")} /{" "}
                {String(ERA_SEQUENCE.length).padStart(2, "0")}
              </p>
              <span
                className="archipelago-state-chip"
                data-state={isPreviewing ? "preview" : view.selected.state}
              >
                {isPreviewing ? "VIEWING ONLY" : view.selected.chip}
              </span>
            </div>
            <h2 id={titleId} data-testid="archipelago-title">
              {view.selected.name}
            </h2>
            <p className="archipelago-topic" data-testid="archipelago-topic">
              {view.selected.topic}
            </p>
          </header>

          <button
            type="button"
            className={
              returnLabel
                ? "archipelago-close archipelago-close--guided"
                : "archipelago-close"
            }
            aria-label={returnLabel ?? "Close archipelago"}
            ref={closeRef}
            onClick={onClose}
          >
            {returnLabel ? (
              <span>{returnLabel}</span>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M7 7l10 10M17 7 7 17" />
              </svg>
            )}
          </button>
          {presenterHome !== undefined && (
            <button
              type="button"
              className="archipelago-presenter-home"
              aria-label={
                presenterHomeDisabled
                  ? `Return to Era ${eraNumber(
                      presenterHome.eraId,
                    )}, already on Era ${eraNumber(presenterHome.eraId)}`
                  : `Return to Era ${eraNumber(presenterHome.eraId)}`
              }
              disabled={presenterHomeDisabled}
              onClick={() => presenterHome.onReturn(presenterHome.eraId)}
            >
              <span>Return to Era {eraNumber(presenterHome.eraId)}</span>
              <small>{presenterHomeDisabled ? "Already here" : "Land now"}</small>
            </button>
          )}
          {resetEligible && (
            <button
              type="button"
              className="archipelago-overflow-trigger"
              aria-label="More island actions"
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              ref={overflowTriggerRef}
              onClick={() => {
                if (overflowOpen) {
                  closeOverflow();
                } else {
                  setOverflowOpen(true);
                }
              }}
            >
              <span aria-hidden="true">•••</span>
            </button>
          )}
        </div>

        {overflowOpen && resetEligible && (
          <div
            className="archipelago-overflow-menu"
            role="menu"
            aria-label="Island actions"
            ref={overflowMenuRef}
            onKeyDown={handleOverflowKeyDown}
          >
            <section
              className="archipelago-overflow-destructive"
              aria-label="Destructive actions"
            >
              <p>Destructive</p>
              <button
                type="button"
                role="menuitem"
                ref={resetMenuItemRef}
                onClick={() => {
                  setOverflowOpen(false);
                  setResetConfirmOpen(true);
                }}
              >
                Reset past island
              </button>
            </section>
          </div>
        )}

        <div className="archipelago-bottom-band" data-testid="archipelago-bottom-band">
          <div
            className="archipelago-route-menu"
            role="listbox"
            aria-label="Choose an island"
            ref={routeMenuRef}
            hidden={!routeOpen}
            onKeyDown={handleRouteKeyDown}
          >
            {view.islands.map((island) => (
              <button
                key={island.eraId}
                type="button"
                className="archipelago-route-option"
                role="option"
                aria-selected={island.eraId === view.selected.eraId}
                aria-label={`Island ${String(island.number).padStart(
                  2,
                  "0",
                )}, ${island.name}, ${island.state}`}
                data-testid={`archipelago-select-${island.eraId}`}
                data-state={island.state}
                data-standing={island.eraId === liveEraId ? "true" : "false"}
                onClick={() => select(island.eraId)}
              >
                <EraHallMedallion eraId={island.eraId} />
                {island.state === "closed" && (
                  <svg
                    className="archipelago-route-option__lock"
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M3.2 5V3.7a2.8 2.8 0 0 1 5.6 0V5M2 5h8v6H2Z" />
                  </svg>
                )}
                <span aria-hidden="true">{String(island.number).padStart(2, "0")}</span>
                <small aria-hidden="true">{island.name.replace(/ Era$/, "")}</small>
              </button>
            ))}
          </div>

          <div className="archipelago-dock">
            <button
              type="button"
              className="archipelago-arrow archipelago-arrow--previous"
              aria-label={
                previous ? `Previous island, ${previous.name}` : "No previous island"
              }
              disabled={previous === null || (ceremony !== null && !ceremony.ready)}
              onClick={() => step(-1, "previous-arrow")}
            >
              <Chevron direction="left" />
            </button>

            <button
              type="button"
              className="archipelago-route-trigger"
              aria-label={`Choose island. Island ${view.selected.number} of ${ERA_SEQUENCE.length} selected`}
              aria-haspopup="listbox"
              aria-expanded={routeOpen}
              ref={routeTriggerRef}
              onClick={() => {
                setOverflowOpen(false);
                setRouteOpen((open) => !open);
              }}
            >
              <span className="archipelago-route-trigger__label">Islands</span>
              <span className="archipelago-route-trigger__count" aria-hidden="true">
                {String(view.selected.number).padStart(2, "0")} / {ERA_SEQUENCE.length}
              </span>
            </button>

            <section
              className="archipelago-state-card"
              id={stateCardId}
              ref={stateCardRef}
              tabIndex={-1}
              aria-label="Selected island status"
              data-testid="archipelago-state-card"
            >
              <p className="archipelago-state-headline">
                {isPreviewing
                  ? `Viewing ${view.selected.name} terrain`
                  : view.selected.headline}
              </p>
              <p className="archipelago-state-sentence">{stateDetail}</p>
              {view.selected.state !== "closed" && hallStandIn !== null && (
                <p className="archipelago-hall-standin">{hallStandIn}</p>
              )}
              {view.selected.state === "closed" &&
                !isPreviewing &&
                unlockIsland !== null && (
                  <progress
                    className="archipelago-unlock-progress"
                    aria-label={`${unlockIsland.name.replace(/ Era$/, "")} mastery`}
                    aria-valuemin={0}
                    aria-valuemax={unlockIsland.nodeCount}
                    aria-valuenow={unlockIsland.masteredCount}
                    max={unlockIsland.nodeCount}
                    value={unlockIsland.masteredCount}
                  />
                )}
            </section>

            {action !== null && (
              <button
                type="button"
                className="archipelago-primary-action"
                data-testid="archipelago-primary-action"
                aria-label={actionAccessibleName}
                onClick={activate}
              >
                <span>{action}</span>
                {actionQualifier !== null && <small>{actionQualifier}</small>}
              </button>
            )}

            <button
              type="button"
              className="archipelago-arrow archipelago-arrow--next"
              aria-label={next ? `Next island, ${next.name}` : "No next island"}
              disabled={next === null || (ceremony !== null && !ceremony.ready)}
              onClick={() => step(1, "next-arrow")}
            >
              <Chevron direction="right" />
            </button>
          </div>

          <p className="visually-hidden" aria-live="polite" aria-atomic="true">
            {liveAnnouncement(view.selected, liveEraId, isPreviewing)}
          </p>
        </div>

        {resetConfirmOpen && resetEligible && (
          <div className="archipelago-reset-confirm-layer">
            <button
              type="button"
              className="archipelago-reset-confirm-backdrop"
              aria-hidden="true"
              tabIndex={-1}
              onClick={cancelReset}
            />
            <div
              className="archipelago-reset-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={`${stateCardId}-reset-title`}
              aria-describedby={`${stateCardId}-reset-detail`}
              onKeyDown={handleResetKeyDown}
            >
              <p className="archipelago-reset-confirm-eyebrow">Destructive action</p>
              <h3 id={`${stateCardId}-reset-title`}>Reset past island?</h3>
              <p id={`${stateCardId}-reset-detail`}>
                Buildings, roads, spending and damage are cleared. The Town Hall and learned
                progress remain.
              </p>
              {resetError && (
                <p className="archipelago-reset-confirm-error" role="alert">
                  {resetError}
                </p>
              )}
              <div className="archipelago-reset-confirm-actions">
                <button
                  type="button"
                  className="archipelago-reset-confirm-cancel"
                  ref={resetCancelRef}
                  disabled={resetBusy}
                  onClick={cancelReset}
                >
                  Cancel reset
                </button>
                <button
                  type="button"
                  className="archipelago-reset-confirm-danger"
                  disabled={resetBusy}
                  onClick={() => {
                    void confirmReset();
                  }}
                >
                  {resetBusy ? "Resetting island" : "Confirm reset past island"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
