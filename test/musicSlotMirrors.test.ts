import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE CONVERSION SCRIPT KNOWS TWO THINGS ABOUT THE SLOTS AND IT CANNOT IMPORT EITHER.**
 *
 * `tools/convert-suno-track.ps1` is PowerShell, so the one thing it cannot do is read
 * TypeScript. It reads the slot LIST out of the generation-prompts markdown, which is why that
 * list cannot drift — but two smaller facts are mirrored into it in terms:
 *
 *  1. the regex that pulls the slot headings out of the document, which has to accept every
 *     prefix a slot id can take;
 *  2. the floor it refuses to run below, which is a written-down count of those headings.
 *
 * Both are the shape `.cursor/rules/qa-verification.mdc` warns about: a mirror that can drift
 * off the thing it mirrors while every other guard stays green. Neither failure is silent —
 * both make the script refuse a real slot — but both refuse it with a message about the
 * document's heading format, which points at the wrong file.
 *
 * **A third fact used to be mirrored here and is gone**: while the ceremony slot was a cue, the
 * script printed a `playback` field into the registry row and had to know which slot was the
 * cue. That was the dangerous one, because a wrong value there produced a **valid row** and a
 * defect in a file the lead pasted rather than in the code that read it. The design correction
 * removed the field, so the mirror went with it.
 *
 * This compares the script's text against the document. It is a text comparison rather than an
 * execution because `pwsh` is not available in CI or in this environment, and a guard that
 * silently skipped would be worse than one that reads the source.
 */

const repo = resolveRepoRoot();

function read(relative: string): string {
  return readFileSync(posix.join(repo, relative), "utf8");
}

const SCRIPT_PATH = "tools/convert-suno-track.ps1";
const script = read(SCRIPT_PATH);
const eraMusic = read("apps/web/src/audio/eraMusic.ts");
const prompts = read(
  "docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md",
);

/** The ceremony slot's id as the CODE declares it, parsed rather than written down here. */
const ceremonySlotId = (() => {
  const found = /CEREMONY_SLOT_TRACK_ID = "([^"]+)"/.exec(eraMusic);
  if (found === null) {
    throw new Error(
      "eraMusic.ts no longer declares CEREMONY_SLOT_TRACK_ID as a string literal, so this " +
        "file is comparing the script against nothing.",
    );
  }
  return found[1] as string;
})();

/** The heading regex as the SCRIPT declares it, lifted out of the PowerShell source. */
const scriptHeadingPattern = (() => {
  const found = /\[regex\]::Matches\(\$text,\s*'([^']+)'\)/.exec(script);
  if (found === null) {
    throw new Error(
      `${SCRIPT_PATH} no longer matches slot headings with a single-quoted regex, so this ` +
        "file cannot tell what it accepts.",
    );
  }
  return found[1] as string;
})();

describe("the conversion script's mirrored knowledge of the slots", () => {
  it("read a real script, a real module and a real prompt sheet", () => {
    // The floor, before anything is compared: three reads that returned nothing would make
    // every assertion below pass over empty strings.
    expect(script.length).toBeGreaterThan(5_000);
    expect(eraMusic.length).toBeGreaterThan(5_000);
    expect(prompts.length).toBeGreaterThan(10_000);
    expect(ceremonySlotId).toBe("ceremony-advance");
  });

  it("accepts every slot heading the prompt sheet actually carries", () => {
    // THE REGEX, RUN. Not inspected for the word "ceremony" — executed against the real
    // document, in JavaScript, over the same `(?m)^### \`...\`` shape PowerShell would apply.
    // So a prefix the script cannot express fails here whatever the pattern happens to say.
    const jsPattern = new RegExp(scriptHeadingPattern.replace(/^\(\?m\)/, ""), "gm");
    const fromScript = [...prompts.matchAll(jsPattern)].map((match) => match[1] as string);

    // Every `###` slot heading in the sheet, by the loosest possible reading, so the
    // comparison is against the document rather than against a second copy of the pattern.
    const everyHeading = [...prompts.matchAll(/^### `([a-z]+-[a-z_]+)`/gm)].map(
      (match) => match[1] as string,
    );

    expect(everyHeading.length).toBeGreaterThanOrEqual(15);
    expect([...new Set(fromScript)].sort()).toEqual([...new Set(everyHeading)].sort());
    expect(fromScript).toContain(ceremonySlotId);
  });

  it("keeps the same floor the slot count actually is", () => {
    // The script refuses to run if it reads fewer headings than it expects. That floor is a
    // written-down number, so it is checked against the document rather than trusted.
    const floor = /if \(\$found\.Count -lt (\d+)\)/.exec(script);
    expect(floor).not.toBeNull();
    const headings = [...prompts.matchAll(/^### `([a-z]+-[a-z_]+)`/gm)];
    expect(Number(floor?.[1])).toBe(new Set(headings.map((match) => match[1])).size);
  });
});
