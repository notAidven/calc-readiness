/**
 * Minimal mount/interaction helpers for the lesson interactive-widget browser tests
 * (real Chromium via vitest.browser.config.ts). Kept dependency-free (no Testing Library):
 * mount a React node into a throwaway host, poll the DOM, and drive native inputs the way
 * React expects (native value setter + a bubbling `input` event so `onChange` fires).
 */

import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

export interface Harness {
  host: HTMLElement;
  root: Root;
  cleanup: () => void;
}

export function mount(node: ReactNode): Harness {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(node);
  return {
    host,
    root,
    cleanup: () => {
      root.unmount();
      host.remove();
    },
  };
}

/** Poll until `predicate` is true or the timeout elapses (throws on timeout). */
export async function waitFor(
  predicate: () => boolean,
  message = "condition",
  timeoutMs = 4000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (predicate()) {
        return;
      }
    } catch {
      // Element may not be mounted yet (e.g. a query helper throws); keep polling.
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`waitFor timed out: ${message}`);
}

/** Set a controlled input's value the way React detects (native setter + input event). */
export function setInputValue(input: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const setter = descriptor?.set;
  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/** First `<button>` under `root` whose visible text matches `text`. */
export function findButton(root: ParentNode, text: string | RegExp): HTMLButtonElement {
  const buttons = Array.from(root.querySelectorAll("button"));
  const match = buttons.find((b) => {
    const content = b.textContent ?? "";
    return typeof text === "string" ? content.includes(text) : text.test(content);
  });
  if (!match) {
    throw new Error(`button not found: ${String(text)}`);
  }
  return match;
}

/** All `<input>` elements under `root`. */
export function inputs(root: ParentNode): HTMLInputElement[] {
  return Array.from(root.querySelectorAll("input"));
}

/**
 * True when `root`'s text content contains `text`. Prose only — for math, use `hasMath`.
 */
export function hasText(root: HTMLElement, text: string | RegExp): boolean {
  const content = root.textContent ?? "";
  return typeof text === "string" ? content.includes(text) : text.test(content);
}

/**
 * True when some KaTeX node under `root` was typeset from LaTeX containing `latex`.
 *
 * Math has to be asserted on the source, not the rendering: `\dfrac{7}{12}` produces no
 * slash to search for, and KaTeX's `htmlAndMathml` output emits every glyph twice (once
 * visually, once in MathML), so `textContent` reads "1212" for a single 12.
 */
export function hasMath(root: HTMLElement, latex: string): boolean {
  return Array.from(root.querySelectorAll("[data-latex]")).some((node) =>
    (node.getAttribute("data-latex") ?? "").includes(latex),
  );
}

/** Counts tones, so a test can prove a step was silent. One tone is two oscillators. */
export interface AudioProbe {
  oscillators: () => number;
  reset: () => void;
  restore: () => void;
}

class CountingAudioContext {
  static built = 0;
  state = "running";
  currentTime = 0;
  destination = {};
  resume() {
    return Promise.resolve();
  }
  createOscillator() {
    CountingAudioContext.built += 1;
    return {
      type: "sine",
      frequency: { value: 0 },
      connect: (node: unknown) => node,
      start: () => {},
      stop: () => {},
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: (node: unknown) => node,
    };
  }
}

/**
 * Swaps `window.AudioContext` for one that counts what it builds.
 *
 * `lessonSound` caches its context against the constructor it came from, so swapping the
 * constructor is what gets a fresh fake rather than a stale real one.
 */
export function installCountingAudio(): AudioProbe {
  const scope = window as unknown as { AudioContext?: unknown };
  const real = scope.AudioContext;
  scope.AudioContext = CountingAudioContext;
  CountingAudioContext.built = 0;
  return {
    oscillators: () => CountingAudioContext.built,
    reset: () => {
      CountingAudioContext.built = 0;
    },
    restore: () => {
      scope.AudioContext = real;
    },
  };
}
