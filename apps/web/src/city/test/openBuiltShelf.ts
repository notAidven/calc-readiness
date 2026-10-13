import { screen, within } from "@testing-library/react";

type ClickUser = {
  click(element: Element): Promise<void>;
};

/**
 * Enter the completed-building roster through its permanent product path: Build, then Built.
 * Tests use this instead of a selector-only shortcut so focus and disclosure behavior stay live.
 */
export async function openBuiltShelf(user: ClickUser): Promise<{
  readonly dialog: HTMLElement;
  readonly summary: HTMLElement;
}> {
  const build = await screen.findByRole("button", { name: "Build" });
  let dialog = screen.queryByRole("dialog", { name: /Choose a skill to build/ });
  if (!dialog) {
    await user.click(build);
    dialog = await screen.findByRole("dialog", { name: /Choose a skill to build/ });
  }
  const summary = within(dialog).getByRole("button", { name: /^Built \d+\/\d+$/ });
  if (summary.getAttribute("aria-expanded") !== "true") {
    await user.click(summary);
  }
  return { dialog, summary };
}
