import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE ERA-TRANSITION BED HAS NOT BEEN GENERATED, AND THE TREE AND THE RECORD HAVE TO SAY
 * THE SAME THING ABOUT THAT.**
 *
 * The lead reinstated the dedicated era-to-era transition track after cancelling it:
 * *"there should be [a specific era transition song] for the era-to-era transitions for
 * better feel."* The slot survived the cancellation — #605 was closed unmerged — so the code
 * is ready and `apps/web/src/audio/eraToEraTransitionTrack.test.ts` pins the selection at all
 * nine seams. **The asset is the whole of what is missing**, and that is the fact this file
 * keeps honest.
 *
 * ## WHY A GUARD AND NOT A NOTE
 *
 * "The audio still needs generating" is exactly the kind of statement that is true when it is
 * written and silently false three merges later, in either direction:
 *
 *  - the bed lands and the runbook goes on telling the next reader to generate it, so it gets
 *    generated twice and one take is thrown away;
 *  - the paragraph is deleted in a merge and the missing asset stops being visible anywhere,
 *    which is how a slot ships permanently standing in on somebody else's music.
 *
 * The `#191` shape is the one to avoid here: a claim that certifies itself. So neither side
 * is written down. The registry is read for a row, the audio directory is read for a file,
 * and the runbook is read for its marker; the assertion is that all three agree.
 *
 * ## THE TWO STATES, EACH FAILING INTO THE OTHER
 *
 * **UNACQUIRED** — no registry row. Then there must be no audio file either (a committed file
 * with no row is a track nothing will ever play, which is how the fourteen sat inert once),
 * the runbook must still carry the marker, and §I of the prompt sheet must still carry a
 * prompt substantial enough to generate from.
 *
 * **ACQUIRED** — a registry row. Then the file it names must exist, `CREDITS.md` must carry
 * its provenance row, and the marker must be **gone**, so the record cannot go on describing
 * a gap that has closed.
 *
 * Each direction was watched fail before this file was trusted; the injections are named in
 * the commit that added it.
 */

const repo = resolveRepoRoot();

function read(relative: string): string {
  return readFileSync(posix.join(repo, relative), "utf8");
}

const ERA_MUSIC_PATH = "apps/web/src/audio/eraMusic.ts";
const REGISTRY_PATH = "apps/web/src/audio/musicRegistry.ts";
const RUNBOOK_PATH = "docs/superpowers/specs/2026-08-04-music-pipeline.md";
const PROMPTS_PATH =
  "docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md";
const CREDITS_PATH = "apps/web/public/audio/CREDITS.md";
const MUSIC_DIR = "apps/web/public/audio/music";

const eraMusic = read(ERA_MUSIC_PATH);

/**
 * `text` with JSDoc leaders and line wrapping taken out, so a sentence can be matched as the
 * sentence it is rather than as whatever shape the 96-column wrap happened to give it.
 *
 * This is the `#187` failure mode avoided rather than described: a prose assertion written
 * against an unwrapped quote matches nothing the moment the paragraph reflows, and it fails
 * green — the sentence is there, the guard cannot see it, and nobody finds out until the
 * sentence is deleted and the guard still passes.
 */
function flattened(text: string): string {
  return text
    .replace(/^[ \t]*\*[ \t]?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

const eraMusicProse = flattened(eraMusic);
const registry = read(REGISTRY_PATH);
const runbook = read(RUNBOOK_PATH);
const prompts = read(PROMPTS_PATH);
const credits = read(CREDITS_PATH);

/**
 * The bed's slot id as the CODE declares it, parsed rather than written down here.
 *
 * A tree that has dropped the constant fails at collection with this message rather than
 * passing over an id nothing uses, which is the first thing #605's removal does.
 */
const SLOT_ID = (() => {
  const found = /CEREMONY_SLOT_TRACK_ID = "([^"]+)"/.exec(eraMusic);
  if (found === null) {
    throw new Error(
      `${ERA_MUSIC_PATH} no longer declares CEREMONY_SLOT_TRACK_ID as a string literal. ` +
        "The lead reinstated the dedicated era-to-era transition track after cancelling " +
        "it, so removing the slot again is a product decision and not a cleanup.",
    );
  }
  return found[1] as string;
})();

/** The registry row for the bed, if one has been landed. */
const registryRow = new RegExp(`id:\\s*"${SLOT_ID}"`).test(registry);

