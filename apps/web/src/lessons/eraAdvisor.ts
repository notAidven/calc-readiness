import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";

import { ERA_ADVISORS, eraAdvisor } from "../city/eraDressing";
import type { MakaMood } from "./MakaAdvisorCharacter";
import type { OruMood } from "./OruAdvisorCharacter";

/**
 * WHICH POSE A LESSON BEAT ASKS THE ERA'S ADVISOR FOR (D-ERA28).
 *
 * ## What this owns, and what it deliberately does not
 *
 * **WHO the advisor is lives in `city/eraDressing.ts`** — `ERA_ADVISORS` there holds the name
 * and the role, ratified per era (era one **Oru**, *your advisor*, and era two **Oru** again as
 * a grain keeper), and the era-advance ceremony reads it to say the re-dressing out loud. One
 * continuous advisor in every era is `D-ET9`, so only the register moves. That table is
 * the single source and this module does not restate it: an earlier draft of this file carried
 * its own copy of the same two rows and it was deleted at the 2026-07-30 merge, because two
 * tables naming the same advisor is how they come to disagree.
 *
 * What that table does NOT have is the **beat → pose** mapping, which is what a lesson surface
 * actually needs, and that is this module.
 *
 * ## WHY THE MAPPING IS TOTAL, AND WHAT THE TOTALITY BUYS
 *
 * D-ERA28 permits an advance to **shrink** the pose vocabulary: a later era's advisor need not
 * be drawn in all four poses. A consumer that mapped a beat straight onto a pose name would
 * compile fine against an advisor that cannot strike it and then render whatever CSS makes of
 * an unknown `data-mood` — no pose change at all, silently, on a correct answer.
 *
 * So {@link ERA_ADVISOR_POSES} is `Record<EraId, …>` — **not `Partial`** — and each entry is a
 * total `Record<AdvisorMood, OruMood>`. An era added to `ERA_SEQUENCE` without a pose row is a
 * COMPILE ERROR rather than a dead frame, and a beat with no pose behind it cannot be written.
 * `eraTwo.reachability.test.ts` measures both against `ERA_SEQUENCE` with floors, because a
 * `Record` over a union only constrains the keys the union already has.
 *
 * **The `Partial`/total split between the two tables is deliberate, not an inconsistency.**
 * `ERA_ADVISORS` is `Partial` because an era with no ratified advisor must show NO NAME rather
 * than borrow the previous era's — a borrowed name reads as authored. A pose is the opposite
 * case: it is invisible mechanism, never learner-facing copy, and an era with no pose row
 * would render a frozen character. Absent copy is honest; an absent pose is a bug.
 *
 * ## ERA TWO'S ART LANDED 2026-07-31. EIGHT ERAS STILL BORROW, AND SAY SO
 *
 * This section read *"the era-two advisor's art does not exist"* and described the borrow as
 * era two's case. It is no longer: `MakaAdvisorCharacter` is era two's own drawing, ported
 * from Evan's `Gridwork Eras` export and shelved verbatim at
 * `city/art/sources/MakaAdvisor.dc.html`. Era two therefore declares `art: "maka"` and
 * `artIsOwn: true`, and the borrow below is now the eight later eras' case alone.
 *
 * **The name that drawing is filed under is NOT the advisor's name, and that is settled.**
 * Evan ruled on 2026-07-31 — *"oru redressed"* — so era two's advisor is Oru re-dressed as a
 * grain keeper, which is `D-ET9`'s answer; `maka` stays as the token for the DRAWING, after
 * the file it was ported from. The split this module already had is what makes that coherent
 * rather than a leftover: **`art` names a DRAWING and `ERA_ADVISORS` names a PERSON**, and
 * under D-ET9 one person wears ten costumes, so the two names cannot be the same kind of
 * thing. Settling the person moved that table and moved no token here — which is exactly
 * what let the drawing land a day before the name did.
 *
 * The borrow costs the learner nothing that is theirs, because the character is `aria-hidden`
 * decoration and wordless by design (`AdvisorNpc`: *"the art is `aria-hidden` decoration, so
 * every word the advisor says lives in the bubble and never in the character"*). So an era
 * whose art has not landed draws a shipped character and keeps every word, every control and
 * every pose beat. What it does not do is render an empty box, and it does not pretend: `art`
 * below is an explicit per-era declaration, so borrowing era one's drawing is recorded rather
 * than falling out of a default, and the day an era is drawn the change is one token.
 *
 * ## ⚑ THE POSE ROW IS DISCRIMINATED ON `art`, WHICH IS WHAT MAKES THE SHRINK SAFE
 *
 * Until era two had its own drawing, every row's `moodPose` was typed `Record<AdvisorMood,
 * OruMood>` — pose names drawn from era ONE's vocabulary whichever era the row was for. That
 * was sound while one drawing existed and became unsound the moment a second did: era two
 * could have declared `art: "maka"` and mapped a beat to a pose only Oru can strike, and it
 * would have compiled.
 *
 * So {@link EraAdvisorPoses} is now a UNION discriminated on `art`, and each member's
 * `moodPose` is total over {@link AdvisorMood} in **that drawing's own** pose union. Three
 * separate defects are now compile errors rather than dead frames, and each was demonstrated
 * by injection at `d7a08d6` (see `eraAdvisorPoses.test.ts`' header for the transcripts):
 *
 *  1. **a dropped beat** — removing `encouraging` from a row is `TS2741`, property missing;
 *  2. **a pose the drawing does not offer** — mapping a beat to CityGuide's `wave` is `TS2322`;
 *  3. **an advance that SHRINKS the vocabulary** — the case D-ERA28 exists for. Narrowing a
 *     drawing's own union (dropping `point` from `MakaMood`, as an era whose advisor is drawn
 *     in fewer poses would) is `TS2322` at every beat that asked for the pose it lost, in the
 *     rows that render it and nowhere else.
 *
 * The third is the one the old shape could not catch at all, and it is the whole of D-ERA28's
 * reasoning: two of CityGuide's poses ceased to exist with call sites depending on both.
 */

