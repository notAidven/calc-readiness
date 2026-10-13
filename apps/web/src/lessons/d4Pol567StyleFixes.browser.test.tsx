/**
 * D4 POL.5–POL.7 style fixes — spatial frames at 1024×580 on the learner mount.
 *
 * These use the shipped full-viewport `WorldScene size="large"` rather than a direct figure
 * mount. Panel tokens live on `.city-shell`, not at `:root`, so the test host takes that class
 * before any frame is read.
 */

import type { FrozenItem } from "@cr/item-bank";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { WorldScene } from "../city/WorldScene";
import { AdvisorLesson } from "./AdvisorLesson";
import { lessonByNode } from "./domains";
import { LessonPractice } from "./LessonPractice";
import { practiceItemsById } from "./practiceChecker";
import { fixedSource } from "./practiceSurfaceFixture";
import { type Harness, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const VIEWPORT = { width: 1024, height: 580 } as const;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function mountLearnerScene(title: string, children: ReactNode): HTMLElement {
  h = mount(
    <WorldScene
      eyebrow="Polynomial workshop · lesson"
      title={title}
      tone="lesson"
      size="large"
      onExit={() => {}}
    >
      {children}
    </WorldScene>,
  );
  h.host.className = "city-shell";
  return h.host;
}

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  expect(window.innerWidth, "viewport width").toBe(VIEWPORT.width);
  if (CAPTURE_EVIDENCE) {
    expect(
      await page.screenshot({
        path: `__screenshots__/d4-pol567-style-fixes/${name}-1024x580.png`,
      }),
      `no frame for ${name}`,
    ).toBeTruthy();
  }
}

async function waitForTypeset(host: HTMLElement): Promise<void> {
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("svg foreignObject")).every(
        (box) => box.querySelector(".katex") !== null,
      ) || host.querySelectorAll("svg foreignObject").length === 0,
    "diagram typesets",
    20_000,
  );
}

async function assertLearnerMount(host: HTMLElement): Promise<void> {
  await waitFor(
    () => host.querySelector(".world-scene--large .coc-card") !== null,
    "learner scene mounts",
  );
  const scene = host.querySelector(".world-scene--large");
  expect(scene, "frame uses the shipped height-capped learner scene").toBeTruthy();
  const card = scene?.querySelector<HTMLElement>(".coc-card");
  expect(card, "frame includes the learner card").toBeTruthy();
  if (!card) {
    throw new Error("learner scene produced no card");
  }
  card.style.animation = "none";
  expect(getComputedStyle(card).maxHeight, "learner card stays height-capped").not.toBe(
    "none",
  );
}

function practiceItem(
  templateId: string,
  accepts: (item: FrozenItem) => boolean = () => true,
): FrozenItem {
  const candidates = [...practiceItemsById.values()].filter(
    (item) => item.template_id === templateId,
  );
  expect(candidates.length, `${templateId} has no served practice item`).toBeGreaterThan(0);
  const item = candidates.find(accepts);
  if (!item) {
    throw new Error(`${templateId} has no served item matching the frame's branch`);
  }
  return item;
}

function button(host: HTMLElement, label: RegExp): HTMLButtonElement | undefined {
  return Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find((candidate) =>
    label.test((candidate.textContent ?? "").trim()),
  );
}

async function revealPracticeFigure(host: HTMLElement): Promise<HTMLElement> {
  await waitFor(
    () => host.querySelector(".lesson-practice") !== null,
    "practice card mounts",
  );
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const reveal = button(host, /^Reveal answer$/);
    if (reveal) {
      reveal.click();
      await waitFor(
        () => host.querySelector(".worked-solution--figure") !== null,
        "worked figure renders",
      );
      const figure = host.querySelector<HTMLElement>(".worked-solution--figure");
      if (!figure) {
        throw new Error("practice reveal produced no worked figure");
      }
      return figure;
    }
    const hint = button(host, /^Show hint/);
    if (!hint) {
      throw new Error("practice has neither another hint nor a reveal");
    }
    hint.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("practice did not offer its reveal after every hint");
}

function lastPol6Slide(): LessonContent {
  const lesson = lessonByNode["POL.6"];
  const prose = lesson?.mini_lesson[3];
  const visual = lesson?.visuals?.find(
    (entry) => entry.id === "end-behavior-describe-order",
  );
  if (!lesson || !prose || !visual) {
    throw new Error("POL.6 no longer places end-behavior-describe-order on its last slide");
  }
  return {
    ...lesson,
    mini_lesson: [prose],
    slide_subtitles: [lesson.slide_subtitles?.[3] ?? "The leading coefficient"],
    // Every positional array is re-sliced with the prose, not just the ones this test
    // reads: `worked_examples` is indexed by slide, so the spread's four entries would
    // pair slide 3's paragraph with slide 0's example. No assertion below observes that,
    // and removing this line leaves the file green -- it is here so the fixture is not
    // lying about which slide it claims to be, for whoever asserts on the card next.
    worked_examples: [lesson.worked_examples?.[3] ?? null],
    visuals: [{ ...visual, after: 0 }],
  };
}

