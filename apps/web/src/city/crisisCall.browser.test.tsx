import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CrisisCallAdvisor, CrisisCallNotice } from "./CrisisCallAdvisor";
import {
  type CrisisBriefing,
  crisisBriefingFor,
  crisisBriefingLines,
  crisisBriefingTerms,
  forgetCrisisBriefingRead,
  hasReadCrisisBriefing,
} from "./crisisCall";
import { CURRENT_ERA_ID } from "./eraDressing";

import "../styles.css";

/**
 * THE CRISIS ENTRY SEQUENCE IN REAL CHROMIUM: that it draws, that it can be worked from
 * the keyboard alone, that it fits on the screens people have — and, since 2026-07-31,
 * that it is NOT A CARD.
 *
 * `crisisEntrySequence.test.tsx` proves the sequence FIRES; nothing there can see terms
 * painted past an edge, a focus trap that lets Tab escape onto the city behind it, or a
 * dialogue pushed off the bottom of a 720px laptop. Those need layout, so they are here.
 *
 * ## "NOT A CARD" IS A CLAIM ABOUT PIXELS, AND HALF OF IT IS MEASURABLE HERE
 *
 * The lead's ruling was that the briefing *"shouldn't be contained within a box; it should
 * appear over the actual island screen"*. Two of the three parts of that are measurable in
 * a DOM with real stylesheets, and are measured below rather than argued from CSS:
 *
 *  1. **Nothing between the dialog root and the bubble paints.** The root and the row
 *     inside it have no background, no border and no shadow, so the only opaque things on
 *     screen are the character and his bubble. This is what catches the panel or the scrim
 *     coming back, in either the shared chrome or a new rule of this feature's own.
 *  2. **The island is left uncovered.** A real strip of the viewport above the advisor is
 *     free of everything the dialogue draws, enumerated the way
 *     `winterIslandVisible.browser.test.tsx` enumerates it rather than eyeballed.
 *
 * The third part — whether it READS as a character speaking over your city — is not a
 * measurement, and `crisisAdvisorOverIsland.browser.test.tsx` photographs it instead.
 *
 * ## The vertical case is the one that has bitten this repo
 *
 * A card capping at `80vh` was once found drawing content outside itself on short
 * viewports, so the checks below are not "does it look right at 1440x960". Each height is
 * measured for five separate things: the dialogue inside the viewport, the reply buttons
 * on screen, no page-level scrollbar, a free strip of island above it, and — the one that
 * catches clipped content rather than overflowing content — every slide of the walkthrough
 * drawn inside the bubble's own scroll box, stepped through one at a time at that height.
 *
 * ## The walkthrough moved what "all the terms are on screen" can mean
 *
 * One section is mounted at a time now, so the old assertion ("every authored sentence is
 * in `card.textContent`") is not merely wrong, it is the opposite of the requirement. The
 * replacement is stronger rather than weaker: the dialogue is STEPPED, and the union of
 * what each slide shows has to cover the whole briefing. A slide dropped from the array
 * fails that, and so does one that renders its heading and forgets its lines.
 */

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

const briefing: CrisisBriefing = (() => {
  const found = crisisBriefingFor(CURRENT_ERA_ID);
  if (found === null) {
    throw new Error("era one has no briefing, so this whole file proves nothing");
  }
  return found;
})();

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
  forgetCrisisBriefingRead();
});

// The walkthrough remembers that it has been read, in `localStorage`, and reaching the last
// slide is what sets it. Every test below therefore starts from a first-time player unless
// it says otherwise; without this the first test to step to the end would collapse the
// walkthrough for every test after it.
beforeEach(() => {
  forgetCrisisBriefingRead();
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

interface Calls {
  faced: number;
  later: number;
}

async function openAdvisor(): Promise<{ card: HTMLElement; calls: Calls }> {
  const calls: Calls = { faced: 0, later: 0 };
  h?.cleanup();
  h = mount(
    <div className="city-shell">
      <CrisisCallAdvisor
        briefing={briefing}
        onFace={() => {
          calls.faced += 1;
        }}
        onLater={() => {
          calls.later += 1;
        }}
      />
    </div>,
  );
  await waitFor(
    () => document.querySelector('[data-testid="crisis-call-advisor"]') !== null,
    "the advisor card mounts",
  );
  await document.fonts.ready;
  // The dialogue rises 14px over 200ms; a transformed box measures in the wrong place, so
  // every rect below is taken at rest.
  await new Promise<void>((resolve) => setTimeout(resolve, 420));
  return { card: query('[data-testid="crisis-call-advisor"]'), calls };
}

/**
 * Whether an element PAINTS anything of its own: a fill, an edge or a shadow.
 *
 * The whole "it is not a box" claim rests on this, so it reads the four properties a box
 * can be drawn with rather than checking for a class name. A rule that reintroduced the
 * panel under a different selector would be caught; a `.coc-card` check would not.
 */
function paints(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const opaqueFill =
    style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent";
  const edge =
    Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderRightWidth) +
      Number.parseFloat(style.borderBottomWidth) +
      Number.parseFloat(style.borderLeftWidth) >
    0;
  return (
    opaqueFill || style.backgroundImage !== "none" || edge || style.boxShadow !== "none"
  );
}

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

function press(target: Element, key: string, shiftKey = false): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }),
  );
}

/** Let React commit a click and the browser lay the new slide out. */
async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 60));
}

/**
 * Walk the walkthrough from wherever it is to the last slide, running `onSlide` at each.
 *
 * Pressing the real button rather than driving state, because "Next advances" is one of the
 * things under test: a stepper wired to nothing would satisfy every assertion about the
 * first slide and none about the rest.
 */
async function stepThrough(
  onSlide: (slide: HTMLElement, index: number) => void | Promise<void>,
): Promise<number> {
  let seen = 0;
  for (let index = 0; index < briefing.slides.length; index += 1) {
    const slide = query<HTMLElement>('[data-testid="crisis-call-slide"]');
    await onSlide(slide, index);
    seen += 1;
    const next = query<HTMLButtonElement>('[data-testid="crisis-call-next"]');
    if (next.disabled) {
      break;
    }
    next.click();
    await settle();
  }
  return seen;
}