/** Every music file on disk, by basename with the container extension dropped. */
const musicFiles = readdirSync(posix.join(repo, MUSIC_DIR));
const musicSlotsOnDisk = musicFiles.map((name) => name.replace(/\.[^.]+$/, ""));

/** The runbook's marker, keyed off the code's own id so it cannot drift from the slot. */
const MARKER = new RegExp(`\\*\\*STILL TO GENERATE: \`${SLOT_ID}\`\\.\\*\\*`);

describe("the era-transition bed's ledger", () => {
  it("read five real files and a real audio directory", () => {
    // The floor, before anything is compared. Five reads that returned nothing would make
    // every assertion below pass over empty strings, and an empty directory listing would
    // make the file checks unanimous over nothing.
    expect(eraMusic.length).toBeGreaterThan(5_000);
    expect(registry.length).toBeGreaterThan(1_000);
    expect(runbook.length).toBeGreaterThan(5_000);
    expect(prompts.length).toBeGreaterThan(10_000);
    expect(credits.length).toBeGreaterThan(5_000);
    expect(musicFiles.length).toBeGreaterThanOrEqual(15);
    expect(SLOT_ID.startsWith("ceremony-")).toBe(true);
  });

  it("keeps a §I prompt substantial enough to generate the bed from", () => {
    // Whichever state the tree is in, the prompt is what the take was or will be generated
    // against, and #605 deleted it along with the slot. A heading alone is not enough: the
    // block under it is the deliverable, so its length is the assertion.
    const heading = `### \`${SLOT_ID}\``;
    expect(prompts).toContain(heading);
    const block = prompts.slice(prompts.indexOf(heading));
    const nextHeading = block.indexOf("\n### ", 1);
    const section = nextHeading === -1 ? block : block.slice(0, nextHeading);
    expect(section.length).toBeGreaterThan(2_000);
    // The re-length correction the lead forced: a bed that wraps, not a cue that resolves.
    expect(section).toContain("LOOPS");
    expect(section).toContain("NO ENDING AND NO RESOLUTION");
  });

  it("says the same thing in the registry, on disk and in the runbook", () => {
    if (registryRow) {
      // ACQUIRED. The row must name a file that is really there, the provenance rule must
      // have been satisfied, and the runbook must have stopped asking for it.
      const file = new RegExp(`file:\\s*"music/(${SLOT_ID}\\.[^"]+)"`).exec(registry);
      expect(
        file,
        `${REGISTRY_PATH} registers ${SLOT_ID} without a music/ file path`,
      ).not.toBeNull();
      const name = file?.[1] as string;
      expect(
        musicFiles,
        `${MUSIC_DIR} is missing the file the registry row names`,
      ).toContain(name);
      expect(credits, `${CREDITS_PATH} has no provenance row for ${name}`).toContain(name);
      expect(
        MARKER.test(runbook),
        `${RUNBOOK_PATH} still asks for ${SLOT_ID}, which has landed. Retire the marker.`,
      ).toBe(false);
      return;
    }

    // UNACQUIRED, which is the state as this file is written. Three statements, and the tree
    // is what makes each of them true rather than this file's opinion.
    expect(
      musicSlotsOnDisk,
      `${MUSIC_DIR} holds a ${SLOT_ID} take that ${REGISTRY_PATH} never registered, so ` +
        "nothing will ever play it. Add the row.",
    ).not.toContain(SLOT_ID);
    expect(
      MARKER.test(runbook),
      `${RUNBOOK_PATH} has lost the "STILL TO GENERATE: ${SLOT_ID}" marker while the bed ` +
        "is still unacquired, so the one asset the lead asked for by name is now recorded " +
        "nowhere a reader would look.",
    ).toBe(true);
    // And the runbook says what a learner hears meanwhile, so the placeholder is never
    // mistaken for the feature.
    expect(runbook).toContain("OUTGOING era's own");
  });

  it("records that the cancellation was reversed, where the next reader of the slot is", () => {
    // #605 is closed and closed PRs are not read. The reversal has to live in the module
    // whose deletion it forbids, so the argument arrives with the code rather than with
    // whoever remembers the thread. Matched against the flattened prose, because the quote
    // is wrapped across four lines in the source and a literal match would fail green.
    expect(eraMusicProse).toContain("take back what i said");
    expect(eraMusicProse).toContain("there should be for the era-to-era transitions");
    expect(eraMusicProse).toContain("for better feel");
  });
});
