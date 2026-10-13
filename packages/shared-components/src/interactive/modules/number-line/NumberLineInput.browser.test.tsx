import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type NumberLineExpected,
  type NumberLinePayload,
  toNumberLineWorkspace,
} from "./comparator";
import { NumberLineInput } from "./NumberLineInput";

/**
 * Chromium render + interaction tests for the number_line input. They drive the
 * widget through its accessible controls (number fields, endpoint toggles, keyboard
 * marker nudges) and assert the emitted controlled payload shape — proving the item
 * is answerable end to end from the keyboard alone, over the same value/onChange seam
 * the text input uses.
 */

afterEach(cleanup);

const pointSpec: NumberLineExpected = {
  domain: [-5, 5],
  tick: 1,
  points: [3],
  tolerance: 0.25,
};

const intervalSpec: NumberLineExpected = {
  domain: [-6, 6],
  tick: 1,
  intervals: [{ lo: -1, hi: 4, loClosed: true, hiClosed: true }],
  tolerance: 0.25,
};

function lastPayload(spy: ReturnType<typeof vi.fn>): NumberLinePayload {
  const calls = spy.mock.calls;
  return calls[calls.length - 1]?.[0] as NumberLinePayload;
}

describe("NumberLineInput (Chromium): keyboard-answerable, correct payload shape", () => {
  it("renders a labeled axis and a polite live region", () => {
    render(
      <NumberLineInput
        itemVersionId="pt"
        workspace={toNumberLineWorkspace(pointSpec)}
        value={null}
        onChange={() => {}}
        label="Place x = 3"
      />,
    );
    expect(screen.getByRole("img", { name: /number line/i })).toBeTruthy();
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toBeTruthy();
  });

  it("emits a points payload when a point is set through its number field", () => {
    const onChange = vi.fn();
    render(
      <NumberLineInput
        itemVersionId="pt"
        workspace={toNumberLineWorkspace(pointSpec)}
        value={null}
        onChange={onChange}
        label="Place x = 3"
      />,
    );
    fireEvent.change(screen.getByLabelText("Point 1 position"), {
      target: { value: "3" },
    });
    expect(onChange).toHaveBeenCalled();
    expect(lastPayload(onChange)).toEqual({ points: [3] });
  });

  it("nudges a point marker with the arrow keys (keyboard-only)", () => {
    const onChange = vi.fn();
    render(
      <NumberLineInput
        itemVersionId="pt"
        workspace={toNumberLineWorkspace(pointSpec)}
        value={{ points: [2] }}
        onChange={onChange}
        label="Place x = 3"
      />,
    );
    const marker = screen.getByRole("slider", { name: /point 1 marker/i });
    marker.focus();
    fireEvent.keyDown(marker, { key: "ArrowRight" });
    expect(lastPayload(onChange).points?.[0]).toBe(3);
  });

  it("emits a full interval payload via endpoint fields + inclusivity toggles", () => {
    const onChange = vi.fn();
    render(
      <NumberLineInput
        itemVersionId="iv"
        workspace={toNumberLineWorkspace(intervalSpec)}
        value={null}
        onChange={onChange}
        label="Shade [-1, 4]"
      />,
    );
    fireEvent.change(screen.getByLabelText("Interval 1 left endpoint"), {
      target: { value: "-1" },
    });
    fireEvent.change(screen.getByLabelText("Interval 1 right endpoint"), {
      target: { value: "4" },
    });
    const payload = lastPayload(onChange);
    expect(payload.intervals).toHaveLength(1);
    expect(payload.intervals?.[0]).toMatchObject({
      lo: -1,
      hi: 4,
      loClosed: true,
      hiClosed: true,
    });
  });

  it("toggles endpoint inclusivity (open/closed) through a labeled control", () => {
    const onChange = vi.fn();
    render(
      <NumberLineInput
        itemVersionId="iv"
        workspace={toNumberLineWorkspace(intervalSpec)}
        value={{ intervals: [{ lo: 2, hi: 5, loClosed: true, hiClosed: true }] }}
        onChange={onChange}
        label="Shade the interval"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /left endpoint is closed/i }));
    expect(lastPayload(onChange).intervals?.[0]?.loClosed).toBe(false);
  });

  it("disables every scored control when disabled", () => {
    render(
      <NumberLineInput
        itemVersionId="iv"
        workspace={toNumberLineWorkspace(intervalSpec)}
        value={null}
        onChange={() => {}}
        label="Shade the interval"
        disabled
      />,
    );
    expect(
      (screen.getByLabelText("Interval 1 left endpoint") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /left endpoint is/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