/** A lesson beat, as the lesson surfaces speak it. Poses are per-advisor. */
export type AdvisorMood = "neutral" | "happy" | "encouraging";

/** Every mood a lesson beat can be, for a total-map assertion to iterate. */
export const ADVISOR_MOODS: readonly AdvisorMood[] = ["neutral", "happy", "encouraging"];

/**
 * Which shipped character drawing an era renders.
 *
 * Each token is named after the source file the component was ported from, per
 * `city/art/sources/README.md`' *"the filename says what the art is"* — so a token here is a
 * fact about a drawing and never a claim about the advisor's ratified name, which lives in
 * `city/eraDressing.ts`' `ERA_ADVISORS`.
 *
 * This is NOT a default: each era names its drawing, so borrowing another era's is a recorded
 * decision per era rather than a fallthrough nobody chose. A new drawing widens this union,
 * and `AdvisorNpc`'s exhaustive switch over it then fails to compile until it is handled —
 * which is the point.
 */
export type AdvisorArt = "oru" | "maka";

/**
 * One era's pose row, for a drawing whose own vocabulary is `TPose`.
 *
 * The two type parameters are what tie a beat mapping to the drawing that has to strike it:
 * `moodPose` is total over {@link AdvisorMood} in `TPose` and in nothing wider, so a row can
 * only name poses the drawing it declares actually offers.
 */
interface AdvisorPoseRow<TArt extends AdvisorArt, TPose extends string> {
  /** The shipped drawing this era renders. See {@link AdvisorArt}. */
  readonly art: TArt;
  /**
   * Whether {@link art} is this advisor's OWN drawing. `false` says in data that the era is
   * borrowing another's, which is what stops a missing character passing for a finished one.
   */
  readonly artIsOwn: boolean;
  /** Beat → pose, TOTAL over {@link AdvisorMood}. A beat with no pose cannot be written. */
  readonly moodPose: Readonly<Record<AdvisorMood, TPose>>;
}

