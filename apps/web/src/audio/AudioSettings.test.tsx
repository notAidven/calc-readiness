import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { LessonSoundToggle } from "../lessons/widgetFeedback";
import { AudioSettings } from "./AudioSettings";
import { audioPrefs, DEFAULT_VOLUME, MUSIC_ENABLED_BY_DEFAULT } from "./audioPrefs";

// `AudioSettings` reads the app-wide singleton, which keeps its state in memory for the
// life of the module. Reset it to the shipped defaults before each test so no test
// inherits another's preferences.
beforeEach(() => {
  audioPrefs.setMuted(false);
  audioPrefs.setMusicEnabled(MUSIC_ENABLED_BY_DEFAULT);
  audioPrefs.setVolume(DEFAULT_VOLUME);
});

function openPanel() {
  return userEvent.setup().click(screen.getByTestId("audio-settings-toggle"));
}

describe("AudioSettings — the control surface", () => {
  it("shows a labelled trigger and no panel until it is opened", () => {
    render(<AudioSettings />);

    expect(screen.getByTestId("audio-settings")).toHaveAttribute(
      "data-placement",
      "overlay",
    );
    const trigger = screen.getByRole("button", { name: /sound/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAccessibleName("Sound settings, effects on");
    expect(trigger).toHaveTextContent("SoundOn");
    expect(screen.queryByTestId("audio-volume")).not.toBeInTheDocument();
  });

  it("opens a panel with all three controls", async () => {
    render(<AudioSettings />);

    await openPanel();

    expect(screen.getByTestId("audio-settings-toggle")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByTestId("audio-mute-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("audio-music-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("audio-volume")).toBeInTheDocument();
  });

  it("uses the same disclosure and settings when embedded in the city Menu", async () => {
    render(<AudioSettings placement="menu" />);

    expect(screen.getByTestId("audio-settings")).toHaveAttribute("data-placement", "menu");
    await openPanel();
    expect(screen.getByTestId("audio-mute-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("audio-music-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("audio-volume")).toBeInTheDocument();
  });

  it("uses no emoji anywhere in its learner-facing text", () => {
    const { container } = render(<AudioSettings />);

    // The repo forbids emoji in UI; icons are inline SVG instead.
    expect(container.textContent ?? "").not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<AudioSettings />);
    await openPanel();

    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("audio-volume")).not.toBeInTheDocument();
    expect(screen.getByTestId("audio-settings-toggle")).toHaveFocus();
  });
});

describe("AudioSettings — effects mute", () => {
  it("starts ON, because an effect only ever answers the learner's own click", async () => {
    render(<AudioSettings />);
    await openPanel();

    const toggle = screen.getByTestId("audio-mute-toggle");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("On");
  });

  it("mutes and unmutes, and writes the preference through", async () => {
    const user = userEvent.setup();
    render(<AudioSettings />);
    await openPanel();

    await user.click(screen.getByTestId("audio-mute-toggle"));

    expect(audioPrefs.muted()).toBe(true);
    expect(audioPrefs.effectGain()).toBe(0);
    expect(screen.getByTestId("audio-mute-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("audio-mute-toggle")).toHaveTextContent("Off");
    expect(screen.getByTestId("audio-settings-toggle")).toHaveAccessibleName(
      "Sound settings, effects muted",
    );
    expect(screen.getByTestId("audio-settings-toggle")).toHaveTextContent("SoundMuted");

    await user.click(screen.getByTestId("audio-mute-toggle"));

    expect(audioPrefs.muted()).toBe(false);
  });

  it("spells the state out in words, not only in the icon", async () => {
    const user = userEvent.setup();
    render(<AudioSettings />);
    await openPanel();

    // Meaning must never be carried by the glyph (or by colour) alone.
    expect(screen.getByTestId("audio-mute-toggle")).toHaveTextContent(/On|Off/);
    await user.click(screen.getByTestId("audio-mute-toggle"));
    expect(screen.getByTestId("audio-mute-toggle")).toHaveTextContent("Off");
  });
});

describe("AudioSettings — music", () => {
  it("starts ON, and names the track that will play", async () => {
    render(<AudioSettings />);
    await openPanel();

    const toggle = screen.getByTestId("audio-music-toggle");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("On");
    expect(audioPrefs.musicEnabled()).toBe(true);
    expect(screen.getByText(/Now playing/i)).toBeInTheDocument();
  });

  it("says the music waits for a click, so silence on a fresh tab is explained", async () => {
    render(<AudioSettings />);
    await openPanel();

    // With music on by default, the surprising state is the SILENCE before the first
    // interaction. The panel has to account for it or it reads as broken.
    expect(screen.getByText(/after your first click/i)).toBeInTheDocument();
  });

  it("turns off in one click, and says so", async () => {
    const user = userEvent.setup();
    render(<AudioSettings />);
    await openPanel();

    await user.click(screen.getByTestId("audio-music-toggle"));

    expect(audioPrefs.musicEnabled()).toBe(false);
    expect(screen.getByTestId("audio-music-toggle")).toHaveTextContent("Off");
    expect(screen.getByText(/stays quiet/i)).toBeInTheDocument();
  });
});

describe("AudioSettings — volume", () => {
  it("shows the current volume as a percentage", async () => {
    audioPrefs.setVolume(0.4);
    render(<AudioSettings />);
    await openPanel();

    expect(screen.getByTestId("audio-volume")).toHaveValue("40");
    expect(screen.getByLabelText(/volume/i)).toBeInTheDocument();
  });

  it("writes the slider back to the preference as a 0..1 value", async () => {
    render(<AudioSettings />);
    await openPanel();

    // A range input is dragged, not typed into, so drive its change event directly.
    fireEvent.change(screen.getByTestId("audio-volume"), { target: { value: "25" } });

    expect(audioPrefs.volume()).toBeCloseTo(0.25);
  });

  it("silences everything at zero without touching the mute switch", async () => {
    render(<AudioSettings />);
    await openPanel();

    fireEvent.change(screen.getByTestId("audio-volume"), { target: { value: "0" } });

    expect(audioPrefs.effectGain()).toBe(0);
    expect(audioPrefs.musicGain()).toBe(0);
    expect(audioPrefs.muted()).toBe(false);
    expect(screen.getByTestId("audio-mute-toggle")).toHaveTextContent("On");
  });
});

describe("the mute preference is SHARED, not duplicated", () => {
  it("keeps the lesson banner's toggle and the game panel in step", async () => {
    const user = userEvent.setup();
    // Both controls on screen at once. Before this feature these were two different
    // preferences (the city chime honoured none at all), so muting in one place left
    // the other making noise.
    render(
      <>
        <AudioSettings />
        <LessonSoundToggle />
      </>,
    );
    await openPanel();

    const lessonToggle = screen.getByRole("button", { name: /mute lesson sounds/i });
    await user.click(lessonToggle);

    // The lesson toggle moved the ONE shared preference, and the game panel re-rendered
    // from it without being told.
    expect(audioPrefs.muted()).toBe(true);
    expect(screen.getByTestId("audio-mute-toggle")).toHaveTextContent("Off");

    await user.click(screen.getByTestId("audio-mute-toggle"));

    expect(audioPrefs.muted()).toBe(false);
    expect(screen.getByRole("button", { name: /mute lesson sounds/i })).toBeInTheDocument();
  });
});
