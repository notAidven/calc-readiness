import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE COSMETIC SHOP AND XP ARE GONE, AND NOTHING MAY QUIETLY BRING EITHER BACK.**
 *
 * Team lead, 2026-08-03: *"sunset the cosmetic shop and xp systems completely - they
 * dont really have a role in our game. remove it from the interface and it shouldnt
 * really have any implications anywhere."*
 *
 * ## THE POPULATION IS SCOPED BY BEHAVIOUR, AND THE OBVIOUS DERIVATION IS THE WRONG ONE
 *
 * The tempting filter is *every source containing the word "cosmetic" or "xp"*. That set
 * is dominated by PROSE: this deletion is recorded in a couple of dozen docblocks that
 * say what left and why, `packages/economy/src/index.ts` names both systems in its
 * header, and the migration's comment block is entirely about them. A word sweep would
 * fail on the documentation of the very property it is checking — which is the shape
 * `clockless.test.ts` already hit and solved by stripping comments first.
 *
 * So the question is not "where is the word" but **"what would have to be true of a
 * source for a cosmetic shop or an XP system to be POSSIBLE there"**, and the answer is
 * an identifier, a stored key, a ledger column, an enum member, a CSS class or a
 * learner-visible sentence. Each of those is a surface; a comment is not. The sweep is
 * therefore over comment-stripped code, plus a separate pass over learner copy.
 *
 * ## WHAT IS DELIBERATELY NOT SWEPT, and why each is a real distinction
 *
 * - **RESOURCES STAY.** The ten era materials, the ledger, the cap, the drill bound, the
 *   civic catalogue, roads and crisis repair are how buildings get paid for and are
 *   untouched. `EARN`, `spendable`, `materialForEra` and `applyMaterialSpend` are not in
 *   any banned list here, and the floors below assert those surfaces are still present —
 *   so a sweep that started deleting the economy would fail this file rather than pass it.
 * - **MASTERY STARS STAY.** `MasteryStars.tsx`, `masteryVisuals.ts` and the `mastery-star`
 *   sound are a VISUAL over a building. What went is the economy row that paid XP for
 *   reaching one, which is a different thing that happened to share the word "star" —
 *   hence `starGrant`/`starEventId`/`reportStar` by name below rather than `/star/`.
 * - **THE BUILD MENU IS CALLED A SHOP INTERNALLY.** `.build-shop`, `build-shop-tabs` and
 *   `findByTestId("shop-tab-…")` are the civic build panel's chrome and have nothing to do
 *   with cosmetics. The banned CSS list is `economy-shop-*` specifically, and the copy
 *   sweep is over learner-visible strings rather than class names.
 * - **ANOTHER OWNER'S LANE.** `apps/web/src/lessons/**` is Anthony's; the copy pass
 *   follows `cityCopyRegister.test.ts`'s precedent and stays out of it.
 * - **TESTS.** A test may legitimately FORGE the surface it is proving is refused — the
 *   persistence suite hands the parser a stored `xp` row and a `purchase:` spend and
 *   asserts the blob is discarded, and `winterConclusion.test.ts` quotes the exact
 *   earnings sentence it deleted so a re-introduction fails. Sweeping those would fail on
 *   the fixtures that make the property checkable, which is `clockless.test.ts`'s own
 *   reasoning for the same exclusion. **The behaviour scopes it rather than the file
 *   name**: a shop can only SHIP from a shipped source, so a shipped source is the
 *   population, and the floors below are what stop that exclusion swallowing the sweep.
 */

const repoRoot = resolveRepoRoot();

function read(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

function tracked(...pathspecs: string[]): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", ...pathspecs], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter((path) => path !== "");
}

/** Every SHIPPED source the two systems could live in — tests excluded, see the header. */
function sources(): string[] {
  return tracked("apps", "packages", "engines", "services").filter(
    (path) =>
      /\.(ts|tsx)$/.test(path) &&
      !path.endsWith(".d.ts") &&
      !/\.test\.tsx?$/.test(path) &&
      !/\/(test|__tests__)\//.test(path),
  );
}

