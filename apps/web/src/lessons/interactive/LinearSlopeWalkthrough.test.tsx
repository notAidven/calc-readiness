/**
 * The LF.1 slope scaffold used to be an animation, so nothing it did could be wrong. Now it
 * owns a gate behind seven typed slots, which is worth pinning: that the gate opens only
 * once all three rows are right, that EITHER point may be taken as the second one while a
 * substitution mixing the two readings is still named as an order error, that the last row
 * insists on lowest terms, and that "start over" deals a different pair instead of the
 * numbers just answered.
 */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { LinearSlopeWalkthrough } from "./LinearSlopeWalkthrough";

afterEach(cleanup);

/** The first pair dealt: (-2, 5) and (4, -4), so rise -9, run 6, slope -3/2. */
const FIRST = { x: -2, y: 5 };
const SECOND = { x: 4, y: -4 };

/**
 * `SLOPE_FIELD` is matched on its tail rather than on "the slope", which would also match
 * the diagram's own `aria-label` ("The slope through ...").
 */
const SLOPE_FIELD = "reduced to lowest terms";

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string,
) {
  const field = screen.getByLabelText(label, { exact: false });
  await user.clear(field);
  await user.type(field, value);
}

/** Fill and check the substitution row with the correctly ordered coordinates. */
async function substituteCorrectly(user: ReturnType<typeof userEvent.setup>) {
  await fill(user, "y sub 2", String(SECOND.y));
  await fill(user, "y sub 1", String(FIRST.y));
  await fill(user, "x sub 2", String(SECOND.x));
  await fill(user, "x sub 1", String(FIRST.x));
  await user.click(screen.getByRole("button", { name: "Check" }));
}

/** Every KaTeX expression on the page, which is where the legend and the labels read. */
function typeset(): string[] {
  return Array.from(document.querySelectorAll("[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
}

describe("LinearSlopeWalkthrough", () => {
  it("opens the gate once, after all three rows are right", async () => {
    const user = userEvent.setup();
    let completed = 0;
    render(<LinearSlopeWalkthrough onComplete={() => completed++} />);

    await substituteCorrectly(user);
    // The substitution alone must not gate: two rows of the formula are still blank.
    expect(completed).toBe(0);

    await fill(user, "the rise", "-9");
    await fill(user, "the run", "6");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(completed).toBe(0);

    await fill(user, SLOPE_FIELD, "-3/2");
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(completed).toBe(1);
    expect(
      screen.getByRole("button", { name: /Start over with a different pair/ }),
    ).toBeVisible();
  });

  it("takes the other point as the second one, and follows the learner there", async () => {
    const user = userEvent.setup();
    let completed = 0;
    render(<LinearSlopeWalkthrough onComplete={() => completed++} />);

    // The reverse reading: (-2, 5) as point 2, (4, -4) as point 1. Both differences change
    // sign, so the rise is 9 over a run of -6, and the slope is the same -3/2.
    await fill(user, "y sub 2", String(FIRST.y));
    await fill(user, "y sub 1", String(SECOND.y));
    await fill(user, "x sub 2", String(FIRST.x));
    await fill(user, "x sub 1", String(SECOND.x));
    await user.click(screen.getByRole("button", { name: "Check" }));

    // The row advanced, and the legend now states the reading the learner chose.
    expect(screen.getByLabelText(/the rise/)).toBeVisible();
    expect(typeset()).toContain("(x_2,\\, y_2) = (-2,\\, 5)");
    // The triangle followed too: its rise leg runs the other way, and says so.
    expect(typeset()).toContain("\\text{rise} = 9");

    await fill(user, "the rise", "9");
    await fill(user, "the run", "-6");
    await user.click(screen.getByRole("button", { name: "Check" }));

    await fill(user, SLOPE_FIELD, "-3/2");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(completed).toBe(1);
  });

  it("names a swapped substitution as an order error, and does not advance", async () => {
    const user = userEvent.setup();
    render(<LinearSlopeWalkthrough />);

    // The top read one way and the bottom the other: each difference is between the two
    // points, but they start at opposite ends, so only one of them changes sign.
    await fill(user, "y sub 2", String(FIRST.y));
    await fill(user, "y sub 1", String(SECOND.y));
    await fill(user, "x sub 2", String(SECOND.x));
    await fill(user, "x sub 1", String(FIRST.x));
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(screen.getByText(/Right numbers, wrong order/)).toBeVisible();
    // Still on the substitution row: the rise field has not appeared.
    expect(screen.queryByLabelText(/the rise/)).toBeNull();
  });

  it("holds the last row until the fraction is in lowest terms", async () => {
    const user = userEvent.setup();
    let completed = 0;
    render(<LinearSlopeWalkthrough onComplete={() => completed++} />);

    await substituteCorrectly(user);
    await fill(user, "the rise", "-9");
    await fill(user, "the run", "6");
    await user.click(screen.getByRole("button", { name: "Check" }));

    // Right value, wrong form: -9/6 is the row's input, not its answer.
    await fill(user, SLOPE_FIELD, "-9/6");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByText(/the fraction still reduces/)).toBeVisible();
    expect(completed).toBe(0);

    await fill(user, SLOPE_FIELD, "-3/2");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(completed).toBe(1);
  });

  it("deals a different pair on start over, and closes the gate behind it", async () => {
    const user = userEvent.setup();
    let reopened = 0;
    render(<LinearSlopeWalkthrough onReopen={() => reopened++} />);

    const before = screen.getByRole("img").getAttribute("aria-label");

    await substituteCorrectly(user);
    await fill(user, "the rise", "-9");
    await fill(user, "the run", "6");
    await user.click(screen.getByRole("button", { name: "Check" }));
    await fill(user, SLOPE_FIELD, "-3/2");
    await user.click(screen.getByRole("button", { name: "Check" }));

    await user.click(
      screen.getByRole("button", { name: /Start over with a different pair/ }),
    );

    expect(reopened).toBe(1);
    // Different numbers, and back on the first row with the slots empty.
    expect(screen.getByRole("img").getAttribute("aria-label")).not.toBe(before);
    expect(screen.getByLabelText(/y sub 2/)).toHaveValue("");
  });
});
