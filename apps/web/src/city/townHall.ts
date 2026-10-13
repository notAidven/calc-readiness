import { INTERLEAVED_PRACTICE_MIN_COMPLETED as AUTHORITY_INTERLEAVED_PRACTICE_MIN_COMPLETED } from "@cr/economy";
import type { DomainId, EraId } from "@cr/skill-graph";

import { buildingName, type ResolvedBuildingModel } from "./buildingAssets";
import { ERA8_TO10_ASSET_URLS } from "./art/era8To10AssetManifest.generated";
import { civicName, isCivicPlacement } from "./civic";
import { LATE_ERA_HALLS } from "./era8To10RegistryPlan";
import { type Footprint, snapToCell, type Transform } from "./worldLayout";

/**
 * The Town Hall — the island HUB, a NON-skill building (design
 * `docs/superpowers/specs/2026-07-25-town-hall-design.md`).
 *
 * It is a NEW concept in a codebase where every building is a skill node
 * (`NUM.*`): the hall has no lesson, no CFU, no practice set, no mastery, and NO
 * `node_id`. It is absent from the skill graph, from `student_node_state`, and from
 * the mastery/placement pipeline entirely (spec §2.2, §7). So it is modelled here as
 * its own first-class concept rather than a pseudo-node:
 *
 *   - a stable sentinel id (`TOWN_HALL_ID`) that is deliberately NOT a `NUM.*` node,
 *     so everywhere skills are enumerated (`D1_NODE_BUILDINGS`, the skill graph,
 *     `viewModel.buildings`) simply never sees it;
 *   - a per-island SKIN descriptor (`TownHallDescriptor`) resolved the same generic
 *     way as neighborhood descriptors (spec §3); behaviour is one shared component,
 *     skins vary.
 *
 * PRE-SEEDED, ALWAYS BUILT, MOVABLE (2026-07-26 design): the hall already exists on
 * every island from the start — the player never places it. It always renders the
 * finished `townhall-built` model (there is NO stage progression); the player only
 * RELOCATES it around the island with the ordinary move feature. It reuses the
 * ORDINARY placement/occupancy grid math like any building (spec §4.3): a `3×2`
 * footprint (D-TH6, widened 2026-07-26 to match the model's proportions) whose odd
 * width means it sits ~2u off-centre on X (see `TOWN_HALL_CENTER_TRANSFORM`).
 *
 * The `townhall-site.glb` / `townhall-construction.glb` assets are retained but
 * UNREFERENCED (the registry still lists all three) in case the hall earns a
 * construction upgrade later; today only `built` is ever resolved.
 */

/**
 * The Town Hall's stable identity in the placement/occupancy grid. A sentinel, not a
 * `NUM.*` skill node — it is intentionally absent from `D1_NODE_BUILDINGS` and the
 * skill graph, so skill-node logic (the roster's `N/6`, the build-menu lesson cards,
 * prerequisite gating, mastery stars) never counts it. It exists only so the hall can
 * flow through the SAME `PlacedTransform`/`occupiedCells`/`isPlacementValid` math and
 * the same move feature as any building.
 */
export const TOWN_HALL_ID = "town-hall";

/**
 * Student-facing label for the hub. The owner-ratified name is exactly "Town Hall".
 * `NUM.S` is "Assembly Hall", so the old collision that once forced "Civic Center"
 * no longer exists; every roster, announcement, album and world nameplate resolves
 * this one authority.
 *
 * The hub is DRESSED per era like every other building (D-ERA29): era one's **Gathering
 * Round**, from `eraDressing.ts`. Only the dressing moves; this label never does — which
 * is what let **D-ERA31** hand the hub era one's round communal hall (it was the Great
 * Hearth, and the Gathering Round was `NUM.S`'s) **without touching D-TH7 at all**. The
 * hub took the dressing and NOT the round-plan chain, which stayed on `hall`; see
 * `eraDressing.ts` for both halves. Internal identifiers stay `TOWN_HALL_*` /
 * `town-hall` — a sentinel, deliberately not learner-facing.
 *
 * The hub's existing art is APPROVED for this dressing (Evan, 2026-07-28): it reads as a
 * hearth with a shelter, which is what the Stone Circle names. No new model is needed.
 */
