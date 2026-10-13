import { ERA8_TO10_ASSET_URLS } from "./art/era8To10AssetManifest.generated";
import { earlyModernVariantForNode } from "./earlyModernBuildingVariants";
import { LATE_ERA_SKILL_BUILDINGS, type LateEraId } from "./era8To10RegistryPlan";
import type { BuildStage } from "./palette";
import { skillBuildingHomeEra } from "./skillBuildingEra";

/**
 * Per-skill D1 building MODELS — the node→stage→render mapping for the 3D React
 * Three Fiber city (pure data, framework-free).
 *
 * Each of the six D1 skills renders as its OWN distinct building at EVERY build
 * phase, loaded from per-node GLBs: a `site` clearing, a `construction` frame, and
 * a finished `built` model — so a node under construction builds up AS ITSELF,
 * then tops out into its `built` model.
 *
 * WHAT LOADS TODAY IS THE ERA-ONE PREHISTORIC SET (adopted in `be9f00b`), which
 * replaced the original Gridwork isometric models in place. The six masses are
 * dressed as the Roundhouse (`hall`), the Hide Shed (`store`), the Hut Cluster
 * (`dwelling`), the Tool Shelter (`workshop`), the Clearing (`yard`) and the
 * Lookout (`tower`); the hub is the Stone Circle (D-ERA31 moved that dressing to the
 * hub from `hall`, which kept the round-plan chain). See
 * `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §6. Those seven
 * dressing names are now DATA, not just prose: they are era one's row of the per-era
 * subtitle table in `eraDressing.ts` (D-ERA29).
 *
 * The ORIGINAL Gridwork set — the Deco tower, the glass slab, the brownstone
 * terrace and the rest — is NOT deleted. All 21 files are preserved, deliberately
 * unwired, in `art/models/gridwork-modern/` (see its README): they are a later
 * era's art. Nothing will ever re-dress these six buildings into it, because a skill
 * building keeps the look it was raised in (see `D1_NODE_BUILDINGS` below), so the set
 * is a wardrobe for the NEW nodes of whichever later era claims it. Which era that is
 * remains open and is Evan's; the mechanism for wearing it is D-ERA22.
 *
 * The per-node `site`/`construction` GLBs are that node's OWN early phases, so the
 * frame already carries the finished building's silhouette rather than a generic
 * scaffold (era one §7: turf stripped and stakes driven at `site`, posts standing
 * and lashed with the roof still off at `construction`). Every stage is contain-fit
 * to the node's own footprint (see `PlacedBuilding.prepareModel`), so the footprint
 * and the site → construction → built cross-fade stay consistent.
 *
 *   site         → per-node CLEARING    `num-*-site.glb`         (not_started / teaching / preview)
 *   construction → per-node FRAME       `num-*-construction.glb` (practice)
 *   built        → per-node building    `num-*-built.glb`        (unfinished / topped-out)
 *
 * The `advanced` milestone stage is DERIVED in-engine so only three GLBs per
 * building are needed:
 *
 *   advanced → reuses the `built` model (complete / full mastery, mastery ≥ 2)
 *
 * Full mastery renders as the normal `built` model — there is no gold-mastered
 * stage and no gold tint.
 *
 * `resolveBuildingModel` returns a render descriptor: a `kind` of `"glb"` (with a
 * `url`) when the node's GLB for that phase exists. Otherwise it FAILS CLOSED to the
 * shared neutral procedural template for that phase (`three/constructionStages.ts`, a
 * `kind` of `"site"` / `"construction"` / `"built"`).
 *
 * **IT NEVER RETURNS `null`, AND THAT CHANGED WHEN THE CITY'S ROSTER STOPPED BEING SIX.**
 * It used to resolve an unmapped node to `null`, documented as "an empty pad", which was
 * harmless only because an unmapped node could not be placed: the roster came from a
 * domain's `mvp` nodes, so the only placeable nodes were the six mapped here. The roster is
 * now the era's (`@cr/game` — `city-roster.ts`), so 56 of the 62 in-product nodes became
 * placeable with no model. `null` would have drawn nothing, and `PlacedBuilding` renders its
 * named, click-handling `<group>` unconditionally with all geometry inside it — so an
 * unmapped node would have been an invisible building AND an unreachable lesson, because on
 * the canvas the pointer hits geometry and a group with no mesh is not a raycast target.
 * `unmappedBuilding.test.ts` and `unmappedBuildingRenders.browser.test.tsx` hold both halves.
 */