test("the advisor is a named dialog, and the bubble is what it opens with", async () => {
  await page.viewport(1280, 900);
  const { card } = await openAdvisor();

  // ACCESSIBLE NAME, AND THIS IS THE ONE THE TITLE RIBBON USED TO CARRY. The ribbon is
  // gone; the heading is not, it is only invisible. So the dialog is still labelled by a
  // real `<h2>` holding the real title, and a screen reader still announces "The Hard
  // Winter, dialog" over a surface that draws no title anywhere.
  expect(card.getAttribute("role")).toBe("dialog");
  expect(card.getAttribute("aria-modal")).toBe("true");
  const labelledBy = card.getAttribute("aria-labelledby") ?? "";
  expect(labelledBy.length).toBeGreaterThan(0);
  const heading = document.getElementById(labelledBy);
  expect(heading?.tagName).toBe("H2");
  expect(heading?.textContent).toBe(briefing.title);
  // Hidden the way a name must be hidden: clipped, never `display: none` or
  // `visibility: hidden`, either of which would take it out of the accessibility tree and
  // leave the dialog unnamed.
  const headingStyle = getComputedStyle(heading as HTMLElement);
  expect(headingStyle.display).not.toBe("none");
  expect(headingStyle.visibility).not.toBe("hidden");
  expect(
    (heading as HTMLElement).getBoundingClientRect().height,
    "the title is not drawn",
  ).toBeLessThanOrEqual(2);

  // THE ADVISOR SPEAKS FIRST, and the shout is the top of what the bubble carries.
  const bubble = query<HTMLElement>(".crisis-call-speech__bubble");
  expect(bubble.textContent ?? "").toContain(briefing.lead);
  expect(bubble.textContent ?? "").toContain(`${briefing.advisorName} says:`);
  const lede = query<HTMLElement>('[data-testid="crisis-call-lead"]');
  expect(lede.textContent).toBe(briefing.lead);
  // The SPOKEN LINE carries no rule, which is the claim; the bubble now holds the
  // walkthrough as well, so asserting it over the bubble would assert the opposite.
  for (const term of crisisBriefingTerms(briefing)) {
    expect(lede.textContent ?? "", term.id).not.toContain(term.text);
  }

  // The advisor drawing is decorative, and the words carry who is speaking.
  const figure = query<HTMLElement>(".crisis-call-speech__figure");
  expect(figure.getAttribute("aria-hidden")).toBe("true");

  // THE SHOUT IS THE PRIMARY ELEMENT ON FIRST PAINT, measured rather than read off the
  // stylesheet: it is above the walkthrough, and it is set larger than the walkthrough's
  // lines. That is what makes this "a character addressing the player" rather than "a
  // caption on a text block", and it is the exact thing the pre-#322 layout failed.
  const walkthrough = query<HTMLElement>(".crisis-call-walkthrough");
  expect(lede.getBoundingClientRect().top, "the shout is above the slides").toBeLessThan(
    walkthrough.getBoundingClientRect().top,
  );
  const ledeSize = Number.parseFloat(getComputedStyle(lede).fontSize);
  const termSize = Number.parseFloat(
    getComputedStyle(query<HTMLElement>(".crisis-call-terms li")).fontSize,
  );
  expect(ledeSize, "the spoken line is set larger than a rule").toBeGreaterThan(termSize);
  expect(ledeSize, "and it is set to be shouted").toBeGreaterThanOrEqual(20);

  // AND THE ADVISOR IS A CHARACTER, NOT AN AVATAR CHIP. He was 136px of a 600px card; the
  // floor here is what stops him quietly shrinking back into one, and it is asserted in
  // px rather than as a ratio because "big enough to read as a person" is not relative to
  // anything the bubble does.
  const figureRect = figure.getBoundingClientRect();
  expect(figureRect.height, "the advisor reads as a character").toBeGreaterThanOrEqual(200);
  expect(figureRect.width, "the advisor reads as a character").toBeGreaterThanOrEqual(200);
  // ...and he is BESIDE the bubble rather than inside it, with the tail between them.
  expect(figureRect.right).toBeLessThanOrEqual(
    bubble.getBoundingClientRect().left + figureRect.width * 0.2,
  );
});

/**
 * **IT IS NOT A BOX.** The whole of the 2026-07-31 ask, in the half of it a DOM can settle.
 *
 * The lead's words were *"it shouldn't be contained within a box; it should appear over the
 * actual island screen. right now its modeled too much like a lesson."* Read as an
 * assertion that is: nothing between the dialog root and the bubble may paint, and the
 * shared card chrome may not be worn anywhere in the subtree.
 *
 * Both directions matter. Checking only for `.coc-card` would pass the day somebody
 * rebuilt the same panel under a new class, so the load-bearing assertion is over COMPUTED
 * STYLE — a fill, an edge or a shadow on any ancestor of the bubble fails it. The class
 * check is kept beside it because it names the specific regression: this surface wore that
 * chrome, and reaching for it again is the likeliest way back.
 */
test("nothing between the dialog and the bubble draws a box, and there is no scrim", async () => {
  await page.viewport(1280, 900);
  const { card } = await openAdvisor();

  // NO SHARED CARD CHROME, anywhere under the dialogue or on it.
  for (const chrome of [
    ".coc-popup",
    ".coc-card",
    ".coc-card__banner",
    ".coc-card__body",
    ".coc-card__actions",
    ".coc-card__close",
    ".crisis-call-card",
  ]) {
    expect(
      card.querySelector(chrome),
      `${chrome} is back on the crisis advisor`,
    ).toBeNull();
    expect(card.matches(chrome), `the dialog root wears ${chrome}`).toBe(false);
  }

  // NO SCRIM. The root covers the viewport so it can trap the pointer, and it paints
  // nothing at all over the island while it does.
  const rootStyle = getComputedStyle(card);
  expect(rootStyle.position, "the dialogue is a viewport layer").toBe("fixed");
  expect(rootStyle.backgroundColor, "the island is dimmed").toBe("rgba(0, 0, 0, 0)");
  expect(rootStyle.backgroundImage, "the island is dimmed").toBe("none");
  expect(paints(card), "the dialog root paints a box").toBe(false);

  // NO PANEL. Every element on the path from the root down to the bubble is transparent
  // too, so the bubble is not sitting in a container of any kind.
  const bubble = query<HTMLElement>(".crisis-call-speech__bubble");
  const between: HTMLElement[] = [];
  for (
    let node = bubble.parentElement;
    node !== null && node !== card.parentElement;
    node = node.parentElement
  ) {
    between.push(node);
  }
  // The floor: an empty chain would satisfy the loop below by containing nothing.
  expect(between.length, "no ancestors were walked at all").toBeGreaterThanOrEqual(2);
  expect(between).toContain(card);
  for (const node of between) {
    expect(
      paints(node),
      `${node.className || node.tagName} draws a box round the advisor`,
    ).toBe(false);
  }

  // AND THE BUBBLE ITSELF DOES PAINT, which is the floor under all of the above: a
  // dialogue that drew nothing anywhere would pass every assertion in this test.
  expect(paints(bubble), "the bubble draws nothing either").toBe(true);
});

