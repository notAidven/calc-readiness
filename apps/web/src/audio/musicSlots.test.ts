import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { CRISIS_ERAS } from "../city/three/crisis/registry";
import {
  CEREMONY_SLOT_TRACK_ID,
  crisisSlotTrackId,
  eraScene,
  eraSlotTrackId,
  musicSlots,
  trackIdForScene,
} from "./eraMusic";
import { type MusicTrack, MUSIC_TRACKS } from "./musicRegistry";

/**
 * **THE FIFTEEN SLOTS, DERIVED TWICE FROM TWO INDEPENDENT SOURCES AND REQUIRED TO
 * AGREE.**
 *
 * A registry whose ids do not match the ids the generation prompts were written for is a
 * soundtrack that silently never plays: the file lands, the slot goes on standing in, and
 * nothing fails. That is the defect this file exists for, and it is exactly the shape
 * that passes unnoticed, so neither side of the comparison is written down here.
 *
 *  - **THE DOCUMENT** (#515), which is the authoritative slot list, parsed two ways: its
 *    per-slot `###` headings in §C, §E and §I, and its "The fifteen slots" summary table.
 *    Those two must agree with each other before either is used, because a parse that
 *    silently matched nothing would make the comparison below unanimous over an empty
 *    set.
 *  - **THE CODE**, from `musicSlots()` — which is `ERA_SEQUENCE` (what `setCityEra`
 *    accepts) for the era rows, `CRISIS_ERAS` (the crisis registry's own four-in-scope
 *    list) for the crisis rows, and the one ceremony slot — through the same
 *    `eraSlotTrackId`/`crisisSlotTrackId`/`CEREMONY_SLOT_TRACK_ID` the player resolves ids
 *    with.
 *
 * Deriving correctly is a separate question from deriving at all, and one clean filter
 * over a real source is also what a too-narrow filter looks like. Two derivations from
 * sources that cannot both drift the same way is the answer to that: the doc is prose a
 * human edits, the code is what the game runs, and a change to either alone fails here.
 *
 * **The fifteenth slot is the case that proved the guard rather than merely joining it.**
 * `ceremony-advance` is neither `era-<id>` nor `crisis-<id>`, so both regexes below and the
 * code-side derivation had to be widened, and each was watched go RED with the slot added
 * to one side only: doc-only fails at the set equality with an unmatched
 * `ceremony-advance`, code-only fails the same assertion in the other direction.
 */

/** The doc that #515 landed. Named as the CI scope filter names it. */
const PROMPTS_DOC =
  "docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md";

/**
 * The document itself, through Vite's `?raw` glob — the house idiom for a test that needs
 * a file's text under `apps/web`'s DOM-only `lib`, where `node:fs` is not declared
 * (`diagnostic/skillNames.test.ts` carries the same note).
 */