/** The three GLB file stages exported per building (the authored per-era phases). */
export type ModelStage = "site" | "construction" | "built";
export const MODEL_STAGES: readonly ModelStage[] = ["site", "construction", "built"];

/**
 * The per-skill D1 building mapping (a distinct building per node), keyed in
 * registry order (NUM.S, NUM.F, NUM.2, NUM.3, NUM.4, NUM.5). The `building` display
 * names are locked by **D-ERA29**.
 *
 * `building` is the STUDENT-FACING STABLE NAME — the handle, era-neutral, and it
 * never changes across the ten eras. `gridworkId` names the underlying ART MASS —
 * the shape slot the node occupies, one of the six the ten era style guides share and
 * dress.
 *
 * A SKILL BUILDING IS DRAWN ONCE, IN THE ERA IT IS RAISED, AND IS NEVER RE-DRESSED.
 * The town hall is the sole building exception and re-themes at every advance; so do
 * the island, the roads and the advisor, which are one surface each per era rather
 * than a catalogue that multiplies. That narrows D-ERA8's upgrade clause to the hall,
 * and it is recorded in
 * `docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md`. **The six masses
 * SURVIVE it** as the guides' shared vocabulary: an era dresses only the masses its
 * own new nodes use, and where two of its nodes land on the same mass they are
 * separated by plan, scale and props, never by geometry. The model budget that follows
 * is derived once, at era design §12.1, and is deliberately not restated here.
 *
 * WHAT D-ERA10 FREEZES IS THE FOOTPRINT, NOT THE MASS. INV-ERA-1 scopes itself to
 * cells throughout — a building "never changes the cells it occupies", so an era
 * advance can never reshuffle a layout the player arranged — and it rules on nothing
 * in the mass column below. Which mass a node was given is the shipped assignment and
 * carries no mathematical meaning (D-ERA8): a `store` is not a skill about collecting.
 *
 *   node    mass       `building` (the stable handle)
 *   NUM.S → hall     · Assembly Hall
 *   NUM.F → store    · Store
 *   NUM.2 → dwelling · Dwellings
 *   NUM.3 → workshop · Workshop
 *   NUM.4 → yard     · Commons
 *   NUM.5 → tower    · Tower
 *
 * THE MASS IDS *ARE* THE SIX ORDINARY TYPES, and as of 2026-07-29 there is only one
 * vocabulary rather than two. The era design's §6.1 (D-ERA8) authors the six as
 * "dwelling, workshop, store, hall, tower, yard", the nine later style guides name
 * their roster masses with exactly those words, and era one alone still carried the
 * retired Gridwork art's own names — `deco`, `slab`, `rowhouse`, `school`, `park`.
 * **The old-to-new mapping was already one-to-one** and is recorded in every guide's
 * §5: `deco` = hall, `slab` = store, `rowhouse` = dwelling, `school` = workshop,
 * `park` = yard, `tower` = tower. So no mass had to be reused and no two nodes
 * collapsed onto one id. **Nothing on disk moved**: a GLB filename is built from the
 * NODE ID (`nodeFilePrefix` below), so all 18 live files and all 18 preserved ones
 * are `num-*` and none of them ever carried a mass name.
 *
 * Two stable names still depart from their type word, both recorded in D-ERA29:
 * `yard` is **Commons** rather than "Yard" (the dwelling's own through-line is
 * "several small dwellings, one shared yard", so "Yard" would collide with a
 * load-bearing phrase), and `hall` carries the qualifier **Assembly** (D-TH7 wants
 * exactly one name in the city reading as the town hall, which is the hub's "Civic
 * Center") — "assembly rotunda" is era two's own word for this chain.
 *
 * THE PREVIOUS SET DESCRIBED ART THAT NO LONGER LOADS. City Bank, Public Library,
 * Rowhouse Flats, Community School, Central Park and Clock Tower cannot exist in the
 * Prehistoric Era, whose masses are thatch and lashed timber. `NUM.S` has now been
 * renamed twice (#148 / D-TH7, then D-ERA29), and D-TH7's constraint was re-checked
 * rather than assumed: the hub is "Town Hall" and stays the only hub-like name.
 *
 * ERA FLAVOUR LIVES IN THE SUBTITLE, NOT HERE (D-ERA29). `eraDressing.ts` holds the
 * per-era dressing subtitle — era one's Roundhouse, Hide Shed, Hut Cluster, Tool
 * Shelter, Clearing, Lookout, and the hub's Stone Circle — and composes the display
 * name as `"{stable}, {subtitle}"`. Read display copy through `buildingDisplayName`
 * there when an era is in hand and through `buildingName` here when it is the bare
 * handle that is wanted. There is no second hard-coded copy of this set any more:
 * `three/GridworkModelPreview.tsx` derives its picker labels from `D1_SKILL_IDS`.
 *
 * WHAT `gridworkId` DOES AND DOES NOT DO. It does NOT map the GLBs on disk — a
 * filename is built from the NODE ID (`nodeFilePrefix`, used by `resolveBuildingModel`
 * below), so no loader has ever read this field. Nor does the engine key anything on
 * it: `@cr/game` cannot import `apps/web`, which is why citizen roles are keyed on
 * `node_id` instead (D-CIT17 amended D-CIT3 for exactly this reason; see
 * `citizens.ts`). Its real remaining job is as the JOIN KEY THE ERA STYLE GUIDES USE:
 * each of the ten guides names the six masses `hall`/`store`/`dwelling`/`workshop`/
 * `yard`/`tower` and dresses them by that name, so these values are load-bearing
 * documentation and must move in step with the guides or the join breaks.
 *
 * **THAT IS WHY THE FIELD IS STILL CALLED `gridworkId` WHILE ITS VALUES NO LONGER ARE.**
 * The values were renamed onto the shared six on 2026-07-29 because era one's docs were
 * the last place the retired art's vocabulary survived; the FIELD NAME is deliberately
 * left alone in the same pass, because renaming it reaches a dozen design documents that
 * cite it by name and buys nothing a reader of this docblock does not already have.
 * A `citizen_role` of `school` (`descriptors.ts`) is a DIFFERENT namespace and is
 * untouched — it survived era one's `school` mass losing that word.
 *
 * Each node has its OWN model at every phase (`site`/`construction`/`built`), so a
 * node builds up as itself rather than through a generic scaffold.
 */
