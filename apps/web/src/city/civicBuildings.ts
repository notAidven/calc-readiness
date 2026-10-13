import {
  CIVIC_CATALOGUE,
  type CivicBuildingDefinition,
  civicCatalogueForEra,
  civicCatalogueRow,
  civicModelTypeFor,
} from "@cr/economy";
import { ERA_ONE_CIVIC_TYPES, type EraOneCivicTypeId } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";

import {
  MODEL_STAGES,
  type ModelStage,
  type ResolvedBuildingModel,
} from "./buildingAssets";
import { ERA8_TO10_ASSET_URLS } from "./art/era8To10AssetManifest.generated";
import { lateEraCivicIds } from "./era8To10RegistryPlan";
import type { Footprint } from "./worldLayout";

/**
 * ERA ONE'S FOUR CIVIC BUILDINGS — the MODEL registry for the class the player BUYS
 * (D-ERA7), as opposed to the six skill buildings it earns (`buildingAssets.ts`) and the
 * pre-seeded hub (`townHall.ts`).
 *
 * ## THE NAMING KEY, which is the one thing another lane needs from this file
 *
 * **A civic model is addressed as `civic-<type>-<stage>.glb`, flat in `art/models/`,**
 * where `<type>` is `@cr/game`'s `EraOneCivicTypeId` WITH `_` COLLAPSED TO `-`
 * (`water_spring` → `civic-water-spring-…`) and `<stage>` is one of the three
 * {@link MODEL_STAGES}. Resolve through {@link resolveCivicModel}, never by building the
 * string: the resolver is what fails closed.
 *
 * **The id is not this file's to invent, and inventing one was the first mistake made
 * here.** `engines/game/src/city-vitality-tuning.ts` already ships
 * {@link ERA_ONE_CIVIC_TYPES} — `smokehouse`, `longhouse`, `campfire`, `water_spring`,
 * each with its learner-facing name, footprint, cost, two capacity contributions and
 * citizen role — and `test/eraOneCivicCatalogue.test.ts` already binds that table to the
 * authored catalogue. Keying these files on the ART's own slugs instead (`lodge`,
 * `spring`, which is what the source calls two of them) would have produced twelve GLBs
 * the economy lane holds no key for: a model no loader can resolve, which is the exact
 * failure this registry exists to avoid.
 *
 * **So the only transform is `_` → `-`,** because a `.glb` basename with an underscore
 * beside seventeen dashed ones is a needless second convention. {@link civicFilePrefix}
 * is the one place that collapse happens, and `civicBuildings.test.ts` derives every
 * expected basename through it from `Object.keys(ERA_ONE_CIVIC_TYPES)` rather than from a
 * list written down here — so a fifth type, or a renamed one, fails as a missing model
 * instead of loading nothing.
 *
 * **Why the `civic-` prefix is collision-free by construction, not by luck.** This
 * registry is keyed by BASENAME like the other two, so the prefix has to be provably
 * outside the node-derived space that `nodeFilePrefix` emits. There is no `CIVIC.*` node
 * — asserted over the real graph in `civicBuildings.test.ts`, not asserted here in prose.
 *
 * ## FLAT IN `art/models/`, AND THE SKILL GLOB WAS NARROWED TO PAY FOR IT
 *
 * These 4 files sit in the SAME directory as the 18 skill GLBs, un-namespaced. A
 * `art/models/civic/` subdirectory was not an option: every glob reaching that directory
 * is non-recursive, so the files would be invisible and {@link resolveCivicModel} would
 * fail closed with every test still green — and the obvious repair, a recursive glob, is
 * worse, because `gridwork-modern/`'s 18 preserved `num-*` basenames would start
 * competing for the live keys with glob order picking the winner (`buildingAssets.ts`
 * documents that hazard at the glob itself).
 *
 * Flat has one cost and it is paid rather than dodged: `art/models/*.glb` would have
 * swept these into the SKILL registry and moved its pinned URL count from 18 to 22. So
 * that glob now carries an explicit `!./art/models/civic-*.glb` exclusion and the 18
 * stays EXACT — a narrower assertion than before, not a looser one, since the skill set
 * is now pinned against a directory that has other things in it.
 *
 * ## THREE STAGES ARE AUTHORED; ONLY `built` IS COMMITTED, BECAUSE ONLY `built` RESOLVES
 *
 * **The design says bought-and-done.** A civic building's look freezes *at purchase*
 * where a skill building's freezes *at construction*
 * (`2026-07-27-era-progression-design.md` §6.4a's freeze table), and the per-building
 * site → scaffold → built → advanced ladder is a MASTERY ladder (§12.1's note on
 * "accretion"). A civic type has no mastery to climb it with — it has no lesson, no CFU,
 * no `student_node_state` row — so nothing in the shipped design would ever advance one
 * of these off `built`. A purchase resolves `built` and nothing else ever asks.
 *
 * **Evan's source authors all three anyway, and deliberately** — its stage picker
 * ("Cleared ground" / "Frame up" / "Finished") is offered for all four civic types, and
 * every civic entry in its `_defs()` carries its own `frame()` builder rather than
 * falling back to a generic scaffold — **so the exporter still emits all twelve, and the
 * eight early stages are deliberately NOT COMMITTED** (2,559,576 bytes of `dist` for a
 * stage no code path reaches). THE ART IS NOT LOST AND MUST NOT BE TREATED AS LOST: it is
 * code, it regenerates byte-for-byte from Evan's own source, and one command brings all
 * twelve back:
 *
 * ```sh
 * node scripts/export-civic-models.mjs        # rewrites all 12, including the 8 absent
 * node scripts/export-civic-models.mjs --check   # verifies all 12 reproduce
 * ```
 *
 * `scripts/export-civic-models.mjs` owns that contract and pins the eight absent files by
 * SHA-256, so "they regenerate" is checked rather than promised.
 *
 * **What the four committed files cost, measured rather than estimated.** They are
 * 2,623,968 bytes on disk and in `dist`. The entry JS barely notices either way, because
 * the glob is `query: "?url"`: the chunk carries one string per file and `useGLTF` fetches
 * the bytes on demand — all twelve came to 1,887 bytes of entry JS when all twelve were
 * committed.
 *
 * **So {@link resolveCivicModel} is asked for a stage it has no file for**, and it must
 * not answer `null`: see {@link CIVIC_UNBUNDLED_STAGES} for what it answers instead and
 * why silence was the wrong choice.
 *
 * ## WHAT THIS FILE DELIBERATELY DOES NOT HOLD: A SECOND COPY OF THE CATALOGUE
 *
 * No cost, no livability, no happiness, and no hand-transcribed footprint. Every one of
 * those is read THROUGH {@link ERA_ONE_CIVIC_TYPES}, which is itself bound to the
 * authored catalogue by `test/eraOneCivicCatalogue.test.ts`. A copy here would be a copy
 * free to drift, and the two rebalances that landed on 2026-07-29 are exactly what
 * drifts: `#233` renamed the material `flint` → `stone` (and silently emptied a guard's
 * regex doing it), `#236` gave the Longhouse its 5 happiness and made the Smokehouse the
 * free row. {@link civicFootprint} converts that table's `[w, d]` tuple to the
 * renderer's {@link Footprint}, which is a shape change and not a second authority.
 *
 * ## THE ART DIVERGED FROM THE CATALOGUE IN TWO PLACES — ONE IS NOW SETTLED
 *
 * The art source fills the same four slots. Declared per type in {@link CIVIC_ART},
 * because a reader of the filenames alone would never see it:
 *
 * - **`longhouse`** — the art calls it the **Family Lodge**. Same building either way
 *   (one 2×2 roof over a whole family group, smoke at the ridge, firelight in the
 *   doorway, which is the §3 detail carrying its 5 happiness), so this is a LABEL to
 *   settle and no art is owed. **STILL OPEN, owner Evan** — he ruled on the other one,
 *   not on this.
 * - **`water_spring`** — **SETTLED 2026-07-29, and the SUBJECT question is closed.** This
 *   slot's art is a stone-ringed spring: a rim worn smooth where people kneel, a shaded
 *   dipping post, bowls, the only cool note in the palette. The catalogue's 1×1 row was
 *   *The Storage Pit*, a sunken stone-lined pit under a conical thatch cap — a different
 *   subject, not another name for the same thing. Evan ruled **for the art** (*"the
 *   storage pit is supposed to be a bathhouse"*), so the ROW moved: the catalogue row,
 *   the type id and this file's basenames are all the spring now, and the model was never
 *   touched. What remains is one word of WORDING, declared rather than dropped: the
 *   catalogue says *The Water Spring* where the art source's own roster still says *The
 *   Spring*, because era three already ships The Bathhouse and a bare *Spring* on a buy
 *   menu is ambiguous. Era one's §3 carries that reasoning and flags the departure from
 *   his exact word.
 *
 * **The filename follows the shipped id, which is why the rename reached the disk.** The
 * id is the ADDRESS and there is only one of those, so `civic-storage-pit-built.glb` —
 * which always contained a spring — is now `civic-water-spring-built.glb`, renamed with
 * `git mv` and re-exported (the exporter seeds its random stream from the output name, so
 * the bytes are the spring's own regeneration under its new seed, not a copy).
 */