function stylesheets(): string[] {
  return tracked("apps").filter((path) => path.endsWith(".css"));
}

function migrations(): string[] {
  return tracked("db/migrations").filter((path) => path.endsWith(".sql"));
}

/**
 * The markdown that lives WITH the code — a package README, a lane README.
 *
 * **THIS SWEEP WAS MISSING AND IT COST A WHOLE DOCUMENT.** The first version of this
 * file swept `.ts`, `.tsx`, `.css` and `.sql`, and `packages/economy/README.md` went on
 * documenting `applySpend`, `starEventId`, `purchaseEventId`, `xpLevel`,
 * `COSMETIC_CATALOG`, `validatePurchasable`, `prestigeUnlocks`, `ResourceType`,
 * `Balances` and `CosmeticDescriptor` as the package's public interface. It was found by
 * running the plain grep the QA rule asks for over the whole tree, which is exactly the
 * check the guard was supposed to make unnecessary.
 *
 * `docs/` and `work-log/` are deliberately OUT of it. Those are where a reversal is
 * RECORDED — `Contracts.md` §8 and the ratified amendment both name every deleted type
 * in their superseding notes, and must — whereas a README beside the code answers "what
 * does this package export", and there is only one right answer to that.
 */
function colocatedDocs(): string[] {
  return tracked("apps", "packages", "engines", "services").filter((path) =>
    path.endsWith(".md"),
  );
}

/**
 * Comment-stripped source. Without this the sweep is unrunnable in practice: this change
 * is RECORDED in prose across the tree, and a naive scan would fail on every docblock
 * explaining what was removed. `clockless.test.ts` takes the same step for the same
 * reason.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/**
 * **THE SURFACES, each named by an identifier that can only exist if the system is back.**
 *
 * Every entry was live in the tree before this change and is now absent, so none of these
 * is a hypothetical: the list is the deletion's own inventory, read as a prohibition.
 */
