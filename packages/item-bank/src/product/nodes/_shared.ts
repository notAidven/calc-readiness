/**
 * Formatting helpers shared by the per-node product (v2) template files
 * (`nodes/<NODE>/`). Previously inline in `templates.ts`; hoisting them keeps each
 * node's template in its own file while every node renders numbers/signs
 * identically (so the frozen item content is byte-for-byte unchanged by the split).
 */

/** Format a JS number without floating-point noise. */
export function numStr(value: number): string {
  return String(Number(value.toFixed(6)));
}

/** Render a signed additive term for a prompt: 5 -> "+ 5", -5 -> "- 5". */
export function signed(value: number): string {
  return value >= 0 ? `+ ${value}` : `- ${-value}`;
}
