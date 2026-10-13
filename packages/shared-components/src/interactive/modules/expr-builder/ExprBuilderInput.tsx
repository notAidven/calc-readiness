import { type ReactElement, useId, useState } from "react";
import type { InteractiveInputProps } from "../../types";
import type {
  ExprBuilderPayload,
  ExprBuilderSlot,
  ExprBuilderWorkspace,
} from "./comparator";

/**
 * The interactive `expr_builder` input, the THIRD scored interactive widget after
 * the graph and number-line inputs. A student assembles a symbolic expression from
 * the answer-free slots the workspace declares (a base + exponent for
 * `positive_power`; a coefficient, radicand + index for `coeff_radical`; a base,
 * power + index for `radical_form`; a base + numerator/denominator for
 * `rational_power`) and the widget emits the structured {@link ExprBuilderPayload}
 * the comparator scores. It is CONTROLLED (emits through `value`/`onChange`) and
 * does NOT self-grade in practice: the practice surface owns submission through the
 * global `checkAnswer` seam, exactly like the text input.
 *
 * The student SEES what they have built, as notation. On RAD.3 the form IS the answer,
 * so showing back `root(x^3, 4)` asked a learner to convert into a radical and then
 * never showed them a radical. When the host passes a `renderMath` typesetter the
 * assembled expression renders as real math; without one it degrades to the readable
 * ASCII form, so the widget still stands alone.
 *
 * The widget prints a heading of its own ONLY when the host gives it a `label`. A
 * practice surface already renders the problem, typeset, so passing the prompt down as a
 * label put it on screen a second time as its raw LaTeX source. Such a host sends
 * `labelledBy` instead, and the slot group takes its accessible name from the prompt the
 * host already drew.
 *
 * Accessibility: every slot is a native control inside its own `<label>` (a text field
 * for a symbol, a number field for an integer), so the whole item is answerable from the
 * keyboard and each control has exactly one accessible name. Integer slots carry the
 * `min` their role allows. A polite live region narrates the assembled expression IN
 * WORDS (the typeset copy beside it is hidden from assistive tech, because typeset math
 * markup reads badly aloud), and no state is conveyed by color alone.
 */

/** The payload field each slot role writes to (positive_power uses base + exp). */
function readSlotValue(
  slot: ExprBuilderSlot,
  raw: string,
): { key: keyof ExprBuilderPayload; value: string | number } | undefined {
  const trimmed = raw.trim();
  switch (slot.role) {
    case "base":
      return { key: "base", value: trimmed };
    case "exponent":
      return { key: "exp", value: Number(trimmed) };
    case "coefficient":
      return { key: "coeff", value: Number(trimmed) };
    case "radicand":
      return { key: "radicand", value: Number(trimmed) };
    case "index":
      return { key: "index", value: Number(trimmed) };
    case "numerator":
      return { key: "num", value: Number(trimmed) };
    case "denominator":
      return { key: "den", value: Number(trimmed) };
    default:
      return undefined;
  }
}

/**
 * The smallest value a role can legitimately take, mirroring `validateExprBuilderSpec`.
 * A radicand or a root index below 2 is not a gradeable answer in any authored shape.
 */
function slotMin(slot: ExprBuilderSlot): number | undefined {
  if (slot.control !== "integer") {
    return undefined;
  }
  return slot.role === "radicand" || slot.role === "index" || slot.role === "denominator"
    ? 2
    : 1;
}

/** A slot's current trimmed value, or an empty string. */
function slotVal(values: Record<string, string>, id: string): string {
  return values[id]?.trim() ?? "";
}

/**
 * A base symbol safe to splice into LaTeX. The student types this field freely, so
 * anything that is not a letter or digit is dropped rather than handed to a typesetter
 * as a command.
 */
function safeSymbol(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "");
  return cleaned === "" ? "?" : cleaned;
}

/** A readable ASCII preview of the assembled expression (e.g. `x^3`). */
function previewExpression(
  workspace: ExprBuilderWorkspace,
  values: Record<string, string>,
): string {
  const anyFilled = workspace.slots.some((slot) => slotVal(values, slot.id) !== "");
  if (!anyFilled) {
    return "";
  }
  const ph = (id: string): string => slotVal(values, id) || "?";
  switch (workspace.kind) {
    case "positive_power":
      return `${ph("base")}^${ph("exp")}`;
    case "coeff_radical":
      return `${ph("coeff")}*root(${ph("radicand")}, ${ph("index")})`;
    case "radical_form":
      return `root(${ph("base")}^${ph("exp")}, ${ph("index")})`;
    case "rational_power":
      return `${ph("base")}^(${ph("num")}/${ph("den")})`;
    default:
      return workspace.slots.map((slot) => `${slot.label}: ${ph(slot.id)}`).join(", ");
  }
}

/** A root in LaTeX; a square root is written bare, as every lesson draws it. */
function rootTex(radicand: string, index: string): string {
  return index === "2" ? `\\sqrt{${radicand}}` : `\\sqrt[${index}]{${radicand}}`;
}

