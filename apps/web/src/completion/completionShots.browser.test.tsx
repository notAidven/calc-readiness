import {
  canonicalRawAnswer,
  DIAGNOSTIC_WALK_ITEM_PACK,
  wellFormedWrongRawAnswer,
} from "@cr/item-bank";
import type { AssessmentPurpose, UUID } from "@cr/state-schema";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { CitySurface } from "../city/CitySurface";
import {
  createInMemoryDiagnosticClient,
  DIAGNOSTIC_CHECKER_VERSION,
} from "../diagnostic/browserRuntime";
import type { DiagnosticClient } from "../diagnostic/session";
import {
  findButton,
  type Harness,
  mount,
  setInputValue,
  waitFor,
} from "../lessons/testHarness";
import { CompletionCeremony } from "./CompletionCeremony";
import { COMPLETION_CEREMONY_STORAGE_KEY } from "./completionState";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * A PICTURE OF THE GROWTH READING, over the city, at a short viewport.
 *
 * The standing ceremony is photographable from a running dev server
 * (`output/completion/shots.mjs`) because it is what the offline path gives every
 * learner. The GROWTH one is not: it needs a baseline that survives to the retake,
 * and on the offline path administrations live in a per-instance `Map` that dies with
 * the component (D-END12). So the only way to look at it is to hand the ceremony a
 * client that already holds a pre, which is what the `client` prop is for.
 *
 * **What is and is not production-faithful here.** The city under the sheet is the
 * real `CitySurface` with the real stylesheet; the ceremony is mounted as a SIBLING
 * of it rather than a child, because `CitySurface` builds its own client and has no
 * seam to inject one. That changes nothing about the layout under test: the ceremony
 * is a `position: fixed` overlay, so its box is resolved against the viewport either
 * way. It is stated rather than glossed.
 *
 * Not a visual-regression suite, on `crisisCallShots.browser.test.tsx`'s precedent:
 * nothing compares against a stored baseline. Its assertions are that the shot was
 * taken and that the surface photographed was the growth reading and not the
 * fallback, which is what stops it reporting success over a picture of the wrong
 * branch. The PNGs land under `__screenshots__/`, which `.gitignore` already excludes.
 *
 * Regenerate with:
 *   npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/completion/completionShots.browser.test.tsx
 */

/**
 * A short, realistic laptop. Named because a frame whose viewport is unstated says
 * nothing about anybody's screen, and because the sheet's `min(74vh, 560px)` cap
 * resolves to 429px here and 560px on a tall monitor.
 */
const SHORT_LAPTOP = { width: 1024, height: 580 };

const ITEM_BY_ID = new Map(
  DIAGNOSTIC_WALK_ITEM_PACK.map((entry) => [entry.item_version_id, entry] as const),
);

/**
 * The guard on both walks below is the ENGINE's own instrument ceiling
 * (`DEFAULT_WALK_POLICY.maxItems`), not a number chosen to fit: the check runs the
 * content-derived scope, measured at a median of 23 items and a worst case of 35 over 6,000
 * simulated walks, so a run that passes 70 is a defect and not a slow test.
 */
const MAX_QUESTIONS = 70;

function probeItem(itemVersionId: string) {
  const entry = ITEM_BY_ID.get(itemVersionId);
  if (!entry) {
    throw new Error(`served an item the diagnostic pack does not carry: ${itemVersionId}`);
  }
  return entry;
}

const STUDENT = "00000000-0000-4000-8000-00000000ce02" as UUID;
const LAST_ERA = "cyberpunk" as const;

let city: Harness | null = null;
let ending: Harness | null = null;
let restore: { width: number; height: number } | null = null;

/**
 * Drive a whole administration with no UI, to give the ceremony a learner with a baseline.
 *
 * `equivalence_checker_version` comes from the browser runtime rather than the literal 1 it
 * used to be: both checkers fail closed on a mismatch, so a hardcoded stamp against the
 * composed v2 checker scores `scoring_error` on every item, and `isScorable` refuses that,
 * so the walk re-serves the same probe until the guard trips. That is what this file did
 * when the checker moved.
 */
async function driveAdministration(
  client: DiagnosticClient,
  purpose: AssessmentPurpose,
  correct: boolean,
): Promise<void> {
  const run = client.begin(purpose);
  const served = await run.start();
  let item = served.items[0];
  for (let asked = 0; asked < MAX_QUESTIONS && item; asked += 1) {
    const entry = probeItem(item.item_version_id);
    const advance = await run.submitStage([
      {
        administration_id: served.administrationId,
        item_version_id: item.item_version_id,
        node_id: item.node_id,
        raw_answer: correct
          ? canonicalRawAnswer(entry.answer)
          : wellFormedWrongRawAnswer(entry),
        item_definition_hash: item.item_definition_hash,
        equivalence_checker_version: DIAGNOSTIC_CHECKER_VERSION,
        client_correct: correct,
      },
    ]);
    if (advance.complete) {
      await run.finalize();
      return;
    }
    item = advance.items[0];
  }
  throw new Error(`${purpose} did not complete within the guard`);
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
  localStorage.setItem("cr.onboarding.demoSeen", "true");
  localStorage.setItem("cr.coach.skipAll", "true");
});