export const D1_NODE_BUILDINGS: Readonly<
  Record<string, { readonly building: string; readonly gridworkId: string }>
> = {
  "NUM.S": { building: "Assembly Hall", gridworkId: "hall" },
  "NUM.F": { building: "Store", gridworkId: "store" },
  "NUM.2": { building: "Dwellings", gridworkId: "dwelling" },
  "NUM.3": { building: "Workshop", gridworkId: "workshop" },
  "NUM.4": { building: "Commons", gridworkId: "yard" },
  "NUM.5": { building: "Tower", gridworkId: "tower" },
};

/** The six D1 skill node ids, in registry order (drives the placement picker). */
export const D1_SKILL_IDS: readonly string[] = Object.keys(D1_NODE_BUILDINGS);

/**
 * ERA TWO'S FIVE SKILL BUILDINGS — the Neolithic roster (`EXP.1`, `RAD.1`-`RAD.4`).
 *
 * ## The precondition this map was waiting on has been met
 *
 * `MODEL_URLS`' docblock above says era two's GLBs "will sit bundled and unread until that
 * map (or a sibling) names its nodes", and it names the two things such a map owes: a
 * stable display name per node, plus an `eraDressing.ts` subtitle row — *"exactly the
 * dressing **O-11** rules on … naming the buildings is the ruling, not the plumbing."*
 * **O-11 is ANSWERED** (2026-07-29, Evan: the through-lines survive, the buildings do not),
 * and era two's subtitle row is FINALISED by the team lead — `style-guide.md`'s row says in
 * terms *"All seven are the team lead's final names and the row is ready to wire."* So this
 * is the plumbing, arriving after its ruling rather than ahead of it.
 *
 * ## Why the stable names REPEAT era one's, and why that is not a collision
 *
 * A stable name is the MASS's era-neutral handle (D-ERA9/D-ERA29), so era two's node on
 * `store` is "Store" for the same reason era one's is: the handle names the shape slot, and
 * it is the SUBTITLE that carries the era. The announced name is
 * `"{stable}, {subtitle}"` — era one's `NUM.F` announces "Store, Hide Shed" and era two's
 * `EXP.1` announces "Store, the Bee House" — and it is the announced name that the
 * uniqueness rule is about, because both buildings stand on the island at once under the
 * re-dressing ruling. `eraDressing.test.tsx` asserts the composed names are distinct, which
 * is the claim worth pinning; asserting the handles were distinct would assert the opposite
 * of D-ERA29.
 *
 * The mass per node is read straight off `era-02-neolithic/style-guide.md`'s roster table,
 * and the `building` handles are the "Stable name" column of its subtitle row.
 *
 * ## RAD.2 IS WIRED TO THE MODEL AT THE TIP, WHICH IS A THRESHING CIRCLE
 *
 * The brief's ruling of record re-authored `RAD.2` as **a sheep pen** and moved the subtitle
 * to "the Sheep Pen" with it, and the SUBTITLE below follows that ruling. The exported
 * `rad-2-*.glb` at this tip is still the threshing circle the name replaced. **Flagged, not
 * fixed** — which art `RAD.2` ships is an open ruling and not this lane's to close. The
 * wiring is correct either way: the loader is keyed on the node id, so a re-exported
 * `rad-2-built.glb` is picked up with no code change.
 */
