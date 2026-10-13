# Archived music search documents — all four superseded

**Superseded on 2026-08-03 by `docs/superpowers/specs/2026-08-03-music-picks-per-slot.md`**,
which carries one row per slot: the track, a checked link, the licence, and the literal
attribution string where one is owed. **Act on the pick sheet, not on these.**

These four are the record of *how* the candidates were found. They are kept because the
rejections are the expensive part — `2026-08-02-era-and-crisis-music-candidates.md` alone
decoded and measured 150 audio files, read 128 OpenGameArt licence fields per asset, and
excluded 19 assets with the sentence each one fails quoted — and re-finding a track somebody
already killed is the waste this directory exists to prevent.

**They are byte-identical to what was merged.** No banner was inserted, deliberately: the four
cite each other by line number, and adding a header would silently shift every one of those
citations. That is also why anything in them should be re-read at the current tip before it is
briefed to anyone.

| File | Lines | What it is |
| --- | --- | --- |
| `2026-08-02-era-and-crisis-music-shortlist.md` | 1,123 | First pass. Calibrated tempo and repeat estimators; era 2 named as its one gap |
| `2026-08-02-era-and-crisis-music-candidates.md` | 1,215 | Second pass. Loop-seam measurements on 150 files; eras 1 and 3 named as gaps |
| `2026-08-02-music-candidate-shortlist.md` | 1,134 | Third pass. Found era 8 by querying instrumentation plus tempo instead of mood |
| `2026-08-02-music-search-by-facet.md` | 794 | Fourth pass, after the first three merged. Filled eras 3 and 4 and the Succession |

## Three corrections the pick sheet applies to these files

Recorded here rather than edited into them, so the files stay as merged.

1. **`Accralate` is not an era 2 candidate.** `2026-08-02-music-candidate-shortlist.md` proposes
   it and stands era 2 down from the generation list on the strength of it, arguing from the
   catalogue's `instruments` field. The `description` field on the same row says *"Feel change in
   the middle; Tempo change near the end"* and names agogo and cowbell, both metal. Era 2 bans
   metal and asks for metronomic steadiness. `2026-08-02-music-search-by-facet.md` §3.1 catches
   this independently. **Era 2 is empty.**
2. **`Ancient Temple` is by Umplix, not "yd".** `2026-08-02-music-search-by-facet.md` §5 has the
   wrong author. Read on the asset page 2026-08-03: the submitter is `umplix` and the description
   says *"if you do, call me Umplix"*. It matters twice — a wrong author is a wrong credit row,
   and Umplix's other track on the site was excluded by an earlier pass for being made out of
   Apple loops.
3. **`Meadow Thoughts` is by mishonis.** Same document, same section. "Alex McCulloch" does not
   appear anywhere on that asset page.

## What none of them did

**Nobody listened to anything.** All four say so about their own work. The brief's two decisive
tests are ear tests and remain unrun.
