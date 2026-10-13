import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GraphProbe } from "./GraphProbe";

/**
 * Verifies the scored-SVG graph widget is wired into the diagnostic answer/check
 * flow: selecting a graph slice, answering it through the widget's accessible
 * controls, and recording the graded verdict — the same seam `DiagnosticRunner`
 * uses for `MathInput`. Grading runs through the REAL geometric comparator.
 */
describe("GraphProbe (graph item in the diagnostic flow)", () => {
  it("answers and grades the FUN.4 read-features + region slice correct", () => {
    render(<GraphProbe />);

    // Switch to the FUN.4 slice (features + a shaded region, no curve to plot).
    fireEvent.click(screen.getByRole("tab", { name: "FUN.4" }));

    fireEvent.change(screen.getByLabelText("vertex x coordinate"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("vertex y coordinate"), {
      target: { value: "-4" },
    });
    fireEvent.change(screen.getByLabelText("root_left x coordinate"), {
      target: { value: "-1" },
    });
    fireEvent.change(screen.getByLabelText("root_left y coordinate"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("root_right x coordinate"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("root_right y coordinate"), {
      target: { value: "0" },
    });

    // Shade where f(x) >= 0: (-3, 2) and (4, 0) are inside; the others stay outside.
    fireEvent.click(screen.getByRole("button", { name: /Point \(-3, 2\) is outside/i }));
    fireEvent.click(screen.getByRole("button", { name: /Point \(4, 0\) is outside/i }));

    fireEvent.click(screen.getByRole("button", { name: /record graph answer/i }));

    expect(screen.getByText(/Recorded: correct/i)).toBeInTheDocument();
  });

  it("records an incorrect verdict with its reason when a feature is misplaced", () => {
    render(<GraphProbe />);
    fireEvent.click(screen.getByRole("tab", { name: "FUN.4" }));

    fireEvent.change(screen.getByLabelText("vertex x coordinate"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("vertex y coordinate"), {
      target: { value: "0" },
    }); // wrong vertex
    fireEvent.change(screen.getByLabelText("root_left x coordinate"), {
      target: { value: "-1" },
    });
    fireEvent.change(screen.getByLabelText("root_left y coordinate"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("root_right x coordinate"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("root_right y coordinate"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Point \(-3, 2\) is outside/i }));
    fireEvent.click(screen.getByRole("button", { name: /Point \(4, 0\) is outside/i }));

    fireEvent.click(screen.getByRole("button", { name: /record graph answer/i }));

    expect(
      screen.getByText(/Recorded: incorrect \(vertex_mismatch\)/i),
    ).toBeInTheDocument();
  });
});
