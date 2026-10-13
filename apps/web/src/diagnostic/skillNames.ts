/**
 * Learner-facing skill display names for the diagnostic, keyed by skill-graph node
 * id. The skill graph (`packages/skill-graph/src/skill_graph.json`) is the source
 * of truth for node *identity* but carries no human-readable titles, so these
 * names are sourced from the two places that DO hold authored copy for a node: its
 * lesson pack's `title` (`content/lessons/<domain>/<node>.json`) where a pack
 * exists, and `docs/Node_Spine_v4.md`'s node tables — the registry's own declared
 * "stable-ID content authority" — where one does not yet.
 *
 * Kept local to the diagnostic lane — a single lookup used everywhere the UI would
 * otherwise show a raw node id (blueprint, question header, results, seeding,
 * handoff, the city roster's third span, the floating 3D building label, the
 * completion ceremony's skill roll). Node ids survive only in the small
 * dev-identity/debug chip and in `data-node-id` hooks.
 *
 * ## The table is TOTAL over the live graph, and a guard says so
 *
 * Until 2026-07-31 this held **11 of the graph's 62 in-product nodes** and nothing
 * measured that, which is how fifty-one nodes could sit unnamed in a shipped
 * lookup: era three's build card read `"Assembly Hall" / "the Merchants' Hall" /
 * "LIN.1"`, because the third span is the SKILL's name and D3 had no row here. The
 * only sweep that touched this module was scoped to era one and era two — the two
 * eras whose art has landed — so it was structurally incapable of noticing D3..D10.
 *
 * `skillNames.test.ts` now derives its population from `getProductNodes()` and
 * fails if ANY live node is missing, so the population is measured against the
 * registry rather than against a list written here.
 *
 * ## Register: a skill name is a noun phrase, a lesson title is a task
 *
 * A pack title is an instruction ("Solve absolute-value equations") because it
 * heads a lesson. A skill name labels a *thing* — it sits in a roster row beside a
 * building name, floats over a rooftop, and is read out in a results table — so it
 * is a noun or gerund phrase ("Absolute-value equations"). Where a pack title
 * already reads as a noun phrase it is taken VERBATIM; where it does not, the edit
 * is minimal and its original is recorded in {@link SKILL_SOURCE_TITLES} so the
 * provenance cannot be lost. Names sourced from the spine doc record their row in
 * {@link SKILL_SPINE_SOURCES}.
 *
 * `skillDisplayName` still falls back to the raw id for an id that is not a skill
 * node at all — the `town-hall` sentinel reaches it through `announcements.ts` —
 * so the UI degrades rather than blanking. That fallback is no longer load-bearing
 * for any live node.
 */
