import type { ReactNode } from "react";

/**
 * Sticker-style HUD icons (one icon = one meaning), always paired with a text
 * label by the caller so meaning is never carried by the glyph alone. Icons are
 * decorative (`aria-hidden`), inherit `currentColor`, and size to `1em`.
 */

export type IconName =
  | "storm"
  | "gem"
  | "dev"
  | "survey"
  | "lessons"
  | "checker"
  | "rotate-left"
  | "rotate-right"
  | "plus"
  | "minus"
  | "home"
  | "sun"
  | "moon"
  | "contrast"
  | "hammer"
  | "check"
  | "close"
  | "menu"
  | "chevron-up"
  | "chevron-down"
  | "building"
  | "lock"
  | "move"
  | "road"
  | "help"
  | "sound-on"
  | "sound-off"
  | "alert";

function paths(name: IconName): ReactNode {
  switch (name) {
    case "storm":
      return <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" stroke="none" />;
    case "gem":
      return (
        <path
          d="M6 3h12l3 6-9 12L3 9l3-6Z M3 9h18 M9 3 7 9l5 12 M15 3l2 6-5 12"
          fill="none"
        />
      );
    case "dev":
      return (
        <path d="M14.5 5.5a3.5 3.5 0 0 1-4.6 4.6L5 15l4 4 4.9-4.9a3.5 3.5 0 0 1 4.6-4.6l-2.6 2.6-2-2 2.6-2.6Z" />
      );
    case "survey":
      return (
        <path d="M8 4h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M10 3h4v3h-4z M9.5 10h5 M9.5 13h5 M9.5 16h3" />
      );
    case "lessons":
      return <path d="M12 4 3 8l9 4 9-4-9-4Z M5 10v5l7 3 7-3v-5" />;
    case "checker":
      return (
        <path d="M10.5 3a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Z M16 16l5 5 M7.5 10.5l2 2 4-4" />
      );
    case "rotate-left":
      return <path d="M3 12a9 9 0 1 0 3-6.7 M3 3v5h5" />;
    case "rotate-right":
      return <path d="M21 12a9 9 0 1 1-3-6.7 M21 3v5h-5" />;
    case "plus":
      return <path d="M12 5v14 M5 12h14" />;
    case "minus":
      return <path d="M5 12h14" />;
    case "home":
      return <path d="M3 11 12 3l9 8 M5 10v10h14V10" />;
    case "sun":
      return (
        <path d="M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z M12 2v2 M12 20v2 M4 12H2 M22 12h-2 M5 5l1.5 1.5 M17.5 17.5 19 19 M19 5l-1.5 1.5 M6.5 17.5 5 19" />
      );
    case "moon":
      return <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />;
    case "contrast":
      return (
        <>
          <circle cx="12" cy="12" r="9" fill="none" />
          <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />
        </>
      );
    case "hammer":
      return (
        <path d="M13.5 3.5 20.5 10.5 18 13 11 6l2.5-2.5Z M11 8 3.5 15.5 3 20l4.5-.5L15 12" />
      );
    case "check":
      return <path d="M4 12.5 9.5 18 20 6.5" />;
    case "close":
      return <path d="M6 6l12 12 M18 6 6 18" />;
    case "menu":
      return <path d="M4 7h16 M4 12h16 M4 17h16" />;
    case "chevron-up":
      return <path d="M6 15l6-6 6 6" />;
    case "chevron-down":
      return <path d="M6 9l6 6 6-6" />;
    case "building":
      return (
        <path d="M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16 M14 21V10h4a1 1 0 0 1 1 1v10 M3 21h18 M8 8h3 M8 12h3 M8 16h3" />
      );
    case "lock":
      return (
        <path d="M8 10V7a4 4 0 0 1 8 0v3 M5.5 10h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z M12 14v3" />
      );
    // Four-way move (relocate) arrows — the CoC "pick up and reposition" affordance.
    case "move":
      return (
        <path d="M12 3v18 M3 12h18 M9 6l3-3 3 3 M9 18l3 3 3-3 M6 9l-3 3 3 3 M18 9l3 3-3 3" />
      );
    // A road receding to the horizon: two converging edges with a dashed centre line.
    case "road":
      return <path d="M8 21 10.5 3 M16 21 13.5 3 M12 5v3 M12 11v2 M12 16v3" />;
    /**
     * A circled question mark: "there is an explanation here".
     *
     * The stop under the hook is a 0.6-unit segment rather than a zero-length one,
     * because a round cap needs something to cap: `v0` draws nothing in Chromium.
     */
    case "help":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.3 9.4a2.75 2.75 0 1 1 3.5 2.9c-.85.3-1.2.95-1.2 1.75v.35" />
          <path d="M11.7 17.4h.6" />
        </>
      );
    // A speaker cone with two radiating arcs: sound is coming out.
    case "sound-on":
      return (
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z M15.8 9a4.2 4.2 0 0 1 0 6 M18.4 6.8a7.5 7.5 0 0 1 0 10.4" />
      );
    // The same cone with the arcs struck out: silenced.
    case "sound-off":
      return <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z M16 9.5l4.5 5m0-5l-4.5 5" />;
    /*
      A warning triangle, which the city life panel's distressed rows carry.

      IT IS A SHAPE AND NOT A COLOUR, and that is the whole reason it exists. The lead
      asked for the panel to LOOK wrong and not only read wrong, and the obvious way to do
      that is a red row: but the panel's own rule is that nothing is signalled by colour
      alone (D-CIT13), and red is the axis red/green colour blindness erases and greyscale
      flattens. A triangle survives both. It sits beside the row's own word, so the state
      is carried three times over: the shape, the sentence, and the tint.
    */
    case "alert":
      return <path d="M12 3.6 22 20.4H2L12 3.6Z M12 10v4.4 M12 17.2v.1" />;
  }
}

export function HudIcon({ name }: { name: IconName }) {
  return (
    <svg
      className="hud-icon"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths(name)}
    </svg>
  );
}
