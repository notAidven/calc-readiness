import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { WorkChecker } from "./WorkChecker";
import type { StoredWorkUpload, WorkUploadAssociation, WorkUploadStore } from "./types";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
});

async function waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out. DOM text: ${(host?.textContent ?? "").slice(0, 400)}`);
}

function button(label: RegExp): HTMLButtonElement {
  const found = [...(host?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find(
    (candidate) => label.test(candidate.textContent ?? ""),
  );
  if (!found) {
    throw new Error(`No button matching ${label}`);
  }
  return found;
}

function association(nodeId: string): WorkUploadAssociation {
  return {
    surface: "lesson-practice",
    node_id: nodeId,
    item_version_id: `${nodeId}-item`,
    template_id: `${nodeId}-template`,
  };
}

function record(id: string, uploadAssociation: WorkUploadAssociation): StoredWorkUpload {
  return {
    id,
    association: uploadAssociation,
    contentType: "image/png",
    sizeBytes: 4,
    createdAt: "2026-08-06T12:00:00.000Z",
    objectKey: `work-uploads/student/${id}.png`,
    status: "uploaded",
  };
}

test("a reused work checker never offers the prior problem's photo for reading", async () => {
  const first = association("NUM.F");
  const second = association("NUM.D");
  const store: WorkUploadStore = {
    upload: async (_file, uploadAssociation) => record("first-upload", uploadAssociation),
    remove: async () => {},
    list: async () => [],
  };
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(<WorkChecker association={first} store={store} />);

  await waitFor(
    () => host?.querySelector<HTMLInputElement>(".work-upload__input") !== null,
  );
  const input = host?.querySelector<HTMLInputElement>(".work-upload__input");
  if (!input) {
    throw new Error("work checker mounted no photo input");
  }
  const transfer = new DataTransfer();
  transfer.items.add(
    new File([new Uint8Array([1, 2, 3, 4])], "work.png", { type: "image/png" }),
  );
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await waitFor(() => /Ready to save/.test(host?.textContent ?? ""));
  button(/Save for review/).click();
  await waitFor(() => /Read my working/.test(host?.textContent ?? ""));

  root.render(<WorkChecker association={second} store={store} />);
  await waitFor(() => /Take or choose a photo/.test(host?.textContent ?? ""));
  expect(host?.textContent).not.toContain("Read my working");
});