const SKILL_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  // ERA ONE (Prehistoric) — D1. Three verbatim pack titles, three edits.
  "NUM.S": "Signed numbers",
  "NUM.F": "Fractions",
  "NUM.2": "Order of operations",
  "NUM.3": "Field properties & the distributive law",
  "NUM.4": "Simplifying & combining like terms",
  "NUM.5": "Ratios, proportions & percents",
  // ERA TWO (Neolithic) — D2, added 2026-07-30 when its buildings became reachable in
  // the city. Without these the roster's third span, the floating 3D skill label and
  // every announcement printed the RAW REGISTRY ID — measured in the live app before
  // the fix: the roster read "Store / the Seed House / EXP.1", which is exactly the
  // leak `CitySurface`'s own comment forbids ("the raw node_id … is kept out of the
  // UI") and that PR #142 swept out of the announcements.
  //
  // These five are the pack titles VERBATIM, and `eraTwo.reachability.test.ts` pins
  // them that way. They already read as noun phrases, so no edit was owed.
  "EXP.1": "Exponent rules and positive exponents",
  "RAD.1": "Square roots: evaluate and simplify",
  "RAD.2": "Adding root terms and clearing the denominator",
  "RAD.3": "Fraction exponents and radical form",
  "RAD.4": "Roots with a variable inside",
  // ERA THREE (Bronze Age) — D3. Named 2026-07-31: `45caea03` gave these five buildings
  // their headline and subtitle, leaving the third span reading "LIN.1". Pack-sourced.
  "LIN.1": "One-variable linear equations",
  "LIN.3": "Rearranging formulas",
  "LIN.4": "Linear & compound inequalities",
  "LIN.5": "Absolute-value equations",
  "LIN.6": "Absolute-value inequalities",
  // ERA FOUR (Classical) and the graphing nodes the coordinate plane gates — D4. All eight
  // pack-sourced now. POL.5, POL.6 and POL.7 came from the spine doc until their packs were
  // authored to move the diagnostic's placement horizon, and this guard is what forced each
  // re-sourcing rather than leaving a stale doc quote standing. POL.5's own name changed in
  // the process, from the spine's "Graphs of quadratics: vertex & intercepts" to its pack
  // title, which names the third reading the lesson actually teaches.
  "POL.1": "Adding, subtracting & multiplying polynomials",
  "POL.2": "Factoring polynomials",
  "POL.3": "Quadratics by factoring & square roots",
  "POL.4": "Completing the square & the quadratic formula",
  "POL.5": "Graph quadratics: vertex, intercepts, min/max",
  "POL.6": "End behavior of polynomials",
  "POL.7": "Polynomial graphs: zeros & turning points",
  "POL.8": "Polynomial long and synthetic division",
  // ERA FIVE (Medieval) — D5. All six pack-sourced.
  "RAT.1": "Simplifying rational expressions",
  "RAT.2": "Multiplying & dividing rational expressions",
  "RAT.3": "Adding & subtracting rational expressions",
  "RAT.4": "Complex & nested rational expressions",
  "RAT.5": "Graphs of rational functions",
  "RAT.6": "Rational equations & extraneous solutions",
  // ERA SIX (Early Modern) — D10's geometry pair is pack-sourced and both titles already
  // read as noun phrases, so both are verbatim. `CG.1` is D6's and pack-sourced too, as
  // an edit of "Coordinate plane": the roster row needs to tell it apart from GEO.1 and
  // GEO.2 beside it, so the name keeps what the lesson actually covers.
  "GEO.1": "Pythagorean theorem, similar triangles, basic angle relationships",
  "GEO.2": "Area, perimeter, volume and surface area of standard figures",
  "CG.1": "The coordinate plane: distance & midpoint",
  // ERAS SEVEN AND EIGHT (Industrial, Atomic) — D6's functions, pack-sourced since its
  // eleven packs landed. FUN.2 and FUN.5 are their pack titles verbatim; the rest are
  // recorded edits, because a lesson title heads a task ("Read graph features") where a
  // roster row wants the thing ("Key features of a graph").
  "FUN.1": "Function notation & evaluating functions",
  "FUN.2": "Domain and range",
  "FUN.3": "Piecewise-defined functions",
  "FUN.4": "Key features of a graph",
  "FUN.5": "Average rate of change",
  "FUN.6": "The difference quotient",
  "FUN.7": "Composing & decomposing functions",
  "FUN.8": "One-to-one & inverse functions",
  "FUN.9": "Transformations of graphs",
  "FUN.10": "Absolute-value functions",
  // ERA EIGHT (Atomic) — D7's linear-functions four are pack-sourced.
  "LF.1": "Slope as a constant rate of change",
  "LF.2": "Equations of lines & their graphs",
  "LF.3": "Linear models from data",
  "LF.4": "Systems of linear equations",
  // ERA NINE (Information) — D8's six are pack-sourced.
  "EL.1": "Exponential models & base e",
  "EL.2": "Graphs of exponential functions",
  "EL.3": "Logarithms: common & natural",
  "EL.4": "Graphs of logarithmic functions",
  "EL.5": "Logarithm properties: expanding & condensing",
  "EL.6": "Exponential & logarithmic equations",
  // ERA TEN (Cyberpunk) — D9's nine are pack-sourced.
  "TRG.1": "Angle measure, degrees & radians",
  "TRG.2": "Right-triangle trigonometry",
  "TRG.3": "The unit circle & reference angles",
  "TRG.4": "The six trig functions & fundamental identities",
  "TRG.5": "Graphs of sine & cosine",
  "TRG.6": "Graphs of tangent & the reciprocal functions",
  "TRG.7": "Inverse trig functions",
  "TRG.8": "Basic trig equations",
  "TRG.9": "Sum, difference & double-angle identities",
};

/**
 * The exact lesson-content title each display name is drawn from, for provenance.
 * `skillNames.test.ts` asserts this both ways: an EDITED name with no entry here
 * fails, and an entry that does not match its node's live pack `title` fails. A
 * verbatim name owes no entry (it already quotes its pack) but may carry one — era
 * one's six all do, from before the rule settled.
 *
 * `eraTwo.reachability.test.ts` reads the same map for eras one and two.
 */
