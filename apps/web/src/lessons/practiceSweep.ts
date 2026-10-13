/**
 * The population every worked-solution sweep renders: which practice instances, and which
 * domains are left out of them.
 *
 * Lifted out of `visualsMath.test.tsx` when a second sweep needed the same set. Two files
 * deriving "every frozen instance a learner can be served" separately is two chances to
 * derive it slightly differently, and the narrower of the two would be the one nobody
 * noticed: a census that lives in one file and is copied into another has no assertion
 * holding the copies together. So the derivation lives here once and both sweeps import it,
 * which also means the `NOT_SWEPT_HERE` list below is the SAME list in both, and widening
 * one sweep to a new domain widens the other.
 *
 * Test-only, like `kindFamily.ts` beside it. Nothing in the app imports it.
 */

import * as itemBank from "@cr/item-bank";
import {
  createRng,
  D1_PRACTICE_ITEMS,
  D1_PRACTICE_POOL,
  D1_PRACTICE_TEMPLATES,
  D2_PRACTICE_ITEMS,
  D2_PRACTICE_POOL,
  D2_PRACTICE_TEMPLATES,
  D3_PRACTICE_ITEMS,
  D3_PRACTICE_POOL,
  D3_PRACTICE_TEMPLATES,
  D4_PRACTICE_ITEMS,
  D4_PRACTICE_POOL,
  D4_PRACTICE_TEMPLATES,
  D5_PRACTICE_ITEMS,
  D5_PRACTICE_POOL,
  D5_PRACTICE_TEMPLATES,
  D6_PRACTICE_ITEMS,
  D6_PRACTICE_POOL,
  D6_PRACTICE_TEMPLATES,
  D7_PRACTICE_ITEMS,
  D7_PRACTICE_POOL,
  D7_PRACTICE_TEMPLATES,
  D8_PRACTICE_ITEMS,
  D8_PRACTICE_POOL,
  D8_PRACTICE_TEMPLATES,
  D9_PRACTICE_ITEMS,
  D9_PRACTICE_POOL,
  D9_PRACTICE_TEMPLATES,
  D10_PRACTICE_ITEMS,
  D10_PRACTICE_POOL,
  D10_PRACTICE_TEMPLATES,
  type FrozenItem,
  generateFromTemplate,
  type ItemTemplate,
} from "@cr/item-bank";

import { CFU_ONLY_TEMPLATE_LIST } from "./cfuVariants";
import { workedSolutionVisualIds } from "./workedSolutionVisuals";

/**
 * Every frozen practice item a learner can actually be served, across all domains: the
 * canonical pools, plus one instance of any template the pools do not reach.
 *
 * The canonical pool is NOT the whole surface. A (node, difficulty) cell can hold more
 * problem SHAPES than it has slots, and `buildPool` takes them round-robin, so the extra
 * shapes reach learners only through their retry variants. D2 has 27 templates and 25
 * pool items for exactly that reason, and `d2.rad2.unlike.l2` was never swept despite
 * having a registered visual and being the only shape that prints a two-term unlike sum.
 * It renders clean, so this was a hole in the guard rather than a live bug.
 */
const POOLED_ITEMS = [
  ...D1_PRACTICE_POOL,
  ...D2_PRACTICE_POOL,
  ...D3_PRACTICE_POOL,
  ...D4_PRACTICE_POOL,
  ...D5_PRACTICE_POOL,
  ...D6_PRACTICE_POOL,
  ...D7_PRACTICE_POOL,
  ...D8_PRACTICE_POOL,
  ...D9_PRACTICE_POOL,
  ...D10_PRACTICE_POOL,
];

