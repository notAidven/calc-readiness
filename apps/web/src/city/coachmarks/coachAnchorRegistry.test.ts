import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearCoachAnchors,
  coachAnchorsVersion,
  getCoachAnchor,
  setCoachAnchor,
  subscribeCoachAnchors,
} from "./coachAnchorRegistry";

afterEach(() => {
  clearCoachAnchors();
});

describe("coach-mark anchor registry", () => {
  it("registers and resolves an element per anchor slot", () => {
    const chip = document.createElement("button");
    expect(getCoachAnchor("economy")).toBeNull();

    setCoachAnchor("economy", chip);
    expect(getCoachAnchor("economy")).toBe(chip);

    // React calls a ref callback with null on unmount.
    setCoachAnchor("economy", null);
    expect(getCoachAnchor("economy")).toBeNull();
  });

  it("notifies subscribers on register and unregister, with a changed snapshot", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCoachAnchors(listener);
    const before = coachAnchorsVersion();

    setCoachAnchor("sound", document.createElement("button"));
    expect(listener).toHaveBeenCalledTimes(1);
    // `useSyncExternalStore` re-reads only when the snapshot changes identity.
    expect(coachAnchorsVersion()).not.toBe(before);

    setCoachAnchor("sound", null);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setCoachAnchor("sound", document.createElement("button"));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stays quiet when nothing actually changed", () => {
    const chip = document.createElement("button");
    setCoachAnchor("economy", chip);

    const listener = vi.fn();
    subscribeCoachAnchors(listener);

    // Re-registering the same element (a re-render) must not loop the controller.
    setCoachAnchor("economy", chip);
    // Unregistering a slot that was never registered is a no-op too.
    setCoachAnchor("townhall", null);
    expect(listener).not.toHaveBeenCalled();
  });
});
