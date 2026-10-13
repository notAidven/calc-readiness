import katex from "katex";
import "katex/dist/katex.min.css";
import { useEffect, useRef } from "react";

/**
 * A tiny, dependency-light math renderer for diagnostic probe prompts.
 *
 * The v2 walk item pack serves prompts as PLAIN-TEXT math (e.g. `Evaluate:
 * (-5) + 3 × (-4)`, `Expand: 3(2x + 4)`, `What is 20% of 60?`) — not LaTeX and
 * not Markdown. Rendered verbatim they read like raw source, so this component
 * upgrades them to typeset math with the already-bundled `katex` dependency.
 *
 * It is deliberately LOCAL to the diagnostic lane: the shared packages export no
 * math renderer, and the lesson-prose renderer lives in another teammate's lane,
 * so we consume only `katex` here (no Markdown pipeline).
 *
 * Rendering strategy:
 *  - A labelled expression ("Evaluate: …" / "Expand: …" / "Simplify: …") renders
 *    as a small kicker label plus a centered display equation.
 *  - A bare expression renders as a display equation.
 *  - A word problem renders as prose with its numbers/percentages typeset inline,
 *    so the sentence stays readable.
 *
 * Accessibility: KaTeX emits MathML beside the visual HTML (its HTML layer is
 * `aria-hidden`), so assistive tech reads the math; surrounding text is plain.
 */

/** Instruction words the pack prefixes onto an expression prompt. */
const INSTRUCTION_LABEL =
  /^(Evaluate|Simplify|Expand and combine|Expand|Factor|Compute|Solve)\s*:\s*/i;

/** A pure math expression is only digits/operators/parens plus the variable x. */
const EXPRESSION_ONLY = /^[\s\d+\-×÷*/().%^=xX,]+$/;

/** Split prose on number tokens (optional decimal + optional trailing percent). */
const NUMBER_SPLIT = /(\d+(?:\.\d+)?%?)/g;

/** Classify a single prose token as a standalone number. */
const IS_NUMBER = /^\d+(?:\.\d+)?%?$/;

/** Split prose on inline `$…$` LaTeX (forward-compat with `$`-delimited packs). */
const TEX_SPLIT = /(\$[^$]+\$)/g;

interface ParsedPrompt {
  /** The instruction word ("Evaluate", …), Title-cased, or null when unlabelled. */
  label: string | null;
  /** The prompt body with any label/trailing period stripped. */
  body: string;
  /** True when the body is a pure math expression (render as display math). */
  isExpression: boolean;
}

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Split a prompt into an optional instruction label + body, and classify it. */
export function parsePrompt(raw: string): ParsedPrompt {
  const trimmed = raw.trim();
  const match = trimmed.match(INSTRUCTION_LABEL);
  if (match) {
    const matched = match[0] ?? "";
    const label = match[1] ?? "";
    const body = trimmed
      .slice(matched.length)
      .replace(/\.\s*$/, "")
      .trim();
    if (label && EXPRESSION_ONLY.test(body)) {
      return { label: titleCase(label), body, isExpression: true };
    }
  }
  const bare = trimmed.replace(/\.\s*$/, "").trim();
  if (!INSTRUCTION_LABEL.test(trimmed) && EXPRESSION_ONLY.test(bare)) {
    return { label: null, body: bare, isExpression: true };
  }
  return { label: null, body: trimmed, isExpression: false };
}

/** Convert the pack's plain-text math notation into equivalent LaTeX. */
export function toLatex(expression: string): string {
  return expression
    .replace(/\s*×\s*/g, " \\times ")
    .replace(/\s*÷\s*/g, " \\div ")
    .replace(/\s*\*\s*/g, " \\cdot ")
    .replace(/(\d+)\s*\/\s*(\d+)/g, "\\dfrac{$1}{$2}")
    .replace(/%/g, "\\%")
    .replace(/\s+/g, " ")
    .trim();
}

interface PromptSegment {
  id: string;
  value: string;
  math: boolean;
}

/** Break a word problem into alternating text / inline-math segments. */
function segmentSentence(raw: string): PromptSegment[] {
  const hasTex = /\$[^$]+\$/.test(raw);
  const parts = raw.split(hasTex ? TEX_SPLIT : NUMBER_SPLIT);
  const segments: PromptSegment[] = [];
  let offset = 0;
  for (const part of parts) {
    if (part.length > 0) {
      const math = hasTex ? part.startsWith("$") : IS_NUMBER.test(part);
      const value = hasTex && math ? part.slice(1, -1) : part;
      segments.push({ id: `${offset}:${part}`, value, math });
    }
    offset += part.length;
  }
  return segments;
}

/** One KaTeX-rendered fragment, mounted imperatively (no `dangerouslySetInnerHTML`). */
function MathPiece({ latex, display = false }: { latex: string; display?: boolean }) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = host.current;
    if (!node) {
      return;
    }
    try {
      katex.render(latex, node, {
        displayMode: display,
        throwOnError: false,
        output: "htmlAndMathml",
      });
    } catch {
      // Defensive: never let a malformed prompt break the probe — show the source.
      node.textContent = latex;
    }
  }, [latex, display]);
  return (
    <span
      ref={host}
      className={display ? "dgx-math dgx-math--block" : "dgx-math dgx-math--inline"}
    />
  );
}

/** Render a diagnostic prompt as typeset math (see the module doc for the rules). */
export function MathText({ prompt }: { prompt: string }) {
  const parsed = parsePrompt(prompt);
  if (parsed.isExpression) {
    return (
      <span className="dgx-prompt dgx-prompt--expression">
        {parsed.label ? <span className="dgx-prompt__kicker">{parsed.label}</span> : null}
        <MathPiece latex={toLatex(parsed.body)} display />
      </span>
    );
  }
  return (
    <span className="dgx-prompt dgx-prompt--prose">
      {segmentSentence(prompt).map((segment) =>
        segment.math ? (
          <MathPiece key={segment.id} latex={toLatex(segment.value)} />
        ) : (
          <span key={segment.id} className="dgx-prompt__text">
            {segment.value}
          </span>
        ),
      )}
    </span>
  );
}