export const ERA_TWO_NODE_BUILDINGS: Readonly<
  Record<string, { readonly building: string; readonly gridworkId: string }>
> = {
  "EXP.1": { building: "Store", gridworkId: "store" },
  "RAD.1": { building: "Workshop", gridworkId: "workshop" },
  "RAD.2": { building: "Commons", gridworkId: "yard" },
  "RAD.3": { building: "Assembly Hall", gridworkId: "hall" },
  "RAD.4": { building: "Tower", gridworkId: "tower" },
};

/**
 * ERA THREE'S FIVE SKILL BUILDINGS — the Bronze Age roster (`LIN.1`, `LIN.3`-`LIN.6`).
 * `LIN.2` is retired and is not a node in any era (`lessons/d3.ts`).
 *
 * ## THE ATTACHED GRIDWORK KIT NOW SUPPLIES ALL THREE MODEL STAGES
 *
 * The source attachment is procedural JavaScript rather than a GLB/image pack. It is preserved
 * verbatim in `art/building-sources/era-03-bronze-age-all-buildings.dc.html`, and
 * `scripts/export-era3-building-models.mjs` deterministically exports `lin-*-site`,
 * `-construction` and `-built` for these five nodes. The basename remains node-derived, so
 * this name map and the model registry meet through the same key every earlier era uses.
 *
 * ## Why the stable names repeat, again
 *
 * A stable name is the MASS's era-neutral handle (D-ERA9/D-ERA29), so era three's node on
 * `store` is "Store" for the same reason eras one and two are. The era is carried by the
 * SUBTITLE — `LIN.4` announces "Store, the Treasury" against era one's "Store, Hide Shed" — and
 * it is the announced name the uniqueness rule is about, which `eraDressing.test.tsx` and
 * `eraTwo.reachability.test.ts` both assert over the composed strings.
 *
 * The mass per node is read straight off `era-03-bronze-age/style-guide.md`'s roster table
 * ("The skill buildings this era introduces"), and the `building` handles are the "Stable name"
 * column of its ratified subtitle row.
 */
export const ERA_THREE_NODE_BUILDINGS: Readonly<
  Record<string, { readonly building: string; readonly gridworkId: string }>
> = {
  "LIN.1": { building: "Assembly Hall", gridworkId: "hall" },
  "LIN.3": { building: "Workshop", gridworkId: "workshop" },
  "LIN.4": { building: "Store", gridworkId: "store" },
  "LIN.5": { building: "Commons", gridworkId: "yard" },
  "LIN.6": { building: "Tower", gridworkId: "tower" },
};

/**
 * ERA FOUR'S FIVE SKILL BUILDINGS — the Classical roster (`POL.1`-`POL.4`, `POL.8`).
 *
 * The stable handles and mass ids are the existing era-neutral vocabulary; the attached
 * Era4Kit supplies the distinct Classical geometry. The guide's ratified subtitle row is
 * wired through `eraDressing.ts`; this map remains the stable-handle/model gate rather than
 * a second copy of learner-facing dressing names.
 */
export const ERA_FOUR_NODE_BUILDINGS: Readonly<
  Record<string, { readonly building: string; readonly gridworkId: string }>
> = {
  "POL.1": { building: "Workshop", gridworkId: "workshop" },
  "POL.2": { building: "Commons", gridworkId: "yard" },
  "POL.3": { building: "Assembly Hall", gridworkId: "hall" },
  "POL.4": { building: "Store", gridworkId: "store" },
  "POL.8": { building: "Workshop", gridworkId: "workshop" },
};

/**
 * ERA FIVE'S FIVE SKILL BUILDINGS — the Medieval roster
 * (`RAT.1`, `RAT.2`, `RAT.3`, `RAT.4`, `RAT.6`).
 *
 * The stable handles remain the era-neutral mass vocabulary. The attached Era5Kit supplies
 * the distinct Medieval geometry, while `eraDressing.ts` owns the ratified Weaver's Shop,
 * Wool Store, Guild Hall, Tower House, and Timber Houses subtitles.
 */
