import { INTERACTIVE_DEMO_NODE } from "@cr/item-bank";
import { useMemo, useState } from "react";

import { InfinitePractice } from "../lessons/InfinitePractice";
import { LessonPractice } from "../lessons/LessonPractice";
import { interactivePracticeSource } from "../lessons/practiceSession";

import "./diagnostic-demo.css";

/**
 * A live demo of the interactive `number_line` answer type running through the REAL
 * practice surfaces — the graded {@link LessonPractice} (5-slot set → 4/5 mastery
 * rule, hints, reveal → worked solution, fresh-version retry) and the casual
 * {@link InfinitePractice} (endless streak). It uses the interactive DEMO pool under
 * the synthetic {@link INTERACTIVE_DEMO_NODE}, so it demonstrates the whole flow
 * WITHOUT touching any shipped D1 node's practice. Reached with `?interactive`.
 *
 * Everything is graded through the same global `checkAnswer` seam and the same engine
 * + mastery service as the text practice — only the answer widget differs.
 */
export function InteractivePracticeProbe() {
  const [mode, setMode] = useState<"graded" | "infinite">("graded");
  // A fresh interactive source per graded run so "Practice again" reshuffles cleanly.
  const source = useMemo(() => interactivePracticeSource(), []);

  return (
    <section className="diagnostic-demo" aria-labelledby="interactive-probe-title">
      <div className="dgx-probe__head">
        <span className="dgx-eyebrow">Capability probe · Number-line answers</span>
        <h2 id="interactive-probe-title" className="dgx-probe__title">
          Answer number-line items through the real practice flow
        </h2>
        <p className="dgx-lede">
          The controlled number-line widget emits a structured point/interval payload that
          the deterministic comparator grades, over the same submit → global checker →
          mastery path as text practice. This demo pool lives under a synthetic demo node
          and never touches any shipped lesson.
        </p>
      </div>

      <div className="dgx-probe__meter" role="tablist" aria-label="Practice mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "graded"}
          className="dgx-btn dgx-btn--ghost"
          data-active={mode === "graded"}
          onClick={() => setMode("graded")}
        >
          Graded set (4/5 mastery)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "infinite"}
          className="dgx-btn dgx-btn--ghost"
          data-active={mode === "infinite"}
          onClick={() => setMode("infinite")}
        >
          Infinite practice (streak)
        </button>
      </div>

      {mode === "graded" ? (
        <LessonPractice key="graded" nodeId={INTERACTIVE_DEMO_NODE} source={source} />
      ) : (
        <InfinitePractice
          key="infinite"
          nodeId={INTERACTIVE_DEMO_NODE}
          onExit={() => setMode("graded")}
        />
      )}
    </section>
  );
}
