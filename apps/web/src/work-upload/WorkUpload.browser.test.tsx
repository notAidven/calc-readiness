import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";

import { InMemoryWorkUploadStore } from "./store";
import type { LessonWorkUploadAssociation, StoredWorkUpload } from "./types";
import { WorkUploadError } from "./types";
import { WorkUpload } from "./WorkUpload";

/**
 * Component tests in real Chromium (native File / DataTransfer / DragEvent / object
 * URLs). Follows the raw-createRoot + poll pattern of DiagnosticSurface.browser.test.tsx.
 * Verifies the capture → preview → save → remove flow, drag-and-drop, validation copy,
 * and the store-only invariant at the component boundary (onUploaded gets inert data).
 */

const ASSOCIATION: LessonWorkUploadAssociation = {
  surface: "lesson-practice",
  node_id: "NUM.F",
  item_version_id: "num-f.item.1",
  template_id: "num-f.reduce",
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
});

function mount(ui: ReactElement) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(ui);
}

function text(): string {
  return host?.textContent ?? "";
}

function queryEl(selector: string): Element | null {
  return host?.querySelector(selector) ?? null;
}

async function waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out. DOM text: ${text().slice(0, 300)}`);
}

function button(label: RegExp): HTMLButtonElement {
  const buttons = [...(host?.querySelectorAll("button") ?? [])] as HTMLButtonElement[];
  const found = buttons.find((element) => label.test(element.textContent ?? ""));
  if (!found) {
    throw new Error(
      `No button matching ${label}. Buttons: ${buttons
        .map((element) => element.textContent)
        .join(" | ")}`,
    );
  }
  return found;
}

function imageFile(name = "work.png", type = "image/png", bytes = 2048): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function selectFile(file: File): void {
  const input = queryEl(".work-upload__input") as HTMLInputElement | null;
  if (!input) {
    throw new Error("file input not found");
  }
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("WorkUpload", () => {
  test("renders the optional, store-only capture affordance", async () => {
    mount(<WorkUpload association={ASSOCIATION} store={new InMemoryWorkUploadStore()} />);
    await waitFor(() => /Add a photo of your work/.test(text()));
    expect(text()).toMatch(/Take or choose a photo/);
    expect(text()).toMatch(/Optional/);
    expect(text()).toMatch(/never changes your score/i);
    // A capture-first file input the phone camera can open directly.
    const input = queryEl(".work-upload__input") as HTMLInputElement | null;
    expect(input?.getAttribute("accept")).toBe("image/*");
    expect(input?.getAttribute("capture")).toBe("environment");
  });

  test("shows a preview and save/remove controls after choosing an image", async () => {
    mount(<WorkUpload association={ASSOCIATION} store={new InMemoryWorkUploadStore()} />);
    await waitFor(() => /Take or choose a photo/.test(text()));

    selectFile(imageFile());

    await waitFor(() => queryEl(".work-upload__thumb") !== null);
    expect(text()).toMatch(/Ready to save/i);
    expect(button(/save for review/i)).toBeTruthy();
    expect(button(/remove/i)).toBeTruthy();
  });

  test("saves the photo and reports an INERT record (no scoring signal)", async () => {
    const uploads: StoredWorkUpload[] = [];
    mount(
      <WorkUpload
        association={ASSOCIATION}
        store={new InMemoryWorkUploadStore()}
        onUploaded={(record) => uploads.push(record)}
      />,
    );
    await waitFor(() => /Take or choose a photo/.test(text()));

    selectFile(imageFile());
    await waitFor(() => queryEl(".work-upload__thumb") !== null);
    button(/save for review/i).click();

    await waitFor(() => /Saved for review/i.test(text()));
    expect(text()).toMatch(/never affects your score or mastery/i);
    expect(uploads).toHaveLength(1);
    const record = uploads[0];
    expect(record?.association.item_version_id).toBe(ASSOCIATION.item_version_id);
    for (const key of ["mastery", "score", "correct", "client_correct", "placement"]) {
      expect(record).not.toHaveProperty(key);
    }
  });

  test("announces truthful upload milestones without inventing byte precision", async () => {
    let finish: ((record: StoredWorkUpload) => void) | undefined;
    const store = {
      upload: (
        _file: File,
        _association: LessonWorkUploadAssociation,
        options?: Parameters<InMemoryWorkUploadStore["upload"]>[2],
      ) => {
        options?.onProgress?.({
          stage: "uploading",
          percent: 65,
          message: "Uploading the private photo…",
        });
        return new Promise<StoredWorkUpload>((resolve) => {
          finish = resolve;
        });
      },
      remove: async () => {},
      list: async () => [],
    };
    mount(<WorkUpload association={ASSOCIATION} store={store} />);
    await waitFor(() => /Take or choose a photo/.test(text()));
    selectFile(imageFile());
    await waitFor(() => queryEl(".work-upload__thumb") !== null);
    button(/save for review/i).click();

    await waitFor(() => queryEl('[role="progressbar"]') !== null);
    const progress = queryEl('[role="progressbar"]');
    expect(progress?.getAttribute("aria-valuenow")).toBe("65");
    expect(progress?.getAttribute("aria-valuetext")).toBe("Uploading the private photo…");
    expect(text()).toContain("Uploading the private photo");

    finish?.({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      association: ASSOCIATION,
      contentType: "image/png",
      sizeBytes: 2048,
      createdAt: new Date(0).toISOString(),
      objectKey: "work-uploads/student/photo.png",
      status: "uploaded",
    });
    await waitFor(() => /Saved for review/i.test(text()));
  });

  test("remove clears the selection and returns to the picker", async () => {
    const removed: string[] = [];
    mount(
      <WorkUpload
        association={ASSOCIATION}
        store={new InMemoryWorkUploadStore()}
        onRemoved={(id) => removed.push(id)}
      />,
    );
    await waitFor(() => /Take or choose a photo/.test(text()));

    selectFile(imageFile());
    await waitFor(() => queryEl(".work-upload__thumb") !== null);
    button(/save for review/i).click();
    await waitFor(() => /Saved for review/i.test(text()));

    button(/delete photo/i).click();
    await waitFor(() => queryEl(".work-upload__thumb") === null);
    expect(text()).toMatch(/Take or choose a photo/);
    expect(removed).toHaveLength(1);
  });

  test("keeps a saved photo visible when remote deletion fails, so the learner can retry", async () => {
    const backing = new InMemoryWorkUploadStore();
    const store = {
      upload: backing.upload.bind(backing),
      list: backing.list.bind(backing),
      remove: async () => {
        throw new Error("remote delete failed with a secret");
      },
    };
    mount(<WorkUpload association={ASSOCIATION} store={store} />);
    await waitFor(() => /Take or choose a photo/.test(text()));

    selectFile(imageFile());
    await waitFor(() => queryEl(".work-upload__thumb") !== null);
    button(/save for review/i).click();
    await waitFor(() => /Saved for review/i.test(text()));
    button(/delete photo/i).click();

    await waitFor(() => /couldn't delete/i.test(text()));
    expect(queryEl(".work-upload__thumb")).not.toBeNull();
    expect(button(/try delete again/i)).toBeTruthy();
    expect(text()).not.toContain("secret");
  });

  test("rejects a non-image with a friendly message and stores nothing", async () => {
    const store = new InMemoryWorkUploadStore();
    mount(<WorkUpload association={ASSOCIATION} store={store} />);
    await waitFor(() => /Take or choose a photo/.test(text()));

    selectFile(new File(["hi"], "notes.txt", { type: "text/plain" }));

    await waitFor(() => /please choose a photo/i.test(text()));
    expect(queryEl(".work-upload__thumb")).toBeNull();
    expect(await store.list()).toHaveLength(0);
  });

  test.each([
    [
      "auth",
      "Your sign-in has expired. Sign in again, then try this photo once more.",
      /sign-in has expired/i,
    ],
    [
      "signature",
      "The secure upload link was refused. Choose the photo again to get a fresh link.",
      /secure upload link was refused/i,
    ],
    [
      "upload",
      "The photo upload did not finish. Your lesson is safe; try saving the photo again.",
      /upload did not finish/i,
    ],
  ] as const)(
    "renders the safe %s failure separately",
    async (reason, message, visible) => {
      const store = {
        upload: async () => {
          throw new WorkUploadError(reason, `${message} SECRET-SHOULD-NOT-APPEAR`);
        },
        remove: async () => {},
        list: async () => [],
      };
      mount(<WorkUpload association={ASSOCIATION} store={store} />);
      await waitFor(() => /Take or choose a photo/.test(text()));
      selectFile(imageFile());
      await waitFor(() => queryEl(".work-upload__thumb") !== null);
      button(/save for review/i).click();

      await waitFor(() => visible.test(text()));
      expect(text()).not.toContain("SECRET-SHOULD-NOT-APPEAR");
    },
  );

  test("accepts a dropped image (droppable)", async () => {
    mount(<WorkUpload association={ASSOCIATION} store={new InMemoryWorkUploadStore()} />);
    await waitFor(() => /Take or choose a photo/.test(text()));

    const zone = queryEl(".work-upload__dropzone");
    if (!zone) {
      throw new Error("dropzone not found");
    }
    const transfer = new DataTransfer();
    transfer.items.add(imageFile("dropped.png"));
    zone.dispatchEvent(
      new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }),
    );

    await waitFor(() => queryEl(".work-upload__thumb") !== null);
    expect(text()).toMatch(/Ready to save/i);
  });
});