export const ERA_FIVE_NODE_BUILDINGS: Readonly<
  Record<string, { readonly building: string; readonly gridworkId: string }>
> = {
  "RAT.1": { building: "Workshop", gridworkId: "workshop" },
  "RAT.2": { building: "Store", gridworkId: "store" },
  "RAT.3": { building: "Assembly Hall", gridworkId: "hall" },
  "RAT.4": { building: "Tower", gridworkId: "tower" },
  "RAT.6": { building: "Dwellings", gridworkId: "dwelling" },
};

/**
 * ERA SEVEN'S SIX SKILL BUILDINGS — the Industrial roster
 * (`FUN.1`, `FUN.2`, `FUN.3`, `FUN.7`, `FUN.8`, `POL.5`).
 *
 * The stable handles remain the shared mass vocabulary. The canonical Era7Kit supplies
 * distinct geometry for both shared pairs (`FUN.1`/`FUN.7` on hall and
 * `FUN.3`/`FUN.8` on workshop); `eraDressing.ts` owns their node-specific subtitles.
 */
export const ERA_SEVEN_NODE_BUILDINGS: Readonly<
  Record<string, { readonly building: string; readonly gridworkId: string }>
> = {
  "FUN.1": { building: "Assembly Hall", gridworkId: "hall" },
  "FUN.2": { building: "Store", gridworkId: "store" },
  "FUN.3": { building: "Workshop", gridworkId: "workshop" },
  "FUN.7": { building: "Assembly Hall", gridworkId: "hall" },
  "FUN.8": { building: "Workshop", gridworkId: "workshop" },
  "POL.5": { building: "Tower", gridworkId: "tower" },
};

function lateEraNodeBuildings(
  eraId: LateEraId,
): Readonly<Record<string, { readonly building: string; readonly gridworkId: string }>> {
  return Object.fromEntries(
    Object.entries(LATE_ERA_SKILL_BUILDINGS[eraId]).map(
      ([nodeId, [building, gridworkId]]) => [nodeId, { building, gridworkId }],
    ),
  );
}

/** Era eight's nine Atomic Age skill buildings, derived from the frozen release plan. */
export const ERA_EIGHT_NODE_BUILDINGS = lateEraNodeBuildings("atomic_age");

/** Era nine's six Information Age skill buildings, derived from the frozen release plan. */
export const ERA_NINE_NODE_BUILDINGS = lateEraNodeBuildings("information_age");

/** Era ten's nine Cyberpunk skill buildings, derived from the frozen release plan. */
export const ERA_TEN_NODE_BUILDINGS = lateEraNodeBuildings("cyberpunk");

/**
 * Every skill node the city can NAME, across the eras whose copy has landed.
 *
 * `resolveBuildingModel` and `buildingName` both gate on THIS, not on `D1_NODE_BUILDINGS`,
 * so an era's buildings become resolvable by being added above rather than by any change
 * here. Era one's entries win a key collision, which cannot happen today (node ids are the
 * registry's primary key and no id is in two eras — INV-ERA-2) and is written down so a
 * future duplicate resolves to the era that already shipped rather than to whichever object
 * was spread last. The newest era is spread FIRST for that reason, so precedence runs era one
 * through era five in historical order.
 *
 * **MEMBERSHIP HERE IS A NAME, NOT PROOF OF A MODEL.** `resolveBuildingModel` still gates the
 * GLB lookup on this record and fails closed when a file is absent, while
 * `era2SkillModels.test.ts` independently declares and checks which eras have exported art.
 * Era three now has art too, but the two questions remain separate by construction.
 */
const NODE_BUILDINGS: Readonly<
  Record<string, { readonly building: string; readonly gridworkId: string }>
> = {
  ...ERA_TEN_NODE_BUILDINGS,
  ...ERA_NINE_NODE_BUILDINGS,
  ...ERA_EIGHT_NODE_BUILDINGS,
  ...ERA_SEVEN_NODE_BUILDINGS,
  ...ERA_FIVE_NODE_BUILDINGS,
  ...ERA_FOUR_NODE_BUILDINGS,
  ...ERA_THREE_NODE_BUILDINGS,
  ...ERA_TWO_NODE_BUILDINGS,
  ...D1_NODE_BUILDINGS,
};

