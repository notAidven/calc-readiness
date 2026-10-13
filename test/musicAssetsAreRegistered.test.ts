import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **A FILE IN `public/audio/music/` WITH NO REGISTRY ROW IS A TRACK NOTHING WILL EVER
 * PLAY, AND NOTHING ELSE IN THE TREE FAILED ON IT.**
 *
 * That is not a hypothetical shape. It is the state the fourteen generated tracks were
 * committed in: converted, normalised, committed, and inert, because `MUSIC_TRACKS` had no
 * rows for them. Every audio guard in the tree was green over it — `musicSlots.test.ts`
 * compared the registry's slot rows against the prompts document and a registry with **no**
 * slot rows satisfies that vacuously, and `music.test.ts` checked the fields of the rows
 * that existed. The one thing nobody was comparing was **the registry against the
 * directory**, so this file does that, in both directions.
 *
 * `apps/web/src/audio/landedTracksPlay.test.ts` is the other half and they are different
 * claims: that file proves the URL a scene resolves to names a file that is there, and this
 * one proves the directory and the registry are the same set. A row nothing reaches passes
 * this and fails that; a file nobody registered fails this and cannot be seen by that.
 *
 * ## Why here and not beside the module
 *
 * The subject is the tracked file list plus what is written in a source file, which is what
 * `test/` is for and why this project is the one with `types: ["node"]`. `apps/web`'s suite
 * has no node types, so it cannot `stat` anything; it can see the directory through
 * `import.meta.glob` but not the size of what is in it.
 *
 * The registry is read as TEXT rather than imported, for the same reason
 * `musicSlotMirrors.test.ts` reads `eraMusic.ts` as text: `test/tsconfig.json` references
 * five packages and deliberately not `apps/web`, so importing across that boundary would
 * not typecheck. The parse is floored and its own output is asserted, because a regex that
 * matched nothing would make every comparison below unanimous over an empty set.
 *
 * ## THE DURATION IS DERIVED FROM THE FILE, not from the conversion script's report
 *
 * For an Ogg stream that costs no decoder: the last page's **granule position** is the
 * total sample count, so `granule / 48000` is the exact length in seconds. That is a real
 * measurement of the committed bytes and it is what `seconds` is checked against. The two
 * house tracks are MP3 and have no equivalent, so they get the weaker cross-check the
 * generated rows also get: bytes per second has to land in the band a ~128 kbps stream
 * occupies, which is what catches a `seconds` value copied from the wrong row.
 */

const repo = resolveRepoRoot();
const MUSIC_DIR = "apps/web/public/audio/music";
const REGISTRY = "apps/web/src/audio/musicRegistry.ts";
const CREDITS = "apps/web/public/audio/CREDITS.md";
const PROMPTS =
  "docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md";

function read(relative: string): string {
  return readFileSync(posix.join(repo, relative), "utf8");
}

/**
 * COMMITTED files only, and that is the load-bearing choice rather than a convenience.
 *
 * A `readdir` would also find an untracked download sitting in the working tree, and this
 * guard would then demand a registry row for a file that does not ship. `git ls-files` is
 * what keeps a take that is mid-audition out of the comparison.
 */
function trackedMusicFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", MUSIC_DIR], {
    cwd: repo,
    encoding: "utf8",
  })
    .split("\0")
    .filter((path) => path.length > 0);
}

interface Row {
  readonly id: string;
  readonly file: string;
  readonly seconds: number;
  readonly bytes: number;
}

/**
 * The `MUSIC_TRACKS` array literal with its comments removed.
 *
 * BOTH steps are needed and the first was found by the second failing. The file's own
 * docblock shows the row format as an example, complete with `seconds: 0, bytes: 0`, so a
 * parse over the whole source finds a seventeenth `era-neolithic` row whose file is zero
 * bytes long. Narrowing to the array removes it; stripping block comments removes the
 * section separators inside the array. Only BLOCK comments are stripped, because a line
 * comment cannot be told from the `//` in an `https://` source URL without a real parser.
 */