export const TOWN_HALL_LABEL = "Town Hall";

/**
 * D-TH6 (updated 2026-07-26): a `3×2` footprint — WIDER than deep, matching the hall
 * model's ~1.25 x:z aspect. `footprintFitScale` is a CONTAIN fit (`min(fitX, fitZ)`);
 * widening to 3 cells makes DEPTH the binding axis instead of width, so the hall
 * renders ~9.54 × 7.60u (~26% larger than a 2×2's 7.60 × 6.06u) with little wasted
 * ground. The hall is registered in `NODE_FOOTPRINTS` under `TOWN_HALL_ID`, so every
 * generic `footprintFor(TOWN_HALL_ID)` path (scene, ghost, occupancy, move/rotate)
 * sees this; `townHall.test.ts` locks the two definitions equal so they can't drift.
 */
export const TOWN_HALL_FOOTPRINT: Footprint = { w: 3, d: 2 };

/**
 * The hall's PRE-SEEDED home: as close to the island centre as the grid allows.
 * `snapToCell(0, 0, …)` seats the footprint under the origin; for `3×2` that is
 * `{ col: -1, row: -1 }`. The EVEN depth centres perfectly on Z (z = 0), but the ODD
 * width of 3 cannot centre on X — the footprint centre lands at world x = +2 (half a
 * cell, ~2u EAST of centre); the alternative seat (`col: -2`) would sit the same 2u
 * WEST, so neither is more central. Derived through the same `snapToCell` grid math
 * every building uses (not a hard-coded cell), so it tracks the footprint. Occupancy
 * must account for these 6 cells BEFORE any auto-layout (`defaultPlacements`) runs, or
 * a skill building would be dropped on the hub (`citySession` seeds it first).
 */
export const TOWN_HALL_CENTER_TRANSFORM: Transform = {
  ...snapToCell(0, 0, TOWN_HALL_FOOTPRINT, 0),
  rot: 0,
};

/**
 * D-TH3: the Town Hall offers interleaved practice once this many of the island's
 * skills are available to MIX — the structural floor (you cannot INTERLEAVE fewer than
 * two). A tuning constant; raise it if the first mix feels thin. Never a learning gate.
 *
 * "Available to mix" is the drill's own rule — a skill whose practice set the learner
 * has finished (`lessons/lessonProgress.completedNodeIdsFrom`, `mastery >= 1`) AND that
 * the item bank can serve problems for (`lessons/interleavedPool.interleavedSkillIds`) —
 * NOT the island's Complete-building count. The spec wrote D-TH3 as "2 completed
 * skills", but a tested-out building is `completion_status: "complete"` at `mastery: 0`,
 * so counting Complete buildings would offer a mix drawn from skills the learner has
 * never practiced and open the drill's locked screen. The floor of 2 is unchanged; only
 * what counts toward it is pinned to the one rule the drill pools on.
 */
export const INTERLEAVED_PRACTICE_MIN_COMPLETED =
  AUTHORITY_INTERLEAVED_PRACTICE_MIN_COMPLETED;

/**
 * The hall's three authored model stages. The hall renders ONLY `built` today (it is
 * always finished); `site` / `construction` are retained assets kept for a possible
 * future construction upgrade (design 2026-07-26). No completion-driven progression.
 */
export type TownHallStage = "site" | "construction" | "built";
export const TOWN_HALL_STAGES: readonly TownHallStage[] = ["site", "construction", "built"];

