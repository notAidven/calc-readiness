import { useId } from "react";

import { useFullscreen } from "./useFullscreen";

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="fullscreen-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {active ? (
        <path d="M4 9h5V4 M20 9h-5V4 M4 15h5v5 M20 15h-5v5" />
      ) : (
        <path d="M9 4H4v5 M15 4h5v5 M9 20H4v-5 M15 20h5v-5" />
      )}
    </svg>
  );
}

/**
 * Labelled Menu utility for the app-level fullscreen control.
 *
 * Only the standard API is used. This repository declares no legacy browser
 * target and its browser suite runs current Chromium, so prefixed methods would
 * add an untested second contract. Browsers without the standard pair get a
 * disabled, explained action instead.
 */
export function FullscreenMenuAction() {
  const { active, pending, status, supported, toggle } = useFullscreen();
  const messageId = useId();
  const label = active ? "Exit full screen" : "Enter full screen";
  const message = supported ? status : "Full screen is unavailable in this browser.";

  return (
    <div className="fullscreen-menu-utility">
      <button
        type="button"
        className="city-action city-action-ghost fullscreen-menu-action"
        aria-label={label}
        aria-pressed={active}
        aria-busy={pending}
        aria-describedby={message ? messageId : undefined}
        disabled={!supported || pending}
        onClick={() => void toggle()}
      >
        <FullscreenIcon active={active} />
        <span>{label}</span>
      </button>
      {message && (
        <p
          className="fullscreen-menu-status"
          id={messageId}
          role={status ? "status" : undefined}
          aria-live={status ? "polite" : undefined}
        >
          {message}
        </p>
      )}
    </div>
  );
}
