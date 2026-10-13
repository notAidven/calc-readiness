import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  activeIslandUnlockEraId as advanceCeremonyEraId,
  setActiveIslandUnlock as setAdvanceCeremony,
} from "../city/activeIslandUnlock";
import { activeCrisisEraId, setActiveCrisis } from "../city/activeCrisis";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import {
  CEREMONY_SLOT_TRACK_ID,
  crisisSlotTrackId,
  eraSlotTrackId,
  trackIdForScene,
} from "./eraMusic";
import { MUSIC_TRACKS, type MusicTrack, musicPlayer } from "./music";
import { useGameAudio } from "./useAudio";

/**
 * **THE SUBSCRIPTIONS, which are the half `sceneMusic.test.ts` cannot reach.**
 *
 * That file drives `reconcileMusic` by hand, so it proves the selection and the player and
 * says nothing about whether anything ever CALLS them. This mounts the real
 * `useGameAudio`, moves the real stores, and reads the real app-wide singleton. Dropping
 * either subscription from the hook leaves every case in that file green and every case
 * here red, which is the split worth having.
 *
 * NOTHING IS EVER PLAYED HERE. The gesture gate is the app-wide one and no test clicks, so
 * `sync()` never wants anything and no `Audio` is constructed, which is also asserted,
 * because jsdom has no media stack and a test that quietly started building elements would
 * be measuring something other than what it claims.
 */

function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`expected an element at index ${index}, found ${items.length}`);
  }
  return item;
}

/** Register ids as shipped for the duration of `body`, then restore exactly. */
function withShippedTracks(ids: readonly string[], body: () => void): void {
  const table = MUSIC_TRACKS as unknown as MusicTrack[];
  const before = table.length;
  for (const id of ids) {
    table.push({ ...nth(MUSIC_TRACKS, 0), id, title: id, file: `music/${id}.mp3` });
  }
  try {
    body();
  } finally {
    table.length = before;
  }
}

const ERA_ONE: EraId = nth(ERA_SEQUENCE, 0).id;
const ERA_TWO: EraId = nth(ERA_SEQUENCE, 1).id;

function Harness() {
  useGameAudio();
  return null;
}

beforeEach(() => {
  resetCityEra();
  setActiveCrisis(null);
  setAdvanceCeremony(null);
});

afterEach(() => {
  resetCityEra();
  setActiveCrisis(null);
  setAdvanceCeremony(null);
});