/**
 * Bundled, fingerprinted GLB urls for EVERY build phase, keyed by basename
 * (`num-s-site.glb`, `num-s-construction.glb`, `num-s-built.glb`). All three
 * per-node stages are bundled so the live city cross-fades site → construction →
 * built from the node's OWN models. `import.meta.glob(..., { eager: true })` is the
 * Vite-idiomatic way to pull the model directory; files are keyed by basename.
 *
 * THIS GLOB IS NON-RECURSIVE, AND THREE SUBDIRECTORIES DEPEND ON THAT: `townhall/`
 * and `roads/` have their own registries (`townHall.ts`, `roadModels.ts`) and stay
 * ADDITIONAL to the 18, and `gridwork-modern/` holds the preserved-but-unwired
 * original model set (see its README) and must stay invisible to every loader.
 *
 * ## AND IT NOW EXCLUDES A PREFIX, BECAUSE THE FLAT DIRECTORY HAS A SECOND TENANT
 *
 * `!./art/models/civic-*.glb` keeps era one's four BOUGHT civic buildings
 * (`civic-<type>-built.glb`, 4 files — only that stage is committed, see
 * `civicBuildings.ts`) out of the SKILL set, which is why the 18
 * below is still exactly 18 with 22 `.glb` files sitting flat in that directory. They
 * are flat for the reason a `d2/` subdirectory is ruled out two paragraphs down — a
 * non-recursive glob cannot see a subdirectory, and making it recursive re-opens the
 * `gridwork-modern/` basename collision — so the boundary had to be drawn by PREFIX
 * instead of by directory, and `civicBuildings.ts` owns the other side of it.
 *
 * **This is a narrower assertion than the one it replaced, not a looser one.** Before,
 * "18" meant "everything in the directory"; now it means "the 18 node-derived
 * basenames, in a directory that has other things in it", which is the claim actually
 * worth pinning. Both directions are asserted: `buildingAssets.test.ts` checks no
 * civic url leaks into the 18, and `civicBuildings.test.ts` checks no skill url leaks
 * into the civic set — a one-way check would let a future prefix be owned twice.
 *
 * DO NOT MAKE THIS PATTERN RECURSIVE, and note that the count guard is only half a
 * defence. Measured with `**\/*.glb` here: 43 files match, but they collapse to 22
 * keys, because THIS REGISTRY IS KEYED BY BASENAME and `gridwork-modern/num-2-built.glb`
 * collides with `num-2-built.glb`. So the count moves 18 → 22 and
 * `buildingAssets.test.ts` fails — but the +4 is `townhall/` and `roads/`, NOT the
 * preserved set, which is invisible to any count. What it changes instead is WHICH
 * file a basename resolves to, decided purely by glob key order: `gridwork-modern/`
 * happens to sort before `num-*`, so the live entry is written last and still wins.
 * That is luck, not a design — a preserved directory whose name sorted AFTER `num-`
 * would swap era one's art out silently, with the URL count unchanged. Any future
 * era work (D-ERA22) must key on the full path, not the basename.
 *
 * ## WHERE THE NEXT ERA'S SKILL GLBs GO: THIS DIRECTORY, FLAT. NOT A `d2/` SUBFOLDER.
 *
 * Era two (the Neolithic, whose nodes are D2's `EXP.1` and `RAD.1`-`RAD.4`) needs no
 * namespace, because the basenames this registry is keyed by are derived from the NODE
 * ID (`nodeFilePrefix`), and node ids are the registry's primary key: 66 ids yield 66
 * distinct prefixes, no id contains a dash, and none collides after lowercasing and
 * `.`→`-` (asserted in `buildingAssets.test.ts`, not merely counted once by hand). So
 * `exp-1-built.glb` and `rad-4-site.glb` cannot collide with any `num-*` basename, and
 * dropping them alongside D1's is safe BY CONSTRUCTION rather than by convention.
 *
 * Putting them in `art/models/d2/` instead fails twice over. The glob is non-recursive,
 * so they would be invisible: `resolveBuildingModel` would fail closed to the shared
 * procedural scaffold and to an empty pad, with every test still green. And the obvious
 * repair — making the glob recursive — is the collision hazard documented above, where
 * `gridwork-modern/`'s eighteen preserved `num-*` basenames start competing with the
 * live ones and glob key order decides which art the city wears. A subdirectory earns
 * its own registry (`townhall/` → `townHall.ts`, `roads/` → `roadModels.ts`) or it does
 * not exist.
 *
 * ## AND THE MODELS ALONE ARE NOT ENOUGH: THE NAME MAP GATES THE LOOKUP
 *
 * `resolveBuildingModel` resolves no GLB for any node id absent from {@link NODE_BUILDINGS} —
 * it hands back the shared neutral procedural shell instead of `null`, since the era roster
 * made unmapped nodes placeable and an invisible building is worse than a plain one — so a
 * bundled GLB stays unread until some map names its node. What such a map owes is a
 * stable display name per node plus an `eraDressing.ts` subtitle row — exactly the dressing
 * **O-11** ruled on (`2026-07-27-era-progression-design.md` §17; owner Evan).
 *
 * **O-11 is ANSWERED and era two is now wired.** Its five nodes are named in
 * {@link ERA_TWO_NODE_BUILDINGS} and dressed in `eraDressing.ts`'s `neolithic` row, so all
 * fifteen `exp-1-*` / `rad-*` GLBs resolve. Eras three through five now follow the same
 * map-plus-dressing contract above; the five later eras remain deliberately un-pre-wired.
 *
 * ## INCOMING HTML/SVG ART SOURCES DO NOT GO IN `art/sources/`
 *
 * That directory is PINNED to exactly two files. `lessons/cityGuidePreserved.test.tsx`
 * globs `../city/art/sources/*.dc.html` and asserts set EQUALITY against
 * `CityGuide.dc.html` + `OruAdvisor.dc.html`, so a third `*.dc.html` dropped in there
 * breaks the advisor shelf guard — which is doing real work and must not be loosened to
 * make room. Building design sources go in `art/building-sources/` instead: a sibling
 * directory, outside both that glob and the `art/models/*.glb` glob above, so it can
 * neither trip the shelf assertion nor be mistaken for a bundled model. See its README.
 */