/**
 * ONE SECTION AT A TIME, and the union of them is the whole briefing.
 *
 * Two claims, and the second is the floor under the first. "Only one section is showing"
 * would be satisfied by a card that shows one section and can never reach the others, and
 * "every line is reachable" would be satisfied by the wall of text this replaced.
 */
test("it shows one section at a time, and stepping reaches all of them", async () => {
  await page.viewport(1280, 900);
  const { card } = await openAdvisor();

  const seenHeadings: string[] = [];
  const seenTerms: string[] = [];
  const stepped = await stepThrough((slide, index) => {
    // ISOLATED TO ONE SECTION. Exactly one is mounted, and it is the one the step line
    // names, so a card that revealed the next slide underneath fails here.
    expect(card.querySelectorAll("section.crisis-call-section").length).toBe(1);
    expect(slide.textContent ?? "").toContain(
      `Step ${index + 1} of ${briefing.slides.length}`,
    );

    // A real section under a real heading, so it can be skimmed by a screen reader the way
    // a sighted reader skims it.
    const labelledBy = slide.getAttribute("aria-labelledby") ?? "";
    const label = document.getElementById(labelledBy);
    expect(label?.tagName, "the slide is labelled by its heading").toBe("H3");
    const headingText = label?.textContent ?? "";
    expect(headingText.length).toBeGreaterThan(0);
    seenHeadings.push(headingText);

    // The slide announces itself as it changes: the region wrapping it is polite-live and
    // was already in the DOM before the swap, which is what makes the swap speak.
    const live = slide.closest("[aria-live]");
    expect(live?.getAttribute("aria-live"), "the slide is inside a live region").toBe(
      "polite",
    );

    for (const item of slide.querySelectorAll("li, .crisis-call-terms li")) {
      seenTerms.push(item.textContent ?? "");
    }
  });

  // Every slide really was reached by pressing the button, not skipped by a disabled Next.
  expect(stepped).toBe(briefing.slides.length);
  expect(stepped).toBeGreaterThanOrEqual(4);

  // ...and the union covers the authored briefing, headings and lines both. This is the
  // replacement for "every line is in `textContent`": nothing may be lost in paginating.
  const covered = [...seenHeadings, ...seenTerms, briefing.lead, briefing.closing].join(
    "\n",
  );
  const lines = crisisBriefingLines(briefing);
  expect(lines.length).toBeGreaterThanOrEqual(13);
  for (const line of lines) {
    expect(covered, line).toContain(line);
  }
});

/**
 * THE STEP CONTROL IS A REAL, REACHABLE, ANNOUNCED PAIR OF BUTTONS.
 *
 * Clickable divs would satisfy a screenshot and nothing else: not Tab, not Enter, not a
 * screen reader's list of controls. So this drives the walkthrough from the keyboard alone
 * and reads the ends off the buttons' own disabled state.
 */
test("the step control is reachable from the keyboard and bounded at both ends", async () => {
  await page.viewport(1280, 900);
  await openAdvisor();

  const back = query<HTMLButtonElement>('[data-testid="crisis-call-back"]');
  const next = query<HTMLButtonElement>('[data-testid="crisis-call-next"]');
  expect(back.tagName).toBe("BUTTON");
  expect(next.tagName).toBe("BUTTON");
  // Named by their own text, so the control a screen reader lists is the one on screen.
  expect(back.textContent).toBe("Back");
  expect(next.textContent).toBe("Next");

  // The first slide cannot go back, and Back is held rather than removed so the row does
  // not move under the pointer between slides.
  expect(back.disabled, "Back is held on slide one").toBe(true);
  expect(next.disabled).toBe(false);

  // FOCUSABLE AND OPERABLE BY KEY. `Enter` on a focused native button is the browser's own
  // behaviour, so this presses it the way the platform does: focus, then click.
  next.focus();
  expect(document.activeElement).toBe(next);
  next.click();
  await settle();
  expect(
    query<HTMLElement>('[data-testid="crisis-call-slide"]').textContent ?? "",
  ).toContain(`Step 2 of ${briefing.slides.length}`);
  // Focus stayed on Next, which is why the slide has to announce itself rather than relying
  // on focus moving into it.
  expect(document.activeElement).toBe(
    query<HTMLButtonElement>('[data-testid="crisis-call-next"]'),
  );

  // Back works, and going back does not skip the step line.
  const backAgain = query<HTMLButtonElement>('[data-testid="crisis-call-back"]');
  expect(backAgain.disabled).toBe(false);
  backAgain.click();
  await settle();
  expect(
    query<HTMLElement>('[data-testid="crisis-call-slide"]').textContent ?? "",
  ).toContain(`Step 1 of ${briefing.slides.length}`);

  // The far end: Next holds on the last slide rather than wrapping round to the first,
  // which would leave a reader with no way to know they had finished.
  await stepThrough(() => undefined);
  expect(
    query<HTMLElement>('[data-testid="crisis-call-slide"]').textContent ?? "",
  ).toContain(`Step ${briefing.slides.length} of ${briefing.slides.length}`);
  expect(query<HTMLButtonElement>('[data-testid="crisis-call-next"]').disabled).toBe(true);
  expect(query<HTMLButtonElement>('[data-testid="crisis-call-back"]').disabled).toBe(false);

  // NO STATE BY COLOUR. The position is a sentence; the dots are decoration on top of it
  // and are hidden from the reader entirely.
  expect(query<HTMLElement>(".crisis-call-dots").getAttribute("aria-hidden")).toBe("true");
  expect(document.querySelectorAll(".crisis-call-dot").length).toBe(briefing.slides.length);
});

/**
 * ## ⚑ IT IS NOT SKIPPABLE ON A FIRST ENTRY ANY MORE, AND THIS IS THE GATE MEASURED IN A BROWSER
 *
 * Ruled by the team lead on 2026-08-02: *"dont let the user click face the winter until they go
 * through all the tool tips."*
 *
 * This test asserted the opposite, in two senses: *"the walkthrough never gates the encounter:
 * 'Face the winter' is focused on open, so the first frame of the card is already one keystroke
 * from the winter"*, and that a returning player is not walked through it again. **The second half
 * is unchanged and is still the reason the flag is remembered at all.** The first is inverted.
 *
 * What is measured here that jsdom cannot say: the button is really `disabled` in a real browser,
 * the reason really renders beside it, and focus really lands on a control the player can use — a
 * gated card that opened focused on a disabled button would be operable from the keyboard nowhere.
 */
