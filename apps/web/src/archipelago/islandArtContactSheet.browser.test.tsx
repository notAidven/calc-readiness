import { ERA_SEQUENCE } from "@cr/skill-graph";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";

const SHOTS = Boolean(import.meta.env.VITE_ISLAND_ART_PARITY_SHOTS);
const OUTPUT = "output/design-review/island-art-parity";
const VIEWPORT = { width: 1024, height: 580 } as const;
let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function source(filename: string): string {
  return `/@fs/workspace/${OUTPUT}/${filename}`;
}

function SheetSection({
  title,
  frames,
  phone = false,
}: {
  readonly title: string;
  readonly frames: readonly { readonly label: string; readonly filename: string }[];
  readonly phone?: boolean;
}) {
  return (
    <section>
      <h2>{title}</h2>
      <div className={phone ? "sheet-grid sheet-grid--phone" : "sheet-grid"}>
        {frames.map((frame) => (
          <figure key={frame.filename}>
            <img src={source(frame.filename)} alt="" />
            <figcaption>{frame.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function ContactSheet() {
  const desktop = ERA_SEQUENCE.map((era) => ({
    label: era.name,
    id: era.id,
  }));
  return (
    <main
      id="island-art-contact-sheet"
      style={{
        boxSizing: "border-box",
        width: VIEWPORT.width,
        height: VIEWPORT.height,
        overflow: "hidden",
        padding: "8px",
        background: "#102f3d",
        color: "#f0e4ca",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <style>{`
        #island-art-contact-sheet h1 { margin: 0 0 3px; font-size: 14px; }
        #island-art-contact-sheet h2 {
          margin: 3px 0 2px;
          color: #f2c14e;
          font-size: 8px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .sheet-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px; }
        .sheet-grid--phone { grid-template-columns: repeat(4, 1fr); }
        .sheet-grid figure { position: relative; margin: 0; overflow: hidden; background: #071d28; }
        .sheet-grid img { display: block; width: 100%; aspect-ratio: 1024 / 580; object-fit: cover; }
        .sheet-grid--phone img { aspect-ratio: 390 / 580; object-fit: contain; height: 315px; }
        .sheet-grid figcaption {
          position: absolute;
          right: 1px;
          bottom: 1px;
          max-width: 94%;
          overflow: hidden;
          padding: 1px 2px;
          background: rgb(5 22 31 / 86%);
          color: #fff7df;
          font-size: 5px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
      <h1>Island art parity · current branch · 1024×580 and 390×580</h1>
      <SheetSection
        title="City · normal exploration"
        frames={desktop.map((era) => ({
          label: era.label,
          filename: `city-1024x580-${era.id}-exploration.png`,
        }))}
      />
      <SheetSection
        title="City · build mode"
        frames={desktop.map((era) => ({
          label: era.label,
          filename: `city-1024x580-${era.id}-build.png`,
        }))}
      />
      <SheetSection
        title="Representative phone frames"
        phone
        frames={[
          {
            label: "Early Modern city",
            filename: "city-390x580-renaissance-exploration.png",
          },
          {
            label: "Information city",
            filename: "city-390x580-information_age-exploration.png",
          },
        ]}
      />
    </main>
  );
}

test.runIf(SHOTS)(
  "composes the full island art review contact sheet",
  async () => {
    await page.viewport(VIEWPORT.width, VIEWPORT.height);
    harness = mount(<ContactSheet />);
    await waitFor(
      () => {
        const images = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
        return (
          document.getElementById("island-art-contact-sheet") !== null &&
          images.length === 22 &&
          images.every((image) => image.complete && image.naturalWidth > 0)
        );
      },
      "the generated island evidence did not load into the contact sheet",
      20_000,
    );
    const stage = document.getElementById("island-art-contact-sheet") as HTMLElement;
    const frame = window.frameElement as HTMLElement;
    const frameBox = frame.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    const outer = window.parent as Window;
    const browser = cdp() as unknown as {
      send: (
        method: string,
        params?: Record<string, unknown>,
      ) => Promise<{ readonly data: string }>;
    };
    const shot = await browser.send("Page.captureScreenshot", {
      format: "png",
      clip: {
        x: frameBox.left + outer.scrollX + stageBox.left,
        y: frameBox.top + outer.scrollY + stageBox.top,
        width: stageBox.width,
        height: stageBox.height,
        scale: 1,
      },
    });
    expect(shot.data).not.toBe("");
    if (SHOTS) {
      await commands.writeFile(`${OUTPUT}/contact-sheet.png`, shot.data, {
        encoding: "base64",
      });
    }
  },
  30_000,
);
