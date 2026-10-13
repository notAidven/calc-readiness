import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { presenterFixtureFor } from "../demo/presenterFixtures";
import "../styles.css";
import { createApiCitySession } from "./apiCitySession";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { civicName } from "./civic";
import { resetCityEra, setCityEraForPreview } from "./useCityEra";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

afterEach(() => {
  cleanup();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

async function captureViewport(): Promise<string> {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the civic deletion frame has no browser viewport");
  }
  const box = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  const session = cdp() as unknown as {
    send: (
      method: string,
      params: Record<string, unknown>,
    ) => Promise<{ readonly data: string }>;
  };
  return (
    await session.send("Page.captureScreenshot", {
      format: "png",
      clip: {
        x: box.left + outer.scrollX,
        y: box.top + outer.scrollY,
        width: box.width,
        height: box.height,
        scale: 1,
      },
    })
  ).data;
}

test("learner and account civic detail/confirmation remain reachable without Presenter chrome", {
  timeout: 120_000,
}, async () => {
  for (const viewport of [
    { name: "short-laptop", width: 1024, height: 580 },
    { name: "phone", width: 390, height: 580 },
  ] as const) {
    for (const composition of ["learner", "account"] as const) {
      await page.viewport(viewport.width, viewport.height);
      setCityEraForPreview("prehistoric");
      const fixture = presenterFixtureFor({
        enabled: true,
        legacy: false,
        preset: "bronze-city",
        surface: "city",
        eraId: "prehistoric",
      });
      const civic = fixture.city.seed.civic?.find((placement) =>
        placement.nodeId.includes("prehistoric_longhouse"),
      );
      if (!civic) {
        throw new Error("The frame fixture has no Longhouse.");
      }
      const source = createCityDevSession(null, fixture.city.seed);
      const session =
        composition === "account"
          ? createApiCitySession({
              studentId: "account-civic-frame",
              load: source.load,
              save: vi.fn(async () => undefined),
              eraId: () => "prehistoric",
            })
          : source;

      const mounted = render(
        <CitySurface
          loadCity={session.load}
          onMoveCivic={session.moveCivic}
          onRemoveCivic={session.removeCivic}
          initialOpenBuildingId={civic.nodeId}
          materialLabel="stone"
          eraId="prehistoric"
          archipelagoMetrics
        />,
      );
      await screen.findByRole("button", { name: "Build" });
      await waitFor(
        () => expect(document.querySelector(".city-canvas canvas")).not.toBeNull(),
        { timeout: 15_000 },
      );
      await waitFor(
        () =>
          expect(
            screen.getByTestId("city-viewport").getAttribute("data-composition-ready"),
          ).toBe("true"),
        { timeout: 15_000 },
      );
      const detail = await screen.findByTestId("civic-panel");
      const action = `Delete ${civicName(civic.nodeId)}`;
      const remove = within(detail).getByRole<HTMLButtonElement>("button", {
        name: action,
      });
      const move = within(detail).getByRole<HTMLButtonElement>("button", {
        name: "Move building",
      });
      await waitFor(() =>
        expect(remove.getBoundingClientRect().height).toBeGreaterThanOrEqual(44),
      );
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      expect(move.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(screen.queryByRole("navigation", { name: "Presenter actions" })).toBeNull();
      expect(document.querySelector(".presenter-reward")).toBeNull();
      expect(document.querySelector(".presenter-instrument")).toBeNull();

      if (CAPTURE_EVIDENCE) {
        await commands.writeFile(
          `output/design-review/civic-deletion-policy/${composition}-detail-${viewport.name}-${viewport.width}x${viewport.height}.png`,
          await captureViewport(),
          { encoding: "base64" },
        );
      }

      await userEvent.setup().click(remove);
      const confirmation = await waitFor(() => {
        const panel = screen.getByTestId("civic-panel");
        expect(panel).toHaveAttribute("data-confirming", "true");
        return panel;
      });
      expect(confirmation).toHaveTextContent(civicName(civic.nodeId));
      expect(confirmation).toHaveTextContent(/spent .* will not be returned/i);
      const confirm = within(confirmation).getByRole<HTMLButtonElement>("button", {
        name: action,
      });
      const keep = within(confirmation).getByRole<HTMLButtonElement>("button", {
        name: "Keep building",
      });
      expect(
        within(confirmation).queryByRole("button", { name: /^(yes|no)$/i }),
      ).toBeNull();
      expect(confirm.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(keep.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      const confirmationBox = confirmation.getBoundingClientRect();
      expect(confirmationBox.left).toBeGreaterThanOrEqual(0);
      expect(confirmationBox.right).toBeLessThanOrEqual(viewport.width);
      expect(confirmationBox.top).toBeGreaterThanOrEqual(0);
      expect(confirmationBox.bottom).toBeLessThanOrEqual(viewport.height);

      if (CAPTURE_EVIDENCE) {
        await commands.writeFile(
          `output/design-review/civic-deletion-policy/${composition}-confirmation-${viewport.name}-${viewport.width}x${viewport.height}.png`,
          await captureViewport(),
          { encoding: "base64" },
        );
      }

      await userEvent.setup().click(keep);
      expect((await session.load()).civic).toEqual(
        expect.arrayContaining([expect.objectContaining({ nodeId: civic.nodeId })]),
      );
      mounted.unmount();
      cleanup();
      resetCityEra();
    }
  }
});