test("gates Face the winter until the last slide, and does not re-gate a returning player", async () => {
  await page.viewport(1280, 900);
  const first = await openAdvisor();

  // GATED, from the first frame. The button is on screen and disabled, the reason is beside it, and
  // focus is on "Next" instead — so Enter walks the slides rather than landing on nothing.
  const gated = query<HTMLButtonElement>('[data-testid="crisis-call-face"]');
  expect(gated.disabled, "Face the winter is not gated on the first slide").toBe(true);
  expect(document.activeElement).toBe(
    query<HTMLButtonElement>('[data-testid="crisis-call-next"]'),
  );
  const why = query<HTMLElement>('[data-testid="crisis-call-gate"]');
  expect(why.getBoundingClientRect().height, "the reason is not drawn").toBeGreaterThan(0);
  expect(why.textContent ?? "").toMatch(
    new RegExp(`read all ${briefing.slides.length} steps`, "i"),
  );
  expect(gated.getAttribute("aria-describedby")).toBe(why.id);
  // AND "NOT YET" IS NEVER GATED, which is its own ruling: a learner must always be able to leave.
  expect(query<HTMLButtonElement>('[data-testid="crisis-call-later"]').disabled).toBe(
    false,
  );
  expect(hasReadCrisisBriefing(), "nothing is remembered yet").toBe(false);
  expect(document.querySelector('[data-testid="crisis-call-slide"]')).not.toBeNull();

  // Read it to the end. THAT is what counts as having read it, and it is what opens the gate.
  await stepThrough(() => undefined);
  expect(hasReadCrisisBriefing(), "reaching the last slide records it").toBe(true);
  expect(
    query<HTMLButtonElement>('[data-testid="crisis-call-face"]').disabled,
    "the gate did not open on the last slide",
  ).toBe(false);
  expect(document.querySelector('[data-testid="crisis-call-gate"]')).toBeNull();

  // Come back. The advisor still speaks; the walkthrough does not re-impose itself.
  const second = await openAdvisor();
  expect(second.card.textContent ?? "").toContain(briefing.lead);
  expect(document.querySelector('[data-testid="crisis-call-slide"]')).toBeNull();
  const toggle = query<HTMLButtonElement>('[data-testid="crisis-call-walkthrough-toggle"]');
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(toggle.textContent ?? "").toMatch(/how it works/i);

  // ...and it is one click away, not gone.
  toggle.click();
  await settle();
  expect(document.querySelector('[data-testid="crisis-call-slide"]')).not.toBeNull();
  expect(
    query<HTMLButtonElement>('[data-testid="crisis-call-walkthrough-toggle"]').getAttribute(
      "aria-expanded",
    ),
  ).toBe("true");

  // Facing the winter is still the way out, and it never needed the walkthrough closed.
  query<HTMLButtonElement>('[data-testid="crisis-call-face"]').click();
  expect(second.calls.faced).toBe(1);
  expect(first.calls.faced).toBe(0);
});

/**
 * The other direction of the same flag: **ONLY READING IT COUNTS AS READING IT.**
 *
 * A player who presses Enter on the first frame has read nothing, so neither exit records it. That
 * was always true of both exits and is now enforced twice over for one of them: the gate means
 * "Face the winter" cannot be pressed at all until the flag is set.
 *
 * **AND PUTTING THE WALKTHROUGH AWAY NO LONGER COUNTS**, which is the change the gate forced. It
 * did, on the reasoning that collapsing it means *"I do not need this expanded again"* — safe while
 * nothing was gated, and the whole gate bypassed in one click once something was.
 */
test("neither exit, and no collapse, counts as having read it", async () => {
  await page.viewport(1280, 900);
  await openAdvisor();

  // Facing it is not even reachable while the gate is shut, which is the strongest form of the
  // original claim rather than a replacement for it.
  expect(query<HTMLButtonElement>('[data-testid="crisis-call-face"]').disabled).toBe(true);
  expect(hasReadCrisisBriefing(), "the card recorded a read on open").toBe(false);

  const { calls } = await openAdvisor();
  query<HTMLButtonElement>('[data-testid="crisis-call-later"]').click();
  expect(calls.later).toBeGreaterThan(0);
  expect(hasReadCrisisBriefing(), "declining is not reading it").toBe(false);

  // COLLAPSING IS NOT READING IT EITHER, and the gate stays shut through it: a player who puts the
  // walkthrough away without walking it has to reopen it, which is one click and not a trap.
  await openAdvisor();
  const toggle = query<HTMLButtonElement>('[data-testid="crisis-call-walkthrough-toggle"]');
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  toggle.click();
  await settle();
  expect(document.querySelector('[data-testid="crisis-call-slide"]')).toBeNull();
  expect(hasReadCrisisBriefing(), "putting it away recorded a read").toBe(false);
  expect(
    query<HTMLButtonElement>('[data-testid="crisis-call-face"]').disabled,
    "collapsing the walkthrough opened the gate",
  ).toBe(true);
  // ...and reopening it puts the slides back, so the way through is always available.
  query<HTMLButtonElement>('[data-testid="crisis-call-walkthrough-toggle"]').click();
  await settle();
  expect(document.querySelector('[data-testid="crisis-call-slide"]')).not.toBeNull();
});