/** The four civic type ids, re-exported so a caller needs one import, not two. */
export type CivicTypeId = EraOneCivicTypeId;

/**
 * The four ids, DERIVED from the shipped table rather than listed. A fifth type added in
 * the economy lane therefore shows up here as a type with no model — which
 * `civicBuildings.test.ts` fails on — instead of being silently unrenderable.
 */
export const CIVIC_TYPE_IDS: readonly CivicTypeId[] = Object.keys(
  ERA_ONE_CIVIC_TYPES,
) as CivicTypeId[];

/**
 * ERA TWO'S FOUR, DERIVED FROM THE CATALOGUE AT THE TIP — `neolithic_granary`,
 * `neolithic_village_houses`, `neolithic_bread_oven`, `neolithic_village_well`.
 *
 * ## WHY THIS IS A SECOND LIST AND NOT AN EXTENSION OF `CIVIC_TYPE_IDS`
 *
 * The two eras are addressed out of two different id spaces, and pretending otherwise
 * would break era one's filenames. `ERA_ONE_CIVIC_TYPES` keys are UNPREFIXED
 * (`smokehouse`), because that table predates the catalogue; `CIVIC_CATALOGUE` states its
 * own convention as `<era>_<slug>` and every era-two row obeys it. Era one's four GLBs are
 * already committed as `civic-smokehouse-built.glb` and so on, so re-deriving era one
 * through the catalogue would rename four shipped files for no gain. Era two has no such
 * legacy, so it takes the catalogue id — which is the address the economy actually holds,
 * and the whole reason the key exists.
 *
 * ## WHY THE POPULATION IS THE CATALOGUE AND NOT A LIST WRITTEN DOWN HERE
 *
 * The same reason `CIVIC_TYPE_IDS` reads `ERA_ONE_CIVIC_TYPES`: a fifth era-two row landing
 * in the economy lane must show up here as a type with no model — which
 * `civicBuildings.test.ts` fails on — rather than being silently unrenderable. **Gabriel's
 * `#243` renamed several rows this week** (era one's 1×1 became *The Spring* and its
 * dwelling *The Family Lodge*), so a hand-copied list would already have been wrong once.
 *
 * ## THESE FOUR CANNOT RENDER IN THE CITY YET, AND THAT IS NOT A REASON TO WITHHOLD THEM
 *
 * Era two's nodes are `product_scope: "target"` and `CURRENT_ERA_ID` derives from
 * `ERA_SEQUENCE[0]`, so no in-city surface reaches them. Registering them anyway is what
 * makes them addressable and provably loadable — the `BuildingThumb` preview bench renders
 * them today — instead of four binaries nothing can name.
 */