const LATE_ERA_SKILL_MODEL_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(ERA8_TO10_ASSET_URLS)
    .filter(
      ([path]) =>
        !path.includes("/townhall/") &&
        !(path.split("/").pop() as string).startsWith("civic-"),
    )
    .map(([path, url]) => [path.split("/").pop() as string, url]),
);

const MODEL_URLS: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    Object.entries(
      import.meta.glob(["./art/models/*.glb", "!./art/models/civic-*.glb"], {
        query: "?url",
        import: "default",
        eager: true,
      }) as Record<string, string>,
    ).map(([path, url]) => [path.split("/").pop() as string, url]),
  ),
  ...LATE_ERA_SKILL_MODEL_URLS,
};

/** node_id → file prefix (lowercase, dots → dashes): "NUM.S" → "num-s". */
export function nodeFilePrefix(nodeId: string): string {
  return nodeId.toLowerCase().replace(/\./g, "-");
}

/**
 * Every named skill node whose full three-stage model set is present in the live registry.
 *
 * Derived here, beside {@link MODEL_URLS}, so preload/disjointness guards consume the registry's
 * actual population rather than repeating an era list that must be edited after every art drop.
 */
export const SKILL_MODEL_NODES: readonly string[] = Object.keys(NODE_BUILDINGS).filter(
  (nodeId) =>
    MODEL_STAGES.every(
      (stage) => MODEL_URLS[`${nodeFilePrefix(nodeId)}-${stage}.glb`] !== undefined,
    ),
);

/**
 * Map a milestone build stage to the GLB file stage it renders from. `advanced`
 * reuses the `built` model (no extra export needed).
 */
export function modelStageForBuildStage(stage: BuildStage): ModelStage {
  switch (stage) {
    case "site":
      return "site";
    case "construction":
      return "construction";
    default:
      // built · advanced both render the completed model.
      return "built";
  }
}

/** How the scene renders a node at a stage: its per-node GLB, or a shared phase. */
export type ModelKind = "glb" | "site" | "construction" | "built";

/** The render descriptor the scene draws for a node at a build stage. */
export interface ResolvedBuildingModel {
  readonly node_id: string;
  readonly stage: BuildStage;
  readonly modelStage: ModelStage;
  /** How to draw this stage: this node's own GLB, or a shared procedural phase. */
  readonly kind: ModelKind;
  /** The GLB url for `kind: "glb"`; `null` for the shared procedural phases. */
  readonly url: string | null;
  /**
   * A node-specific procedural model identity. Present only where canonical concepts exist but
   * no GLB has been delivered; absent means the ordinary shared phase fallback.
   */
  readonly variantId?: string;
}

