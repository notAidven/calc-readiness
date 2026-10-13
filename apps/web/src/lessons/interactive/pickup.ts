/**
 * A "held" item, for every widget where the learner picks something up and then puts it
 * somewhere: tap a value then tap a slot, or drag a chip onto a bin.
 *
 * It exists because reading the held item out of ordinary `useState` is wrong, and wrong
 * in a way that looks like the widget is dead. The handler on the drop target closes over
 * the state as it was when that render ran, so two taps inside one frame (a value and then
 * a slot, which is how anybody actually clicks) reach the drop handler with the selection
 * still `null`: no landing, no "not quite", no feedback of any kind. The D2 number-line
 * widget had exactly this, and it is what QA saw as "the interface doesn't work".
 *
 * So the value is kept in a ref, which is readable in the same tick it was written, and
 * mirrored into state only so the chips can render their pressed state.
 */

import { useCallback, useRef, useState } from "react";

export interface Pickup<T> {
  /** What is held right now. Safe to render (it is state). */
  held: T | null;
  /** Pick something up, or put it back down by passing the same value again. */
  toggle: (value: T) => void;
  /** Pick something up outright (used by `onDragStart`). */
  hold: (value: T) => void;
  /** Read AND release what is held. Correct inside a drop handler. */
  take: () => T | null;
  /** Release without reading. */
  clear: () => void;
}

export function usePickup<T>(): Pickup<T> {
  const ref = useRef<T | null>(null);
  const [held, setHeld] = useState<T | null>(null);

  const hold = useCallback((value: T) => {
    ref.current = value;
    setHeld(value);
  }, []);

  const clear = useCallback(() => {
    ref.current = null;
    setHeld(null);
  }, []);

  const toggle = useCallback((value: T) => {
    const next = ref.current === value ? null : value;
    ref.current = next;
    setHeld(next);
  }, []);

  const take = useCallback(() => {
    const value = ref.current;
    ref.current = null;
    setHeld(null);
    return value;
  }, []);

  return { held, toggle, hold, take, clear };
}