/**
 * Per-island Town Hall SKIN (spec §3): a family of three construction-stage GLBs
 * `[site, construction, built]` plus a label. Behaviour never varies per island (one
 * shared component); only this descriptor does. One entry per populated neighborhood.
 */
export interface TownHallDescriptor {
  /** Three stage GLB basenames, in order `[site, construction, built]`. */
  readonly stage_models: readonly [string, string, string];
  /** Student-facing name (e.g. "Town Hall"). */
  readonly label: string;
}

/**
 * The Town Hall descriptors, keyed by neighborhood. At MVP only D1 is populated
 * (Blueprint §6); its three stage GLBs live in the `townhall/` subdirectory (spec §8).
 * Authoring another island's hall is "add one descriptor entry + its three stage
 * GLBs", never an engine branch (Blueprint §12 extension discipline).
 */
export const TOWN_HALL_DESCRIPTORS: Readonly<
  Partial<Record<DomainId, TownHallDescriptor>>
> = {
  D1: {
    // The civic hub for the Real Numbers starter island.
    stage_models: ["townhall-site.glb", "townhall-construction.glb", "townhall-built.glb"],
    label: TOWN_HALL_LABEL,
  },
};

/** The default (and, at MVP, only populated) island whose hall art exists. */
export const DEFAULT_TOWN_HALL_DOMAIN: DomainId = "D1";

/*
 * THERE IS ONE PER-ERA HUB TABLE, AND IT IS `TOWN_HALL_ERA_MODELS` FURTHER DOWN THIS FILE.
 *
 * A SECOND one stood here until the 2026-07-30 forward-merge, and **git text-merged the two
 * declarations into one file without reporting a conflict** — the same hazard class as a
 * schema literal that matches on both sides, and it surfaced only as a `TS2451 Cannot
 * redeclare` from the compiler. Recording it because the next reader will want to know why
 * two tables ever existed:
 *
 *   - This lane's, added with era two's exported art, was keyed by a plain `string` and held
 *     a `[site, construction, built]` TRIPLE to match `TOWN_HALL_DESCRIPTORS`' shape.
 *   - `integration`'s, from `game/era-one-to-two-transition` (#281), is keyed by `EraId` and
 *     holds the ONE FINISHED basename, because the ceremony draws its own construction
 *     stages and an era therefore owes exactly one GLB rather than three.
 *
 * **`integration`'s is kept, whole.** It is the era-advance lane's own design and it is the
 * better answer on both counts: `EraId` rather than `string` makes an unknown era a compile
 * error instead of a silent miss, and `resolveEraTownHall` reports `authored | fallback |
 * unauthored` so no caller can mistake era one's hall for era two's. This lane's triple
 * named two basenames (`townhall-neolithic-site.glb`, `-construction.glb`) that are
 * deliberately NOT in the tree, so it could only ever have resolved its third entry anyway.
 */

/*
 * THERE IS DELIBERATELY NO `townHallDrillDomainId` ANY MORE.
 *
 * It lower-cased a neighborhood's `DomainId` into a `LESSON_DOMAINS` id, because the
 * hub's interleaved drill was domain-scoped. The drill is now era-scoped
 * (`lessons/interleavedPool.ts`), and the replacement is NOT a `DomainId`-to-`EraId`
 * version of the same function: **INV-ERA-5 forbids deriving an era from a domain**, and
 * it is not merely discouraged but wrong, since a domain can sit in three eras at once.
 * `CitySurface` passes the era the city is wearing, which it already holds for D-ERA29's
 * dressing subtitles, so no mapping is needed at all.
 */

/** True for the Town Hall's sentinel id — the "is this the hub, not a skill?" test. */
export function isTownHall(id: string): boolean {
  return id === TOWN_HALL_ID;
}

