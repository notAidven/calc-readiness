import type { FrozenItem } from "@cr/item-bank";
import { cleanup, render } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { cdp, page } from "vitest/browser";

import { WorldScene } from "../city/WorldScene";
import type { StoredWorkUpload, WorkParseClient, WorkUploadStore } from "../work-upload";
import { LessonPractice } from "./LessonPractice";
import { practiceItemsById } from "./practiceChecker";
import { fixedSource } from "./practiceSurfaceFixture";
import { waitFor } from "./testHarness";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const VIEW = { width: 1024, height: 580 } as const;
const found = [...practiceItemsById.values()].find(
  (candidate) => candidate.hints.length > 0,
);
if (!found) throw new Error("no practice item has a reveal path");
const item: FrozenItem = found;

let restore: { width: number; height: number } | null = null;

function session() {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  };
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(VIEW.width, VIEW.height);
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
});

afterAll(async () => {
  cleanup();
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  if (restore) await page.viewport(restore.width, restore.height);
});

function button(label: RegExp): HTMLButtonElement {
  const foundButton = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => label.test(candidate.textContent ?? ""),
  );
  if (!foundButton) throw new Error(`no button matching ${label}`);
  return foundButton;
}

async function reveal(): Promise<void> {
  for (let index = 0; index < item.hints.length; index += 1) {
    button(/show hint/i).click();
    await waitFor(
      () => document.querySelectorAll(".lesson-practice__hint").length === index + 1,
      `hint ${index + 1}`,
    );
  }
  button(/^reveal answer$/i).click();
  await waitFor(
    () => document.querySelector(".work-upload__input") !== null,
    "upload mount",
  );
}

async function selectPhoto(): Promise<void> {
  const input = document.querySelector<HTMLInputElement>(".work-upload__input");
  if (!input) throw new Error("no photo input");
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 240;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas context for the real photo fixture");
  context.fillStyle = "#fffdf6";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#26384a";
  context.font = "28px sans-serif";
  context.fillText("3x + 5 = 20", 38, 75);
  context.fillText("3x = 25", 38, 125);
  context.fillText("x = 25/3", 38, 175);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("canvas did not encode the photo fixture");
  const transfer = new DataTransfer();
  transfer.items.add(new File([blob], "paper-work.png", { type: "image/png" }));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 80));
  expect(window.innerWidth).toBe(VIEW.width);
  if (CAPTURE_EVIDENCE) {
    expect(
      await page.screenshot({ path: `__screenshots__/work-checker/${name}-1024x580.png` }),
    ).toBeTruthy();
  }
}

test("the consent and provisional-reading states fit the learner's 1024x580 lesson mount", async () => {
  const stored: StoredWorkUpload = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    association: {
      surface: "lesson-practice",
      node_id: item.node_id,
      item_version_id: item.item_version_id,
    },
    contentType: "image/png",
    sizeBytes: 1024,
    createdAt: "2026-08-06T12:00:00.000Z",
    objectKey: "work-uploads/student/paper-work.png",
    status: "uploaded",
  };
  const store: WorkUploadStore = {
    upload: async () => stored,
    remove: async () => {},
    list: async () => [],
  };
  const parseClient: WorkParseClient = {
    read: async () => ({
      uploadId: stored.id,
      outcome: "read",
      steps: ["3x + 5 = 20", "3x = 25", "x = 25/3"],
      suspectStepIndex: 1,
      confidence: 0.86,
      provisional: true,
      headline: "Here's what we read. Correct us if we got it wrong.",
      caveat: "This automated transcription can be wrong. It never changes your progress.",
      parserId: "bedrock-converse",
      modelId: "qwen.qwen3-vl-235b-a22b",
      createdAt: "2026-08-06T12:00:01.000Z",
    }),
  };
  render(
    <div className="city-shell">
      <WorldScene
        eyebrow={`${item.node_id} · mini-lesson`}
        title="Practice your skill"
        size="large"
        onExit={() => {}}
      >
        <LessonPractice
          nodeId={item.node_id}
          source={fixedSource(item)}
          workUploadStore={store}
          workParseClient={parseClient}
        />
      </WorldScene>
    </div>,
  );

  expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
  await reveal();
  const dropzone = document.querySelector<HTMLElement>(".work-upload__dropzone");
  if (!dropzone) throw new Error("no photo dropzone");
  expect(getComputedStyle(dropzone).transitionDuration).toBe("0s");
  await selectPhoto();
  await waitFor(() => /ready to save/i.test(document.body.textContent ?? ""), "preview");
  document.querySelector<HTMLElement>(".work-upload")?.scrollIntoView({ block: "center" });
  await shoot("photo-preview");
  button(/save for review/i).click();
  await waitFor(() => /saved for review/i.test(document.body.textContent ?? ""), "saved");

  const parseCard = document.querySelector<HTMLElement>(".work-parse");
  if (!parseCard) throw new Error("no parse consent card");
  parseCard.scrollIntoView({ block: "center" });
  for (const control of document.querySelectorAll<HTMLElement>(
    ".work-upload__btn, .work-parse__btn, .work-parse__consent",
  )) {
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  }
  await shoot("consent");

  const consent = document.querySelector<HTMLInputElement>(".work-parse__consent input");
  if (!consent) throw new Error("no consent checkbox");
  consent.focus();
  expect(document.activeElement).toBe(consent);
  consent.click();
  button(/read my working/i).click();
  await waitFor(() => /3x = 25/.test(document.body.textContent ?? ""), "reading");
  document.querySelector<HTMLElement>(".work-parse")?.scrollIntoView({ block: "center" });

  expect(document.body.textContent ?? "").toContain("Provisional automated transcription");
  expect(document.body.textContent ?? "").toContain("Where the work stopped matching");
  expect(button(/move on/i).disabled).toBe(false);
  await shoot("provisional-reading");
});
