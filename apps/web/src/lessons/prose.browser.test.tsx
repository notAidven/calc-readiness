/**
 * Money prompts through the real Markdown + KaTeX pipeline.
 *
 * A currency amount is the one place a prompt mixes a literal `$` with math delimiters,
 * and remark-math counts every unescaped `$` as a delimiter. Drop one and the span never
 * closes: the sentence AFTER the amount gets swallowed into math and renders as run-on
 * italics, while the fragment before it fails to parse as LaTeX. Both halves still
 * typecheck and still pass `validateTemplates`, so only a render catches it.
 */

import {
  D7_PRACTICE_POOL,
  D10_PRACTICE_POOL,
  latexDollarInt,
  PRODUCT_ITEM_PACK,
} from "@cr/item-bank";
import { afterEach, expect, test } from "vitest";

import { LessonProse } from "./prose";
import { type Harness, mount, waitFor } from "./testHarness";

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

async function render(markdown: string): Promise<HTMLElement> {
  h = mount(<LessonProse markdown={markdown} />);
  const { host } = h;
  await waitFor(() => (host.textContent ?? "") !== "", "prose renders");
  return host;
}

/** The prompt's prose, with every typeset math span removed. */
function textOutsideMath(host: HTMLElement): string {
  const clone = host.cloneNode(true) as HTMLElement;
  for (const math of Array.from(clone.querySelectorAll(".katex"))) {
    math.remove();
  }
  return clone.textContent ?? "";
}

function katexErrors(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll(".katex-error")).map((n) => n.textContent ?? "");
}

test("a money amount leaves the rest of the sentence outside math", async () => {
  const markdown = `A print shop charges a setup fee of ${latexDollarInt(45)}, plus ${latexDollarInt(2)} for each poster. Let $x$ be the number of posters.`;
  const host = await render(markdown);

  expect(katexErrors(host), "no fragment failed to parse as LaTeX").toEqual([]);

  // The words after each amount are prose, not math. When a delimiter goes missing they
  // get pulled into a math span and this text disappears.
  const prose = textOutsideMath(host);
  expect(prose).toContain("for each poster");
  expect(prose).toContain("be the number of posters");

  // The currency sign renders as a literal `$` in the prose, not as a delimiter.
  expect(prose).toContain("$");

  // Three amounts/variables typeset: 45, 2, and x.
  expect(host.querySelectorAll(".katex").length).toBe(3);
});

test("every pooled D7 money prompt renders without a KaTeX error", async () => {
  const money = D7_PRACTICE_POOL.filter((item) => item.prompt.includes("\\$"));
  expect(money.length, "D7 has money prompts to check").toBeGreaterThan(0);

  for (const item of money) {
    const host = await render(item.prompt);
    expect(katexErrors(host), `${item.item_version_id} renders no KaTeX error`).toEqual([]);
    h?.cleanup();
    h = null;
  }
});

/** Every practice prompt that declares `pi` in `allowed_symbols` typesets π, not bare ASCII. */
function piPromptItems() {
  return [...D10_PRACTICE_POOL, ...PRODUCT_ITEM_PACK].filter((item) =>
    (item.answer.allowed_symbols ?? []).includes("pi"),
  );
}

/**
 * The product spine's items are Gabe-authored and frozen (`docs/Content_Authoring_Split.md` §7):
 * re-wording one moves its pinned hash in `product.test.ts`, which is not this lane's to re-pin.
 * TRG.1 is the only exact-pi prompt in that pack, so it still reads "in terms of pi" as prose.
 * Asserted in both directions below, so the excuse cannot outlive the thing it excuses.
 */
const BARE_PI_EXEMPT_NODES: readonly string[] = ["TRG.1"];

const BARE_PI = /\bin terms of pi\b/i;

test("every exact-pi practice prompt typesets pi and renders without a KaTeX error", async () => {
  const piItems = piPromptItems();
  const owed = piItems.filter((item) => !BARE_PI_EXEMPT_NODES.includes(item.node_id));
  const excused = piItems.filter((item) => BARE_PI_EXEMPT_NODES.includes(item.node_id));

  expect(owed.length, "the tree has non-exempt exact-pi prompts to guard").toBeGreaterThan(
    0,
  );

  for (const item of owed) {
    const host = await render(item.prompt);
    expect(katexErrors(host), `${item.item_version_id} renders no KaTeX error`).toEqual([]);

    expect(
      textOutsideMath(host),
      `${item.item_version_id}: "in terms of pi" should be typeset, not left as plain text`,
    ).not.toMatch(BARE_PI);

    expect(
      host.querySelectorAll(".katex").length,
      `${item.item_version_id} should typeset at least one math span`,
    ).toBeGreaterThan(0);

    h?.cleanup();
    h = null;
  }

  for (const node of BARE_PI_EXEMPT_NODES) {
    expect(
      excused.some((item) => item.node_id === node),
      `${node} is a declared exception that still ships exact-pi prompts`,
    ).toBe(true);
  }

  for (const item of excused) {
    const host = await render(item.prompt);
    expect(katexErrors(host), `${item.item_version_id} renders no KaTeX error`).toEqual([]);

    expect(
      textOutsideMath(host),
      `${item.item_version_id} has adopted typeset pi: drop ${item.node_id} from BARE_PI_EXEMPT_NODES`,
    ).toMatch(BARE_PI);

    h?.cleanup();
    h = null;
  }
});