/**
 * The display label for ANY id the placement/move/announcement machinery handles:
 * the hub reads "Town Hall", a bought civic building its catalogue name, and every
 * skill building its city name.
 *
 * This is the hub-sentinel GUARD (#112 / PR #132). `buildingName` knows only
 * `NUM.*` keys and falls back to the id it was given, so calling it with the hall
 * announces the literal `town-hall` — which is exactly the defect #112 item 2
 * reported. It lives here, beside the sentinel and the label it guards, rather than
 * inside `CitySurface`, so `announcements.ts` can reach it too: copy that
 * names a building must be able to name the hub without importing a React module.
 *
 * A CIVIC PLACEMENT ID IS THE SAME CLASS OF DEFECT, one class of building later:
 * `civic:longhouse:2` is not a `NUM.*` key either, so without this branch the
 * placement bar and every announcement around a purchase would read the raw id out
 * loud. Guarded in the one function they all already call rather than at each of them.
 */
export function placementLabel(nodeId: string): string {
  if (isTownHall(nodeId)) {
    return TOWN_HALL_LABEL;
  }
  return isCivicPlacement(nodeId) ? civicName(nodeId) : buildingName(nodeId);
}

/* -------------------------------------------------------------------------- */
/* Model registry — the three stage GLBs, registered EXPLICITLY (spec §8)      */
/* -------------------------------------------------------------------------- */

/**
 * The Town Hall stage GLBs, bundled by a DEDICATED glob of the `townhall/`
 * subdirectory. They live in a subdirectory ON PURPOSE (spec §8): the non-recursive
 * `art/models/*.glb` glob in `buildingAssets.ts` would otherwise pick them up and
 * break the exact node-derived skill URL set. Registering them here keeps them
 * ADDITIONAL to that set, never part of it. Keyed by basename, like
 * the skill-node registry.
 */
const LATE_ERA_TOWN_HALL_MODEL_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(ERA8_TO10_ASSET_URLS)
    .filter(([path]) => path.includes("/models/townhall/"))
    .map(([path, url]) => [path.split("/").pop() as string, url]),
);

const TOWN_HALL_MODEL_URLS: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    Object.entries(
      import.meta.glob("./art/models/townhall/*.glb", {
        query: "?url",
        import: "default",
        eager: true,
      }) as Record<string, string>,
    ).map(([path, url]) => [path.split("/").pop() as string, url]),
  ),
  ...LATE_ERA_TOWN_HALL_MODEL_URLS,
};

/** Every distinct Town Hall stage GLB url (for `useGLTF.preload`); separate from skills. */
export function townHallModelUrls(): string[] {
  return Object.values(TOWN_HALL_MODEL_URLS);
}

/**
 * The URLs this particular rendered hall may need next.
 *
 * Era-specific halls are always built, so they preload only their own resolved URL. Era one's
 * D1 family is the exception: the live ceremony really swaps among its site, construction and
 * built files, so any member warms exactly those three siblings. A later era falling back to
 * era one's built hall takes the same family because that is the art actually showing.
 */
export function townHallPreloadUrls(modelUrl: string | null): string[] {
  if (!modelUrl) {
    return [];
  }
  const d1Family = TOWN_HALL_DESCRIPTORS[DEFAULT_TOWN_HALL_DOMAIN]?.stage_models
    .map((basename) => TOWN_HALL_MODEL_URLS[basename])
    .filter((url): url is string => Boolean(url));
  return d1Family?.includes(modelUrl) ? d1Family : [modelUrl];
}

/**
 * Resolve the Town Hall's render descriptor for a construction stage, from the
 * island's descriptor. Returns a `"glb"` descriptor when the stage GLB is bundled;
 * FAILS CLOSED to the shared neutral procedural foundation/scaffold for a missing
 * early phase, or `null` (empty pad) for a missing finished model / unknown island —
 * the same fail-closed contract skill buildings use (`buildingAssets.ts`, spec §8).
 */