test("it opens focused, traps Tab, and closes on Escape without a timer", async () => {
  await page.viewport(1280, 900);
  const { card, calls } = await openAdvisor();

  // Opens operable: focus is on the primary action, so Enter alone answers the call.
  const face = query<HTMLButtonElement>('[data-testid="crisis-call-face"]');
  const later = query<HTMLButtonElement>('[data-testid="crisis-call-later"]');
  // The corner close went with the card it hung off. THE WAYS OUT ARE STILL TWO, and both
  // were always here: "Not yet" and Escape. The first control in the trap is now the
  // walkthrough's own disclosure, which is what Tab must wrap round to.
  expect(query<HTMLElement>(".crisis-call-tray").contains(later)).toBe(true);
  const first = query<HTMLButtonElement>('[data-testid="crisis-call-walkthrough-toggle"]');
  // OPENS FOCUSED ON A CONTROL THE PLAYER CAN USE, which since the 2026-08-02 gate is "Next"
  // rather than "Face the winter": a disabled button cannot take focus, so a gated card that
  // still aimed at the primary would open operable from the keyboard nowhere. `face` is asserted
  // disabled instead, because that is what makes the focus target the right one.
  expect(face.disabled).toBe(true);
  expect(document.activeElement).toBe(
    query<HTMLButtonElement>('[data-testid="crisis-call-next"]'),
  );

  // Tab off the LAST control wraps to the first: the city behind the dialogue is not
  // reachable while it is up.
  later.focus();
  press(later, "Tab");
  expect(document.activeElement).toBe(first);

  // ...and Shift+Tab off the first wraps back to the last.
  press(first, "Tab", true);
  expect(document.activeElement).toBe(later);

  // Escape dismisses, and dismissing is DECLINING rather than facing: the crisis waits.
  expect(calls.later).toBe(0);
  press(card, "Escape");
  expect(calls.later).toBe(1);
  expect(calls.faced).toBe(0);

  // CLOCKLESS (INV-CRISIS-1). Nothing has advanced on its own: a second of real time
  // passes and the card has neither closed itself nor fired anything.
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  expect(document.querySelector('[data-testid="crisis-call-advisor"]')).not.toBeNull();
  expect(calls.faced).toBe(0);
  expect(calls.later).toBe(1);

  // AND FACING IT STILL WORKS, once the gate is open. The click is after the walk rather than
  // before it, which is the whole of what the 2026-08-02 ruling changed about this line: a click on
  // a disabled button is a no-op, so `faced` stayed at zero and the old assertion was measuring the
  // gate rather than the handler.
  const reopened = await openAdvisor();
  await stepThrough(() => undefined);
  const armed = query<HTMLButtonElement>('[data-testid="crisis-call-face"]');
  expect(armed.disabled).toBe(false);
  armed.click();
  expect(reopened.calls.faced).toBe(1);
});

/**
 * The seven viewports the layout has to hold at, four of them short on purpose.
 *
 * **1024x580 is the lead's own window** and it is the reason this list exists in the shape
 * it does: it is where he reviews, and a dialogue that only behaves at 1440x900 will look
 * fine to everybody who is not him. 920x720 and 460x800 are the widths named in the brief;
 * 1280x720 and 1180x800 are the HEIGHTS, on a width where nothing wraps to rescue them.
 *
 * 1280x360 forces the clipping case rather than hoping for it. #335 used 1280x520 for this
 * and dropping the card made it too roomy to bite: the same content that needed a scroller
 * inside a 464px card fits a 580px window outright now. So the stress viewport goes shorter
 * rather than the assertion going away. `mustClip` says which height is the floor under
 * "the last line is reachable", and it is asserted rather than assumed.
 */
const VIEWPORTS = [
  { label: "narrow phone", width: 460, height: 800, mustClip: false, island: 0.11 },
  {
    label: "short narrow phone",
    width: 460,
    height: 720,
    mustClip: false,
    island: 0.05,
  },
  {
    label: "half-width laptop",
    width: 920,
    height: 720,
    mustClip: false,
    island: 0.35,
  },
  {
    label: "the lead's window",
    width: 1024,
    height: 580,
    mustClip: false,
    island: 0.26,
  },
  { label: "short laptop", width: 1280, height: 720, mustClip: false, island: 0.35 },
  { label: "laptop", width: 1180, height: 800, mustClip: false, island: 0.4 },
  { label: "small window", width: 1280, height: 360, mustClip: true, island: 0.25 },
] as const;

/**
 * HOW MUCH ISLAND EACH SCREEN HAS TO LEAVE, and why the number is not one number.
 *
 * `island` is the fraction of the viewport above the advisor that the dialogue may not
 * paint into, checked at EVERY slide rather than on the opening one. It differs per
 * viewport because the layouts differ: a laptop stands the character BESIDE the bubble and
 * gives back around half the screen, while a 460px phone stacks him underneath it and
 * genuinely has less to give. One floor across both would have meant either a phone number
 * that laptops pass in their sleep, or a laptop number no phone can meet.
 *
 * Each is set a few points under the tallest slide's reading in **whichever of the two
 * environments reads lower**, and that phrasing is the whole lesson of getting these wrong
 * twice. They were first written two points under a local reading; CI failed three of them.
 * They were reset from CI's failure messages; CI failed a different one on the next run.
 *
 * The numbers are font metrics, and the two machines wrap the same sentence differently in
 * both directions — 1024x580 reads 0.31 on the runner and 0.29 here, while 460x720 reads
 * 0.08 there and 0.13 here. So they were finally MEASURED on the runner rather than inferred
 * from it, by reporting every viewport in one deliberately-passing round, and the floors are
 * the lower of the two readings with three or four points on top. A floor that has only just
 * been squeezed past is a floor to widen, not a measurement to trust.
 *
 * Per-viewport floors are also how a table like this rots, so the SHAPE is asserted as well
 * as the size. Softening one entry to make a change fit fails here rather than passing
 * quietly, and the lead's own window is inside the laptop class by its dimensions rather
 * than by being named.
 *
 * ## WHAT THIS FLOOR CATCHES, AND WHAT THE FIRST-PAINT TEST CATCHES INSTEAD
 *
 * Worth writing down, because measuring the three injections turned out to divide the space
 * differently from how it reads:
 *
 *  - **The assembly growing** is this floor's. 10px of padding inside the bubble fails three
 *    viewports here, the lead's own among them at 26% against its 26% floor.
 *  - **The cap being raised** is also this floor's, and it is the important one: `68vh` is
 *    what makes the island a guarantee rather than an observation, and taking it to `85vh`
 *    fails at *"only 11% of the screen is left as island"*.
 *  - **Content squeezed past readability** is NOT this floor's, and expecting it to be would
 *    be the mistake. Past the cap the bubble stops growing and the walkthrough absorbs the
 *    difference, so the strip stays exactly where it was: a card's worth of padding put back
 *    into the reading well leaves every floor here green and fails the first-paint test
 *    instead, at *"the step count is wholly on screen: expected 11 to be 15"*.
 */