export const ERA_TWO_CIVIC_TYPE_IDS: readonly string[] = CIVIC_CATALOGUE.filter(
  (row) => row.era === "neolithic",
).map((row) => row.id);

/**
 * ERA THREE'S FOUR, derived from the same catalogue rows the economy and build menu use.
 * Their attached Gridwork source names the Terraced Fields, Walled Houses, Steam House and
 * Trading Post exactly, so no display-name or visual-similarity mapping is involved.
 */
export const ERA_THREE_CIVIC_TYPE_IDS: readonly string[] = CIVIC_CATALOGUE.filter(
  (row) => row.era === "bronze_age",
).map((row) => row.id);

/** Era four's four catalogue ids, exported for the dev model preview's exact option row. */
export const ERA_FOUR_CIVIC_TYPE_IDS: readonly string[] = CIVIC_CATALOGUE.filter(
  (row) => row.era === "classical",
).map((row) => row.id);

/** Era five's four catalogue ids, including stable ids whose slugs predate display renames. */
export const ERA_FIVE_CIVIC_TYPE_IDS: readonly string[] = CIVIC_CATALOGUE.filter(
  (row) => row.era === "medieval",
).map((row) => row.id);

/** Era seven's four Industrial catalogue ids, including two stable ids predating renames. */
export const ERA_SEVEN_CIVIC_TYPE_IDS: readonly string[] = CIVIC_CATALOGUE.filter(
  (row) => row.era === "industrial",
).map((row) => row.id);

