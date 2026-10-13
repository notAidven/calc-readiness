import type { FrozenItem } from "@cr/item-bank";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createHttpWorkParseClient,
  type StoredWorkUpload,
  type WorkUploadStore,
} from "../work-upload";
import { LessonPractice } from "./LessonPractice";
import { practiceItemsById } from "./practiceChecker";
import { fixedSource } from "./practiceSurfaceFixture";
import { waitFor } from "./testHarness";

import "../styles.css";

const foundItem = [...practiceItemsById.values()].find(
  (candidate): candidate is FrozenItem => candidate.hints.length > 0,
);
if (!foundItem) {
  throw new Error("the practice pool has no item with a reveal path");
}
const item: FrozenItem = foundItem;

const stored: StoredWorkUpload = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  association: {
    surface: "lesson-practice",
    node_id: item.node_id,
    item_version_id: item.item_version_id,
    template_id: item.template_id,
  },
  contentType: "image/png",
  sizeBytes: 1024,
  createdAt: "2026-08-06T12:00:00.000Z",
  objectKey: `work-uploads/student/${item.item_version_id}/photo.png`,
  status: "uploaded",
};

function button(label: RegExp): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => label.test(candidate.textContent ?? ""),
  );
  if (!found) {
    throw new Error(`no button matching ${label}`);
  }
  return found;
}

function text(): string {
  return document.body.textContent ?? "";
}

async function reveal(): Promise<void> {
  for (let index = 0; index < item.hints.length; index += 1) {
    button(/show hint/i).click();
    await waitFor(
      () => document.querySelectorAll(".lesson-practice__hint").length === index + 1,
      `hint ${index + 1} is shown`,
    );
  }
  button(/^reveal answer$/i).click();
  await waitFor(
    () => document.querySelector(".work-upload__input") !== null,
    "the post-reveal upload is mounted",
  );
}

function selectPhoto(): void {
  const input = document.querySelector<HTMLInputElement>(".work-upload__input");
  if (!input) {
    throw new Error("the revealed practice flow mounted no photo input");
  }
  const transfer = new DataTransfer();
  transfer.items.add(new File([new Uint8Array(1024)], "work.png", { type: "image/png" }));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function consent(): HTMLInputElement {
  const found = document.querySelector<HTMLInputElement>(
    '.work-parse__consent input[type="checkbox"]',
  );
  if (!found) {
    throw new Error("the saved photo mounted no automated-reading consent");
  }
  return found;
}

afterEach(cleanup);

describe("the learner work-checker contract, through the real post-reveal mount", () => {
  it("uploads, asks for separate consent, requests the parse, renders it provisionally, and deletes", async () => {
    const remove = vi.fn(async () => {});
    const store: WorkUploadStore = {
      upload: vi.fn(async () => stored),
      remove,
      list: async () => [],
    };
    const fetchParse = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            parse: {
              uploadId: stored.id,
              outcome: "read",
              steps: ["3x + 5 = 20", "3x = 25", "x = 25/3"],
              suspectStepIndex: 1,
              confidence: 0.86,
              provisional: true,
              headline: "Here's what we read. Correct us if we got it wrong.",
              caveat:
                "This automated transcription can be wrong and never changes your progress.",
              parserId: "bedrock-converse",
              modelId: "qwen.qwen3-vl-235b-a22b",
              createdAt: "2026-08-06T12:00:01.000Z",
            },
            cached: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const parseClient = createHttpWorkParseClient({
      endpoint: "https://app.test/api/work-upload/parse",
      getToken: async () => "jwt-token",
      fetchImpl: fetchParse as typeof fetch,
    });

    render(
      <LessonPractice
        nodeId={item.node_id}
        source={fixedSource(item)}
        workUploadStore={store}
        workParseClient={parseClient}
      />,
    );
    await reveal();
    selectPhoto();
    await waitFor(() => /ready to save/i.test(text()), "the photo preview is ready");
    button(/save for review/i).click();

    await waitFor(() => /saved for review/i.test(text()), "the photo is saved");
    expect(fetchParse).not.toHaveBeenCalled();
    expect(text()).toMatch(/only after you ask/i);
    expect(button(/read my working/i).disabled).toBe(true);
    expect(button(/move on/i).disabled).toBe(false);

    consent().click();
    button(/read my working/i).click();

    await waitFor(() => text().includes("3x = 25"), "the provisional parse is rendered");
    expect(fetchParse).toHaveBeenCalledTimes(1);
    const [url, init] = fetchParse.mock.calls[0] ?? [];
    expect(url).toBe("https://app.test/api/work-upload/parse");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        authorization: "Bearer jwt-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ uploadId: stored.id }),
    });
    expect(text()).toMatch(/correct us if we got it wrong/i);
    expect(text()).toMatch(/where the work stopped matching/i);
    expect(text()).toMatch(/check this line/i);
    expect(text()).toMatch(/never changes your progress/i);

    button(/delete photo/i).click();
    await waitFor(() => remove.mock.calls.length === 1, "the delete reaches the store");
    expect(remove).toHaveBeenCalledWith(stored.id);
    await waitFor(
      () => !/read my working/i.test(text()),
      "deleting the photo removes its parse controls",
    );
  });

  it("never blocks moving on while an automated reading is pending", async () => {
    let finish: ((response: Response) => void) | undefined;
    const fetchParse = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const parseClient = createHttpWorkParseClient({
      endpoint: "https://app.test/api/work-upload/parse",
      getToken: async () => "jwt-token",
      fetchImpl: fetchParse as typeof fetch,
    });
    const store: WorkUploadStore = {
      upload: async () => stored,
      remove: async () => {},
      list: async () => [],
    };

    render(
      <LessonPractice
        nodeId={item.node_id}
        source={fixedSource(item)}
        workUploadStore={store}
        workParseClient={parseClient}
      />,
    );
    await reveal();
    selectPhoto();
    await waitFor(() => /ready to save/i.test(text()), "the photo preview is ready");
    button(/save for review/i).click();
    await waitFor(() => /saved for review/i.test(text()), "the photo is saved");
    consent().click();
    button(/read my working/i).click();

    await waitFor(() => /reading your working/i.test(text()), "the parse is pending");
    expect(button(/move on/i).disabled).toBe(false);
    expect(fetchParse).toHaveBeenCalledTimes(1);

    finish?.(
      new Response(
        JSON.stringify({
          parse: {
            uploadId: stored.id,
            outcome: "unavailable",
            provisional: true,
            headline: "We couldn't read your work this time.",
            caveat: "Your photo is still saved for review.",
            failureReason: "service",
          },
        }),
        { status: 200 },
      ),
    );
    await waitFor(() => /temporary problem/i.test(text()), "the pending parse settles");
  });
});
