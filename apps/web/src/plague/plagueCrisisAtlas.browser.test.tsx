import {
  createPlague,
  PLAGUE,
  PLAGUE_ERA,
  type PlagueAction,
  type PlagueState,
  plagueReducer,
} from "@cr/game";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { CitySurface } from "../city/CitySurface";
import { MOCK_CITY_LOAD } from "../city/mockCity";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import type { PlagueSession } from "./plaguePersistence";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_PLAGUE_CARE_SHOTS);
const DESKTOP = { width: 1024, height: 580 } as const;
const PHONE = { width: 390, height: 580 } as const;
const OUT = "output/design-review/plague-winter-standard";

const FRAMES = [
  "after-opening-1024x580",
  "after-mid-spread-1024x580",
  "after-intervention-1024x580",
  "after-contained-resolution-1024x580",
  "after-lost-resolution-1024x580",
  "after-opening-390x580",
  "after-mid-spread-390x580",
  "after-intervention-390x580",
  "after-contained-resolution-390x580",
  "after-intervention-reduced-motion-1024x580",
] as const;

test("the Plague review atlas covers every required state and viewport", () => {
  expect(new Set(FRAMES).size).toBe(FRAMES.length);
  for (const state of ["opening", "mid-spread", "intervention", "resolution"]) {
    expect(
      FRAMES.some((frame) => frame.includes(state)),
      state,
    ).toBe(true);
  }
  expect(
    FRAMES.filter((frame) => frame.includes("1024x580")).length,
  ).toBeGreaterThanOrEqual(5);
  expect(FRAMES.filter((frame) => frame.includes("390x580")).length).toBeGreaterThanOrEqual(
    4,
  );
  expect(FRAMES.some((frame) => frame.includes("reduced-motion"))).toBe(true);
});

const QUESTIONS = ["q1", "q2", "q3"] as const;

function resolve(state: PlagueState, action: PlagueAction, correct: number): PlagueState {
  let next = plagueReducer(state, {
    type: "choose_action",
    action,
    question_ids: QUESTIONS.map((id) => `${id}-r${state.round}`),
    expected_revision: state.revision,
  });
  for (let index = 0; index < PLAGUE.batch_size; index += 1) {
    next = plagueReducer(next, {
      type: "answer",
      question_id: next.question_ids[next.answers.length] as string,
      correct: index < correct,
      expected_revision: next.revision,
    });
  }
  return next;
}

function advance(state: PlagueState): PlagueState {
  return plagueReducer(state, { type: "advance", expected_revision: state.revision });
}

function reviewStates(): {
  readonly opening: PlagueState;
  readonly midSpread: PlagueState;
  readonly intervention: PlagueState;
  readonly contained: PlagueState;
  readonly lost: PlagueState;
} {
  const opening = createPlague();
  const midSpread = advance(
    resolve(opening, { kind: "quarantine", route_id: "market-care" }, 0),
  );
  const intervention = resolve(
    midSpread,
    { kind: "quarantine", route_id: "printworks-chapel" },
    2,
  );

  let contained = advance(
    resolve(createPlague(), { kind: "quarantine", route_id: "market-care" }, 3),
  );
  contained = advance(
    resolve(contained, { kind: "quarantine", route_id: "printworks-chapel" }, 3),
  );

  let lost = midSpread;
  lost = advance(resolve(lost, { kind: "quarantine", route_id: "printworks-chapel" }, 0));
  lost = advance(resolve(lost, { kind: "care", node_id: "chapel" }, 0));

  expect(contained.outcome?.verdict).toBe("contained");
  expect(lost.outcome?.verdict).toBe("lost");
  return { opening, midSpread, intervention, contained, lost };
}

function fixedSession(initial: PlagueState): PlagueSession {
  let state = initial;
  return {
    load: async () => state,
    start: async () => state,
    dispatch: async (event) => {
      state = plagueReducer(state, event);
      return state;
    },
  };
}

let harness: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

async function open(
  state: PlagueState,
  viewport: { readonly width: number; readonly height: number },
  reducedMotion = false,
): Promise<void> {
  await page.viewport(viewport.width, viewport.height);
  harness = mount(
    <div className="city-shell">
      <CitySurface
        enableCanvas
        reducedMotion={reducedMotion}
        eraId={PLAGUE_ERA}
        loadCity={async () => MOCK_CITY_LOAD}
        plagueSession={fixedSession(state)}
        initialPlagueInCity
        onOpenSurface={() => undefined}
      />
      <style>
        {".achievement-note, [data-testid='ob-dev-replay'] { display: none !important; }"}
      </style>
    </div>,
  );
  await waitFor(
    () =>
      document.querySelector(".city-viewport canvas") !== null &&
      document.querySelector('[data-testid="pl-care-house"]') !== null,
    "the live-city Plague frame never mounted",
    30000,
  );
  await document.fonts.ready;
  // The canvas exists before the procedural island's first shadowed frame has landed.
  await new Promise((resolve) => window.setTimeout(resolve, 1200));
}

function testerBox(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (frame === null) {
    throw new Error("the browser test has no tester frame");
  }
  const box = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

async function capture(name: string): Promise<void> {
  const session = cdp() as unknown as {
    send(
      method: string,
      params: Record<string, unknown>,
    ): Promise<{ readonly data: string }>;
  };
  const box = testerBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (SHOTS) {
    await commands.writeFile(`${OUT}/${name}.png`, shot.data, { encoding: "base64" });
  }
}

function closeMount(): void {
  harness?.cleanup();
  harness = null;
}

test.runIf(SHOTS)(
  "captures full-surface Plague opening, spread, intervention, and endings",
  async () => {
    const states = reviewStates();
    for (const [name, state] of [
      [FRAMES[0], states.opening],
      [FRAMES[1], states.midSpread],
      [FRAMES[2], states.intervention],
      [FRAMES[3], states.contained],
      [FRAMES[4], states.lost],
    ] as const) {
      await open(state, DESKTOP);
      await capture(name);
      closeMount();
    }
    for (const [name, state] of [
      [FRAMES[5], states.opening],
      [FRAMES[6], states.midSpread],
      [FRAMES[7], states.intervention],
      [FRAMES[8], states.contained],
    ] as const) {
      await open(state, PHONE);
      await capture(name);
      closeMount();
    }
    await open(states.intervention, DESKTOP, true);
    expect(
      document.querySelector<HTMLElement>(".city-surface")?.dataset.reducedMotion,
    ).toBe("true");
    await capture(FRAMES[9]);
  },
  600000,
);