/** Era eight's exact four Atomic Age catalogue/model identities. */
export const ERA_EIGHT_CIVIC_TYPE_IDS = lateEraCivicIds(CIVIC_CATALOGUE, "atomic_age");

/** Era nine's exact four Information Age catalogue/model identities. */
export const ERA_NINE_CIVIC_TYPE_IDS = lateEraCivicIds(CIVIC_CATALOGUE, "information_age");

/** Era ten's exact four Cyberpunk catalogue/model identities. */
export const ERA_TEN_CIVIC_TYPE_IDS = lateEraCivicIds(CIVIC_CATALOGUE, "cyberpunk");

/**
 * The three authored file stages, identical to the skill set's {@link MODEL_STAGES} —
 * aliased by reference rather than re-declared, so the two cannot drift apart and a civic
 * model is addressed with the same stage words as everything else in the city.
 */
export const CIVIC_MODEL_STAGES: readonly ModelStage[] = MODEL_STAGES;

/**
 * The stages a civic type has a COMMITTED GLB for. Exactly `built`, because a civic
 * building is bought rather than built through mastery and `built` is the only stage a
 * purchase resolves.
 */
export const CIVIC_BUNDLED_STAGES: readonly ModelStage[] = ["built"];

/**
 * The stages whose art is authored and exported but **deliberately not committed** —
 * `site` and `construction`. Named here rather than left as an absence, because an absent
 * file and a forgotten one look identical from outside the registry.
 *
 * THIS IS AN EXCEPTION LIST, so `civicBuildings.test.ts` asserts it in BOTH directions
 * against the real glob: a stage listed here that turns out to be bundled fails, and a
 * stage NOT listed here that turns out to be unbundled fails too. So the list cannot go on
 * excusing something it has stopped describing, and it cannot quietly absorb a `built`
 * file that went missing.
 *
 * **What {@link resolveCivicModel} answers for one of these, and why it is not `null`.**
 * `null` means "empty pad" to every caller, and a future build beat on purchase would then
 * render nothing with every test still green — the exact fail-closed-and-silent shape this
 * registry exists to avoid. So an unbundled early stage resolves to the SHARED NEUTRAL
 * PROCEDURAL stand-in the skill nodes and the hub already use for a missing early phase
 * (`kind: "site"` / `kind: "construction"`, `url: null`): a foundation or a scaffold that
 * is visibly a placeholder, not an absence. Restoring Evan's real early-stage art is one
 * command — see this file's header — and the moment those files are committed the same
 * resolver returns them with no code change.
 */