test("every laptop-class viewport is held to a real strip of island", () => {
  const laptops = VIEWPORTS.filter((v) => v.width >= 900 && v.height >= 520);
  expect(
    laptops.length,
    "no laptop-class viewport is measured at all",
  ).toBeGreaterThanOrEqual(4);
  expect(laptops.map((v) => `${v.width}x${v.height}`)).toContain("1024x580");
  // A QUARTER OF THE SCREEN, everywhere a laptop is being used. This is the floor that
  // makes "you can still see your city" a guarantee rather than an observation, and it is
  // the class the lead's ruling was about.
  for (const v of laptops) {
    expect(v.island, `${v.label} gives the island away`).toBeGreaterThanOrEqual(0.25);
  }
  // ...and the roomy ones owe far more than that, so the table cannot be flattened to the
  // short-window number and called compliant.
  const roomy = laptops.filter((v) => v.height >= 700);
  expect(roomy.length).toBeGreaterThanOrEqual(3);
  for (const v of roomy) {
    expect(v.island, `${v.label} gives the island away`).toBeGreaterThanOrEqual(0.35);
  }
  // ...and no viewport is excused entirely, though the phones come close and the number
  // says so rather than hiding it. A 460x720 screen stacking a character under a bubble
  // that holds a four-slide walkthrough leaves 8% of itself on the runner's fonts: that is
  // what a phone has to give, not a concession, and this floor is here so that "not much"
  // cannot quietly become "none".
  for (const v of VIEWPORTS) {
    expect(v.island, v.label).toBeGreaterThanOrEqual(0.05);
  }
});

for (const viewport of VIEWPORTS) {
  test(`the advisor stays inside a ${viewport.label} (${viewport.width}x${viewport.height})`, async () => {
    await page.viewport(viewport.width, viewport.height);
    await openAdvisor();

    const card = query<HTMLElement>(".crisis-call-speech");
    const body = query<HTMLElement>('[data-testid="crisis-call-said"]');
    const tray = query<HTMLElement>(".crisis-call-actions");
    const rect = card.getBoundingClientRect();

    // 1. The dialogue itself is on the screen, top and bottom.
    expect(rect.top, "advisor top").toBeGreaterThanOrEqual(-1);
    expect(rect.bottom, "advisor bottom").toBeLessThanOrEqual(window.innerHeight + 1);
    expect(rect.left, "advisor left").toBeGreaterThanOrEqual(-1);
    expect(rect.right, "advisor right").toBeLessThanOrEqual(window.innerWidth + 1);

    // 2. The reply buttons are inside the bubble AND on the screen. This is what a
    //    dialogue that overflowed its own cap would lose first, and losing it means the
    //    crisis cannot be entered or declined at all.
    const trayRect = tray.getBoundingClientRect();
    expect(trayRect.bottom, "replies bottom").toBeLessThanOrEqual(rect.bottom + 1);
    expect(trayRect.bottom, "replies on screen").toBeLessThanOrEqual(
      window.innerHeight + 1,
    );
    expect(trayRect.height, "replies have height").toBeGreaterThan(20);

    // 3. No page-level scrollbar. A dialogue that pushed the document taller than the
    //    viewport would be drawing outside the app rather than inside itself.
    expect(
      document.documentElement.scrollHeight,
      "document does not grow",
    ).toBeLessThanOrEqual(window.innerHeight + 1);

    // 4. SOMETHING REALLY CLIPS, which is the floor under every containment assertion
    //    below: a container that did not scroll could not clip, and "inside the bubble"
    //    would then be a fact about a box with no edges.
    //
    //    THE CLIPPING IS ONE LEVEL IN, and this floor names that level (#335). Asking the
    //    outer box to overflow would be asking for the old layout back: a single scrolling
    //    column is what carried Back / Next off the bottom of a short card. The
    //    walkthrough absorbs the height pressure and its slide is the inner scroller, so
    //    at a short height the bubble fits and the SLIDE is what clips.
    expect(getComputedStyle(body).overflowY, "the bubble is a scroll container").toBe(
      "auto",
    );
    expect(body.clientHeight, "the scroll box has a box").toBeGreaterThan(40);
    if (viewport.mustClip) {
      // The slide's LINES, not the slide: the step count and the heading are pinned rows
      // above them, so a squeezed page still says which of the four it is.
      const pressed = query<HTMLElement>(".crisis-call-slide .crisis-call-terms");
      expect(getComputedStyle(pressed).overflowY, "the lines are the inner scroller").toBe(
        "auto",
      );
      expect(
        pressed.scrollHeight,
        "something really has to clip at this height",
      ).toBeGreaterThan(pressed.clientHeight);
    }

    // 5. AND THE ISLAND IS STILL THERE, which is the claim the whole rewrite is about and
    //    the one a card could never satisfy. Two halves:
    //
    //    a) the strip above the advisor is at least this viewport's declared fraction of
    //       the screen, so the dialogue cannot grow until there is nothing behind it;
    //    b) nothing the dialogue draws reaches into it. Sampled with `elementsFromPoint`
    //       rather than by comparing rects, and that is a fix for a measured false
    //       failure: a rect ignores ancestor clipping, so the shout scrolled up out of
    //       sight inside the bubble still reported a box in the strip it could not
    //       possibly be painting into. `elementsFromPoint` answers the question actually
    //       being asked, which is what a person looking at that pixel would see.
    //
    //    Taken at EVERY SLIDE rather than on arrival, because the slides are not the same
    //    height: the actions slide carries three lines and slide one carries two, so a
    //    check on the opening frame would be measuring the smallest bubble the dialogue
    //    ever draws and calling it the worst case.
    const advisor = query<HTMLElement>('[data-testid="crisis-call-advisor"]');
    const figure = query<HTMLElement>(".crisis-call-speech__figure");
    const islandStrip = () => {
      const free = Math.min(
        card.getBoundingClientRect().top,
        figure.getBoundingClientRect().top,
      );
      expect(
        free / window.innerHeight,
        `only ${Math.round((free / window.innerHeight) * 100)}% of the screen is left as island`,
      ).toBeGreaterThanOrEqual(viewport.island);
      const hits = document.elementsFromPoint(window.innerWidth / 2, free / 2);
      // The floor: the sample has to land inside the dialogue's own layer, or "nothing of
      // the dialogue is here" would be true of any point on the page.
      expect(hits, "the sampled point is not inside the dialogue at all").toContain(
        advisor,
      );
      expect(
        hits
          .filter((el) => el !== advisor && advisor.contains(el))
          .map((el) => el.className),
        "the advisor paints into the strip of island above it",
      ).toEqual([]);
    };
    islandStrip();

    // 6. EVERY SLIDE IS REACHABLE AND UNCLIPPED, stepped through at this height. Clipping
    //    content is as bad as spilling it, and one slide fitting says nothing about the
    //    longest one, so each is scrolled to and measured against the scroll box's own box.
    //
    //    Reachability rather than containment, because on the small window a three-line
    //    slide is genuinely taller than the whole scroll viewport: its top and its bottom
    //    each have to be BRINGABLE inside it, which is the property that fails when
    //    something is clipped and holds when something merely scrolls.
    const stepped = await stepThrough(async (slide) => {
      const lines = [...slide.querySelectorAll<HTMLElement>(".crisis-call-terms li")];
      expect(lines.length, "the slide has lines").toBeGreaterThanOrEqual(1);
      const first = lines[0];
      const last = lines[lines.length - 1];
      if (!first || !last) {
        throw new Error("the slide rendered no lines");
      }

      first.scrollIntoView({ block: "nearest" });
      await settle();
      expect(
        first.getBoundingClientRect().top,
        "the slide's first line comes inside the body",
      ).toBeGreaterThanOrEqual(body.getBoundingClientRect().top - 1);
      expect(first.getBoundingClientRect().height, "first line has height").toBeGreaterThan(
        8,
      );

      last.scrollIntoView({ block: "nearest" });
      await settle();
      expect(
        last.getBoundingClientRect().bottom,
        "the slide's last line comes inside the body",
      ).toBeLessThanOrEqual(body.getBoundingClientRect().bottom + 1);
      expect(last.getBoundingClientRect().height, "last line has height").toBeGreaterThan(
        8,
      );

      // Never sideways. A slide that overflowed horizontally would be unreadable at any
      // scroll position, since the bubble only scrolls the one way.
      const slideRect = slide.getBoundingClientRect();
      const bodyBox = body.getBoundingClientRect();
      expect(slideRect.left, "slide left inside the bubble").toBeGreaterThanOrEqual(
        bodyBox.left - 1,
      );
      expect(slideRect.right, "slide right inside the bubble").toBeLessThanOrEqual(
        bodyBox.right + 1,
      );

      // ...and THIS slide still leaves the island showing. The tallest one is the case
      // that matters and it is not the one the dialogue opens on.
      islandStrip();
    });
    expect(stepped, "every slide was walked at this height").toBe(briefing.slides.length);

    // 7. And the two fixed lines are reachable in both directions: the closing at the
    //    bottom of the bubble, the advisor's own line at the top.
    body.scrollTop = body.scrollHeight;
    await settle();
    const closing = query<HTMLElement>(".crisis-call-closing").getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    expect(closing.bottom, "last line inside the body").toBeLessThanOrEqual(
      bodyRect.bottom + 1,
    );
    expect(closing.top, "last line inside the body").toBeGreaterThanOrEqual(
      bodyRect.top - 1,
    );
    expect(closing.height, "last line has height").toBeGreaterThan(8);

    body.scrollTop = 0;
    await settle();
    const lead = query<HTMLElement>(
      '[data-testid="crisis-call-lead"]',
    ).getBoundingClientRect();
    expect(lead.top, "first line inside the body").toBeGreaterThanOrEqual(bodyRect.top - 1);
    expect(lead.bottom, "first line inside the body").toBeLessThanOrEqual(
      body.getBoundingClientRect().bottom + 1,
    );
  });
}