export const LIVE_PRACTICE_ITEMS = (() => {
  const covered = new Set(POOLED_ITEMS.map((item) => item.template_id));
  const extra: typeof POOLED_ITEMS = [];
  for (const item of [
    ...D1_PRACTICE_ITEMS,
    ...D2_PRACTICE_ITEMS,
    ...D3_PRACTICE_ITEMS,
    ...D4_PRACTICE_ITEMS,
    ...D5_PRACTICE_ITEMS,
    ...D6_PRACTICE_ITEMS,
    ...D7_PRACTICE_ITEMS,
    ...D8_PRACTICE_ITEMS,
    ...D9_PRACTICE_ITEMS,
    ...D10_PRACTICE_ITEMS,
  ]) {
    if (!covered.has(item.template_id)) {
      covered.add(item.template_id);
      extra.push(item);
    }
  }
  return [...POOLED_ITEMS, ...extra];
})();

/** The templates behind those items, in the same ten registries. */
export const SWEPT_TEMPLATES: readonly ItemTemplate[] = [
  ...D1_PRACTICE_TEMPLATES,
  ...D2_PRACTICE_TEMPLATES,
  ...D3_PRACTICE_TEMPLATES,
  ...D4_PRACTICE_TEMPLATES,
  ...D5_PRACTICE_TEMPLATES,
  ...D6_PRACTICE_TEMPLATES,
  ...D7_PRACTICE_TEMPLATES,
  ...D8_PRACTICE_TEMPLATES,
  ...D9_PRACTICE_TEMPLATES,
  ...D10_PRACTICE_TEMPLATES,
];

/** Every template id the ten registries above put through the sweep. */
export const REGISTERED_TEMPLATE_IDS = SWEPT_TEMPLATES.map(
  (template) => template.template_id,
);

/**
 * Distinct PARAMETER DRAWS per template, over and above the frozen instances.
 *
 * The frozen pool is the wrong population for any claim about a figure's LAYOUT, and the
 * reason is worth stating because the two populations look interchangeable. A pool holds one
 * or two instances per template; a template holds a set of shapes. `d10.geo1.hypotenuse.l1`
 * draws from ten Pythagorean triples, and the figure's labels collide on the SHALLOW ones —
 * the 5-12-13 hangs its hypotenuse label down beside the corner where the words "right angle"
 * are, while the 3-4-5 in the frozen pool is steep enough to clear it by 20px. A sweep over
 * the pool alone therefore renders the one draw that looks fine and reports green over nine
 * that a learner reaches through retries and infinite practice.
 *
 * So the population is the template's own variety, sampled: every distinct `template_params`
 * a run of seeds produces, capped per template so a shape with a large parameter space cannot
 * make the sweep unbounded. The cap is a budget, not a claim — where a template has fewer
 * distinct draws than this, every one of them is swept.
 */
export const DRAWS_PER_TEMPLATE = 12;

/** How many seeds to try per template before giving up on finding more distinct draws. */
const SEEDS_PER_TEMPLATE = 240;

/**
 * Up to `DRAWS_PER_TEMPLATE` distinct parameter draws for every swept template, plus every
 * frozen instance, deduplicated. Deterministic: the seeds are a fixed run, so the population
 * is the same on every machine and a failure names an instance somebody else can reproduce.
 */