export const CIVIC_UNBUNDLED_STAGES: readonly ModelStage[] = ["site", "construction"];

/**
 * What Evan's art source actually draws for each shipped type, and where that departs
 * from the catalogue.
 *
 * THIS IS AN EXCEPTION LIST, so it is asserted in BOTH directions
 * (`civicBuildings.test.ts`): a type whose art and catalogue names agree may not carry a
 * `divergence`, and a type whose names disagree may not be missing one. Otherwise a
 * mis-transcription and a design decision look identical from outside, and the list
 * becomes permanent by neglect.
 *
 * A `divergence` says what is DIFFERENT and what is still owed, and those are two
 * questions rather than one: `water_spring`'s subject question is ruled and nothing is
 * owed on it, while a word of art-source wording still differs, and a note that vanished
 * the moment the design question closed would leave that word looking like agreement
 * nobody had checked.
 */
export interface CivicArtNote {
  /** The roster slug inside the art source (`_rosters().civic`). */
  readonly artSlug: string;
  /** The name the art source gives it. */
  readonly artName: string;
  /** Which capacity the art's own caption claims — prose, never a number. */
  readonly artRole: string;
  /** Null when the art and the catalogue agree; otherwise what differs, what is still owed, and for whom. */
  readonly divergence: string | null;
}

export const CIVIC_ART: Readonly<Record<CivicTypeId, CivicArtNote>> = {
  smokehouse: {
    artSlug: "smoke",
    artName: "Smokehouse",
    artRole: "Food",
    divergence: null,
  },
  longhouse: {
    artSlug: "lodge",
    artName: "Family Lodge",
    artRole: "Housing",
    // CLOSED on the 2026-07-30 forward-merge, and not by this lane: the catalogue moved to
    // the art's word. It read "NAME ONLY … Settle the label; no art is owed either way.
    // Owner Evan" while §3 said The Longhouse; `integration` renamed that row to The Family
    // Lodge, which is the name the art has always used, so there is nothing left to settle
    // and a note here would go on excusing an absence that has stopped existing.
    divergence: null,
  },
  campfire: {
    artSlug: "campfire",
    artName: "Campfire",
    artRole: "Happiness",
    divergence: null,
  },
  water_spring: {
    artSlug: "spring",
    artName: "The Spring",
    artRole: "Amenity",
    // CLOSED TWICE, in two steps, and the second one was somebody else's. Evan ruled the
    // SUBJECT on 2026-07-29 (the art's spring beat the catalogue's storage pit), leaving one
    // word of wording behind: the catalogue read The Water Spring where this source's roster
    // reads The Spring. The team lead independently renamed the same row to **The Spring**,
    // which is the art's own word, so the wording half closed on the 2026-07-30
    // forward-merge without anybody sweeping the art source. Nothing differs and nothing is
    // owed. The type id stays `water_spring` — it is the GLB's address, not a display name.
    divergence: null,
  },
};

/**
 * Bundled, fingerprinted GLB urls for every authored civic type at the one committed
 * stage, keyed by basename (`civic-longhouse-built.glb`). One entry per type — see
 * {@link CIVIC_UNBUNDLED_STAGES}.
 *
 * A DEDICATED, NON-RECURSIVE glob of the `civic-` prefix inside the shared flat model
 * directory. It is the counterpart to the `!./art/models/civic-*.glb` exclusion in
 * `buildingAssets.ts`: between them, every `.glb` sitting flat in that directory belongs
 * to exactly one of the two registries, and neither can silently absorb the other's
 * files. `civicBuildings.test.ts` asserts that partition in BOTH directions — a civic
 * file appearing in the skill count, and a skill or hall file appearing here — because a
 * prefix split that only holds one way is how a basename registry ends up with two owners
 * for one key and glob order picking the art.
 *
 * DO NOT MAKE THIS PATTERN RECURSIVE. `gridwork-modern/` holds 18 preserved `num-*`
 * basenames that must stay invisible to every loader; the hazard is the one
 * `buildingAssets.ts` spells out, and it does not become safe because this glob's prefix
 * happens not to collide today.
 */
