/**
 * The `?dev` lesson list is where an author previews what they just wrote, so a domain
 * missing from it is a domain nobody opens. It lists the ALL-DOMAINS registry, and this
 * walks the whole path a preview takes for the newest domain: the D2 lesson is listed,
 * opens its options menu, and its practice set builds real problems. Before the registry
 * existed the list held only D1, and this D2 path threw inside the D1 practice pool.
 *
 * The ERA drill half also covers the completion gate from the dev side: a browser with
 * no saved city gets the locked panel, a saved practice set unlocks the drill, and the
 * dev bypass button opens it regardless. The two halves are deliberately keyed on
 * different axes, which is the thing worth guarding: the lesson list is domain-shaped
 * because packs live in `content/lessons/<domain>/`, and the drill list is era-shaped
 * because the era is what a learner plays through.
 */

import { D1_PRACTICE_POOL } from "@cr/item-bank";
import { ERA_SEQUENCE, type EraId, getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DevLessons } from "./DevLessons";
import { devSessionStore } from "./devPersistence/devSession";
import { LESSON_DOMAINS, lessonByNode } from "./lessons/domains";
import { teachingSteps } from "./lessons/teachingSections";

const firstD1Item = D1_PRACTICE_POOL[0];
if (!firstD1Item) {
  throw new Error("expected the D1 practice pool to have at least one item");
}
const practicedD1Node = firstD1Item.node_id;

/** Save the city state a learner would have after finishing one D1 practice set. */
function saveCompletedD1Practice(): void {
  const state: StudentNodeState = {
    student_id: "00000000-0000-0000-0000-000000000001",
    node_id: practicedD1Node,
    placement_estimate: 0,
    mastery: 1,
    mastery_updated_at: null,
    completion_status: "in_progress",
    lesson_stage: "done",
    last_practiced_at: null,
  };
  devSessionStore.save({
    node_states: [state],
    neighborhood_states: [],
    placements: [],
  });
  devSessionStore.flush();
}

afterEach(() => {
  devSessionStore.clear();
});