export function resolveTownHallModel(
  stage: TownHallStage,
  domain: DomainId = DEFAULT_TOWN_HALL_DOMAIN,
): ResolvedBuildingModel | null {
  const descriptor = TOWN_HALL_DESCRIPTORS[domain];
  if (!descriptor) {
    return null;
  }
  const index = stage === "site" ? 0 : stage === "construction" ? 1 : 2;
  // ISLAND art only. The ERA axis is `resolveEraTownHall` below, which is the function the
  // advance reads; an `era` parameter was threaded through here in this lane and is dropped
  // in favour of it, because two ways to ask the same question is how the two tables above
  // came to exist.
  const basename = descriptor.stage_models[index];
  const url = TOWN_HALL_MODEL_URLS[basename];
  if (url) {
    return { node_id: TOWN_HALL_ID, stage, modelStage: stage, kind: "glb", url };
  }
  // Fail-closed: an early phase with no exported GLB falls back to the shared neutral
  // procedural foundation/scaffold; the finished phase falls back to an empty pad.
  if (stage === "site" || stage === "construction") {
    return { node_id: TOWN_HALL_ID, stage, modelStage: stage, kind: stage, url: null };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* The hall on the ERA axis — D-ERA22, and the one building that keeps it      */
/* -------------------------------------------------------------------------- */

/**
 * THE FINISHED HALL, ERA BY ERA — the registry the era advance reads.
 *
 * Authority: **D-ERA22**, which gives the Town Hall the era resolution axis and makes it
 * the only building that keeps one, and **D-ET2**, under which the hall re-theming *is* the
 * era advance rather than a decoration on it.
 *
 * ## Why a second registry rather than re-keying the first
 *
 * `TOWN_HALL_DESCRIPTORS` above is keyed by `DomainId`, and the era trial contract §15 row
 * 3 records that as *"keyed by the wrong thing — the same re-keying §1.2 records for the
 * gate itself"*. It is not re-keyed here, and that is a scope decision rather than a
 * disagreement: an era is not a domain (INV-ERA-5 — three eras hold more than one domain
 * and Early Modern holds four), so re-keying it means deciding what a per-ISLAND hall
 * skin means once halls vary per era, and that question belongs with whoever authors a
 * second island. What the advance needs is one lookup from era to finished model, so that
 * is what this is. The domain registry keeps its meaning and its one D1 entry.
 *
 * ## Only the FINISHED model, deliberately
 *
 * `TownHallStage` is `site | construction | built` and `townHall.ts` has always said the
 * hall *"always renders the finished `townhall-built` model (there is NO stage
 * progression)"*. The ceremony's construction stages are **not** these three: there are six
 * of them, they are per-era, and they are drawn by the ceremony's own visual rather than by
 * swapping island geometry (see `EraAdvanceCeremony.tsx`). So an era owes one GLB — the hall
 * it ends with — and nobody has to author thirty.
 *
 * ## An era with no authored hall falls back to era one's, LOUDLY
 *
 * `eraBuildableRadius`'s fail-loud discipline is the house rule and this deliberately does
 * not follow it: throwing would mean the city cannot render at all in an era whose art has
 * not landed, and a blank island is worse than a visibly-era-one hall in a city whose
 * roster, roads, hub name and ground have all already advanced. So the fallback is taken
 * and **reported in the return value** — {@link ResolvedEraTownHall.art} says
 * `"fallback"` — so no caller can mistake era one's hall for era two's authored art, and a
 * surface can say which it is showing. That is the property fail-loud is protecting; the
 * throw is only one way to get it.
 */
/*
 * ⚑ ERAS ONE AND TWO ARE SWAPPED HERE, ON EXPLICIT PRODUCT INSTRUCTION (2026-08-20): "swap
 * the artwork of eras 1 and 2." `prehistoric` now resolves to the GLB authored for era two
 * (the Elders' Hearth) and `neolithic` now resolves to the GLB authored for era one (the
 * original `townhall-built.glb`). Only the two basenames below moved; no file on disk was
 * renamed, and every other era's row is untouched.
 */
export const TOWN_HALL_ERA_MODELS: Readonly<Partial<Record<EraId, string>>> = {
  prehistoric: "townhall-neolithic-built.glb",
  /**
   * Era two's hall: the Elders' Hearth — *"a communal hearth room dug a step into the earth,
   * walled in straw-tempered brick, and roofed flat on close-set beams so that the roof is
   * where the settlement stands"*, with one square smoke opening over the fire, a broad
   * brick stair down one long side and one brick screen wall above the roof line
   * (`era-02-neolithic/style-guide.md` §5's landmark entry).
   *
   * **THE BUNDLED GLB IS NOW THIS BUILDING**, re-exported on 2026-07-31 from Evan's
   * re-authored source. It was the withdrawn one until then: this docblock quoted a domed
   * clay oven under a long thatch canopy — *the Shrine* — until he withdrew that design on
   * 2026-07-30, because it was the same object as era two's civic Bread Oven and carried no
   * straw-tempered brick at all, which is the era's body material. **The basename below did
   * not change** across either move, because it is keyed by ERA rather than by building, so
   * only the bytes under it did. The superseded description is quoted in that guide's
   * withdrawn-text appendix (A5).
   *
   * WHAT THE MESH ACTUALLY IS, said separately from the brief above because the two are not
   * yet the same building: the source builds a SOLID brick mass with the hearth sunk into its
   * deck, a broad stair up the front, dentil courses under every edge and a herringbone
   * parapet closing the back — not the sunken room under a flat roof the style guide asks
   * for. Same identity, same materials, same landmark read; the roof and the step down into
   * the ground are the brief's and are not in the geometry. That gap is Evan's to close or to
   * ratify, and it is recorded here rather than silently exported past.
   *
   * **THE PATH IS WIRED AND THE ASSET MAY NOT BE HERE YET.** Drop the GLB at
   * `apps/web/src/city/art/models/townhall/townhall-neolithic-built.glb` and it is picked up
   * with no code change: `TOWN_HALL_MODEL_URLS` globs that directory eagerly and keys by
   * basename. Until then this resolves as `art: "fallback"` and shows era one's hall — see
   * the block above for why that is the chosen failure and how a caller can tell.
   */
  neolithic: "townhall-built.glb",
  /**
   * Era three's Council Hall, extracted from the attached Gridwork Bronze Age kit. The
   * source supplies site/construction/built groups, but the hub is always built (D-TH4),
   * so only this finished GLB is bundled; the exporter pins the two recoverable early
   * stages by digest.
   */
  bronze_age: "townhall-bronze-age-built.glb",
  /**
   * Era four's Senate House, extracted from the attached Gridwork Classical kit. The source
   * supplies all three phases; the always-built hub ships only this finished GLB and the
   * exporter digest-pins its recoverable site and construction phases.
   */
  classical: "townhall-classical-built.glb",
  /**
   * Era five's Court House, extracted from the attached Gridwork Medieval kit. The source
   * roster calls the hub generically "the Town Hall"; the ratified product dressing remains
   * "the Court House". The always-built hub ships only this finished GLB.
   */
  medieval: "townhall-medieval-built.glb",
  /**
   * Era seven's Engine House, extracted from the canonical Industrial Era7Kit. The source
   * classifies it as `civic`, but its own description names it the industrial city's Town
   * Hall and the ratified dressing is the Engine House. The hub remains always built.
   */
  industrial: "townhall-industrial-built.glb",
  atomic_age: LATE_ERA_HALLS.atomic_age.basename,
  information_age: LATE_ERA_HALLS.information_age.basename,
  cyberpunk: LATE_ERA_HALLS.cyberpunk.basename,
};

/** The hall an era resolves to, and whether it is that era's own art. */
export interface ResolvedEraTownHall {
  readonly model: ResolvedBuildingModel | null;
  /** The era whose art is actually on screen. Differs from the request iff `fallback`. */
  readonly showing_era: EraId;
  /**
   * `"authored"` — this era's own hall GLB is bundled and rendering.
   * `"fallback"` — the era declares a hall the bundle does not have, so era one's is
   *   rendering and the surface should say so rather than imply the advance is complete.
   * `"unauthored"` — the era declares no hall at all, so era one's is rendering.
   */
  readonly art: "authored" | "fallback" | "unauthored";
}

/**
 * Whether an era's own finished hall GLB is actually bundled. Reads the glob rather than
 * the table, so a declared-but-missing asset answers `false` — which is the whole question
 * a caller is asking.
 */
export function hasAuthoredEraTownHall(eraId: EraId): boolean {
  const basename = TOWN_HALL_ERA_MODELS[eraId];
  return basename !== undefined && TOWN_HALL_MODEL_URLS[basename] !== undefined;
}

/**
 * The finished hall for the era the city is wearing, with era one's as the named fallback.
 *
 * `fallbackEra` is a parameter rather than a literal so the fallback is era one because era
 * one is FIRST in the sequence, and callers pass `CURRENT_ERA_ID` (itself derived from
 * `ERA_SEQUENCE[0]`) rather than this module hard-coding `"prehistoric"`.
 */
/**
 * WHAT THE FALLBACK LOOKS LIKE TO A PLAYER, in one sentence, or `null` when there is nothing
 * to say because the era's own hall is on screen.
 *
 * ## Why this exists at all: the report was never being read
 *
 * `resolveEraTownHall` has always reported its fallback in `art`, and the block above argues at
 * length that reporting it is what makes the fallback honest — *"so no caller can mistake era
 * one's hall for era two's authored art, and a surface can say which it is showing."* **No
 * surface said.** Both call sites in `CitySurface` read `.model` and dropped `art` on the
 * floor, so all ten eras rendered era one's hall with nothing anywhere admitting it. A verdict
 * a renderer discards is the same as no verdict, which is why the mechanism looked wired and
 * behaved exactly as if it were not.
 *
 * ## The two fallbacks are DIFFERENT news and are said differently
 *
 * `"fallback"` means the era named a hall and the bundle has not got it — a missing asset,
 * which is a build-time gap somebody is mid-way through closing. `"unauthored"` means nobody
 * has designed this era's hall yet, which is a content decision. Collapsing them into one
 * sentence would tell a reviewer chasing a missing GLB that the era is unauthored.
 *
 * The copy names the era whose art is on screen rather than saying *"placeholder"*, because the
 * hall that IS rendering is real authored art for the era it belongs to — the honest statement
 * is which age's hall you are looking at.
 */
export function describeEraTownHallArt(
  resolved: ResolvedEraTownHall,
  _showingEraName: string,
): string | null {
  switch (resolved.art) {
    case "authored":
      return null;
    case "fallback":
      return "This age's finished Hall model is not in the build yet, so its era-specific civic landmark is standing in.";
    default:
      return "This age has no finished Hall model of its own yet, so its era-specific civic landmark is standing in.";
  }
}

export function resolveEraTownHall(eraId: EraId, _fallbackEra: EraId): ResolvedEraTownHall {
  const declared = TOWN_HALL_ERA_MODELS[eraId];
  const url = declared === undefined ? undefined : TOWN_HALL_MODEL_URLS[declared];

  if (url !== undefined) {
    return {
      model: {
        node_id: TOWN_HALL_ID,
        stage: "built",
        modelStage: "built",
        kind: "glb",
        url,
      },
      showing_era: eraId,
      art: "authored",
    };
  }

  return {
    model: {
      node_id: TOWN_HALL_ID,
      stage: "built",
      modelStage: "built",
      kind: "built",
      url: null,
    },
    showing_era: eraId,
    art: declared === undefined ? "unauthored" : "fallback",
  };
}