/**
 * Resolve the render descriptor for a node at a milestone stage. Each stage
 * resolves to the node's OWN GLB for that model stage (`site` → `num-*-site.glb`,
 * `construction` → `num-*-construction.glb`, `built`/`advanced` → `num-*-built.glb`).
 * Full mastery renders the plain `built` model (no gold pass). A phase with no GLB —
 * whether the node has some art and is missing one file, or has none at all — FAILS
 * CLOSED to the shared neutral procedural template for that phase. It never returns
 * `null`; see the module docblock for why an empty pad stopped being survivable.
 *
 * THE ERA IS NOT AN ARGUMENT HERE. D-ERA22'S THIRD AXIS IS NOT NEEDED FOR SKILLS.
 * Since skill buildings stopped re-dressing, `era` in that decision means the era a
 * building was RAISED in rather than the era the city is in — a property of the thing,
 * not of the moment. **Resolved 2026-08-18:** banked and catch-up skill buildings always
 * use the node's home era from `skillBuildingHomeEra(nodeId)`: static data, nothing stored,
 * and this signature stays two-way. The town hall is
 * unaffected either way: it re-themes against the live era and resolves through
 * `townHall.ts`, which has its own glob and resolver disjoint from this one.
 */
export function resolveBuildingModel(
  nodeId: string,
  stage: BuildStage,
): ResolvedBuildingModel {
  const modelStage = modelStageForBuildStage(stage);
  // `NODE_BUILDINGS` and NOT `D1_NODE_BUILDINGS`, which is the whole of era two's art being
  // reachable at all: the gate arrived from a tree where D1 was the only era with models, and
  // narrowing it here sent every era-two node down the procedural fallback with its exported
  // GLBs sitting unused on disk. `eraTwo.reachability.test.ts` fails at five nodes when this
  // reads `D1_NODE_BUILDINGS`.
  const mapped = skillBuildingHomeEra(nodeId) !== null && nodeId in NODE_BUILDINGS;
  const url = mapped
    ? MODEL_URLS[`${nodeFilePrefix(nodeId)}-${modelStage}.glb`]
    : undefined;
  if (url) {
    return {
      node_id: nodeId,
      stage,
      modelStage,
      kind: "glb",
      url,
    };
  }
  const variantId =
    modelStage === "built" ? (earlyModernVariantForNode(nodeId) ?? undefined) : undefined;
  // Fail-closed to the shared neutral procedural template for this phase
  // (`three/constructionStages.ts`). `ModelStage` and the procedural `ModelKind`s are the
  // same three words, so the phase IS the kind and there is no mapping table to fall out
  // of step with.
  return { node_id: nodeId, stage, modelStage, kind: modelStage, url: null, variantId };
}

/** Every distinct bundled GLB url across all nodes + phases (for `useGLTF.preload`). */
export function cityModelUrls(): string[] {
  return Object.values(MODEL_URLS);
}

/** Every bundled phase GLB url for one node (site + construction + built), for per-lot preload. */
export function nodeModelUrls(nodeId: string): string[] {
  const prefix = nodeFilePrefix(nodeId);
  return MODEL_STAGES.map((s) => MODEL_URLS[`${prefix}-${s}.glb`]).filter(
    (url): url is string => Boolean(url),
  );
}

/**
 * The authored stage URLs a placement can still render from its CURRENT state onward.
 *
 * Construction never runs backwards, so a restored built/advanced building owes one active
 * URL, construction owes itself plus built, and a new site may warm all three. Kept beside
 * {@link nodeModelUrls}: that function is the complete asset census; this one is the runtime
 * preload policy and deliberately returns a suffix of it.
 */
export function nodeModelPreloadUrls(nodeId: string, stage: BuildStage): string[] {
  const firstStage = modelStageForBuildStage(stage);
  const firstIndex = MODEL_STAGES.indexOf(firstStage);
  const prefix = nodeFilePrefix(nodeId);
  return MODEL_STAGES.slice(firstIndex)
    .map((modelStage) => MODEL_URLS[`${prefix}-${modelStage}.glb`])
    .filter((url): url is string => Boolean(url));
}

/**
 * The STABLE, era-neutral building name for a node ("Dwellings"), or the node id if
 * unmapped. This is the handle D-ERA9 protects and D-ERA29 keeps: it is identical in
 * all ten eras, so it is what alphabetical order, type-ahead and a screen-reader
 * user's mental map are built on. For the era-dressed form ("Dwellings, Hut Cluster")
 * call `buildingDisplayName` in `eraDressing.ts`, which leads with this string.
 */
export function buildingName(nodeId: string): string {
  return NODE_BUILDINGS[nodeId]?.building ?? nodeId;
}