const BANNED_SYMBOLS: readonly { readonly what: string; readonly re: RegExp }[] = [
  // The catalogue and its descriptors (`packages/economy/src/resources.ts`).
  { what: "COSMETIC_CATALOG", re: /\bCOSMETIC_CATALOG\b/ },
  { what: "CosmeticDescriptor", re: /\bCosmeticDescriptor\b/ },
  { what: "CosmeticCategory or CosmeticNamespace", re: /\bCosmetic(Category|Namespace)\b/ },
  { what: "validatePurchasable", re: /\bvalidatePurchasable\b/ },
  { what: "materialPriceOf", re: /\bmaterialPriceOf\b/ },
  { what: "prestigeUnlocks", re: /\bprestigeUnlocks\b/ },
  { what: "COSMETIC_PREVIEW_CATALOG", re: /\bCOSMETIC_PREVIEW_CATALOG\b/ },
  { what: "deriveCosmeticPreview", re: /\bderiveCosmeticPreview\b/ },
  // The shop's client surface.
  { what: "purchaseCosmetic", re: /\bpurchaseCosmetic\b/ },
  { what: "equipCosmetic", re: /\bequipCosmetic\b/ },
  { what: "getInventory or InventoryView", re: /\b(getInventory|InventoryView)\b/ },
  { what: "purchaseEventId", re: /\bpurchaseEventId\b/ },
  { what: "applySpend", re: /\bapplySpend\b/ },
  // Its stored shape: a ledger column, a snapshot key, a purchase reason.
  { what: "a cosmetic_id field", re: /\bcosmetic_id\b/ },
  { what: "an owned_prestige field", re: /\bowned_prestige\b/ },
  { what: "the purchase: reason prefix", re: /["'`]purchase:/ },
  { what: "REASON_PURCHASE_PREFIX", re: /\bREASON_PURCHASE_PREFIX\b/ },
  // XP: the curve, the bands, the resource, the row that paid it.
  { what: "xpLevel or XpLevel", re: /\b[xX]pLevel\b/ },
  { what: "LEVEL_BANDS or LEVEL_TAIL_STEP", re: /\bLEVEL_(BANDS|TAIL_STEP)\b/ },
  { what: "the ResourceType union", re: /\bResourceType\b/ },
  { what: "NON_SPENDABLE_RESOURCES", re: /\bNON_SPENDABLE_RESOURCES\b/ },
  { what: "starGrant", re: /\bstarGrant\b/ },
  { what: "starEventId", re: /\bstarEventId\b/ },
  { what: "reportStar", re: /\breportStar\b/ },
  { what: "REASON_STAR", re: /\bREASON_STAR\b/ },
  // And the resource itself, as a value rather than as a word.
  { what: 'an "xp" resource literal', re: /["'`]xp["'`]\s*[,:\]}]/ },
];

/** The files that WERE the two systems. Their absence is the deletion, literally. */
const DELETED_FILES: readonly string[] = [
  "packages/economy/src/resources.ts",
  "packages/economy/src/resources.test.ts",
  "packages/economy/src/spend.ts",
  "packages/economy/src/spend.test.ts",
  "packages/economy/src/levels.ts",
  "packages/economy/src/levels.test.ts",
  "apps/web/src/economy/Shop.tsx",
  "engines/game/src/cosmetic-preview.ts",
  "engines/game/src/cosmetic-preview.test.ts",
];

/**
 * The surfaces that must still EXIST and still be about resources, so a sweep that
 * "passed" by deleting the economy fails here instead. Each is read, not merely listed.
 */
const RESOURCES_STAY: readonly { readonly path: string; readonly holds: RegExp }[] = [
  { path: "packages/economy/src/materials.ts", holds: /ERA_MATERIALS/ },
  { path: "packages/economy/src/materialSpend.ts", holds: /applyMaterialSpend/ },
  { path: "packages/economy/src/civicCatalogue.ts", holds: /CIVIC_CATALOGUE/ },
  { path: "packages/economy/src/ledger.ts", holds: /computeMaterialBalances/ },
  { path: "packages/economy/src/cap.ts", holds: /capMaxFor/ },
  { path: "apps/web/src/economy/EconomyHud.tsx", holds: /spendableMaterial/ },
  { path: "apps/web/src/city/roadsEconomy.ts", holds: /createRoadSpendEconomy/ },
  { path: "apps/web/src/city/civicEconomy.ts", holds: /createCivicMaterialEconomy/ },
];

/**
 * THE COPY PASS'S LANE. The game half, which is this change's lane, plus the economy
 * directory itself. `apps/web/src/lessons/**` is another owner's and is excluded on
 * `cityCopyRegister.test.ts`'s precedent rather than by oversight.
 */
const COPY_LANE = /^apps\/web\/src\/(city|economy|winter|completion)\//;

/** A string literal, in the three quoting forms the tree uses. */
function literals(source: string): string[] {
  const found: string[] = [];
  for (const match of code(source).matchAll(/"([^"\\\n]*)"|'([^'\\\n]*)'|`([^`\\]*)`/g)) {
    found.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return found;
}

describe("the cosmetic shop and XP leave no surface behind", () => {
  it("sweeps a real population of sources, stylesheets and migrations", () => {
    // FLOORS FIRST, so every absence below means something. A `git ls-files` that
    // returned nothing would make this whole file a clean sweep over an empty tree.
    // 400 was the floor while tests were in the population; shipped sources alone are
    // roughly half the tree, so the floor moves with the scoping rather than being left
    // at a number the population cannot reach.
    expect(sources().length, "no sources were swept").toBeGreaterThan(200);
    // And the exclusion really is an exclusion rather than the whole tree: the test files
    // it drops exist and are numerous, so "shipped sources" names a genuine subset.
    const all = tracked("apps", "packages", "engines", "services").filter((path) =>
      /\.tsx?$/.test(path),
    );
    expect(all.length - sources().length).toBeGreaterThan(100);
    expect(stylesheets().length, "no stylesheets were swept").toBeGreaterThan(3);
    expect(migrations().length, "no migrations were swept").toBeGreaterThan(5);
    for (const path of sources().slice(0, 5)) {
      expect(read(path).length, `${path} is empty`).toBeGreaterThan(0);
    }
  });

  it("holds no cosmetic or XP symbol in any shipped source", () => {
    const offenders: string[] = [];
    for (const path of sources()) {
      const source = code(read(path));
      for (const { what, re } of BANNED_SYMBOLS) {
        if (re.test(source)) {
          offenders.push(`${path}: ${what}`);
        }
      }
    }
    expect(
      offenders,
      `${offenders.length} cosmetic/XP surfaces survive the sunset`,
    ).toEqual([]);
    // And the sweep really is looking at code rather than at nothing: the banned list is
    // non-trivial and every entry is a real pattern.
    expect(BANNED_SYMBOLS.length).toBeGreaterThanOrEqual(24);
  });

  it("documents no deleted export in the markdown beside the code", () => {
    const docs = colocatedDocs();
    // A floor, because "no README names a deleted export" is trivially true of no
    // READMEs. Measured at this tip: well over a dozen.
    expect(docs.length, "no co-located markdown was swept").toBeGreaterThan(8);
    const offenders: string[] = [];
    for (const path of docs) {
      const source = read(path);
      for (const { what, re } of BANNED_SYMBOLS) {
        if (re.test(source)) {
          offenders.push(`${path}: ${what}`);
        }
      }
    }
    expect(
      offenders,
      `${offenders.length} documents still describe a deleted export`,
    ).toEqual([]);
    // And the one that DID is still swept, so this is a document that was fixed rather
    // than a path that stopped resolving.
    expect(docs).toContain("packages/economy/README.md");
    expect(read("packages/economy/README.md").length).toBeGreaterThan(2000);
  });

  it("styles no shop and no XP meter", () => {
    // `.build-shop*` is the civic BUILD panel and is deliberately not matched here; the
    // shop's own chrome was `economy-shop-*`, and the XP meter was `.economy-meter` /
    // `.economy-xp*`.
    const banned = /economy-shop|economy-meter|economy-xp|city-cosmetic/;
    for (const path of stylesheets()) {
      expect(read(path), `${path} still styles the shop or the XP meter`).not.toMatch(
        banned,
      );
    }
    // The floor with a SHAPE: the sheet that held them is still swept and is still large,
    // so the absence is a deletion rather than a file that stopped being read.
    const main = read("apps/web/src/styles.css");
    expect(main.length).toBeGreaterThan(100_000);
    expect(main, "the build menu's own chrome went with it").toMatch(/\.build-shop\b/);
  });

  it("stores no cosmetic column, no equipped table and no xp resource", () => {
    // The database is the most durable form of the same defect, so it is swept as the
    // CURRENT schema rather than file by file: `0004` legitimately still contains the
    // definitions, and `0007` is what removes them. Reading the migrations in order and
    // checking the last one undoes the first is how that is stated without pretending an
    // applied migration can be edited.
    const sunset = read("db/migrations/0007_sunset_cosmetics_and_xp.sql");
    expect(sunset).toMatch(/drop table if exists public\.equipped_cosmetic/i);
    expect(sunset).toMatch(/drop column cosmetic_id/i);
    expect(sunset).toMatch(/drop constraint resource_grant_ledger_xp_is_never_spent/i);
    expect(sunset).toMatch(/drop type public\.economy_resource/i);
    // The rebuilt enum has the ten materials and no `xp`.
    const enumBody =
      /create type public\.economy_resource_v2 as enum \(([\s\S]*?)\);/.exec(sunset)?.[1] ??
      "";
    expect(enumBody, "the migration declares no replacement enum").not.toBe("");
    expect(enumBody).not.toMatch(/'xp'/);
    expect(enumBody.match(/'/g) ?? []).toHaveLength(20); // ten quoted ids
    // A FLOOR under the whole file, so a truncated migration cannot pass on absences.
    expect(sunset.length).toBeGreaterThan(2000);
    // And 0004 really did build what 0007 removes, or this migration undoes nothing.
    const built = read("db/migrations/0004_civilization_state.sql");
    expect(built).toMatch(/create table public\.equipped_cosmetic/i);
    expect(built).toMatch(/cosmetic_id text/i);
  });

  it("says XP, shop or cosmetic to no learner, in the game lane's own copy", () => {
    const lane = sources().filter((path) => COPY_LANE.test(path));
    // A floor on the lane, because "no copy says XP" is trivially true of no copy.
    expect(lane.length, "the copy lane swept nothing").toBeGreaterThan(40);
    let scanned = 0;
    const offenders: string[] = [];
    for (const path of lane) {
      for (const literal of literals(read(path))) {
        // Prose only: a sentence, not an id, a class name or a test id.
        if (literal.length < 12 || !/\s/.test(literal)) {
          continue;
        }
        scanned += 1;
        /*
         * AND "THE SHOP", WHICH THIS TEST'S OWN NAME CLAIMED AND ITS CONDITION DID NOT CHECK.
         *
         * Measured rather than supposed: with `XP` and `cosmetic` alone, the first-run advisor's
         * stockpile moment shipped *"The Shop spends stone on how the city looks"* — a tutorial
         * teaching a learner to go and find a surface that had been deleted — and this file was
         * green over it, because the sentence names neither of the other two words.
         *
         * **`the Shop` rather than `Shop`, and the difference was measured too.** A bare
         * `\bshops?\b` reddens on `eraDressing.ts`'s *"the Stonecutters' Shop"* and *"the
         * Surveyor's Shop"*, which are era building NAMES and nothing to do with the deleted
         * surface. The definite article is how the cosmetic surface was always referred to and a
         * possessive never produces it, so this separates the two without an exemption list.
         *
         * The residual, named: prose that referred to it some other way — "spend stone on how the
         * city looks" — is not caught by any of the three. That is why the deletion sweeps above
         * are over the FILES and the routes, and this one is the backstop for copy.
         */
        if (
          /\bXP\b/.test(literal) ||
          /\bcosmetics?\b/i.test(literal) ||
          /\bthe shops?\b/i.test(literal)
        ) {
          offenders.push(`${path}: ${literal.trim()}`);
        }
      }
    }
    expect(scanned, "no learner-facing prose was collected").toBeGreaterThan(300);
    expect(offenders, `${offenders.length} sentences still name XP or a cosmetic`).toEqual(
      [],
    );
  });

  it("has deleted the files that WERE the two systems", () => {
    const all = new Set(tracked("apps", "packages", "engines", "services"));
    for (const path of DELETED_FILES) {
      expect(all.has(path), `${path} is back`).toBe(false);
    }
    expect(DELETED_FILES.length).toBeGreaterThanOrEqual(9);
  });

  it("KEEPS the resources, which is the half of this that is not a deletion", () => {
    // The other direction, and the one that stops this file being satisfied by an empty
    // economy. Each surface is READ, so a path that stopped resolving fails here rather
    // than quietly dropping out of the claim.
    for (const { path, holds } of RESOURCES_STAY) {
      // COMMENT-STRIPPED, like every other pass here. Read raw, this check is satisfied
      // by a docblock that still NAMES the function — measured: renaming
      // `applyMaterialSpend` in its declaration and leaving its header untouched passed.
      const source = code(read(path));
      expect(source.length, `${path} is empty`).toBeGreaterThan(200);
      expect(source, `${path} no longer holds ${holds}`).toMatch(holds);
    }
    expect(RESOURCES_STAY.length).toBeGreaterThanOrEqual(8);
    // And the ledger still admits exactly the ten materials, which is the resource axis
    // itself rather than a file that mentions it.
    const types = read("packages/economy/src/types.ts");
    expect(types).toMatch(/export const MATERIAL_IDS/);
    expect((types.match(/^ {2}"[a-z]+",$/gm) ?? []).length).toBeGreaterThanOrEqual(10);
  });
});