/** A row that renders era one's drawing, so its beats are typed in `OruMood`. */
export type OruPoseRow = AdvisorPoseRow<"oru", OruMood>;

/** A row that renders era two's drawing, so its beats are typed in `MakaMood`. */
export type MakaPoseRow = AdvisorPoseRow<"maka", MakaMood>;

/**
 * An era's pose row — a union discriminated on `art`, so the pose names a row may use are the
 * ones its own drawing offers. See the header's third section for the three defects this
 * turns from silent dead frames into compile errors.
 *
 * **Each row constant below is annotated with its OWN member, not with this union**, and that
 * is a diagnostics decision worth keeping: against the union a dropped beat reports as a
 * whole-object mismatch (`TS2322`), and against the member it reports as `TS2741` naming the
 * missing beat. Same failure either way; the member says which beat.
 */
export type EraAdvisorPoses = OruPoseRow | MakaPoseRow;

/**
 * Any pose any shipped drawing can strike.
 *
 * For callers that only INSPECT a pose (a test, a dev panel) rather than hand it to a
 * character. A caller that renders must narrow on `art` first — see `AdvisorNpc` — because
 * this type is deliberately wider than either drawing.
 */
export type AdvisorPose = OruMood | MakaMood;

/**
 * Era one's mapping, moved here UNCHANGED from `AdvisorNpc`'s old `ORU_MOOD` literal, so era
 * one's rendering is byte-identical. Oru has no `cheer` and no `wave`, so he talks while
 * presenting a teaching line and points at the work both to mark a correct answer and to draw
 * the eye back to it on a hint or a retry. `squint` belongs to a surface where he reads the
 * learner's work rather than speaks, so no beat requests it.
 */
const ORU_POSES: OruPoseRow = {
  art: "oru",
  artIsOwn: true,
  moodPose: { neutral: "talk", happy: "point", encouraging: "point" },
};

/**
 * THE ROW THE EIGHT UNDRAWN ERAS TAKE — era one's drawing and era one's beats, with
 * `artIsOwn: false` recording that the drawing is borrowed.
 *
 * ## ⚑ THIS CONSTANT FIXES A DEFECT PRESENT AT `d7a08d6`, and the docblock was the tell
 *
 * The table below assigned bare `ORU_POSES` to all eight, and this module's own header
 * claimed of them: *"Each is marked `artIsOwn: false`, so a test can count how many eras
 * still owe advisor art without anybody maintaining a second list."* **`ORU_POSES` is
 * `artIsOwn: true`**, so every one of the eight reported OWNING era one's drawing, and the
 * count the header promised would have returned zero eras owing art — the flag that exists
 * to stop a borrow passing for a finished character was reporting the opposite of the truth
 * in eight of ten eras. `city/DevEraControl.tsx`' *"advisor art — drawn"* readout is the
 * live consumer, and it would have shown every era's advisor as drawn.
 *
 * Found by writing the guard rather than by reading the code: `eraAdvisorArt.test.tsx`'s
 * exception list is asserted in both directions, and the direction that catches *"a listed
 * era that has quietly acquired its own drawing"* failed at `bronze_age` on the very first
 * run against the pre-change tree.
 *
 * **Era one and era two share the beat mapping and NOT the row**, which is the shape that
 * keeps this honest: `artIsOwn` is a property of the (era, drawing) pairing, so a constant
 * shared across eras cannot carry it. The three rows differ only in that flag and in `art`.
 */
const BORROWED_ORU_POSES: OruPoseRow = {
  art: "oru",
  artIsOwn: false,
  moodPose: { neutral: "talk", happy: "point", encouraging: "point" },
};