describe("DevLessons lists and opens every domain", () => {
  it("lists every registered domain's lessons, labelled by domain", () => {
    render(<DevLessons />);
    const track = screen.getByRole("heading", { name: "All lessons" }).closest("section");
    if (!track) {
      throw new Error("expected the dev lesson list section");
    }
    for (const domain of LESSON_DOMAINS) {
      expect(domain.lessons.length).toBeGreaterThan(0);
      for (const lesson of domain.lessons) {
        const heading = within(track).getByRole("heading", { name: lesson.node_id });
        const card = heading.closest(".lesson-copy");
        expect(card?.textContent, `${lesson.node_id} is not labelled`).toContain(
          `${domain.label} lesson`,
        );
      }
    }
  });

  it("opens a D2 lesson into a practice set that builds", async () => {
    const user = userEvent.setup();
    render(<DevLessons />);

    const exp1 = screen.getByRole("heading", { name: "EXP.1" }).closest(".lesson-copy");
    if (!exp1) {
      throw new Error("EXP.1 is missing from the dev lesson list");
    }
    await user.click(
      within(exp1 as HTMLElement).getByRole("button", { name: /Open options/i }),
    );

    await user.click(await screen.findByRole("button", { name: /Practice set/i }));

    expect(screen.getByText(/Problem 1 of/i)).toBeInTheDocument();
  });

  /**
   * The QA path the gated player cannot offer: reach slide N of a lesson without clearing
   * slides 1..N-1. `AdvisorLesson` is untouched (its hard gate is covered by
   * `AdvisorLesson.browser.test.tsx`); this is a separate dev-only view.
   *
   * A chip lands on its slide's LECTURE, because that is where the player starts the slide,
   * and the widget is named a section or two on. Both halves are asserted: a chip that
   * jumped straight to the activity would skip the sections it exists to let an author read.
   */
  it("steps a lesson's slides and jumps to any one without clearing a gate", async () => {
    const user = userEvent.setup();
    render(<DevLessons />);

    const rad4Pack = lessonByNode["RAD.4"];
    if (!rad4Pack) {
      throw new Error("RAD.4 is missing from the lesson registry");
    }
    const slideCount = rad4Pack.mini_lesson.length;
    const lastVisualId = (rad4Pack.visuals ?? []).find(
      (v) => v.after === slideCount - 1,
    )?.id;
    if (!lastVisualId) {
      throw new Error("RAD.4's last slide has no visual to name");
    }

    const card = screen.getByRole("heading", { name: "RAD.4" }).closest(".lesson-copy");
    if (!card) {
      throw new Error("RAD.4 is missing from the dev lesson list");
    }
    await user.click(
      within(card as HTMLElement).getByRole("button", { name: /Step slides/i }),
    );

    // Opens on the first slide's first section, naming the index and the section.
    expect(
      await screen.findByRole("heading", {
        name: `RAD.4 slide 1 of ${slideCount} \u00b7 lecture`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Previous step/i })).toBeDisabled();

    // Jump straight to the LAST slide: nothing was solved on the way.
    await user.click(screen.getByRole("button", { name: `Go to slide ${slideCount}` }));
    expect(
      screen.getByRole("heading", {
        name: `RAD.4 slide ${slideCount} of ${slideCount} \u00b7 lecture`,
      }),
    ).toBeInTheDocument();
    // The lecture has no widget under it, and the header says which section it is rather
    // than naming a widget that is not on screen.
    expect(screen.queryByText(new RegExp(lastVisualId))).toBeNull();

    // The widget is named once the walk reaches that slide's activity.
    await stepToTheActivity(user);
    expect(
      screen.getByRole("heading", {
        name: `RAD.4 slide ${slideCount} of ${slideCount} \u00b7 activity`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(lastVisualId))).toBeInTheDocument();
    // The CFU is one more step past the last slide, so "Next" is still live here.
    expect(screen.getByRole("button", { name: /Next step/i })).toBeEnabled();
  });

  /**
   * The CFU is the last step of the same stepper, because that is where the real player
   * opens it. Before this it was unreachable from `?dev` at all: `DevLessonSlides` stopped
   * at the last paragraph, so an author could not see the question they had just written.
   *
   * RAD.4 grades against the accepted list (no `cfu.check`), which is the form-dependent
   * path; the `cfu.check` path is covered by NUM.S below.
   */
  it("reaches the CFU as the last step and shows the author's key and hint", async () => {
    const user = userEvent.setup();
    render(<DevLessons />);

    const rad4Pack = lessonByNode["RAD.4"];
    const cfu = rad4Pack?.cfu;
    if (!rad4Pack || !cfu) {
      throw new Error("RAD.4 is missing its CFU");
    }
    // A step is a SECTION, not a slide, so the count is the walk the player takes plus the
    // question. Derived from the same helper the stepper uses, so a pack that grows a
    // worked example cannot leave this asserting a number nobody renders.
    const stepCount = teachingSteps(rad4Pack).length + 1;

    await user.click(
      within(lessonCard("RAD.4")).getByRole("button", { name: /Step slides/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Go to check for understanding/i }),
    );

    expect(
      screen.getByRole("heading", { name: "RAD.4 check for understanding" }),
    ).toBeInTheDocument();
    // It is the step AFTER the last section, and the stepper ends there.
    expect(stepCount, "RAD.4 walks more steps than it has slides").toBeGreaterThan(
      rad4Pack.mini_lesson.length + 1,
    );
    expect(screen.getByText(`Last step of ${stepCount}`, { exact: false })).toBeVisible();
    expect(screen.getByRole("button", { name: /Next step/i })).toBeDisabled();

    // The real CFU card, not a dev copy of it.
    expect(screen.getByText("Check your understanding")).toBeVisible();
    expect(screen.getByRole("button", { name: "Check" })).toBeVisible();

    // The dev-only half: every accepted answer, and the hint.
    const key = screen
      .getByRole("heading", { name: /Answer key \(hidden from learners\)/i })
      .closest("aside");
    if (!key) {
      throw new Error("expected the dev-only answer key panel");
    }
    expect(within(key as HTMLElement).getByText("DEV ONLY")).toBeVisible();
    expect(
      within(key as HTMLElement).getByRole("heading", {
        name: `Accepted answers (${cfu.accepted.length})`,
      }),
    ).toBeVisible();
    // Scoped to the list rather than the panel: the worked solution below it ends by
    // printing the answer, so a panel-wide lookup now finds an accepted spelling twice.
    const accepted = within(key as HTMLElement).getByRole("list", {
      name: "Accepted answers",
    });
    for (const answer of cfu.accepted) {
      expect(
        within(accepted).getByText(answer),
        `${answer} is missing from the dev answer key`,
      ).toBeVisible();
    }
    expect(within(key as HTMLElement).getByRole("heading", { name: "Hint" })).toBeVisible();
    // The panel names the GRADER, and RAD.4's changed: it was on exact match against the
    // list, and the CFU migration gave it a check block, so the line now names the checker
    // and the key it compares against. Asserted off the pack rather than pinned to one
    // sentence, because the whole value of the line to an author is that it tracks which of
    // the two graders their pack actually gets.
    const check = cfu.check;
    if (check === undefined) {
      throw new Error(
        "RAD.4 lost its check block, so the dev panel is naming another grader",
      );
    }
    expect(key.textContent).toContain(
      `shared checker, ${check.answer_type}, key ${check.answer_key}`,
    );
    expect(key.textContent).not.toContain("exact match against the accepted list");

    // The other two halves of the reveal, which are what an author comes here to read and
    // are invisible from the card until a hint and a wrong answer have been spent on it.
    const steps = cfu.worked_solution ?? [];
    expect(steps.length, "RAD.4 authors a worked solution").toBeGreaterThan(0);
    expect(
      within(
        within(key as HTMLElement).getByRole("list", { name: "Worked solution" }),
      ).getAllByRole("listitem"),
      "every authored step is listed",
    ).toHaveLength(steps.length);
    const variants = cfu.variants;
    if (!variants) {
      throw new Error("RAD.4 should draw its re-asked question from a generator");
    }
    expect(key.textContent).toContain(`Draws from ${variants.template_id}`);
  });

  /**
   * The three controls an author is judging have to be the three a learner gets, because a
   * check is not just its prompt: how the help arrives is half of what an author is deciding
   * when they write a hint. This walks the whole sequence in the order a learner meets it —
   * hint, then reveal, then a different question — and pins the two ways it used to be a
   * dev mock-up rather than the real thing.
   *
   * The first is placement. The hint control used to live INSIDE the answer-key panel, the
   * dashed box whose entire meaning is "a learner never sees this", which put the control an
   * author judges among the material they must not ship. So the assertion is `closest`
   * against that panel, not merely that a button exists somewhere.
   *
   * The second is the control itself: it was a bare browser button reading "Spend the hint
   * (unlocks reveal)", a label describing the mechanism rather than offering the help. It is
   * now `ShowHintAction`, the same element `AdvisorNpc` renders, so the bulb and the two
   * classes below are the game's and there is no second copy to drift.
   *
   * Reveal and re-ask are checked here too, though they were already the real ones, because
   * what makes them right is being reachable IN SEQUENCE: the reveal is withheld until a
   * hint has been spent and an attempt made, and an author who cannot reach it cannot read
   * the worked solution they wrote. What that reveal SHOWS changed with #357 — a registered
   * SVG figure rather than the numbered step cards — so the step below asserts both halves.
   */
  it("drives the CFU step through the game's own hint, reveal and re-ask controls", async () => {
    const user = userEvent.setup();
    render(<DevLessons />);

    const cfu = lessonByNode["RAD.4"]?.cfu;
    if (!cfu) {
      throw new Error("RAD.4 is missing its CFU");
    }
    // Plain prose, so it survives markdown rendering as one findable string.
    const hintFragment = "Work the number and the variable one at a time";
    expect(cfu.hint, "the fragment this test matches on is RAD.4's hint").toContain(
      hintFragment,
    );

    await user.click(
      within(lessonCard("RAD.4")).getByRole("button", { name: /Step slides/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Go to check for understanding/i }),
    );

    const key = screen
      .getByRole("heading", { name: /Answer key \(hidden from learners\)/i })
      .closest("aside");
    if (!key) {
      throw new Error("expected the dev-only answer key panel");
    }

    // 1. The hint is offered as the advisor's action, and NOT from inside the dev panel.
    const showHint = screen.getByRole("button", { name: /Show hint/i });
    expect(
      showHint.closest("aside.dev-slides__key"),
      "the hint control is a learner control, so it may not live in the answer key",
    ).toBeNull();
    expect(showHint.className).toBe("advisor-npc__action advisor-npc__action--hint");
    expect(
      showHint.querySelector("svg.lesson-icon--hint"),
      "the game's hint button carries the bulb",
    ).not.toBeNull();
    // The retired dev-only wording, which described the mechanism instead of offering help.
    expect(screen.queryByRole("button", { name: /Spend the hint/i })).toBeNull();

    // Only the answer key prints the hint yet: the panel is the author's reference copy.
    expect(screen.getAllByText(hintFragment, { exact: false })).toHaveLength(1);
    // No way past the question before the help that is meant to precede it.
    expect(screen.queryByRole("button", { name: /Reveal answer/i })).toBeNull();

    // 2. Spending it retires the button and delivers the hint where a learner reads it.
    await user.click(showHint);
    expect(screen.queryByRole("button", { name: /Show hint/i })).toBeNull();
    const shown = screen
      .getAllByText(hintFragment, { exact: false })
      .filter((el) => el.closest("aside.dev-slides__key") === null);
    expect(shown.length, "the spent hint reads outside the answer key").toBeGreaterThan(0);
    expect(shown[0]).toBeVisible();

    // The hint alone is not a way out: the reveal still waits on an attempt.
    expect(screen.queryByRole("button", { name: /Reveal answer/i })).toBeNull();

    // 3. A wrong answer now offers the reveal, which is the card's own control.
    await user.type(screen.getByRole("textbox"), "x");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(await within(key as HTMLElement).findByText("incorrect")).toBeVisible();
    const reveal = await screen.findByRole("button", { name: /Reveal answer/i });
    expect(
      reveal.closest("aside.dev-slides__key"),
      "the reveal is the learner's control, not the dev panel's",
    ).toBeNull();

    // 4. Revealing teaches, then hands back a DIFFERENT question rather than the same one.
    await user.click(reveal);
    // Exact, because a screen-reader status alongside it opens on the same two words.
    expect(await screen.findByText("Answer revealed.")).toBeVisible();

    // The worked solution the author wrote, which is the half of the reveal this step exists
    // to let them read. Since #357 every check reveals a REGISTERED FIGURE rather than the
    // numbered step cards, so the two halves are asserted separately: the authored steps are
    // now the panel's reference copy and appear nowhere else, and the figure is what a learner
    // is actually shown. Both are matched against the answer-key panel, because a reveal that
    // rendered only inside that dashed box would be invisible to a learner while satisfying a
    // bare "the text is on screen somewhere".
    const steps = cfu.worked_solution ?? [];
    const firstStep = steps[0];
    if (!firstStep) {
      throw new Error("RAD.4 should author a worked solution to reveal");
    }
    const stepFragment = "Split the root across the two factors";
    expect(firstStep, "the fragment this test matches on is RAD.4's first step").toContain(
      stepFragment,
    );
    // Still authored and still reachable, in the one place that prints it.
    expect(
      within(key as HTMLElement).getAllByText(stepFragment, { exact: false }).length,
      "the answer key stopped printing the steps the author wrote",
    ).toBeGreaterThan(0);

    // The figure that replaced them, which is now the surface an author is judging.
    const figures = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".worked-solution--figure figure.lesson-visual",
      ),
    ).filter((el) => el.closest("aside.dev-slides__key") === null);
    expect(
      figures.length,
      "the revealed worked figure reads outside the answer key",
    ).toBeGreaterThan(0);
    const figure = figures[0] as HTMLElement;
    expect(figure).toBeVisible();
    // Not an empty frame: the diagram drew, and its math typeset rather than reaching the
    // screen as raw LaTeX, which is how a registry miss photographs as a passing reveal.
    expect(
      figure.querySelector("svg"),
      "the revealed figure drew no diagram",
    ).not.toBeNull();
    expect(
      figure.querySelectorAll(".katex").length,
      "the revealed figure's math never typeset",
    ).toBeGreaterThan(0);
    // And it closes on the answer this check grades, which is what makes it a worked SOLUTION
    // rather than a picture. RAD.4's bars are the whole question, so the bars are the assertion.
    expect(
      within(figure).getByRole("img").getAttribute("aria-label"),
      "the revealed figure never reaches the absolute-value bars RAD.4 is about",
    ).toContain("absolute value of x to the 3");

    // And the step cards are gone rather than sitting under the figure: a fallback that still
    // rendered would print the answer twice, in two spellings, under one reveal.
    expect(
      screen
        .getAllByText(stepFragment, { exact: false })
        .filter((el) => el.closest("aside.dev-slides__key") === null),
      "the reveal is back on step cards, which #357 replaced with a figure",
    ).toEqual([]);

    expect(
      await screen.findByRole("button", { name: /Try a different question/i }),
    ).toBeVisible();
  });

  /**
   * "Genuinely interactive" is the point: an author types an answer and sees the verdict
   * the learner would get. NUM.S sets `cfu.check`, so this drives the SHARED CHECKER path
   * (equivalent forms pass) rather than the accepted-list match — `-2.0` is not in
   * `accepted`, and only the real checker can mark it correct.
   */
  it("grades a typed answer through the real checker on the CFU step", async () => {
    const user = userEvent.setup();
    render(<DevLessons />);

    const numS = lessonByNode["NUM.S"];
    if (!numS?.cfu?.check) {
      throw new Error("NUM.S is missing its checker-graded CFU");
    }
    expect(numS.cfu.accepted).not.toContain("-2.0");

    await user.click(
      within(lessonCard("NUM.S")).getByRole("button", { name: /Step slides/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Go to check for understanding/i }),
    );

    const key = screen
      .getByRole("heading", { name: /Answer key \(hidden from learners\)/i })
      .closest("aside") as HTMLElement;
    expect(key.textContent).toContain("shared checker");
    expect(within(key).getByText("not answered yet")).toBeVisible();

    const field = screen.getByRole("textbox");
    await user.type(field, "5");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(await within(key).findByText("incorrect")).toBeVisible();

    // An equivalent form the accepted list does NOT hold: only the real checker passes it.
    await user.clear(field);
    await user.type(field, "-2.0");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(await within(key).findByText("correct")).toBeVisible();
    expect(screen.getByText(/Correct! Nice work/i)).toBeVisible();
  });

  /**
   * The dev key is dev-only by construction: it lives in `DevLessons.tsx` and the learner's
   * player never renders it. This pins the half that a refactor could plausibly break —
   * `AdvisorLesson` (the real flow, reached from the city) showing the accepted answers.
   */
  it("never shows the answer key in the learner-facing lesson flow", async () => {
    const user = userEvent.setup();
    render(<DevLessons />);

    await user.click(
      within(lessonCard("NUM.S")).getByRole("button", { name: /Open options/i }),
    );
    await user.click(await screen.findByRole("button", { name: /Review the lesson/i }));

    expect(screen.queryByText("DEV ONLY")).toBeNull();
    expect(screen.queryByRole("heading", { name: /Answer key/i })).toBeNull();
  });

  /**
   * Opening a lesson unmounts the list, so coming back rebuilt it at the top. With more
   * than forty packs listed, every exit cost a scroll back down to wherever the reviewer
   * had got to, which is the single most repeated action in a QA pass.
   *
   * The FOCUS half of this is the half that holds here. The scroll half does not: React
   * reconciles the list's wrapper and the opened lesson's wrapper as the same `<div>`, so
   * the faked `scrollTop` below survives the round trip on its own and this passes with
   * `box.scrollTop = spot.scrollTop` deleted (measured). Real Chromium clamps that node's
   * scrollTop to 0 when the short lesson replaces the long list, which is why the guard
   * that actually catches a broken restore is in `DevLessons.browser.test.tsx`.
   */
  it("comes back to the entry it was opened from, not to the top of the list", async () => {
    await withScrollTop(async () => {
      const user = userEvent.setup();
      const { container } = render(<DevLessons />);
      const list = container.querySelector(".dev-lessons") as HTMLElement;
      list.scrollTop = 1840;

      await user.click(
        within(lessonCard("RAD.4")).getByRole("button", { name: /Step slides/i }),
      );
      await screen.findByRole("heading", { name: /RAD\.4 slide 1 of/ });

      await user.click(screen.getByRole("button", { name: /Back to lessons/i }));

      const back = within(lessonCard("RAD.4")).getByRole("button", {
        name: /Step slides/i,
      });
      expect(document.activeElement).toBe(back);
      expect((container.querySelector(".dev-lessons") as HTMLElement).scrollTop).toBe(1840);
    });
  });

  /**
   * "Not every domain" is the half of this that needed rewriting, and D6 is why.
   *
   * It used to be argued by CARDINALITY: `ERA_SEQUENCE.length > LESSON_DOMAINS.length`,
   * on the reasoning that a section which had reverted to iterating `LESSON_DOMAINS`
   * would draw nine cards where ten were counted, so the exact-count assertion below
   * would catch it. That was a proxy, and it was only ever as good as the two registries
   * being different sizes. D6 (Functions) is the tenth domain, the comparison reads
   * `10 > 10`, and a comparison that merely happens to be true is not a guard: flipping
   * it to `>=` would leave a line that passes over the very reversion it names.
   *
   * So the claim is made by IDENTITY instead, which is what it always meant. These cards
   * are the ERAS: the headings the section actually drew, set-equal to the era names,
   * counted so a duplicate cannot hide inside the set, and with the wrong derivation
   * written out and rejected by name. None of that depends on how many domains exist.
   *
   * Two injections, measured rather than argued, and they say different things:
   *
   *  - Render `LESSON_DOMAINS[i].label` in place of `era.name` — the whole reversion —
   *    and the LOOP above fires first, at *"Unable to find an accessible element with
   *    the role heading and name Prehistoric Era"*. So the loop was already carrying most
   *    of this claim, and the deleted comparison was doing less than it read as.
   *  - Add ONE extra card to the section, headed by a domain label and carrying no drill
   *    button. The loop still passes (every era is present), the button count still reads
   *    ten, and the guard as it stood before this change passes the whole test. The line
   *    below fails it: *"the era list is drawing domains, not eras: expected [ 'D1' ] to
   *    deeply equal []"*. That gap is what the new assertions are for.
   */
  it("lists EVERY era with an interleaved drill button, not every domain", () => {
    render(<DevLessons />);
    const section = screen
      .getByRole("heading", { name: "Era practice" })
      .closest("section");
    if (!section) {
      throw new Error("expected the dev era practice section");
    }
    // Derived from `ERA_SEQUENCE`, so moving a node between eras cannot leave this
    // measuring a list written down here.
    for (const era of ERA_SEQUENCE) {
      const card = within(section)
        .getByRole("heading", { name: era.name })
        .closest(".lesson-copy");
      if (!card) {
        throw new Error(`${era.name} is missing from the dev era practice list`);
      }
      expect(
        within(card as HTMLElement).getByRole("button", {
          name: /Open interleaved drill/i,
        }),
      ).toBeInTheDocument();
    }

    // THE WRONG DERIVATION, WRITTEN OUT SO THE GUARD CAN BE SHOWN TO REJECT IT: a
    // section keyed on the lesson registry would head each card with a domain label.
    const headings = within(section)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent ?? "");
    const domainLabels = new Set(LESSON_DOMAINS.map((domain) => domain.label));
    const domainKeyed = headings.filter((name) => domainLabels.has(name));
    expect(domainKeyed, "the era list is drawing domains, not eras").toEqual([]);

    // ...and the population itself, which is the positive form of the same claim. The
    // floor keeps the set equality from holding over two empty sets, and the length
    // keeps a duplicated card from being absorbed into the set.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    expect(headings).toHaveLength(ERA_SEQUENCE.length);
    expect(new Set(headings)).toEqual(new Set(ERA_SEQUENCE.map((era) => era.name)));
    expect(
      within(section).getAllByRole("button", { name: /Open interleaved drill/i }),
    ).toHaveLength(ERA_SEQUENCE.length);
  });

  it("opens an era interleaved drill with a streak counter once a skill is completed", async () => {
    saveCompletedD1Practice();
    const user = userEvent.setup();
    render(<DevLessons />);

    await user.click(
      within(eraCard("prehistoric")).getByRole("button", {
        name: /Open interleaved drill/i,
      }),
    );

    expect(await screen.findByText(/Interleaved practice/i)).toBeInTheDocument();
    expect(document.querySelector(".infinite-practice__streak-count")).toBeTruthy();
  });

  it("locks the drill until a practice set is finished", async () => {
    const user = userEvent.setup();
    render(<DevLessons />);

    expect(eraCard("prehistoric").textContent).toContain("0 of");
    await user.click(
      within(eraCard("prehistoric")).getByRole("button", {
        name: /Open interleaved drill/i,
      }),
    );

    expect(
      await screen.findByText(/Finish a lesson's practice set to unlock/i),
    ).toBeVisible();
    expect(document.querySelector(".infinite-practice__streak-count")).toBeNull();
  });

  it("previews the drill through the dev bypass with no saved progress", async () => {
    const user = userEvent.setup();
    render(<DevLessons />);

    await user.click(
      within(eraCard("prehistoric")).getByRole("button", {
        name: /Open all skills \(dev\)/i,
      }),
    );

    expect(await screen.findByText(/Interleaved practice/i)).toBeInTheDocument();
    expect(document.querySelector(".infinite-practice__streak-count")).toBeTruthy();
  });

  /*
   * DELETED WITH D6: "shows an unauthored era as having nothing to mix, and locks rather
   * than throwing".
   *
   * It searched the rendered page for an era reading "0 of 0 drillable skills", opened
   * its dev bypass, and expected the locked panel. Its own instruction, written when the
   * era was DERIVED rather than named, was to "delete this test rather than aiming it at
   * an era with packs" once the search came up empty, and D6 (Functions, #422) is the run
   * that empties it: its last subject is the Industrial era, D6 writes five of that era's
   * six packs, and on the tree that PR and `integration` make together the least-served
   * era offers four drillable skills. The search fails on that tree and on neither parent
   * alone, which is why this goes here rather than at the merge.
   *
   * Two claims went with it, and only one is now unguarded:
   *
   *  - that an era with nothing to mix is LISTED rather than hidden, which is the defect
   *    the page exists to catch. Still held, by "lists EVERY era with an interleaved
   *    drill button" above: that walks `ERA_SEQUENCE` and requires a card and a button
   *    for every entry, whatever its content.
   *  - that the dev BYPASS reaches the locked panel rather than an exception for an era
   *    with no content. Nothing checks this now, because nothing can: there is no such
   *    era to click. The locked panel itself is still driven from this file by "locks the
   *    drill until a practice set is finished", which reaches it down the gate rather
   *    than down the content, and that is the path a learner can actually be on.
   */
});