export const SKILL_SOURCE_TITLES: Readonly<Record<string, string>> = {
  "NUM.S": "Signed numbers",
  "NUM.F": "Fractions",
  "NUM.2": "Order of operations",
  "NUM.3": "Field properties / distributive",
  "NUM.4": "Simplify / combine like terms",
  "NUM.5": "Ratios, rates, proportions, percents, units",
  "LIN.1": "Solve one-variable linear equations",
  "LIN.3": "Rearrange a formula to isolate a chosen variable",
  "LIN.4": "Solve linear and compound inequalities; interval notation",
  "LIN.5": "Solve absolute-value equations",
  "LIN.6": "Solve absolute-value inequalities",
  "POL.1": "Add, subtract and multiply polynomials",
  "POL.2": "Factor polynomials",
  "POL.3": "Solve quadratics by factoring and the square-root property",
  "POL.4": "Solve quadratics by completing the square and the quadratic formula",
  "POL.6": "Describe polynomial end behavior from degree and leading coefficient",
  "POL.7": "Analyze polynomial graphs: real zeros, multiplicity, turning points",
  "RAT.1": "Simplify rational expressions",
  "RAT.2": "Multiply and divide rational expressions",
  "RAT.3": "Add and subtract rational expressions",
  "RAT.4": "Simplify complex and nested rational expressions",
  "RAT.5": "Graph and analyze rational functions",
  "RAT.6": "Solve rational equations; reject extraneous solutions",
  // D6, reconciled against the packs when they landed. FUN.2 and FUN.5 came out
  // verbatim and owe no entry; the other nine are edits of these titles.
  "CG.1": "Coordinate plane",
  "FUN.1": "Function notation, evaluation, vertical-line test",
  "FUN.3": "Piecewise functions",
  "FUN.4": "Read graph features",
  "FUN.6": "Form and simplify the difference quotient",
  "FUN.7": "Composition of functions",
  "FUN.8": "Inverse functions",
  "FUN.9": "Transformations and even/odd",
  "FUN.10": "Graph and interpret absolute-value functions",
  "LF.2": "Write and graph line equations",
  "LF.3": "Build a linear model from a description or from data",
  "LF.4": "Solve systems of linear equations",
  "EL.1": "Evaluate exponential models, including base e",
  "EL.2": "Graph exponential functions and transformations",
  "EL.3": "Logarithms: convert form, evaluate common and natural logs",
  "EL.4": "Graph logarithmic functions; state domain",
  "EL.5": "Logarithm properties: product, quotient, power, expand and condense",
  "EL.6": "Solve exponential and logarithmic equations",
  "TRG.1": "Angle measure: degrees and radians, coterminal angles",
  "TRG.2": "Right-triangle trigonometry; 30/45/60; cofunctions",
  "TRG.3": "Unit circle; reference angles for sine and cosine",
  "TRG.4": "The six functions; even and odd; fundamental identities",
  "TRG.5": "Graph sine and cosine: amplitude, period, phase shift",
  "TRG.6": "Graph tangent and the reciprocal functions; period and asymptotes",
  "TRG.7": "Inverse trigonometric functions: evaluate and compose",
  "TRG.8": "Solve basic trigonometric equations over an interval",
  "TRG.9": "Core identities: sum, difference and double-angle",
};

/**
 * EMPTY, because every in-product node has an authored lesson pack now.
 *
 * For a node with no pack, this held the `docs/Node_Spine_v4.md` node-table row its display
 * name was drawn from, quoted literally. The spine is the registry's own declared derivation
 * source ("Nodes and base prereqs derived from Node_Spine_v4.md (the stable-ID content
 * authority)"), so those were existing authored curriculum copy rather than names invented at
 * this layer.
 *
 * `skillNames.test.ts` fails if a pack-less node has no entry here, and fails the other way if
 * a node listed here has since gained a lesson pack — at which point the pack's own title is
 * the better source and the name owes a reconciliation rather than a stale doc quote. **Both
 * directions fired in anger, which is why this map emptied rather than being cleaned up.** It
 * held fourteen entries until D6's eleven packs landed, and CG.1 and FUN.1..FUN.10 were
 * re-sourced to their pack titles; POL.6 and POL.7 left when their packs were authored; and
 * POL.5 was the last, re-sourced verbatim to its own pack title in the same edit that authored
 * it.
 *
 * **It is kept rather than deleted, and the shape is deliberate.** The rule the guard states is
 * "a name a learner reads is quoted from authored copy", and the pack-less branch of it stays
 * reachable: the day a node is added to the registry ahead of its lesson, the guard demands an
 * entry here and the doc-reading check below still applies to it. Deleting the map would
 * silently make that case unsourced instead. The guard's own floors are what stop an empty map
 * from reading as coverage.
 *
 * It also READS THE DOC, which is what made those quotes checked rather than merely recorded:
 * each one had to still be the whole `Skill` cell of that node's row, matched by column and not
 * by substring. The rot that catches is silent otherwise — a row is reworded, the quote here
 * goes on claiming to be a quote, and the provenance of a name the learner reads is a sentence
 * nobody wrote. Found on the first run: TRG.8 was recorded as the first clause of its row and
 * not the row.
 */
export const SKILL_SPINE_SOURCES: Readonly<Record<string, string>> = {};

/** Every node this module names. Exported so a guard can measure the table itself. */
export const NAMED_SKILL_NODES: readonly string[] = Object.keys(SKILL_DISPLAY_NAMES);
/** The learner-facing name for a skill node, or the raw id if none is mapped. */
export function skillDisplayName(nodeId: string): string {
  return SKILL_DISPLAY_NAMES[nodeId] ?? nodeId;
}