function trackTable(): string {
  const source = read(REGISTRY);
  const opens = source.indexOf("export const MUSIC_TRACKS");
  const start = source.indexOf("= [", opens);
  const end = source.indexOf("\n];", start);
  if (opens === -1 || start === -1 || end === -1) {
    throw new Error(`${REGISTRY} no longer declares MUSIC_TRACKS as an array literal`);
  }
  return source.slice(start, end).replaceAll(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * The rows of `MUSIC_TRACKS`, parsed out of the source.
 *
 * Deliberately requires all four fields in the order the file writes them, so a row that
 * has lost one is a row this parse does not see — which the count floor below then catches,
 * rather than the field silently defaulting to something that passes.
 */
function registryRows(): Row[] {
  const pattern =
    /id:\s*"([^"]+)",[\s\S]{0,900}?file:\s*"([^"]+)",[\s\S]{0,900}?seconds:\s*([\d_]+),\s*bytes:\s*([\d_]+),/g;
  return [...trackTable().matchAll(pattern)].map((match) => ({
    id: match[1] as string,
    file: match[2] as string,
    seconds: Number((match[3] as string).replaceAll("_", "")),
    bytes: Number((match[4] as string).replaceAll("_", "")),
  }));
}

/**
 * The total sample count an Ogg stream declares, from the granule position of its LAST
 * page.
 *
 * An Ogg page begins with the capture pattern `OggS`; bytes 6 to 13 of the header are the
 * granule position, little-endian, which for a Vorbis stream counts PCM samples. The last
 * page therefore carries the stream's length. Searched backwards from the end of the file
 * over the final 64 KB, which is far more than one page.
 */
function oggSampleCount(absolutePath: string): number {
  const size = statSync(absolutePath).size;
  const window = Math.min(size, 64 * 1024);
  const buffer = readFileSync(absolutePath).subarray(size - window);
  const capture = buffer.lastIndexOf("OggS", buffer.length, "latin1");
  if (capture === -1) {
    throw new Error(`${absolutePath} has no Ogg page in its last ${window} bytes`);
  }
  return Number(buffer.readBigUInt64LE(capture + 6));
}

/** What `loudnorm` was told to resample to, and what the granule is therefore counted in. */
const SAMPLE_RATE = 48_000;

/** The band a ~128 kbps VBR stream occupies, in bytes per second. */
const BYTES_PER_SECOND = { floor: 9_000, ceiling: 22_000 } as const;

/**
 * The day the fourteen were generated, which with the plan is the entire basis of their
 * licence. Written here so the two files that must agree on it are compared against each
 * other rather than each against its own copy.
 */
const GENERATED_ON = "2026-08-04";

/** The day the ceremony bed was generated, one after the batch of fourteen. */
const CEREMONY_GENERATED_ON = "2026-08-05";

/**
 * **EVERY GENERATION DATE THE REGISTRY IS ALLOWED TO NAME, as a set rather than a count.**
 *
 * This used to be a single date and `new Set(dates).size === 1`. That assertion was a proxy
 * for the real property — the registry and `CREDITS.md` must not drift apart about when a
 * file was made — and the proxy held only because there had been exactly one generation
 * batch. `ceremony-advance` was generated a day later and needs its own licence constant
 * (the registry's own rule: a different day *"needs its own string, not an edit to this
 * one"*), so a size-one assertion would now force the wrong fix, which is re-dating fourteen
 * files whose licence basis depends on that date.
 *
 * Widened to a set equality rather than to a bare floor, because a floor constrains size and
 * not shape: `>= 1` is satisfied by any date at all, including a typo, and `>= 2` by any two.
 * A set equality fails in both directions — a third date nobody recorded in `CREDITS.md`,
 * and a date that quietly disappears when a licence constant is deleted.
 */
const GENERATION_DATES: readonly string[] = [GENERATED_ON, CEREMONY_GENERATED_ON];

/** The era-to-era transition bed, whose take landed 2026-08-05. */
const CEREMONY_SLOT = "ceremony-advance";

describe("every music file that ships has a registry row, and vice versa", () => {
  it("parsed a real registry and listed a real directory", () => {
    // THE FLOORS, first. Both comparisons below are set equalities, and two empty sets are
    // equal: a regex that stopped matching or a `git ls-files` that returned nothing would
    // otherwise read as perfect agreement.
    const rows = registryRows();
    const files = trackedMusicFiles();
    expect(rows.length, "the registry parse matched no rows").toBeGreaterThanOrEqual(16);
    expect(files.length, "the music directory listed no files").toBeGreaterThanOrEqual(16);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    // And the parse read the fields it claims to read, on a row whose values are known.
    const house = rows.find((row) => row.id === "town-theme");
    expect(house).toEqual({
      id: "town-theme",
      file: "music/town-theme.mp3",
      seconds: 97,
      bytes: 1_316_581,
    });
  });

  it("agrees with the directory in BOTH directions", () => {
    // The defect this file exists for, stated as a set equality. A file committed with no
    // row is inert; a row pointing at a file that is not there is silence at the player.
    const fromRegistry = registryRows().map(
      (row) => `${MUSIC_DIR}/${row.file.slice("music/".length)}`,
    );
    expect([...fromRegistry].sort()).toEqual([...trackedMusicFiles()].sort());
    // Named rather than only counted, because sixteen is satisfied by sixteen of anything:
    // the two house tracks and one slot from each dimension have to be present by name.
    expect(fromRegistry).toContain(`${MUSIC_DIR}/town-theme.mp3`);
    expect(fromRegistry).toContain(`${MUSIC_DIR}/era-prehistoric.ogg`);
    expect(fromRegistry).toContain(`${MUSIC_DIR}/crisis-prehistoric.ogg`);
    expect(fromRegistry).toContain(`${MUSIC_DIR}/${CEREMONY_SLOT}.ogg`);
    expect(fromRegistry.filter((path) => path.endsWith(".ogg"))).toHaveLength(15);
  });

  it("has BOTH a row and a file for the ceremony bed, which is the live risk now", () => {
    // **THIS ASSERTION USED TO POINT THE OTHER WAY, AND THE WORLD MOVED UNDER IT.** Until
    // 2026-08-05 the bed had never been generated, so the defect worth guarding was somebody
    // closing the arithmetic gap by pointing the slot at one of the fourteen, and this case
    // required the row and the file to be ABSENT. The take now exists, so that assertion
    // would fail on the shipped tree and the risk it was written for is gone.
    //
    // The risk that replaced it is the opposite one and it is not hypothetical: two open
    // slot-removing branches predate the take (#607 and #609), each written against a tree
    // where re-emptying this slot was the correct thing to do. Either one merged carelessly
    // silently returns an advance to the OUTGOING era's ambient track, which is the exact
    // arrangement the lead reversed his own cancellation to fix. So the case is inverted
    // rather than deleted: the bed's row and the bed's file both have to be here.
    //
    // Kept in this file, next to the set equality, because that equality is satisfied by a
    // registry and a directory that have BOTH dropped the bed — agreeing with each other
    // about the wrong world is exactly how it would go quiet.
    expect(
      registryRows().map((row) => row.id),
      `${REGISTRY} has lost the ${CEREMONY_SLOT} row, so an era advance is back on the ` +
        "outgoing era's own ambient track. The lead reversed the cancellation of this " +
        "slot; removing it is a product decision, not a cleanup.",
    ).toContain(CEREMONY_SLOT);
    expect(
      trackedMusicFiles().map((path) => path.slice(`${MUSIC_DIR}/`.length)),
      `${MUSIC_DIR}/${CEREMONY_SLOT}.ogg is no longer committed`,
    ).toContain(`${CEREMONY_SLOT}.ogg`);
    // And it is a take of its OWN, not one of the fourteen re-pointed to close the gap,
    // which was the original defect and is still available to anybody deleting the file.
    const bed = registryRows().find((row) => row.id === CEREMONY_SLOT);
    expect(bed?.file).toBe(`music/${CEREMONY_SLOT}.ogg`);
    const otherFiles = registryRows()
      .filter((row) => row.id !== CEREMONY_SLOT)
      .map((row) => row.file);
    expect(otherFiles).not.toContain(bed?.file);
    expect(otherFiles.length).toBeGreaterThanOrEqual(16);
  });

  it("declares the byte count the file actually has", () => {
    // Exact, not approximate. `bytes` is what `CREDITS.md`'s size column and its download
    // arithmetic are both built on, and a re-converted file that kept its old row is the
    // way that arithmetic goes quietly wrong.
    let checked = 0;
    for (const row of registryRows()) {
      const path = posix.join(repo, MUSIC_DIR, row.file.slice("music/".length));
      expect(statSync(path).size, `${row.id} declares the wrong size`).toBe(row.bytes);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(16);
  });

  it("declares the duration the file actually has, measured from the Ogg granule", () => {
    // The fourteen generated tracks are Ogg Vorbis, so their length is readable exactly
    // from the container with no decoder. Rounded to the nearest second, which is what the
    // conversion script writes and what the registry stores.
    let measured = 0;
    for (const row of registryRows()) {
      if (!row.file.endsWith(".ogg")) {
        continue;
      }
      const path = posix.join(repo, MUSIC_DIR, row.file.slice("music/".length));
      const seconds = oggSampleCount(path) / SAMPLE_RATE;
      expect(Math.round(seconds), `${row.id} declares the wrong duration`).toBe(
        row.seconds,
      );
      measured += 1;
    }
    // The floor, because a `continue` that skipped everything would pass this silently.
    expect(measured).toBe(15);
  });

  it("keeps seconds and bytes consistent, which is what catches a value from another row", () => {
    // The cross-check the two MP3 house tracks can also take. Swapping any two of the
    // fourteen `seconds` values puts at least one row outside this band, so a copy-paste
    // between rows cannot pass both this and the granule check above.
    let judged = 0;
    for (const row of registryRows()) {
      const rate = row.bytes / row.seconds;
      expect(rate, `${row.id} is ${Math.round(rate)} bytes per second`).toBeGreaterThan(
        BYTES_PER_SECOND.floor,
      );
      expect(rate, `${row.id} is ${Math.round(rate)} bytes per second`).toBeLessThan(
        BYTES_PER_SECOND.ceiling,
      );
      judged += 1;
    }
    expect(judged).toBeGreaterThanOrEqual(16);
  });
});

/**
 * **WHAT WAS ASKED FOR AND WHAT CAME BACK, AT EVERY SLOT, WITH THE FOUR THAT MISSED NAMED.**
 *
 * The prompt sheet gives every slot a length window, and four of the fourteen takes came back
 * outside theirs. That is a fact worth keeping visible rather than either hiding or fixing by
 * hand: whether to re-generate is the lead's call, and the four are outside by 6 to 33 seconds
 * with the three long ones long in the direction the runbook prefers.
 *
 * **A quietly-omitted slot and a slot that missed its window look identical from outside a
 * guard**, which is why the four are a NAMED list with their reasons rather than a widened
 * band, and why the list is asserted in both directions:
 *
 *  - a listed slot that comes back INSIDE its window fails, so a re-generated take cannot
 *    leave a stale excuse sitting here excusing nothing;
 *  - an unlisted slot that comes back OUTSIDE its window fails, so the list cannot stop
 *    describing the population it is for.
 *
 * The windows are parsed from the sheet rather than copied: era slots from the `Length:` line
 * inside each slot's own `###` block in §C, and all four crises from §D's single shared line,
 * because the crisis blocks in §E state no length of their own.
 */
describe("the fourteen takes against the length windows the prompts asked for", () => {
  const prompts = read(PROMPTS);

  /** The `### `slot`` block, up to the next heading of any level. */
  function blockFor(slot: string): string {
    const heading = `### \`${slot}\``;
    const start = prompts.indexOf(heading);
    if (start === -1) {
      throw new Error(`${PROMPTS} has no ${heading} heading`);
    }
    const rest = prompts.slice(start + heading.length);
    const nextHeading = rest.search(/\n#{2,3} /);
    return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  }

  /** `## §D` up to `## §E`: the block every crisis slot pastes first. */
  function crisisSharedBlock(): string {
    const start = prompts.indexOf("## §D.");
    const end = prompts.indexOf("## §E.", start + 1);
    if (start === -1 || end <= start) {
      throw new Error(`${PROMPTS} no longer has a §D before its §E`);
    }
    return prompts.slice(start, end);
  }

  /** The `Length: A-B seconds` line in `text`, as a pair. */
  function windowIn(text: string, where: string): readonly [number, number] {
    const found = /^Length: (\d+)-(\d+) seconds/m.exec(text);
    if (found === null) {
      throw new Error(`${where} states no "Length: A-B seconds" window`);
    }
    return [Number(found[1]), Number(found[2])];
  }

  const CRISIS_SLOTS = ["prehistoric", "classical", "renaissance", "information_age"].map(
    (eraId) => `crisis-${eraId}`,
  );

  /** Every slot's window, keyed by slot id, from the sheet's own two shapes. */
  const WINDOWS: ReadonlyMap<string, readonly [number, number]> = new Map([
    ...registryRows()
      .filter((row) => row.id.startsWith("era-"))
      .map(
        (row) =>
          [
            row.id,
            windowIn(blockFor(row.id), `§C's ${row.id} block`),
          ] as const satisfies readonly [string, readonly [number, number]],
      ),
    ...CRISIS_SLOTS.map(
      (slot) =>
        [
          slot,
          windowIn(crisisSharedBlock(), "§D's shared block"),
        ] as const satisfies readonly [string, readonly [number, number]],
    ),
  ]);

  /**
   * **THE FOUR TAKES THAT CAME BACK OUTSIDE THEIR WINDOW, each with its reason.**
   *
   * Not a widened band, because a band wide enough to admit these four would stop measuring
   * anything: `era-industrial` is 33 s over a 160 s ceiling, so admitting it means admitting
   * 120% of any window. Named instead, and asserted both ways below.
   */
  const OUTSIDE_ITS_WINDOW: Readonly<Record<string, string>> = {
    "era-classical":
      "114 s against 120-200, so 6 s short of a window whose own text says to take the " +
      "top of it. The shortest loop of the fourteen, so era four repeats most often.",
    "era-industrial": "193 s against 90-160, so 33 s over. Long, which repeats less.",
    "era-atomic_age": "198 s against 100-180, so 18 s over. Long, which repeats less.",
    "era-cyberpunk": "215 s against 120-200, so 15 s over. Long, which repeats less.",
  };

  it("parsed a real sheet and found a window for all fourteen", () => {
    // The floor, because every comparison below is over `WINDOWS` and an empty map would
    // make each of them unanimous over nothing.
    expect(prompts.length).toBeGreaterThan(10_000);
    expect(WINDOWS.size).toBe(14);
    // The two parse shapes both really fired: ten from §C's own blocks and four from §D's
    // shared one. A single shape that matched everything would hide a slot whose block lost
    // its length line.
    expect([...WINDOWS.keys()].filter((id) => id.startsWith("era-"))).toHaveLength(10);
    expect([...WINDOWS.keys()].filter((id) => id.startsWith("crisis-"))).toHaveLength(4);
    // And the windows are real ranges rather than a regex matching itself.
    for (const [slot, [low, high]] of WINDOWS) {
      expect(low, slot).toBeGreaterThanOrEqual(90);
      expect(high, slot).toBeGreaterThan(low);
    }
    // §B's absolute floor, which every take clears whatever its own window says.
    const floor = /LENGTH\. Never under (\d+) seconds/.exec(prompts);
    expect(floor).not.toBeNull();
    for (const row of registryRows().filter((r) => r.file.endsWith(".ogg"))) {
      expect(row.seconds, `${row.id} is under the absolute floor`).toBeGreaterThanOrEqual(
        Number(floor?.[1]),
      );
    }
  });

  it("has every take inside its window except the four named, and those four outside it", () => {
    const rows = registryRows().filter((row) => WINDOWS.has(row.id));
    expect(rows).toHaveLength(14);
    const inside: string[] = [];
    const outside: string[] = [];
    for (const row of rows) {
      const [low, high] = WINDOWS.get(row.id) as readonly [number, number];
      (row.seconds >= low && row.seconds <= high ? inside : outside).push(row.id);
    }

    // BOTH DIRECTIONS AT ONCE, as a set equality: a listed slot that has come back inside
    // its window fails here (its excuse now excuses nothing), and an unlisted slot that has
    // drifted outside fails here too (the list has stopped describing the population).
    expect([...outside].sort()).toEqual(Object.keys(OUTSIDE_ITS_WINDOW).sort());
    // The floor under that equality, because two empty sets are equal: ten takes really are
    // inside, so the list is not excusing the whole population.
    expect(inside).toHaveLength(10);
    expect(inside).toContain("crisis-prehistoric");
    // Every excuse names a slot that still exists and still has a window, so a renamed or
    // deleted entry cannot sit here forever.
    for (const [slot, reason] of Object.entries(OUTSIDE_ITS_WINDOW)) {
      expect(WINDOWS.has(slot), `${slot} is excused but has no window`).toBe(true);
      expect(reason.length, slot).toBeGreaterThan(30);
    }
    // And `CREDITS.md` says the same four, so the record a human reads cannot drift off the
    // one a test reads.
    const credits = read(CREDITS);
    for (const slot of Object.keys(OUTSIDE_ITS_WINDOW)) {
      expect(credits, `${slot} is not named in CREDITS.md's window table`).toContain(
        `| \`${slot}\` |`,
      );
    }
    expect(credits).toContain("Four lengths are outside their slot's window");
  });
});

/**
 * **THE PROVENANCE RULE, AS AN ASSERTION.** `CREDITS.md`'s own first paragraph says
 * *"Nothing goes in `public/audio/` without a row in this file"*, and until now that was a
 * rule a human enforced. Fourteen files arriving at once is exactly the change that would
 * have got one of them missed.
 *
 * **A GENERATED TRACK'S PROVENANCE IS TWO FACTS AND NEITHER IS IN THE FILE.** Every CC0
 * asset here can be re-verified from its own asset page for as long as that page exists. A
 * Suno generation cannot: the plan that was active and the day it was made are recoverable
 * from nothing but the account holder's memory, and they are the entire basis of the right
 * to ship it. So they are asserted like any other load-bearing fact, in both files, and
 * required to agree.
 */
describe("every music file that ships has a CREDITS row too", () => {
  it("names every committed file in the credits table", () => {
    const credits = read(CREDITS);
    expect(credits.length).toBeGreaterThan(5_000);
    expect(credits).toContain(
      "Nothing goes in `public/audio/` without a row in this file.",
    );
    const files = trackedMusicFiles();
    for (const path of files) {
      const name = path.slice(`${MUSIC_DIR}/`.length);
      // The filename in a table cell, as that file's own row spells it.
      expect(credits, `${name} has no row in CREDITS.md`).toContain(`| \`${name}\` |`);
    }
    expect(files.length).toBeGreaterThanOrEqual(16);
  });

  it("records the plan AND the date, which are the whole basis of the licence", () => {
    // Both, not one. The grant is scoped to output generated *while* subscribed, so the plan
    // without the date establishes nothing: it cannot say whether these fourteen predate the
    // subscription that covers them. The plan is also the recoverable half, since which plan
    // an account is on is answerable at any time, whereas which plan was live on a given day
    // is not readable from the file or from a later billing page.
    const credits = read(CREDITS);
    expect(credits).toMatch(/Suno Pro/);
    // Both batches, because the ceremony bed's date is the one a reader would otherwise
    // have to take from the registry alone.
    for (const date of GENERATION_DATES) {
      expect(credits, `${CREDITS} does not name the ${date} generation`).toContain(date);
    }
    // A credits file that merely named the plan and the date would still leave the two
    // properties a future generator has to know, so both are required to be present.
    expect(credits, "the survives-cancellation fact").toMatch(/survives? cancellation/i);
    expect(credits, "the not-retroactive warning").toMatch(
      /not retroactive|retroactively/i,
    );
    expect(credits, "the no-indemnification note").toMatch(/no indemnification/i);
    // And that attribution is stated NOT to be required, so the rows above cannot be read as
    // discharging an obligation that does not exist.
    expect(credits).toMatch(/[Aa]ttribution is not required/);
  });

  it("keeps the registry and the credits from drifting on the date", () => {
    // The date is written in two files and is the fact neither can recover if they disagree.
    // Parsed out of the registry rather than written down twice here, so this compares the
    // two sources instead of comparing both against a third copy that could itself be stale.
    const registry = read(REGISTRY);
    expect(registry).toContain("SUNO_PRO_LICENCE");
    const dates = [...registry.matchAll(/generated on (\d{4}-\d{2}-\d{2})/g)].map(
      (match) => match[1] as string,
    );
    // The floor: a regex that matched nothing would make the comparisons below vacuous, and
    // a set equality over two empty sets is satisfied.
    expect(dates.length, "no generation date in the registry").toBeGreaterThanOrEqual(2);
    // THE COMPOSITION, not just the count. Fails if a date appears that nobody wrote down
    // here, and fails if one of the two disappears — which is what deleting a licence
    // constant along with its row would do.
    expect([...new Set(dates)].sort()).toEqual([...GENERATION_DATES].sort());
    // Named as well as set-compared, and deliberately NOT by position: which date the file
    // happens to mention first is a fact about prose ordering, and pinning it made this case
    // fail when a docblock above the constants gained a sentence.
    expect(dates, "the fourteen's date").toContain(GENERATED_ON);
    expect(dates, "the ceremony bed's date").toContain(CEREMONY_GENERATED_ON);
    // And EVERY date the registry names is named in the credits, which is the drift this
    // case exists to catch. Looped rather than asserted on the first, because checking one
    // of two dates is how the second one rots.
    const credits = read(CREDITS);
    for (const date of new Set(dates)) {
      expect(credits, `${CREDITS} does not name the ${date} generation`).toContain(date);
    }
    // The registry carries the two warnings too, because a fifteenth row will be copied from
    // an existing one and has to arrive with them attached.
    expect(registry).toMatch(/free tier is NOT covered|not retroactive|retroactively/i);
    expect(registry).toMatch(/no indemnification/i);
    expect(registry).toMatch(/survives? cancellation/i);
  });
});