describe("useGameAudio subscribes the soundtrack to both halves of the scene", () => {
  it("follows the city into another era", () => {
    withShippedTracks([eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO)], () => {
      render(<Harness />);
      expect(musicPlayer.track().id).toBe(eraSlotTrackId(ERA_ONE));

      act(() => {
        setCityEra(ERA_TWO);
      });

      expect(musicPlayer.track().id).toBe(eraSlotTrackId(ERA_TWO));
      expect(musicPlayer.track().id).not.toBe(eraSlotTrackId(ERA_ONE));
      expect(musicPlayer.playing()).toBe(false);
    });
  });

  it("follows a crisis in and back out again", () => {
    withShippedTracks([eraSlotTrackId(ERA_ONE), crisisSlotTrackId(ERA_ONE)], () => {
      render(<Harness />);
      expect(musicPlayer.track().id).toBe(eraSlotTrackId(ERA_ONE));

      act(() => {
        setActiveCrisis(ERA_ONE);
      });
      expect(musicPlayer.track().id).toBe(crisisSlotTrackId(ERA_ONE));

      act(() => {
        setActiveCrisis(null);
      });
      expect(musicPlayer.track().id).toBe(eraSlotTrackId(ERA_ONE));
      expect(musicPlayer.playing()).toBe(false);
    });
  });

  it("stops following once the root unmounts", () => {
    withShippedTracks([eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO)], () => {
      const view = render(<Harness />);
      view.unmount();

      act(() => {
        setCityEra(ERA_TWO);
      });

      // The removers ran, so the store moved and the player did not. A subscription left
      // behind would keep a torn-down page reconciling audio.
      expect(musicPlayer.track().id).toBe(eraSlotTrackId(ERA_ONE));
    });
  });

  it("agrees with the selection function rather than re-deriving it", () => {
    withShippedTracks([eraSlotTrackId(ERA_TWO), crisisSlotTrackId(ERA_ONE)], () => {
      render(<Harness />);
      act(() => {
        setCityEra(ERA_TWO);
        setActiveCrisis(ERA_ONE);
      });

      expect(musicPlayer.track().id).toBe(
        trackIdForScene({ eraId: ERA_TWO, crisisEraId: ERA_ONE, ceremony: null }),
      );
      expect(activeCrisisEraId()).toBe(ERA_ONE);
    });
  });

  /**
   * **THE THIRD SUBSCRIPTION, and the two stores that between them are the handover.**
   *
   * The era and the crisis reach the reconciler through two stores; the ceremony reaches it
   * through a third. Dropping the ceremony subscription leaves every case in
   * `ceremonyMusic.test.ts` green — that file drives `reconcileMusic` by hand — and these red.
   *
   * There is no fourth input off the player any more. While the ceremony was scored by a cue,
   * `useGameAudio` also subscribed to a `musicPlayer.onTrackEnded` notification and turned a
   * finished file into the handover. The bed has no end to report, so the era subscription
   * above does that job instead, which is the case below.
   */
  it("follows an era-advance ceremony in and back out again", () => {
    withShippedTracks(
      [eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO), CEREMONY_SLOT_TRACK_ID],
      () => {
        render(<Harness />);
        expect(musicPlayer.track().id).toBe(eraSlotTrackId(ERA_ONE));

        act(() => {
          setAdvanceCeremony(ERA_ONE);
        });
        expect(musicPlayer.track().id).toBe(CEREMONY_SLOT_TRACK_ID);

        act(() => {
          setAdvanceCeremony(null);
        });
        expect(musicPlayer.track().id).toBe(eraSlotTrackId(ERA_ONE));
        expect(musicPlayer.playing()).toBe(false);
      },
    );
  });

  it("hands the ceremony over to the incoming era when the ERA store moves", () => {
    // THE HANDOVER THROUGH THE REAL HOOK. The advance press writes the era and takes the
    // surface down, and the era write is what ends the bed — so this drives that write alone,
    // with the ceremony still declared, which is exactly the state the press passes through.
    withShippedTracks(
      [eraSlotTrackId(ERA_ONE), eraSlotTrackId(ERA_TWO), CEREMONY_SLOT_TRACK_ID],
      () => {
        render(<Harness />);
        act(() => {
          setAdvanceCeremony(ERA_ONE);
        });
        expect(musicPlayer.track().id).toBe(CEREMONY_SLOT_TRACK_ID);

        act(() => {
          setCityEra(ERA_TWO);
        });

        expect(advanceCeremonyEraId()).toBe(ERA_ONE);
        expect(musicPlayer.track().id).toBe(eraSlotTrackId(ERA_TWO));

        // And the surface coming down afterwards is not a second handover.
        act(() => {
          setAdvanceCeremony(null);
        });
        expect(musicPlayer.track().id).toBe(eraSlotTrackId(ERA_TWO));
      },
    );
  });

  it("stops following the ceremony once the root unmounts", () => {
    withShippedTracks([eraSlotTrackId(ERA_ONE), CEREMONY_SLOT_TRACK_ID], () => {
      const view = render(<Harness />);
      view.unmount();

      act(() => {
        setAdvanceCeremony(ERA_ONE);
      });

      // The remover ran, so the store moved and the player did not.
      expect(advanceCeremonyEraId()).toBe(ERA_ONE);
      expect(musicPlayer.track().id).toBe(eraSlotTrackId(ERA_ONE));
    });
  });
});
