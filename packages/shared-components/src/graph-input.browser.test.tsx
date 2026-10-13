import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createGraphComparator, type GraphExpected } from "./graph-comparator";
import { GraphInput, type GraphInputSubmission } from "./graph-input";
import { toGraphWorkspace } from "./graph-workspace";

/**
 * Chromium render + interaction tests for the scored-SVG graph input. They drive
 * the widget through its accessible controls (number fields, region toggles,
 * keyboard nudges), grade the emitted `GraphResponsePayload` through the REAL
 * geometric comparator, and assert the verdict — proving the widget is answerable
 * end to end and wires into the same injected-checker seam `MathInput` uses.
 */

afterEach(cleanup);

const CHECKER_VERSION = 2;

const featuresItem: GraphExpected = {
  domain: [-4, 4],
  features: [
    { kind: "vertex", point: { x: 1, y: -2 }, tolerance: 0.3, label: "vertex" },
    { kind: "x_intercept", point: { x: 3, y: 0 }, tolerance: 0.3, label: "root" },
  ],
};

const regionItem: GraphExpected = {
  domain: [-5, 5],
  features: [
    {
      kind: "region",
      tolerance: 0,
      label: "shade",
      region: {
        probes: [
          { x: -2, y: 0, inside: true },
          { x: 2, y: 0, inside: false },
        ],
      },
    },
  ],
};

function comparatorFor(id: string, expected: GraphExpected) {
  return createGraphComparator({
    itemVersions: [{ item_version_id: id, node_id: "TEST", expected }],
  });
}

function lastSubmission(spy: ReturnType<typeof vi.fn>): GraphInputSubmission {
  const calls = spy.mock.calls;
  return calls[calls.length - 1]?.[0] as GraphInputSubmission;
}

describe("GraphInput (Chromium): answerable through accessible controls", () => {
  it("renders a labeled coordinate plane and a submit control", () => {
    render(
      <GraphInput
        itemVersionId="feat"
        checkerVersion={CHECKER_VERSION}
        comparator={comparatorFor("feat", featuresItem)}
        workspace={toGraphWorkspace(featuresItem)}
        label="Mark the features"
      />,
    );
    expect(screen.getByRole("img", { name: /coordinate plane/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /check graph/i })).toBeTruthy();
  });

  it("grades correct when the feature points are placed via the number fields", () => {
    const onChecked = vi.fn();
    render(
      <GraphInput
        itemVersionId="feat"
        checkerVersion={CHECKER_VERSION}
        comparator={comparatorFor("feat", featuresItem)}
        workspace={toGraphWorkspace(featuresItem)}
        label="Mark the features"
        onChecked={onChecked}
      />,
    );
    fireEvent.change(screen.getByLabelText("vertex x coordinate"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("vertex y coordinate"), {
      target: { value: "-2" },
    });
    fireEvent.change(screen.getByLabelText("root x coordinate"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("root y coordinate"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check graph/i }));

    expect(onChecked).toHaveBeenCalled();
    expect(lastSubmission(onChecked).result.status).toBe("correct");
  });

  it("grades incorrect with the reason when a feature is misplaced", () => {
    const onChecked = vi.fn();
    render(
      <GraphInput
        itemVersionId="feat"
        checkerVersion={CHECKER_VERSION}
        comparator={comparatorFor("feat", featuresItem)}
        workspace={toGraphWorkspace(featuresItem)}
        label="Mark the features"
        onChecked={onChecked}
      />,
    );
    fireEvent.change(screen.getByLabelText("vertex x coordinate"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("vertex y coordinate"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("root x coordinate"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("root y coordinate"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check graph/i }));

    const result = lastSubmission(onChecked).result;
    expect(result.status).toBe("incorrect");
    expect(result.reason_code).toBe("vertex_mismatch");
  });

  it("exposes each coordinate as a focusable, labeled number field (keyboard accessible)", () => {
    render(
      <GraphInput
        itemVersionId="feat"
        checkerVersion={CHECKER_VERSION}
        comparator={comparatorFor("feat", featuresItem)}
        workspace={toGraphWorkspace(featuresItem)}
        label="Mark the features"
      />,
    );
    // Every scored coordinate is a native number input the keyboard can operate.
    for (const name of [
      "vertex x coordinate",
      "vertex y coordinate",
      "root x coordinate",
    ]) {
      const field = screen.getByLabelText(name) as HTMLInputElement;
      expect(field.tagName).toBe("INPUT");
      expect(field.type).toBe("number");
      expect(field.disabled).toBe(false);
      field.focus();
      expect(document.activeElement).toBe(field);
    }
  });

  it("grades a shaded region by toggling probe membership", () => {
    const onChecked = vi.fn();
    render(
      <GraphInput
        itemVersionId="reg"
        checkerVersion={CHECKER_VERSION}
        comparator={comparatorFor("reg", regionItem)}
        workspace={toGraphWorkspace(regionItem)}
        label="Shade the region"
        onChecked={onChecked}
      />,
    );
    // Probe (-2, 0) is inside the correct region; toggle it on. Probe (2, 0) stays out.
    fireEvent.click(screen.getByRole("button", { name: /Point \(-2, 0\) is outside/i }));
    fireEvent.click(screen.getByRole("button", { name: /check graph/i }));

    expect(lastSubmission(onChecked).result.status).toBe("correct");
  });
});