/** The assembled expression as LaTeX, for a host that can typeset it. */
function latexExpression(
  workspace: ExprBuilderWorkspace,
  values: Record<string, string>,
): string {
  const num = (id: string): string => slotVal(values, id) || "?";
  const sym = (id: string): string => safeSymbol(slotVal(values, id));
  switch (workspace.kind) {
    case "positive_power":
      return `${sym("base")}^{${num("exp")}}`;
    case "coeff_radical":
      return `${num("coeff")}\\,${rootTex(num("radicand"), num("index"))}`;
    case "radical_form":
      return rootTex(`${sym("base")}^{${num("exp")}}`, num("index"));
    case "rational_power":
      return `${sym("base")}^{\\frac{${num("num")}}{${num("den")}}}`;
    default:
      return "";
  }
}

/** The assembled expression in words, for the live region. */
function spokenExpression(
  workspace: ExprBuilderWorkspace,
  values: Record<string, string>,
): string {
  const v = (id: string): string => slotVal(values, id) || "blank";
  switch (workspace.kind) {
    case "positive_power":
      return `${v("base")} to the ${v("exp")}`;
    case "coeff_radical":
      return `${v("coeff")} times the root of ${v("radicand")}, index ${v("index")}`;
    case "radical_form":
      return `the root of ${v("base")} to the ${v("exp")}, index ${v("index")}`;
    case "rational_power":
      return `${v("base")} to the ${v("num")} over ${v("den")}`;
    default:
      return workspace.slots.map((slot) => `${slot.label} ${v(slot.id)}`).join(", ");
  }
}

export function ExprBuilderInput({
  itemVersionId,
  workspace,
  value,
  onChange,
  label,
  labelledBy,
  disabled = false,
  renderMath,
}: InteractiveInputProps<ExprBuilderWorkspace, ExprBuilderPayload>): ReactElement {
  const feedbackId = useId();
  const ownLabelId = `${feedbackId}-label`;
  const ownLabel = label !== undefined && label.trim() !== "";
  const labelledById = ownLabel ? ownLabelId : labelledBy;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const slot of workspace.slots) {
      const field = readSlotValue(slot, "");
      const current = field ? value?.[field.key] : undefined;
      initial[slot.id] = current === undefined ? "" : String(current);
    }
    return initial;
  });

  function emit(next: Record<string, string>): void {
    const payload: ExprBuilderPayload = { kind: workspace.kind };
    for (const slot of workspace.slots) {
      const raw = next[slot.id] ?? "";
      if (raw.trim() === "") {
        continue;
      }
      const field = readSlotValue(slot, raw);
      if (field) {
        (payload as Record<string, unknown>)[field.key] = field.value;
      }
    }
    onChange(payload);
  }

  function updateSlot(slotId: string, raw: string): void {
    const next = { ...values, [slotId]: raw };
    setValues(next);
    // Emit AFTER queuing our own state (never inside the updater) so we don't call
    // the parent's setState during this component's render (React warns on that).
    emit(next);
  }

  const preview = previewExpression(workspace, values);
  const anyFilled = preview !== "";

  return (
    <div
      className="cr-expr-builder-input"
      data-item-version-id={itemVersionId}
      data-disabled={disabled}
    >
      {ownLabel && (
        <p className="cr-expr-builder-input__label" id={ownLabelId}>
          {label}
        </p>
      )}

      <fieldset
        className="cr-expr-builder-input__slots"
        aria-labelledby={labelledById}
        aria-describedby={feedbackId}
      >
        {workspace.slots.map((slot) => (
          <label className="cr-expr-builder-input__field" key={slot.id}>
            <span>{slot.label}</span>
            <input
              type={slot.control === "integer" ? "number" : "text"}
              inputMode={slot.control === "integer" ? "numeric" : "text"}
              step={slot.control === "integer" ? 1 : undefined}
              min={slotMin(slot)}
              disabled={disabled}
              value={values[slot.id] ?? ""}
              autoComplete="off"
              onChange={(event) => updateSlot(slot.id, event.target.value)}
            />
          </label>
        ))}
      </fieldset>

      {/*
        The expression as the student has built it. Decoration over the live region below,
        which carries the same content in words, so it is hidden from assistive tech rather
        than read twice.

        The workspace's `template` used to be printed here too, above the fields. It said
        "base^exponent" over a group already labelled "Base" and "Exponent", which is the
        same instruction twice, in a notation the learner is here to be taught. The field
        labels are the shape. `template` stays on the workspace, where the comparator's own
        tests pin it; that no widget prints it is asserted by `answerRowChrome`.
      */}
      {anyFilled && (
        <p className="cr-expr-builder-input__built" aria-hidden="true">
          {renderMath ? renderMath(latexExpression(workspace, values)) : preview}
        </p>
      )}

      <p id={feedbackId} className="cr-expr-builder-input__feedback" aria-live="polite">
        {anyFilled
          ? `Current answer: ${preview}, read as ${spokenExpression(workspace, values)}.`
          : "Nothing built yet."}
      </p>
    </div>
  );
}