/**
 * THE WINDOW PEOPLE ACTUALLY DEMO ON, and the one property every check above could not see.
 *
 * This is #335's test, kept through the card's removal because the property it pins is not
 * about the card. The loop above scrolls before it measures, on purpose: it is asking
 * whether content is REACHABLE, which is the right question for a scroller. It is the wrong
 * question for the beat the ☰ Menu's winter entry exists to play, and answering the second
 * with the first is how the defect shipped:
 *
 * > Measured in the real city at 1024x580, on first paint, the Back / Next pair was **0 of
 * > 32px visible** and the slide showed **35 of its 117px**. A learner met a cut-off heading
 * > and a "Face the winter" button, with no sign the briefing had four steps at all. Every
 * > assertion above was green, because `scrollIntoView` was called first.
 *
 * So this test never scrolls, and every scroll box's `scrollTop` is asserted at each slide
 * to prove it — that zero is the floor under the whole test, since "is visible" is worth
 * nothing from a test that scrolled the thing into view before looking.
 *
 * ## What has to be on screen, and why each one is here
 *
 * The advisor's FIGURE and his LINE, because "the advisor pops up and explains the crisis"
 * is the ask, and a dialogue that opened on slide text with the character scrolled off the
 * top would satisfy a reachability check and lose the beat. The PAGER, because a
 * walkthrough whose Next cannot be seen is a one-slide briefing wearing three more. The
 * slide's OWN heading, so the page says which of the four it is.
 *
 * The slide's LINES are deliberately not required to fit: the tallest slide can be taller
 * than a short screen holds beside a portrait, and it scrolls inside itself while the pager
 * stays put. That is the design, and the loop above is what keeps those lines reachable.
 *
 * Sizes are asserted beside containment, because containment is trivially true of a box
 * with no area: a figure collapsed to `width: 0` would pass "wholly on screen" invisibly.
 */
const DEMO_WINDOW = { width: 1024, height: 580, headingFits: true } as const;

/**
 * ...and the shortest window in the table, where the fix is load-bearing rather than inert.
 *
 * Dropping the card left so much room that at 1024x580 nothing has to shrink at all, so the
 * pager stays put whether or not the walkthrough absorbs the pressure — this test would go
 * green over a layout with #335's fix taken back out. At 1280x360 it does not: measured,
 * deleting the one rule that lets the walkthrough shrink puts the bubble into its own
 * scroller, the focused reply drags it to the bottom, and the shout and both step buttons
 * leave the screen on first paint.
 *
 * `headingFits` is off there and nowhere else. At 360px the walkthrough is squeezed past
 * the point where even the page's own `auto` rows fit, and the heading comes back 21px of
 * 22 — which is the page giving room, the behaviour this whole arrangement is for, rather
 * than the pager being pushed away, which is the defect. The flag is written down instead
 * of the assertion being dropped so that a heading clipped at a REAL height still fails.
 */
const FIRST_PAINT = [
  DEMO_WINDOW,
  { width: 1280, height: 360, headingFits: false },
] as const;

/**
 * How much of `el` a person can actually see, in px.
 *
 * Every clipping ancestor and then the viewport, because the dialogue has two nested scroll
 * boxes now and a rect ignores both. Reading only the nearest one would have called the
 * shout visible while the bubble had scrolled it off the top.
 */
