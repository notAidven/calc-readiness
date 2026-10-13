import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import manifest from "../../public/presenter-deck/slides.json";

import "./presenter-deck.css";

export interface PresenterSlide {
  readonly index: number;
  readonly src: string;
  readonly title: string;
  readonly alt: string;
}

export const PRESENTER_SLIDES: readonly PresenterSlide[] = manifest.slides;

export function isPresenterDeckSearch(search: string): boolean {
  return new URLSearchParams(search).get("slides") === "1";
}

export function liveDemoHref(from: string): string {
  const url = new URL(from);
  url.pathname = "/demo";
  url.searchParams.set("presenter", "1");
  url.searchParams.delete("slides");
  url.hash = "";
  return url.toString();
}

export function slidesHref(from: string): string {
  const url = new URL(from);
  url.pathname = "/demo";
  url.searchParams.set("presenter", "1");
  url.searchParams.set("slides", "1");
  url.hash = "";
  return url.toString();
}

function interactiveOwner(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      'button, a, input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ) !== null
  );
}

export function PresenterDeck({
  onEnterLiveDemo,
}: {
  readonly onEnterLiveDemo: () => void;
}): ReactElement {
  const [at, setAt] = useState(0);
  const [entering, setEntering] = useState(false);
  const [fullscreen, setFullscreen] = useState(
    () => typeof document !== "undefined" && document.fullscreenElement !== null,
  );
  const rootRef = useRef<HTMLElement | null>(null);
  const slide = PRESENTER_SLIDES[at] as PresenterSlide;
  const last = at === PRESENTER_SLIDES.length - 1;

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    for (const candidate of PRESENTER_SLIDES) {
      const image = new Image();
      image.decoding = "async";
      image.src = candidate.src;
    }
  }, []);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const enter = useCallback(() => {
    if (entering) {
      return;
    }
    setEntering(true);
    onEnterLiveDemo();
  }, [entering, onEnterLiveDemo]);

  const next = useCallback(() => {
    if (last) {
      enter();
      return;
    }
    setAt((current) => Math.min(current + 1, PRESENTER_SLIDES.length - 1));
  }, [enter, last]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (interactiveOwner(event.target)) {
        return;
      }
      if (
        event.key === "ArrowRight" ||
        event.key === "PageDown" ||
        event.key === " " ||
        event.key === "Spacebar"
      ) {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setAt((current) => Math.max(0, current - 1));
      } else if (event.key === "Home") {
        event.preventDefault();
        setAt(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setAt(PRESENTER_SLIDES.length - 1);
      } else if (event.key === "Enter" && last) {
        event.preventDefault();
        enter();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enter, last, next]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      await document.documentElement.requestFullscreen?.();
    }
  }

  function keepFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      // The browser owns Escape in fullscreen. Deliberately do not prevent it.
      rootRef.current?.focus({ preventScroll: true });
    }
  }

  return (
    <main
      className="presenter-deck"
      data-testid="presenter-deck"
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={keepFocus}
    >
      <p className="visually-hidden" role="status" aria-live="polite">
        Slide {slide.index} of {PRESENTER_SLIDES.length}: {slide.title}
      </p>
      <section
        className="presenter-deck__stage"
        aria-label={`Presentation slide ${slide.index}`}
      >
        <img
          className="presenter-deck__slide"
          src={slide.src}
          alt={slide.alt}
          draggable={false}
          decoding="sync"
          fetchPriority="high"
        />
        {last && (
          <button
            type="button"
            className="presenter-deck__enter"
            disabled={entering}
            onClick={enter}
          >
            Enter live demo
          </button>
        )}
      </section>
      <nav className="presenter-deck__controls" aria-label="Slide controls">
        <button
          type="button"
          disabled={at === 0}
          onClick={() => setAt((current) => Math.max(0, current - 1))}
        >
          Previous
        </button>
        <span aria-hidden="true">
          {slide.index} / {PRESENTER_SLIDES.length}
        </span>
        <button type="button" disabled={last} onClick={next}>
          Next
        </button>
        <button type="button" onClick={() => void toggleFullscreen()}>
          {fullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
      </nav>
    </main>
  );
}