/**
 * ERA TWO'S ROW, and it is era one's four poses on purpose. Era two is the first advance, and
 * its guide's reasoning is that keeping all four *"proves the mechanism without exercising the
 * loss"* — the mechanism being the discriminated table above, which an era that dropped a pose
 * would be the first to need. So the beat mapping matches Oru's, for era two's own reasons: the
 * advisor talks with the tablet up on a teaching line, and points at the work on a correct
 * answer, a hint and a retry alike.
 *
 * **`artIsOwn: true` since 2026-07-31** — this era draws its own character rather than
 * borrowing era one's. The values are `MakaMood`, not `OruMood`; the two unions happen to
 * coincide today, and the type keeps them separate so they are free not to.
 *
 * **Named for the era rather than for a person, deliberately.** This constant was `KET_POSES`,
 * and era two's advisor name is under three-way dispute (module header). A row is about an era
 * and a drawing, both of which are settled, so it is named after those.
 */
const ERA_TWO_POSES: MakaPoseRow = {
  art: "maka",
  artIsOwn: true,
  moodPose: { neutral: "talk", happy: "point", encouraging: "point" },
};

/**
 * Every era's pose row. **`Record`, not `Partial`** — an era with no row does not compile.
 *
 * The eight eras after the Neolithic have no advisor ratified in `ERA_ADVISORS` at all, so they
 * show no NAME (that table's rule) while still needing a working pose row, and they take era
 * one's drawing through {@link BORROWED_ORU_POSES}. That is a stand-in and a poor one, but it is
 * a stand-in that MOVES: the alternatives are a `Partial` map that hands a consumer `undefined`
 * and freezes the character, or a throw that makes eight eras unopenable. Each is marked
 * `artIsOwn: false`, so a test can count how many eras still owe advisor art without anybody
 * maintaining a second list — **which was not true until 2026-07-31**, and see that constant's
 * docblock for the defect and how it was found.
 */
export const ERA_ADVISOR_POSES: Readonly<Record<EraId, EraAdvisorPoses>> = {
  prehistoric: ORU_POSES,
  neolithic: ERA_TWO_POSES,
  bronze_age: BORROWED_ORU_POSES,
  classical: BORROWED_ORU_POSES,
  medieval: BORROWED_ORU_POSES,
  renaissance: BORROWED_ORU_POSES,
  industrial: BORROWED_ORU_POSES,
  atomic_age: BORROWED_ORU_POSES,
  information_age: BORROWED_ORU_POSES,
  cyberpunk: BORROWED_ORU_POSES,
};

/** An era's pose row. Total by construction, so there is no `undefined` branch. */
export function advisorPosesForEra(eraId: EraId): EraAdvisorPoses {
  return ERA_ADVISOR_POSES[eraId];
}

/**
 * The pose an era's advisor strikes for a lesson beat, as a bare name.
 *
 * **For INSPECTION, not for rendering.** The return type is {@link AdvisorPose}, the union of
 * every drawing's vocabulary, so a value from here has lost the link to the drawing that has to
 * strike it — which is exactly the coupling `AdvisorNpc` must not lose. A surface that renders
 * narrows `advisorPosesForEra(eraId)` on `art` and reads `moodPose[mood]` off the narrowed row,
 * so the pose it hands a character is typed to that character.
 */
export function advisorPose(eraId: EraId, mood: AdvisorMood): AdvisorPose {
  return ERA_ADVISOR_POSES[eraId].moodPose[mood];
}

/**
 * The advisor's NAME for an era, or era one's where none is ratified.
 *
 * Reads `ERA_ADVISORS` rather than holding a second copy. The fallback is HERE and not in that
 * table on purpose: the table's `null` is the honest answer for a surface printing copy (show
 * no name rather than a borrowed one), and this is for a surface that needs *something* to
 * label a rendered character with. Two different questions, one source.
 */
export function advisorNameForEra(eraId: EraId): string {
  return eraAdvisor(eraId)?.name ?? eraAdvisor(ERA_SEQUENCE[0]?.id ?? eraId)?.name ?? "";
}

/** Eras whose advisor is ratified by name — derived, for a coverage floor. */
export function eraIdsWithRatifiedAdvisor(): readonly EraId[] {
  return ERA_SEQUENCE.map((era) => era.id).filter(
    (eraId) => ERA_ADVISORS[eraId] !== undefined,
  );
}