function visibleHeight(el: HTMLElement): number {
  const box = el.getBoundingClientRect();
  let top = box.top;
  let bottom = box.bottom;
  for (let node = el.parentElement; node !== null; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.overflowY === "visible" && style.overflowX === "visible") {
      continue;
    }
    const clip = node.getBoundingClientRect();
    top = Math.max(top, clip.top);
    bottom = Math.min(bottom, clip.bottom);
  }
  return Math.max(0, Math.min(bottom, window.innerHeight) - Math.max(top, 0));
}

for (const window_ of FIRST_PAINT) {
  test(`the advisor and his pager need no scrolling at ${window_.width}x${window_.height}`, async () => {
    await page.viewport(window_.width, window_.height);
    await openAdvisor();

    const said = query<HTMLElement>('[data-testid="crisis-call-said"]');

    /** Fully on screen, and big enough for that to mean something. */
    const wholly = (el: HTMLElement, what: string, floor: number): void => {
      const box = el.getBoundingClientRect();
      expect(box.height, `${what} has real height`).toBeGreaterThan(floor);
      expect(Math.round(visibleHeight(el)), `${what} is wholly on screen`).toBe(
        Math.round(box.height),
      );
    };

    const stepped = await stepThrough(async (slide, index) => {
      const at = `slide ${index + 1}`;

      // THE FLOOR: neither scroll box has moved, so all of this is about first paint.
      expect(said.scrollTop, `the bubble is unscrolled at ${at}`).toBe(0);
      expect(slide.scrollTop, `the slide is unscrolled at ${at}`).toBe(0);

      wholly(query<HTMLElement>(".crisis-call-speech__figure"), `the advisor at ${at}`, 40);
      wholly(
        query<HTMLElement>('[data-testid="crisis-call-lead"]'),
        `his line at ${at}`,
        20,
      );
      wholly(query<HTMLElement>('[data-testid="crisis-call-back"]'), `Back at ${at}`, 12);
      wholly(query<HTMLElement>('[data-testid="crisis-call-next"]'), `Next at ${at}`, 12);
      wholly(query<HTMLElement>(".crisis-call-slide__step"), `the step count at ${at}`, 8);
      // ...and so are the two replies, which the old action tray kept pinned for free and
      // an unpinned row inside a bubble does not.
      wholly(query<HTMLElement>('[data-testid="crisis-call-face"]'), `Face at ${at}`, 20);
      wholly(
        query<HTMLElement>('[data-testid="crisis-call-later"]'),
        `Not yet at ${at}`,
        20,
      );
      const heading = slide.querySelector<HTMLElement>("h3");
      if (!heading) {
        throw new Error(`the slide rendered no heading at ${at}`);
      }
      if (window_.headingFits) {
        wholly(heading, `the heading at ${at}`, 12);
      } else {
        // Still MOSTLY there, so "the page may give room" cannot quietly become "the page
        // is gone". A heading scrolled off entirely fails here.
        expect(
          visibleHeight(heading) / heading.getBoundingClientRect().height,
          `the heading at ${at}`,
        ).toBeGreaterThan(0.9);
      }

      // And the whole assembly is inside the screen while all of that is true.
      const speech = query<HTMLElement>(".crisis-call-speech").getBoundingClientRect();
      expect(speech.bottom, `the advisor's bottom edge at ${at}`).toBeLessThanOrEqual(
        window.innerHeight + 1,
      );
      expect(speech.top, `the advisor's top edge at ${at}`).toBeGreaterThanOrEqual(-1);
    });
    expect(stepped, "every slide was checked at this height").toBe(briefing.slides.length);
  });
}

test("the standing notice announces itself in words, not by colour", async () => {
  await page.viewport(920, 720);
  let explained = 0;
  h = mount(
    <div className="city-shell">
      <div style={{ position: "relative", height: "100vh" }}>
        <CrisisCallNotice
          briefing={briefing}
          onExplain={() => {
            explained += 1;
          }}
        />
      </div>
    </div>,
  );
  await waitFor(
    () => document.querySelector('[data-testid="crisis-call-notice"]') !== null,
    "the notice mounts",
  );

  const notice = query<HTMLElement>('[data-testid="crisis-call-notice"]');
  // It is a status, not an alert: the assertive announcement already fired once when the
  // call landed, and a banner that re-interrupted would be the interruption D-CRISIS-10
  // rules out.
  expect(notice.getAttribute("role")).toBe("status");

  // NEVER STATE BY COLOUR ALONE. The state is in the sentence, so the notice survives
  // being read aloud, printed in grey, or seen by somebody who cannot tell amber from
  // green. The snowflake is decoration on top of it and is hidden from the reader.
  expect(notice.textContent ?? "").toContain(briefing.title);
  expect(notice.textContent ?? "").toMatch(/is waiting/);
  const mark = query<HTMLElement>(".crisis-call-notice__mark");
  expect(mark.getAttribute("aria-hidden")).toBe("true");

  // The border really is drawn, and in the standing-mark amber rather than in either
  // correctness hue. Compared against probes so this asserts the TOKEN and not one
  // browser's serialization of an `oklch`.
  const shell = query<HTMLElement>(".city-shell");
  const border = getComputedStyle(notice).borderTopColor;
  expect(border).toBe(probe(shell, "color", "var(--signal-deep)"));
  expect(border).not.toBe(probe(shell, "color", "var(--civic)"));
  expect(border).not.toBe(probe(shell, "color", "var(--brick)"));

  // The way back to the terms is a real button with a readable name.
  const explain = query<HTMLButtonElement>('[data-testid="crisis-call-explain"]');
  expect(explain.textContent ?? "").toContain(briefing.advisorName ?? "");
  explain.focus();
  expect(document.activeElement).toBe(explain);
  explain.click();
  expect(explained).toBe(1);
});

/**
 * Resolve one declaration through a throwaway element, so a colour assertion is about the
 * TOKEN. `--signal-deep`, `--civic` and `--brick` are authored in `oklch`, and how a
 * browser serializes a computed `oklch` is not a fact this suite should be pinning.
 */
function probe(shell: HTMLElement, declaration: string, value: string): string {
  const node = document.createElement("div");
  node.style.setProperty(declaration, value);
  shell.appendChild(node);
  const resolved = getComputedStyle(node).getPropertyValue(declaration);
  node.remove();
  return resolved;
}
