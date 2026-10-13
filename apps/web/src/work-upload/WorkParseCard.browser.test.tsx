import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";

import { createStubWorkParseClient } from "./parseClient";
import type { WorkParse, WorkParseClient, WorkParseUnavailable } from "./parseTypes";
import { WorkParseCard } from "./WorkParseCard";

/**
 * The provisional presentation, rendered in real Chromium.
 *
 * `docs/Photo_Work_Upload_Scope.md` §3.5 requires the reading to be shown provisionally, and
 * a type field saying `provisional: true` is not evidence that anybody sees a hedge. These
 * cases are about what is ON THE SCREEN: the caveat, the absence of a verdict, and — for the
 * two degraded outcomes — that a learner is told something honest instead of being shown a
 * confident transcript of a page the model could not read.
 *
 * Same raw-createRoot + poll pattern as `WorkUpload.browser.test.tsx`.
 */

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

async function waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out. DOM text: ${text().slice(0, 400)}`);
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

/** A client that answers exactly this, so each outcome can be rendered on demand. */
function clientAnswering(result: WorkParse | WorkParseUnavailable): WorkParseClient {
  return { read: async () => result };
}

const READ: WorkParse = {
  uploadId: "u1",
  outcome: "read",
  steps: ["3x + 5 = 20", "3x = 15", "x = 3"],
  suspectStepIndex: 2,
  confidence: 0.81,
  provisional: true,
  headline: "Here's what we read. Correct us if we got it wrong.",
  caveat:
    "This is a machine reading of your handwriting and it is often wrong. It doesn't " +
    "change your progress either way.",
  parserId: "p",
  modelId: "m",
  createdAt: new Date(0).toISOString(),
};

async function readWith(client: WorkParseClient) {
  mount(<WorkParseCard uploadId="u1" client={client} />);
  await waitFor(() => /Read my working/.test(text()));
  const consent = host?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!consent) {
    throw new Error("no automated-reading consent control");
  }
  consent.click();
  button(/Read my working/).click();
  await waitFor(() => !/Read my working/.test(text()));
}

describe("WorkParseCard", () => {
  test("does not read anything until the learner asks", async () => {
    let reads = 0;
    mount(
      <WorkParseCard
        uploadId="u1"
        client={{
          read: async () => {
            reads += 1;
            return READ;
          },
        }}
      />,
    );
    await waitFor(() => /Read my working/.test(text()));
    // Mounting the card next to an upload must not spend anything: §6 keeps the feature
    // opt-in, and the cheapest cost control is not making the call.
    expect(reads).toBe(0);
    expect(text()).toContain("Only after you ask");
    expect(button(/Read my working/).disabled).toBe(true);
    host?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
    expect(button(/Read my working/).disabled).toBe(false);
    expect(reads).toBe(0);
  });

  test("shows the hedge above the transcript, and the never-scored line with it", async () => {
    await readWith(clientAnswering(READ));
    const headline = host?.querySelector(".work-parse__headline");
    expect(headline?.textContent).toBe(
      "Here's what we read. Correct us if we got it wrong.",
    );
    // ABOVE, not below: the first thing in the card, before anything a learner might read
    // as a finding about their work.
    const children = [...(host?.querySelector(".work-parse")?.children ?? [])];
    expect(children[0]).toBe(headline);
    expect(text()).toContain("often wrong");
    expect(text()).toContain("doesn't change your progress");
  });

  test("marks the suspect line 'check this line', never as wrong", async () => {
    await readWith(clientAnswering(READ));
    const steps = [...(host?.querySelectorAll(".work-parse__step") ?? [])];
    expect(steps).toHaveLength(3);
    expect(steps[2]?.getAttribute("data-suspect")).toBe("true");
    expect(steps[0]?.getAttribute("data-suspect")).toBeNull();
    expect(steps[2]?.textContent).toContain("check this line");
    // No verdict language anywhere on the surface. The reading localizes; it does not mark.
    for (const forbidden of ["incorrect", "wrong answer", "✗"]) {
      expect(text().toLowerCase(), forbidden).not.toContain(forbidden);
    }
    expect(text()).toContain("never changes your score or progress");
  });

  test("renders a low-confidence reading as a plain transcript with no line marked", async () => {
    // The server withholds `suspectStepIndex` below the threshold. This is the surface half
    // of that: nothing here can point at a line the server did not point at.
    await readWith(
      clientAnswering({
        ...READ,
        outcome: "low_confidence",
        confidence: 0.3,
        suspectStepIndex: undefined,
        headline: "Here's our best guess at what you wrote, and we're not confident.",
        caveat: "We had trouble with this page, so we've left out which line went wrong.",
      }),
    );
    expect(text()).toContain("not confident");
    expect(host?.querySelectorAll(".work-parse__step")).toHaveLength(3);
    expect(host?.querySelector("[data-suspect]")).toBeNull();
    expect(text()).not.toContain("check this line");
  });

  test("shows no transcript at all when the model could not read the page", async () => {
    // The failure that matters: a learner must be told we could not read it, not shown an
    // invented page. An empty `steps` renders no list rather than an empty one.
    await readWith(
      clientAnswering({
        ...READ,
        outcome: "unreadable",
        steps: [],
        suspectStepIndex: undefined,
        headline: "We couldn't make out the working in this photo.",
        caveat: "A clearer photo usually helps. Your upload is saved either way.",
      }),
    );
    expect(text()).toContain("couldn't make out");
    expect(host?.querySelector(".work-parse__steps")).toBeNull();
    expect(text()).toContain("saved either way");
    // And the dismissal reads as a close, not as a correction of something not shown.
    expect(button(/Close/)).toBeTruthy();
  });

  test("degrades to a sentence when there is no reading at all", async () => {
    await readWith(
      clientAnswering({
        uploadId: "u1",
        outcome: "unavailable",
        provisional: true,
        reason: "paused",
        headline: "We couldn't read your work this time.",
        caveat: "We've read as many photos as we can today. Your upload is saved.",
      }),
    );
    expect(text()).toContain("couldn't read your work");
    expect(text()).toContain("Your upload is saved");
    expect(host?.querySelector(".work-parse__steps")).toBeNull();
  });

  test("retries an ordinary temporary failure and then renders the model reading", async () => {
    let reads = 0;
    const client: WorkParseClient = {
      async read() {
        reads += 1;
        return reads === 1
          ? {
              uploadId: "u1",
              outcome: "unavailable",
              provisional: true,
              reason: "service",
              headline: "We couldn't read your work this time.",
              caveat: "The automated reader had a temporary problem; you can retry.",
            }
          : READ;
      },
    };
    mount(<WorkParseCard uploadId="u1" client={client} />);
    await waitFor(() => /Read my working/.test(text()));
    host?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
    button(/Read my working/).click();
    await waitFor(() => /Try reading again/.test(text()));

    button(/Try reading again/).click();
    await waitFor(() => /3x \+ 5 = 20/.test(text()));
    expect(reads).toBe(2);
  });

  test("lets the learner dismiss a reading they disagree with", async () => {
    let dismissed = 0;
    mount(
      <WorkParseCard
        uploadId="u1"
        client={clientAnswering(READ)}
        onDismissed={() => {
          dismissed += 1;
        }}
      />,
    );
    await waitFor(() => /Read my working/.test(text()));
    host?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
    button(/Read my working/).click();
    await waitFor(() => /That's not what I wrote/.test(text()));
    button(/That's not what I wrote/).click();
    await waitFor(() => text() === "");
    expect(dismissed).toBe(1);
  });

  test("does not attach the first photo's late reading to a replacement photo", async () => {
    let finish: ((result: WorkParse) => void) | undefined;
    const client: WorkParseClient = {
      read: () =>
        new Promise<WorkParse>((resolve) => {
          finish = resolve;
        }),
    };
    mount(<WorkParseCard uploadId="u1" client={client} />);
    await waitFor(() => /Read my working/.test(text()));
    host?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
    button(/Read my working/).click();
    await waitFor(() => /Reading your working/.test(text()));

    root?.render(<WorkParseCard uploadId="u2" client={client} />);
    await waitFor(() => /Read my working/.test(text()));
    expect(host?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(
      false,
    );

    finish?.(READ);
    await new Promise((resolve) => setTimeout(resolve, 75));
    expect(text()).not.toContain("3x + 5 = 20");
    expect(button(/Read my working/).disabled).toBe(true);
  });

  test("the dev stub renders without a server, and does not pretend to be right", async () => {
    // `isServerBacked` is false in this loop, so the stub is what a reviewer sees. Its
    // transcript is deliberately a little wrong, which is what a real one looks like 37.62%
    // of the time — a stub that always agreed would make the hedge look like decoration.
    await readWith(createStubWorkParseClient());
    expect(text()).toContain("Correct us if we got it wrong");
    expect(host?.querySelectorAll(".work-parse__step")).toHaveLength(3);
    expect(text()).toContain("check this line");
  });
});
