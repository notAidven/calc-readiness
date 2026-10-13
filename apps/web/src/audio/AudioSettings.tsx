import { useId, useRef, useState } from "react";

import { useActiveIslandUnlock } from "../city/activeIslandUnlock";
import { useActiveCrisis } from "../city/activeCrisis";
import { useCoachAnchor } from "../city/coachmarks/coachAnchorRegistry";
import { HudIcon } from "../city/HudIcon";
import { useCityEra } from "../city/useCityEra";
import { audioPrefs } from "./audioPrefs";
import { trackForScene } from "./eraMusic";
import { useAudioMuted, useAudioVolume, useMusicEnabled } from "./useAudio";

/**
 * The learner's audio controls: one mute switch, one music switch, one volume slider.
 *
 * PLACEMENT. The live city embeds this disclosure in Menu → Environment, keeping it off
 * the world. A lesson, diagnostic, or checker does not expose that Menu, so `App` mounts
 * the compact overlay placement only while one of those takeover surfaces is open. Both
 * placements are this component and therefore share behavior, preferences, announcements,
 * focus restoration, and the same control order.
 *
 * The lesson banner's existing `LessonSoundToggle` now drives the SAME preference, so the
 * two controls stay in step through the shared subscriber set rather than disagreeing —
 * flipping either one moves the other.
 *
 * ACCESSIBILITY. Both switches are real buttons carrying `aria-pressed`, the slider is a
 * native range input with a real `<label>`, and every icon is decorative
 * (`aria-hidden`) beside a text label, per `HudIcon`'s contract. Nothing here is the only
 * way to perceive anything: audio in this game annotates feedback that is always also
 * drawn on screen or announced politely, so a learner who never hears it misses nothing.
 */
export function AudioSettings({
  placement = "overlay",
}: {
  readonly placement?: "menu" | "overlay";
}) {
  const [open, setOpen] = useState(false);
  const muted = useAudioMuted();
  const volume = useAudioVolume();
  const musicEnabled = useMusicEnabled();
  // Named from the SCENE rather than from the player, and re-read when the city advances,
  // a crisis starts or an era-advance ceremony opens. All are the same string by
  // construction, since `useAudio` hands the player exactly this selection, but the panel is
  // a rendered surface, so reading the stores is what keeps the sentence true while the
  // panel is open.
  const ceremonyEraId = useActiveIslandUnlock();
  const nowPlaying = trackForScene({
    eraId: useCityEra(),
    crisisEraId: useActiveCrisis(),
    ceremony: ceremonyEraId === null ? null : { eraId: ceremonyEraId },
  }).title;
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // The takeover control mounts outside `CitySurface`, so it registers itself for any
  // shell-level consumer. In the city, `CitySurface` points the same "sound" coach slot
  // at Menu, the always-visible door to this disclosure.
  const soundAnchorRef = useCoachAnchor("sound");

  // The volume slider reads 0-100 because a percentage is the thing a learner
  // recognises; the preference itself stays 0..1.
  const percent = Math.round(volume * 100);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Escape closes the panel and returns focus to the trigger. It is bound on the panel
  // and on the trigger rather than on their static wrapper, so the handler always sits
  // on something genuinely interactive.
  const onEscape = (event: { key: string; stopPropagation(): void }) => {
    if (event.key === "Escape" && open) {
      // Stop it here so a lesson or popup behind the panel does not ALSO close.
      event.stopPropagation();
      close();
    }
  };

  return (
    <div
      className={
        placement === "menu"
          ? "audio-settings audio-settings--menu"
          : "hud audio-settings audio-settings--overlay"
      }
      data-testid="audio-settings"
      data-placement={placement}
    >
      <button
        type="button"
        className={
          placement === "menu"
            ? "city-menu-setting audio-settings-toggle"
            : "city-chip audio-settings-toggle"
        }
        aria-label={muted ? "Sound settings, effects muted" : "Sound settings, effects on"}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-testid="audio-settings-toggle"
        ref={(element) => {
          triggerRef.current = element;
          if (placement === "overlay") {
            soundAnchorRef(element);
          }
        }}
        onClick={() => setOpen(!open)}
        onKeyDown={onEscape}
      >
        <HudIcon name={muted ? "sound-off" : "sound-on"} />
        <span className="city-chip-label">Sound</span>
        <span className="audio-settings-summary" aria-hidden="true">
          {muted ? "Muted" : "On"}
        </span>
      </button>

      {open && (
        // biome-ignore lint/a11y/useSemanticElements: a floating disclosure panel, the same shape as `hud-buildings-panel`; role="group" is valid ARIA for grouping these controls.
        <div
          className={
            placement === "menu"
              ? "audio-settings-panel audio-settings-panel--menu"
              : "audio-settings-panel hud-popover"
          }
          id={panelId}
          role="group"
          aria-label="Sound settings"
          onKeyDown={onEscape}
        >
          <span className="hud-kicker">Sound</span>

          <button
            type="button"
            className="audio-settings-row"
            aria-pressed={!muted}
            data-testid="audio-mute-toggle"
            onClick={() => audioPrefs.setMuted(!muted)}
          >
            <HudIcon name={muted ? "sound-off" : "sound-on"} />
            <span className="audio-settings-label">Sound effects</span>
            <span className="audio-settings-state">{muted ? "Off" : "On"}</span>
          </button>

          <button
            type="button"
            className="audio-settings-row"
            aria-pressed={musicEnabled}
            data-testid="audio-music-toggle"
            onClick={() => audioPrefs.setMusicEnabled(!musicEnabled)}
          >
            <HudIcon name="lessons" />
            <span className="audio-settings-label">Music</span>
            <span className="audio-settings-state">{musicEnabled ? "On" : "Off"}</span>
          </button>

          <div className="audio-settings-volume">
            <label htmlFor={`${panelId}-volume`}>
              Volume <strong>{percent}%</strong>
            </label>
            <input
              id={`${panelId}-volume`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={percent}
              data-testid="audio-volume"
              onChange={(event) => audioPrefs.setVolume(Number(event.target.value) / 100)}
            />
          </div>

          {/* With music on by default, the state that needs explaining is the SILENCE
              on a freshly opened tab — without a word about it the game reads as
              broken. The off branch is now a choice the learner made, not a default,
              so it says how to undo it. */}
          <p className="audio-settings-note">
            {musicEnabled
              ? `Now playing: ${nowPlaying}. Music starts after your first click on the page.`
              : "Music is off, so the game stays quiet. Turn it back on any time."}
          </p>
        </div>
      )}
    </div>
  );
}