/**
 * jsdom lays nothing out, so `scrollTop` is pinned at 0 and would pass a restore that
 * never happened. Give it a real backing store for the length of one test.
 */
async function withScrollTop(run: () => Promise<void>): Promise<void> {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTop");
  const stored = new WeakMap<HTMLElement, number>();
  Object.defineProperty(HTMLElement.prototype, "scrollTop", {
    configurable: true,
    get(this: HTMLElement) {
      return stored.get(this) ?? 0;
    },
    set(this: HTMLElement, value: number) {
      stored.set(this, value);
    },
  });
  try {
    await run();
  } finally {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, "scrollTop", original);
    }
  }
}

/**
 * Walk the stepper forward to the current slide's activity section, where the widget is.
 *
 * Driven by the heading rather than by a click count: a slide is two steps or three
 * depending on whether the pack authored a worked example for it (`teachingSections.ts`),
 * so a count here would be a claim about pack content this test is not making.
 */
async function stepToTheActivity(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  for (let step = 0; step < 4; step += 1) {
    const heading = screen.getByRole("heading", { name: /slide \d+ of \d+/ });
    if ((heading.textContent ?? "").endsWith("activity")) {
      return;
    }
    await user.click(screen.getByRole("button", { name: /Next step/i }));
  }
  throw new Error("the stepper never reached the slide's activity section");
}

/** The All-lessons card for a node id, which carries "Open options" and "Step slides". */
function lessonCard(nodeId: string): HTMLElement {
  const track = screen.getByRole("heading", { name: "All lessons" }).closest("section");
  if (!track) {
    throw new Error("expected the dev lesson list section");
  }
  const card = within(track as HTMLElement)
    .getByRole("heading", { name: nodeId })
    .closest(".lesson-copy");
  if (!card) {
    throw new Error(`${nodeId} is missing from the dev lesson list`);
  }
  return card as HTMLElement;
}

/**
 * The Era practice card for an era, which carries both drill buttons. Looked up by the
 * era's own `name` read out of `ERA_SEQUENCE` rather than by a typed-in string, so a
 * renamed era fails here instead of finding nothing and reporting a missing card.
 */
function eraCard(eraId: EraId): HTMLElement {
  const era = getEraOrThrow(eraId);
  const card = screen.getByRole("heading", { name: era.name }).closest(".lesson-copy");
  if (!card) {
    throw new Error(`${era.name} is missing from the dev era practice list`);
  }
  return card as HTMLElement;
}