afterAll(async () => {
  localStorage.removeItem(COMPLETION_CEREMONY_STORAGE_KEY);
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  ending?.cleanup();
  city?.cleanup();
  ending = null;
  city = null;
});

test("the growth reading, over the city, at 1024x580", async () => {
  // The baseline: a first day where nothing came out. One client for both sittings is
  // what makes them a pair, counterbalanced onto the two forms by the runtime.
  const client = createInMemoryDiagnosticClient(STUDENT);
  await driveAdministration(client, "pre", false);

  // The 3D canvas is off: headless Chromium has no reliable WebGL here, and the claim
  // under test is what the SHEET leaves visible of the surface, which the HUD, the
  // roster, the build button and the island frame all show.
  city = mount(<CitySurface enableCanvas={false} />);
  await waitFor(
    () => document.querySelectorAll("button").length > 4,
    "the city surface to come up",
    20_000,
  );

  ending = mount(<CompletionCeremony eraId={LAST_ERA} onExit={() => {}} client={client} />);
  await waitFor(
    () => document.querySelector('[data-testid="completion-ceremony"]') !== null,
    "the ending to open",
  );

  findButton(ending.host, /Sit the last check/).click();
  await waitFor(
    () => document.querySelector(".completion__item") !== null,
    "the first question",
    20_000,
  );

  for (let asked = 0; asked < MAX_QUESTIONS; asked += 1) {
    const card = document.querySelector<HTMLElement>(".completion__item");
    if (!card) {
      break;
    }
    const id = card.getAttribute("data-item-version-id") ?? "";
    // EVERY text field, not the first: the answer row is dispatched per shape now, and
    // `rational_answer` renders two — the simplified expression and the values the original
    // denominator forbids — which the comparator grades together and rejects a bare string
    // for. Filling one leaves an `invalid_input`, which is not scorable, so the walk would
    // re-serve this question until the guard tripped.
    const fields = Array.from(
      card.querySelectorAll<HTMLInputElement>("input[type='text']"),
    );
    if (fields.length === 0) {
      throw new Error("the question card has no answer field");
    }
    const answer = canonicalRawAnswer(probeItem(id).answer);
    if (typeof answer === "string") {
      setInputValue(fields[0] as HTMLInputElement, answer);
    } else {
      const payload = (answer ?? {}) as { expression?: unknown; excluded_values?: unknown };
      setInputValue(fields[0] as HTMLInputElement, String(payload.expression ?? ""));
      if (fields[1]) {
        setInputValue(
          fields[1],
          Array.isArray(payload.excluded_values)
            ? payload.excluded_values.join(", ")
            : String(payload.excluded_values ?? ""),
        );
      }
    }
    findButton(card, /Submit answer/).click();
    await waitFor(
      () =>
        document.querySelector('[data-testid="completion-reading"]') !== null ||
        document
          .querySelector(".completion__item")
          ?.getAttribute("data-item-version-id") !== id,
      "the next question or the reading",
      20_000,
    );
    if (document.querySelector('[data-testid="completion-reading"]')) {
      break;
    }
  }

  const reading = document.querySelector<HTMLElement>('[data-testid="completion-reading"]');
  expect(reading, "the retake never reached the reading").not.toBeNull();

  // THE SHOT IS OF THE GROWTH BRANCH. Without this the file would happily photograph
  // the fallback and report success, which is the whole failure mode it has to avoid.
  expect(reading?.getAttribute("data-kind")).toBe("growth");
  expect(
    document.querySelector('[data-testid="completion-aggregate"]'),
    "the growth reading must show its supporting delta (D-END7)",
  ).not.toBeNull();

  if (CAPTURE_EVIDENCE) {
    await page.screenshot({
      path: "__screenshots__/completion/growth-reading-1024x580.png",
    });
  }

  // And the sheet leaves the city around it, at THIS viewport. The frame is the
  // evidence; this is the arithmetic beside it, so a reviewer knows what to look for.
  const sheet = document
    .querySelector(".completion__card")
    ?.getBoundingClientRect() as DOMRect;
  expect(sheet.height).toBeLessThan(window.innerHeight - 80);
  expect(sheet.width).toBeLessThan(window.innerWidth - 200);
});