const LATE_ERA_CIVIC_MODEL_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(ERA8_TO10_ASSET_URLS)
    .filter(([path]) => (path.split("/").pop() as string).startsWith("civic-"))
    .map(([path, url]) => [path.split("/").pop() as string, url]),
);

const CIVIC_MODEL_URLS: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    Object.entries(
      import.meta.glob("./art/models/civic-*.glb", {
        query: "?url",
        import: "default",
        eager: true,
      }) as Record<string, string>,
    ).map(([path, url]) => [path.split("/").pop() as string, url]),
  ),
  ...LATE_ERA_CIVIC_MODEL_URLS,
};

/**
 * Every catalogue/model identity that has an actual bundled built GLB. Derived across the
 * authored era sequence, so a later era joins when and only when its files really resolve.
 */
export const CIVIC_MODEL_TYPE_IDS: readonly string[] = ERA_SEQUENCE.flatMap((era) =>
  civicCatalogueForEra(era.id).flatMap((row) => {
    const modelType = civicModelTypeFor(row);
    return modelType !== null && CIVIC_MODEL_URLS[civicModelBasename(modelType, "built")]
      ? [modelType]
      : [];
  }),
);

/** True only when this identity resolves an actual bundled built civic model. */
export function hasCivicModel(id: string): boolean {
  return CIVIC_MODEL_TYPE_IDS.includes(id);
}

/**
 * civic type id → file prefix: `"water_spring"` → `"civic-water-spring"`. The naming key,
 * in code, and the ONLY place `_` becomes `-` — so a caller can hold the shipped id and
 * never think about the filename.
 */
export function civicFilePrefix(typeId: string): string {
  return `civic-${typeId.replace(/_/g, "-")}`;
}

/** The GLB basename a type + stage resolves to: `civic-longhouse-built.glb`. */
export function civicModelBasename(typeId: string, stage: ModelStage): string {
  return `${civicFilePrefix(typeId)}-${stage}.glb`;
}

/** True for any canonical catalogue id or readable legacy Era 1 model key. */
export function isCivicType(id: string): boolean {
  return civicCatalogueRow(id) !== null;
}

/**
 * The learner-facing label for a civic type, read off the shipped catalogue table (which
 * `test/eraOneCivicCatalogue.test.ts` binds to era one's §3). The ART calls two of them
 * something else; see this file's header on which and why that is not this function's to
 * reconcile.
 */
export function civicBuildingName(typeId: string): string {
  return civicCatalogueRow(typeId)?.name ?? typeId;
}

/**
 * The frozen grid footprint for a civic type, as the renderer's {@link Footprint} — a
 * SHAPE conversion of the catalogue table's `[w, d]` tuple, never a second authority for
 * it. `PlacedBuilding.prepareModel` contain-fits a model to this, so it is the one
 * catalogue number the art lane genuinely needs. INV-ERA-1 / D-ERA10 freeze these across
 * all ten eras.
 */
export function civicFootprint(typeId: string): Footprint | null {
  const row = civicCatalogueRow(typeId);
  return row ? { w: row.footprint.width, d: row.footprint.depth } : null;
}