export function everyDraw(): FrozenItem[] {
  const seen = new Set(
    LIVE_PRACTICE_ITEMS.map(
      (item) => `${item.template_id}|${JSON.stringify(item.template_params)}`,
    ),
  );
  const drawn: FrozenItem[] = [];
  for (const template of SWEPT_TEMPLATES) {
    let kept = 0;
    for (let seed = 1; seed <= SEEDS_PER_TEMPLATE && kept < DRAWS_PER_TEMPLATE; seed += 1) {
      const item = generateFromTemplate(template, "practice", seed);
      const key = `${item.template_id}|${JSON.stringify(item.template_params)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      drawn.push(item);
      kept += 1;
    }
  }
  return [...LIVE_PRACTICE_ITEMS, ...drawn];
}

/**
 * The same derivation over the CHECK-only templates, which no practice registry holds.
 *
 * These are figures with labels on them, drawn by the same components and measured by the same
 * rules, and they were outside the layout sweep entirely — not because anybody judged them
 * exempt, but because the sweep's population was scoped to where the figures are IMPLEMENTED
 * (the item bank's practice registries) rather than to what exhibits the behaviour. A
 * `cfu.*` id lives in `cfuVariants.ts` because the pool does not hold its question, which is a
 * fact about registration and says nothing about whether its labels can land on each other.
 * `.cursor/rules/qa-verification.mdc` names that scoping mistake as the ordinary way a guard
 * here goes wrong, and this is the same shape: a sweep passing over thirty figures it never
 * rendered.
 *
 * Drawn rather than frozen, for the reason `everyDraw` gives: a check's figure is redrawn from
 * fresh parameters on every re-ask, so its variety IS its population.
 */
export function everyCfuDraw(): {
  template_id: string;
  template_params: Record<string, number>;
}[] {
  const seen = new Set<string>();
  const drawn: {
    template_id: string;
    template_params: Record<string, number>;
  }[] = [];
  for (const template of CFU_ONLY_TEMPLATE_LIST) {
    let kept = 0;
    for (let seed = 1; seed <= SEEDS_PER_TEMPLATE && kept < DRAWS_PER_TEMPLATE; seed += 1) {
      const item = template.generate(createRng(seed * 7919 + 13));
      const params = item.params ?? {};
      const key = `${template.template_id}|${JSON.stringify(params)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      drawn.push({
        template_id: template.template_id,
        template_params: params,
      });
      kept += 1;
    }
  }
  return drawn;
}

/**
 * A floor under the population, so "every one of none" cannot pass: 116 templates across the
 * four swept registries when this was written, and MEASURED_TOTAL today across the ten.
 *
 * Raised from 110 with D4, and raised by MORE than the twenty-five D4 brought so that it is a
 * floor under D4's presence rather than a floor under the total. Measured: the other
 * registries came to 131, so a D4 that fell back out of `SWEPT_TEMPLATES` — quietly, the way
 * the exemption below hid it for months — lands under this number and fails, instead of
 * leaving a sweep that is merely large enough.
 *
 * D9 is held to the same standard rather than merely added to the total, which is the whole
 * point of the paragraph above and the easy thing to lose in a merge: the floor sits above
 * the total WITHOUT D4 and above the total WITHOUT D9, so either one dropping out of the
 * sweep fails here. Both readings are asserted in `visualsMath.test.tsx` so the arithmetic
 * behind this number cannot rot into a comment nobody re-measures — which is exactly what
 * nearly happened at this merge, where two lanes each raised the floor for their own domain
 * and either number alone would have left the other's registry free to fall out unnoticed.
 *
 * D3 is now held to it too, and its twenty-six are exactly why the standard is worth
 * keeping: they were a NAMED entry in `NOT_SWEPT_HERE` for months, so nothing about a domain
 * sitting outside this sweep is hypothetical.
 *
 * D6 is held to it as well, and it is the sharpest case yet: its fifty-five make it the largest
 * registry in the sweep, so a floor chosen to clear the new total would leave the widest hole of
 * any domain here.
 *
 * D6 and D7 both left `NOT_SWEPT_HERE` for having figures, in two lanes that merged here, which
 * emptied that list entirely.
 *
 * **THIS NUMBER GOES STALE EVERY TIME THE POPULATION GROWS, AND THAT IS BY DESIGN.** It is the
 * smallest number that fails on any ONE of the guarded registries going missing, so it has to
 * be re-derived against the census rather than left alone once it clears the total — a floor
 * with headroom over the total is a floor that lets a registry leave. Every re-derivation so
 * far, each read off the census the sweep prints. `—` is a domain that was not in the sweep in
 * that era, which is why its subtraction cannot constrain the floor of its row:
 *
 * | census | without D3 | without D4 | without D6 | without D7 | without D9 | floor |
 * |---|--:|--:|--:|--:|--:|--:|
 * | `226 (d1=34 d10=10 d2=27 d3=25 d4=25 d5=30 d8=30 d9=45)` | 201 | 201 | — | — | 181 | 202 |
 * | `241 (d1=34 d10=10 d2=27 d3=25 d4=35 d5=30 d8=31 d9=49)` | 216 | 206 | — | — | 192 | 217 |
 * | `246 (d1=34 d10=10 d2=27 d3=25 d4=40 d5=30 d8=31 d9=49)` | 221 | 206 | — | — | 197 | **222** |
 * | `247 (d1=34 d10=10 d2=27 d3=26 d4=40 d5=30 d8=31 d9=49)` | 221 | 207 | — | — | 198 | **222** |
 * | `267 (d1=34 d10=10 d2=27 d3=26 d4=40 d5=30 d7=20 d8=31 d9=49)` | 241 | 227 | — | 247 | 218 | **248** |
 * | `302 (d1=34 d10=10 d2=27 d3=26 d4=40 d5=30 d6=55 d8=31 d9=49)` | 276 | 262 | 247 | — | 253 | **277** |
 * | `322 (d1=34 d10=10 d2=27 d3=26 d4=40 d5=30 d6=55 d7=20 d8=31 d9=49)` | 296 | 282 | 267 | 302 | 273 | **303** |
 *
 * The last three rows are not three steps in a sequence. Rows five and six are two lanes that
 * grew in PARALLEL from row four — D7's twenty on one, D6's fifty-five on the other, neither
 * census containing the other's domain — and row seven is their union, which is why both of
 * their floors are wrong here rather than one of them being merely out of date.
 *
 * The fifteen between the first two rows are POL.6's and POL.7's ten, EL.3's one and four D9 L2
 * shapes, and 202 stopped being a floor under D3 or D4 the moment they landed: 216 and 206 both
 * cleared it, so either registry could have fallen out of the sweep with this test still green.
 * `visualsMath.test.tsx` is what noticed, and it noticed by arithmetic rather than by a comment,
 * which is the whole reason the subtractions are asserted there.
 *
 * The five in the last row are POL.5's, and they moved the binding constraint from D4 to D3.
 * D3 is now the largest registry that could go missing, at 221 without it, so 217 had stopped
 * being a floor under D3 in the same silent way: the sweep would have reported 221 templates
 * with every D3 figure absent and cleared a floor of 217 doing it. 222 is the smallest number
 * that still fails on any of the three, which is the property this constant is FOR rather than
 * a margin over the total.
 *
 * The one in the fourth row is D3's LIN.4 union template, and it is the case where a growing
 * population leaves this number alone: D3 is the binding registry, so a template added INSIDE
 * D3 raises the total and the without-D4 and without-D9 subtractions by one each while leaving
 * without-D3 at 221, which is the subtraction the floor is derived from. Re-deriving is still
 * the rule — the arithmetic has to be done to find that out, and doing it is what distinguishes
 * a floor that is still 222 from one that has silently stopped biting.
 *
 * D7 IS A REGISTRY THE FLOOR HAS TO BITE FOR ALONE, and it is the binding one. D3, D4, D6 and
 * D9 are each named in `visualsMath.test.tsx`'s per-domain subtraction check, and D10 is named
 * by four GEO tests in `workedFigureLabels.browser.test.tsx` that would fail on an empty draw
 * list, so each of those fails twice over if its registry leaves. D7 is named nowhere else:
 * subtract it and every other assertion in both sweeps still passes, so this number is the only
 * thing holding its twenty in. Its twenty is also the smallest of the five the floor guards,
 * which makes `without D7` the largest of their subtractions and therefore the one the floor is
 * derived from: 302, so 303.
 *
 * D10's ten is smaller still, and it is deliberately NOT what this number is derived from. The
 * floor is derived over the registries it is the only guard for; D10 has four of its own, so
 * deriving from `without D10` at 312 would raise this constant to 313 for no gain and would put
 * it above the census the day D10 grew.
 *
 * THE LAST ROW IS THE D6/D7 MERGE, AND IT IS THE CASE THE D9 PARAGRAPH WARNS ABOUT ARRIVING
 * FROM TWO SIDES AT ONCE. Two lanes each re-derived this constant correctly against its own
 * tree and neither number survives their union: 248 was derived against a population with no D6
 * in it, and 277 against one with no D7. Neither is merely out of date — each is below the other
 * lane's subtraction, so whichever one had been kept would have left the other lane's registry
 * free to fall out of the sweep with every assertion still green. That is the failure this
 * constant exists to prevent, so it is re-derived here rather than picked from either side.
 *
 * INJECTED RED BY: deleting `...D7_PRACTICE_TEMPLATES,` from `SWEPT_TEMPLATES` above — the one
 * line that spreads that registry into the population — which fails at *"expected 302 to be
 * greater than or equal to 303"* on the floor itself, over a census that has lost its `d7` term.
 * Be precise about what that red is evidence FOR: the membership test beside it also fails, at
 * *"expected [ 'd7' ] to deeply equal []"*, and it would have failed at any floor. What the
 * derivation buys is the floor's OWN line, and that was measured too — restore nothing, set this
 * constant back to the 277 the D6 lane carried in, and the same deletion leaves both the floor
 * and the coverage assertion GREEN, clearing 277 with 25 to spare. So a D7 that left
 * `SWEPT_TEMPLATES` while being added to `NOT_SWEPT_HERE` in the same edit, which is the shape
 * that domain sat in for months, would have passed at the inherited number and fails at this one.
 */
export const TEMPLATE_FLOOR = 303;

/**
 * A floor under the DERIVATION of the domain list below, rather than under the bank. The
 * filter that finds the practice registries could stop matching, and a filter that matches
 * nothing reports an empty bank and agrees with any list of exclusions.
 */
export const REGISTRY_FLOOR = 7;

export const domainOf = (templateId: string): string =>
  templateId.split(".")[0] ?? templateId;

/**
 * The domains these sweeps do NOT reach, each with the reason it is absent.
 *
 * A domain covered elsewhere and a domain nobody has got to yet are indistinguishable from
 * inside a census that simply lists what it looks at, which is how the KaTeX sweep came to be
 * titled "in every domain" while three domains sat outside it. So the difference between the
 * bank's domains and the swept ones is asserted against this list rather than left implicit,
 * and it fails three ways: a domain the bank gains is named here or fails; a listed domain
 * that becomes swept has to leave the list; a listed domain that leaves the bank fails too,
 * so an entry cannot sit here forever exempting nothing.
 *
 * THE LIST IS NOW EMPTY, and that is a measurement rather than a tidy-up: every domain the bank
 * exports has at least one registered figure and is swept. `d6` and `d7` were its last two
 * entries and they left in two lanes that merged here — D6's fifty-five figures registered on
 * one, D7's twenty brought into this population on the other.
 *
 * An empty list does NOT make the assertions over it vacuous, and it is worth being exact about
 * which direction still bites. "Every listed domain has no figure" is trivially true of nothing.
 * "Every domain with no figure is listed" is not: it now claims that NO bank domain is without a
 * figure, over a census floored at eight domains that have one, so the day a domain arrives
 * without figures it fails here instead of being quietly absent.
 *
 * A reason like that is now ASSERTED, in both directions, by `figureGapCensus` below and the test
 * both sweep files run over it. It did not used to be. The three directions named above are all
 * about MEMBERSHIP: a bank domain missing from the list fails, a listed domain that became swept
 * fails, a listed domain that left the bank fails. None of them read the `why`, so the day
 * someone registered a D6 figure its entry would have gone on excusing a domain it had stopped
 * describing — the exact shape `.cursor/rules/qa-verification.mdc` names, and the reason a
 * legitimate exception owes a list that fails BOTH ways. D6 is the case that proves it was worth
 * writing: a `d6` entry excused for having no figures met fifty-five of them at this merge, and
 * the census is what makes keeping the entry impossible rather than merely wrong.
 *
 * FOUR domains have now left this list, which is the "a listed domain that becomes swept has to
 * leave" direction working four times in four different rounds: D4, when
 * `workedSolutionArithmetic.test.tsx` began rendering every one of its templates; D3, when its
 * twenty-five figures were brought into this population; D6, when its fifty-five were
 * registered; and D7, whose twenty were brought in beside them. None of the entries could stay
 * once its domain became swept, and none had to be noticed by hand.
 *
 * D7's entry said "no figure sweep anywhere yet" and was true when it was written: every one of
 * its twenty practice templates has a registered figure (`worked/d7LF1..LF4.tsx`), and not one
 * of them had ever been rendered by a sweep in this tree. Measured rather than argued — on the
 * run before this one the label sweep's per-domain census had no `d7` term at all, against
 * `d3=325`, and its total went 3294 figures to 3554 when the twenty came in.
 */
export const NOT_SWEPT_HERE: readonly { domain: string; why: string }[] = [];

/** The names of every practice-template registry the item bank exports. */
export function practiceRegistryNames(): string[] {
  return Object.keys(itemBank).filter((name) => /^D\d+_PRACTICE_TEMPLATES$/.test(name));
}

/** Every domain the item bank has templates for, read off its own export surface. */
export function bankDomains(): Set<string> {
  return new Set(bankTemplateIds().map(domainOf));
}

/** Every practice `template_id` the item bank exports, across every registry. */
export function bankTemplateIds(): string[] {
  return practiceRegistryNames().flatMap((name) => {
    const registry = (itemBank as unknown as Record<string, unknown>)[name];
    if (!Array.isArray(registry)) {
      throw new Error(`${name} is exported but is not a template array`);
    }
    return (registry as { template_id: string }[]).map((template) => template.template_id);
  });
}

/**
 * What `NOT_SWEPT_HERE`'s stated reason claims, measured: which bank domains have a registered
 * worked-solution figure and which have none.
 *
 * That list is empty today, and this derivation is what will not let it refill by neglect.
 * Membership assertions cannot read an entry's REASON: they compare the list against the SWEPT
 * domains, so an entry excused for having no figure keeps its seat on the day a figure is
 * registered, while its reason quietly stops being true. That is not hypothetical here — `d6`
 * sat on the list for exactly that reason, and registering fifty-five `d6.` keys is what took
 * it off. This is the derivation that lets both sweeps fail on such an entry, in either
 * direction.
 *
 * `templates` is carried alongside `figures` because "no figure" is trivially true of a domain
 * with no templates, and an exemption resting on an empty registry excuses nothing. The floors
 * in the sweeps are under that count.
 *
 * `figures` counts REGISTRY KEYS carrying the domain's prefix rather than bank templates that
 * happen to have one, because that is what such an entry's reason literally says. It is the
 * wider of the two readings: a key registered ahead of the template it will draw stops the
 * exemption being true here, which is the direction that matters.
 */
export function figureGapCensus(): Map<string, { templates: number; figures: number }> {
  const rows = new Map<string, { templates: number; figures: number }>();
  const row = (domain: string) => {
    const found = rows.get(domain) ?? { templates: 0, figures: 0 };
    rows.set(domain, found);
    return found;
  };
  for (const id of bankTemplateIds()) {
    row(domainOf(id)).templates += 1;
  }
  for (const id of workedSolutionVisualIds()) {
    const domain = domainOf(id);
    // Registry-only prefixes (`cfu.*`) are not bank domains and are not the subject of this
    // census: the claim is about which of the BANK's domains have nothing to render.
    if (rows.has(domain)) {
      row(domain).figures += 1;
    }
  }
  return rows;
}

/** `d1=34/34 d6=55/55 d7=20/20 ...`, printed beside every assertion over the census. */
export function figureGapReport(): string {
  return [...figureGapCensus()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, r]) => `${domain}=${r.figures}/${r.templates}`)
    .join(" ");
}