test("POL.5 extreme-from-factored: axis labels clear of the figure bottom at 1024×580", async () => {
  const item = practiceItem(
    "d4.pol5.extreme-from-factored.l3",
    (candidate) => (candidate.template_params.a ?? 0) > 0,
  );
  const lesson = lessonByNode[item.node_id];
  const host = mountLearnerScene(
    lesson?.title ?? item.node_id,
    <LessonPractice nodeId={item.node_id} source={fixedSource(item)} />,
  );
  await assertLearnerMount(host);
  const figure = await revealPracticeFigure(host);
  await waitForTypeset(figure);

  const svg = figure.querySelector("svg");
  expect(svg, "CrossingsFigure svg").toBeTruthy();
  if (!svg) {
    return;
  }
  const svgBox = svg.getBoundingClientRect();
  const katexNodes = Array.from(figure.querySelectorAll("svg foreignObject .katex"));
  expect(katexNodes.length, "three axis labels").toBe(3);

  const inkRects = katexNodes.map((node) => node.getBoundingClientRect());
  const bottomInk = Math.max(...inkRects.map((rect) => rect.bottom));
  const margin = svgBox.bottom - bottomInk;
  expect(margin, "ink gap above svg bottom").toBeGreaterThan(4);

  figure.scrollIntoView({ block: "center" });
  await shoot("pol5-extreme-from-factored-l3");
});

test("POL.6 EndBehaviorDescribeOrder: sign chip is sans-serif prose at 1024×580", async () => {
  const content = lastPol6Slide();
  const host = mountLearnerScene(content.title, <AdvisorLesson content={content} />);
  await assertLearnerMount(host);
  // The slide is lecture, worked example, activity since the three-section migration, so
  // the widget is more than one Next away and a fixed number of clicks would pin the
  // section count of the day rather than the widget this test is about.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (host.querySelector(".lesson-sorter__chip")) {
      break;
    }
    await waitFor(() => button(host, /^Next$/) !== undefined, "the slide offers Next");
    button(host, /^Next$/)?.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  await waitFor(() => host.querySelector(".lesson-sorter__chip") !== null, "chips mount");

  const signChip = Array.from(
    host.querySelectorAll<HTMLElement>(".lesson-sorter__chip"),
  ).find((chip) => (chip.textContent ?? "").includes("Leading coefficient is negative"));
  expect(signChip, "sign chip present").toBeTruthy();
  if (!signChip) {
    return;
  }

  expect(signChip.querySelector(".katex"), "sign chip is not KaTeX").toBeNull();
  expect(signChip.querySelector("span"), "sign chip is plain prose").toBeTruthy();

  const proseChips = Array.from(
    host.querySelectorAll<HTMLElement>(".lesson-sorter__chip"),
  ).filter((chip) => chip.querySelector("span") && !chip.querySelector(".katex"));
  expect(proseChips.length, "at least two prose chips").toBeGreaterThanOrEqual(2);

  host.querySelector(".lesson-sorter")?.scrollIntoView({ block: "center" });
  await shoot("pol6-end-behavior-describe-order-sign");
});

test("POL.7 zeros-from-factored: header has normal word spacing at 1024×580", async () => {
  const item = practiceItem("d4.pol7.zeros-from-factored.l1");
  const lesson = lessonByNode[item.node_id];
  const host = mountLearnerScene(
    lesson?.title ?? item.node_id,
    <LessonPractice nodeId={item.node_id} source={fixedSource(item)} />,
  );
  await assertLearnerMount(host);
  const figure = await revealPracticeFigure(host);
  await waitForTypeset(figure);

  const header = Array.from(figure.querySelectorAll("svg text")).find(
    (node) => node.textContent === "each bracket, set to zero",
  );
  expect(header, "plain SVG header text").toBeTruthy();
  expect(figure.textContent ?? "", "header not concatenated").toContain(
    "each bracket, set to zero",
  );
  expect(figure.textContent ?? "", "no garbled header").not.toMatch(/texteachbracket/i);

  figure.scrollIntoView({ block: "center" });
  await shoot("pol7-zeros-from-factored-l1");
});