/**
 * Resolve a civic type's render descriptor for a model stage — the SAME fail-closed
 * contract the skill nodes and the hub use (`buildingAssets.ts`, `townHall.ts`): a
 * `"glb"` descriptor when the file is bundled, the shared neutral procedural
 * foundation/scaffold for a missing early phase, and `null` (empty pad) for a missing
 * `built` model or an id that is not a civic type at all.
 *
 * `stage` defaults to `"built"`, which is the only stage a purchase resolves and the only
 * stage with a committed file. Asked for `site` or `construction` this returns the
 * PROCEDURAL stand-in and NEVER `null`, deliberately: {@link CIVIC_UNBUNDLED_STAGES} holds
 * that decision and the reason silence was rejected.
 */
export function resolveCivicModel(
  typeId: string,
  stage: ModelStage = "built",
): ResolvedBuildingModel | null {
  // Model availability, not catalogue identity: a canonical civic row may exist before
  // its era has a complete authored model set.
  if (!hasCivicModel(typeId)) {
    return null;
  }
  const url = CIVIC_MODEL_URLS[civicModelBasename(typeId, stage)];
  if (url) {
    return { node_id: typeId, stage, modelStage: stage, kind: "glb", url };
  }
  if (stage === "site" || stage === "construction") {
    return { node_id: typeId, stage, modelStage: stage, kind: stage, url: null };
  }
  return null;
}

export interface CivicOption {
  readonly row: CivicBuildingDefinition;
  readonly modelType: string;
  readonly builtModel: ResolvedBuildingModel;
}

export type CivicModelResolver = (
  typeId: string,
  stage?: ModelStage,
) => ResolvedBuildingModel | null;

/**
 * The four current-era civic rows, but only when the whole era has distinct bundled built
 * art. A partial era fails closed to an empty catalogue; it never silently becomes 3/4.
 */
export function civicOptionsForEra(
  eraId: EraId,
  resolver: CivicModelResolver = resolveCivicModel,
): readonly CivicOption[] {
  const rows = civicCatalogueForEra(eraId);
  if (rows.length !== 4 || new Set(rows.map((row) => row.id)).size !== 4) {
    return [];
  }
  const options: CivicOption[] = [];
  for (const row of rows) {
    const modelType = civicModelTypeFor(row);
    if (modelType === null) {
      return [];
    }
    const builtModel = resolver(modelType, "built");
    if (builtModel?.kind !== "glb" || !builtModel.url) {
      return [];
    }
    options.push({ row, modelType, builtModel });
  }
  if (
    new Set(options.map((option) => option.modelType)).size !== 4 ||
    new Set(options.map((option) => option.builtModel.url)).size !== 4
  ) {
    return [];
  }
  return options;
}

/** Model-backed civic eras in authored sequence order, derived rather than allow-listed. */
export function civicModelBackedEras(): readonly EraId[] {
  return ERA_SEQUENCE.filter((era) => civicOptionsForEra(era.id).length === 4).map(
    (era) => era.id,
  );
}

/**
 * Existing known placements are never erased by an art outage. Resolve the built GLB when
 * present, otherwise return the shared procedural built-stage descriptor at the parsed
 * catalogue footprint.
 */
export function resolveRestoredCivicModel(
  modelType: string,
  resolver: CivicModelResolver = resolveCivicModel,
): ResolvedBuildingModel {
  return (
    resolver(modelType, "built") ?? {
      node_id: modelType,
      stage: "built",
      modelStage: "built",
      kind: "built",
      url: null,
    }
  );
}

/**
 * Every distinct bundled civic GLB url (for `useGLTF.preload`), one per modelled type.
 * The early stages are authored but uncommitted
 * ({@link CIVIC_UNBUNDLED_STAGES}).
 */
export function civicModelUrls(): string[] {
  return Object.values(CIVIC_MODEL_URLS);
}

/**
 * One civic type's bundled stage urls, in `site` → `construction` → `built` order — which
 * today is just its `built` one, since the early stages carry no committed file.
 */
export function civicTypeModelUrls(typeId: string): string[] {
  return CIVIC_MODEL_STAGES.map(
    (stage) => CIVIC_MODEL_URLS[civicModelBasename(typeId, stage)],
  ).filter((url): url is string => Boolean(url));
}