const DOC = import.meta.glob(
  "../../../../docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const docText: string = Object.values(DOC).join("");

function matched(pattern: RegExp): string[] {
  return [...docText.matchAll(pattern)].map((match) => match[1] as string);
}

/**
 * The three prefixes a slot id can take. Written once so the two parses below cannot be
 * widened for a new kind of slot in one place and not the other — which is exactly the
 * one-sided edit the set equality exists to catch, and there is no reason to leave a second
 * way to make it.
 */
const SLOT_PREFIXES = "era|crisis|ceremony";

/** §C, §E and §I: one `###` heading per slot, which is the per-slot authority. */
const FROM_HEADINGS = matched(new RegExp(`^### \`((?:${SLOT_PREFIXES})-[a-z_]+)\``, "gm"));

/** "The fifteen slots": the summary table, which is the same claim in another shape. */
const FROM_TABLE = matched(new RegExp(`^\\| \`((?:${SLOT_PREFIXES})-[a-z_]+)\` \\|`, "gm"));

/**
 * The code's own answer, through the id functions the player actually resolves with.
 *
 * The era and crisis halves are re-derived here from `ERA_SEQUENCE` and `CRISIS_ERAS`
 * rather than read off `musicSlots()`, deliberately: `musicSlots()` is total over every era
 * in both dimensions, so it holds ten crisis rows where only four are in scope, and taking
 * the population from it would silently drop the crisis-scope check this file has always
 * made. The ceremony slot has no such second source — there is one of it — so it comes off
 * `musicSlots()`, which is what makes it the CODE's answer rather than this file's copy of
 * the constant.
 */
const FROM_CODE = [
  ...ERA_SEQUENCE.map((era) => eraSlotTrackId(era.id)),
  ...CRISIS_ERAS.map((eraId) => crisisSlotTrackId(eraId)),
  ...musicSlots()
    .filter((entry) => entry.kind === "ceremony")
    .map((entry) => entry.trackId),
];

const sorted = (ids: readonly string[]) => [...ids].sort();

/** Anything in the registry that claims to fill a slot, as opposed to a house track. */
const SLOT_SHAPED = new RegExp(`^(?:${SLOT_PREFIXES})-`);

function slotRows(): readonly MusicTrack[] {
  return MUSIC_TRACKS.filter((track) => SLOT_SHAPED.test(track.id));
}

/** Register ids as shipped for the duration of `body`, then restore exactly. */
function withShippedTracks(ids: readonly string[], body: () => void): void {
  const table = MUSIC_TRACKS as unknown as MusicTrack[];
  const before = table.length;
  for (const id of ids) {
    table.push({ ...MUSIC_TRACKS[0], id, title: id, file: `music/${id}.ogg` });
  }
  try {
    body();
  } finally {
    table.length = before;
  }
}

/**
 * UN-register ids for the duration of `body`, then put them back at their own indices.
 *
 * Fourteen of the fifteen slots now ship, so the rehearsal below has to be able to run in
 * the other direction: for a slot whose row is already there, "one row is the whole change"
 * is shown by taking that row away and watching the slot fall back. Restored by index
 * because the order of `MUSIC_TRACKS` is load-bearing — `trackById` falls back to entry zero.
 *
 * Throws rather than no-ops when an id is not there, so a case cannot pass because the
 * withdrawal it depends on quietly removed nothing.
 */
function withoutShippedTracks(ids: readonly string[], body: () => void): void {
  const table = MUSIC_TRACKS as unknown as MusicTrack[];
  const taken: [number, MusicTrack][] = [];
  for (let index = table.length - 1; index >= 0; index -= 1) {
    const row = table[index];
    if (row !== undefined && ids.includes(row.id)) {
      taken.push([index, row]);
      table.splice(index, 1);
    }
  }
  if (taken.length !== ids.length) {
    throw new Error(
      `expected ${ids.length} shipped rows to withdraw, found ${taken.length}: ${ids.join(", ")}`,
    );
  }
  try {
    body();
  } finally {
    for (const [index, row] of [...taken].reverse()) {
      table.splice(index, 0, row);
    }
  }
}

/**
 * Rehearse the drop-in for one slot, from whichever side of it the tree is on.
 *
 * `body` is called with the slot registered and `absent` with it not registered, in that
 * order, and the table is exactly as it was afterwards either way. The point of taking both
 * is that "adding the row makes the slot resolve" and "removing it makes the slot stop
 * resolving" are the same claim, and only one of the two is available per slot at a time.
 */
function bothSidesOf(
  trackId: string,
  present: () => void,
  absent: () => void,
): "landed" | "empty" {
  if (MUSIC_TRACKS.some((track) => track.id === trackId)) {
    present();
    withoutShippedTracks([trackId], absent);
    present();
    return "landed";
  }
  absent();
  withShippedTracks([trackId], present);
  absent();
  return "empty";
}

describe("the slot list is read from #515, not copied from it", () => {
  it("parsed a real document, both ways, and the two ways agree", () => {
    // THE FLOOR, first, because every comparison below is a set equality and two empty
    // sets are equal. A glob that resolved to nothing, or a heading format that moved,
    // would otherwise read as unanimous agreement.
    expect(docText.length).toBeGreaterThan(10_000);
    expect(docText).toContain("### The fifteen slots");
    // The glob resolved to THAT document and not to some other file, which is the one
    // thing a `?raw` glob can get wrong without anything else here noticing.
    expect(Object.keys(DOC)).toHaveLength(1);
    expect(Object.keys(DOC).every((key) => key.endsWith(PROMPTS_DOC))).toBe(true);
    expect(FROM_HEADINGS.length).toBeGreaterThanOrEqual(15);
    expect(FROM_TABLE.length).toBeGreaterThanOrEqual(15);
    expect(new Set(FROM_HEADINGS).size).toBe(FROM_HEADINGS.length);
    // THE WIDENED PREFIX, ASSERTED RATHER THAN ASSUMED. Both regexes above accept three
    // prefixes now, and a regex that had only been widened in one of them would still make
    // the two parses agree — on fourteen — while the code offered fifteen. Naming the
    // fifteenth in both parses is what makes the failure land here, on the parse, rather
    // than one assertion later where it reads as a code-side omission.
    expect(FROM_HEADINGS).toContain(CEREMONY_SLOT_TRACK_ID);
    expect(FROM_TABLE).toContain(CEREMONY_SLOT_TRACK_ID);

    // Two parses of one document. They can only disagree if the document itself has
    // grown a slot in one place and not the other, which is worth failing on.
    expect(sorted(FROM_HEADINGS)).toEqual(sorted(FROM_TABLE));
  });

  it("matches the ids the code derives, in both directions, over ten eras, four crises and one ceremony", () => {
    // THE COMPARISON THIS FILE IS FOR. Set equality both ways: a slot the document adds
    // and the code cannot express fails here, and so does an era or a crisis the code
    // gained that nobody wrote a prompt for.
    expect(sorted(FROM_CODE)).toEqual(sorted(FROM_HEADINGS));
    expect(FROM_CODE).toHaveLength(15);

    // The composition, not just the size, because a floor of fifteen is satisfied by
    // the wrong fifteen. Ten eras, four crises and one ceremony is the shape ruled.
    expect(FROM_CODE.filter((id) => id.startsWith("era-"))).toHaveLength(10);
    expect(FROM_CODE.filter((id) => id.startsWith("crisis-"))).toHaveLength(4);
    expect(FROM_CODE.filter((id) => id.startsWith("ceremony-"))).toHaveLength(1);
    expect(ERA_SEQUENCE.length).toBe(10);
    expect(CRISIS_ERAS.length).toBe(4);
  });

  it("keeps the ceremony out of the derived families, so it cannot be read as an eleventh era", () => {
    // The id is a CONSTANT rather than a derivation, and the reason is that there is one of
    // it. So the thing that can go wrong is the opposite of a missing derivation: a name
    // that LOOKS derived. `era-advance` would have satisfied the fourteen-slot regexes, sat
    // inside the era family, and collided with the sound effect of the same name.
    expect(CEREMONY_SLOT_TRACK_ID.startsWith("era-")).toBe(false);
    expect(CEREMONY_SLOT_TRACK_ID.startsWith("crisis-")).toBe(false);
    // And no era's or crisis's derived id could ever produce it, over the real populations.
    const derived = new Set([
      ...ERA_SEQUENCE.map((era) => eraSlotTrackId(era.id)),
      ...ERA_SEQUENCE.map((era) => crisisSlotTrackId(era.id)),
    ]);
    expect(derived.has(CEREMONY_SLOT_TRACK_ID)).toBe(false);
    expect(derived.size).toBe(20);
  });
});

describe("the registry can only name a slot that exists", () => {
  it("has no era or crisis row pointing at an id no slot resolves to", () => {
    // The drop-in's own failure mode: a row added as `era-atomic` rather than
    // `era-atomic_age` ships a file nothing ever asks for, the slot goes on standing in,
    // and no other test in the tree notices. This is the one that does.
    const known = new Set(FROM_CODE);
    for (const row of slotRows()) {
      expect(known.has(row.id), `${row.id} is not one of the fifteen slots`).toBe(true);
      expect(row.file, `${row.id} has no asset path`).toMatch(/^music\/.+/);
    }
    // THE FLOOR, which this file was written without because the registry then held no slot
    // rows at all and the sweep above was unanimous over an empty set. It holds fifteen now
    // — the fourteen plus the ceremony bed, which landed 2026-08-05 — so the denominator is
    // worth asserting: a parse or a filter that stopped matching would otherwise read as
    // fifteen correctly-named rows.
    expect(slotRows()).toHaveLength(15);
    expect(slotRows().map((row) => row.id)).toContain("era-atomic_age");
    expect(slotRows().map((row) => row.id)).toContain(CEREMONY_SLOT_TRACK_ID);

    // THE DETECTOR, in the same run: the sweep above is satisfied by a registry with no
    // slot rows in it at all, which is the state this file was written in. A misspelling has
    // to be caught, so one is injected and the same predicate is required to reject it — and
    // to reject ONLY it, which is what says the fourteen real rows are not being swept up.
    withShippedTracks(["era-atomic"], () => {
      const misspelled = slotRows().filter((row) => !known.has(row.id));
      expect(misspelled.map((row) => row.id)).toEqual(["era-atomic"]);
      expect(slotRows()).toHaveLength(16);
    });
  });

  it("picks up any one of the fifteen from a single registry row, and only that one", () => {
    // **THE DROP-IN, REHEARSED ON ALL FIFTEEN, FROM WHICHEVER SIDE OF IT EACH SLOT IS ON.**
    // The claim the pipeline rests on is that landing a track is one line here and a file in
    // `public/audio/music/`. ALL fifteen have now landed, so every one is rehearsed the same
    // way: the REVERSE — withdraw the row and the slot stops resolving to it — which is the
    // stronger reading anyway, because a row that ships and a row that is load-bearing look
    // identical until one is taken away. The ceremony bed was the last one rehearsed by
    // ADDING instead, and it moved sides on 2026-08-05 when its take landed.
    const sides: Record<string, "landed" | "empty"> = {};

    for (const eraId of ERA_SEQUENCE.map((era) => era.id)) {
      const slot = eraSlotTrackId(eraId);
      sides[slot] = bothSidesOf(
        slot,
        () => {
          expect(trackIdForScene(eraScene(eraId)), slot).toBe(slot);
        },
        () => {
          expect(trackIdForScene(eraScene(eraId)), slot).not.toBe(slot);
        },
      );
    }

    for (const eraId of CRISIS_ERAS) {
      const slot = crisisSlotTrackId(eraId);
      const scene = { eraId, crisisEraId: eraId, ceremony: null } as const;
      sides[slot] = bothSidesOf(
        slot,
        () => {
          expect(trackIdForScene(scene), slot).toBe(slot);
          // The era's own music is untouched by its crisis track, which is what makes the
          // two dimensions independent rather than one lever with two names.
          expect(trackIdForScene(eraScene(eraId))).not.toBe(slot);
        },
        () => {
          expect(trackIdForScene(scene), slot).not.toBe(slot);
        },
      );
    }

    // THE FIFTEENTH, rehearsed at every era rather than at one, because there is one cue
    // for all ten advances and "it works at era one" is the claim a single case would make.
    for (const eraId of ERA_SEQUENCE.map((era) => era.id)) {
      const scene = { eraId, crisisEraId: null, ceremony: { eraId } } as const;
      sides[CEREMONY_SLOT_TRACK_ID] = bothSidesOf(
        CEREMONY_SLOT_TRACK_ID,
        () => {
          expect(trackIdForScene(scene), eraId).toBe(CEREMONY_SLOT_TRACK_ID);
          // And only while a ceremony is running: the ordinary city is untouched.
          expect(trackIdForScene(eraScene(eraId))).not.toBe(CEREMONY_SLOT_TRACK_ID);
        },
        () => {
          expect(trackIdForScene(scene), eraId).not.toBe(CEREMONY_SLOT_TRACK_ID);
        },
      );
    }

    // **WHICH SIDE EACH SLOT WAS REHEARSED FROM, ASSERTED RATHER THAN LEFT TO THE RUN.**
    // Without this the loops above are satisfied by a tree in any state, including the one
    // that would now be a defect: any slot reading "empty", which for the fourteen means a
    // take that never landed and for `ceremony-advance` means the row was removed again.
    // All fifteen landed is the shipped state as of 2026-08-05 and the only correct one;
    // this assertion read `landed 14 / empty [ceremony-advance]` before that.
    expect(Object.keys(sides).sort()).toEqual(sorted(FROM_CODE));
    const landed = Object.keys(sides).filter((id) => sides[id] === "landed");
    const empty = Object.keys(sides).filter((id) => sides[id] === "empty");
    expect(landed).toHaveLength(15);
    expect(landed).toContain(CEREMONY_SLOT_TRACK_ID);
    expect(empty).toEqual([]);
    expect(FROM_CODE).toHaveLength(15);
  });
});
