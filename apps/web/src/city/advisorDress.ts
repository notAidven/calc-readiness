import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";

import { type AdvisorDress, ORU_ERA_ONE_DRESS } from "../lessons/OruAdvisorCharacter";

/**
 * WHAT THE ADVISOR IS WEARING, ERA BY ERA — the ten costumes of the one continuous advisor.
 *
 * Authority, and there are three of them because this table sits where three rulings meet:
 *
 *  - **`D-ET8`** (`docs/superpowers/specs/2026-07-29-era-trial-contract.md` §19.1) rules the
 *    ceremony's first beat as *"the citizens gather, scaffolding goes up on the town hall,
 *    and the advisor changes dress — all three together."* This is the third of those three.
 *  - **`D-ET9`** (§19.2) rules *"one continuous advisor for the whole run, re-themed per era.
 *    Not ten advisors."* So this is a **wardrobe and not a cast**. There is no name here, no
 *    voice and no face: `lessons/OruAdvisorCharacter.tsx` writes the person into its markup
 *    where no dress can reach him, and {@link AdvisorDress} has no field that could carry an
 *    identity even if somebody wanted one to.
 *  - **`D-ERA28`** survives on its art half and is what makes a re-dress legal at all: the
 *    advisor is one of the four things an advance still changes, after the 2026-07-29
 *    re-dressing ruling froze every standing building. The lead's line is that per-era art
 *    freezes where it MULTIPLIES WITH A CATALOGUE and is kept where it is ONE PER ERA, and
 *    an advisor is exactly one per era.
 *
 * ## ⚑ EVERY ROW IS TRANSCRIBED. NOTHING HERE IS INVENTED
 *
 * All ten era style guides carry a `## The advisor (D-ERA28)` section with a **dressing**
 * paragraph naming the garment, the materials it may be made of, the instrument the era's
 * advisor carries and where the costume sits in the era palette. Those paragraphs are the
 * source for the ten rows below, and each row names its own guide.
 *
 * **This corrects a stale figure that has been quoted around this table.**
 * `docs/Content_Authoring_Split.md` §10.2 records *"`rg -i advisor` over the ten style
 * guides matches era one alone, so nine eras owe an advisor"*, and
 * `apps/web/src/city/eraDressing.ts` says *"none of the ten dressings is drawn … the ten
 * costumes are art authored outside this repo"*. Both were true when written and neither is
 * now: every guide has since been authored, and re-measuring is what turned this from eight
 * art commissions into eight transcriptions.
 *
 * ## The palette is the era's own, and the ladder is why
 *
 * `docs/superpowers/specs/2026-07-30-era-palette-ladder.md` moved five of the ten body hues
 * so that two eras' buildings standing side by side cannot read as the same age. The same
 * argument applies with more force to a character, because he is the ONE figure on screen
 * the eye is already following: an advisor whose costume drifted off the ladder would put
 * era six's clothes on era nine's island. So each row's colours are placed against that
 * era's own **post-move** body hue and accent, taken from its guide's palette table.
 *
 * | Era | Body hue | Accent |
 * | --- | --- | --- |
 * | 1 Prehistoric | `#C98A5E` | *(none stated — see the ladder's §9)* |
 * | 2 Neolithic | `#D9C288` | fired clay `#A2503A` |
 * | 3 Bronze Age | `#8A6E33` | bronze patina `#7F8C6E` |
 * | 4 Classical | `#D2C8AA` | terracotta roof tile `#B4674A` |
 * | 5 Medieval | `#9D9C8C` | dark oak and slate `#5E4A3A` |
 * | 6 Early Modern | `#C7A48E` | dark slate/sheet lead `#596675`, on every roof and dome |
 * | 7 Industrial | `#8E5F4E` | cast iron `#3E4247` |
 * | 8 Atomic | `#B9B5AC` | aluminium and period teal `#6E9C9A` |
 * | 9 Information | `#96A1AB` | curtain-wall glass `#7FA0A8` |
 * | 10 Cyberpunk | `#4A4E58` | emissive cyan `#5FD0D8` |
 *
 * ## ⚑ TOTAL, NOT PARTIAL, AND THE TYPE IS THE GUARD
 *
 * Every other per-era table in this lane is a `Partial<Record<EraId, …>>` behind a `null`,
 * because an unauthored dressing must not be faked. **This one cannot be**, and the reason
 * is the same one that makes `resolveEraAdvisor` total: under D-ET9 the advisor is the same
 * person continuously present in all ten eras, so an era with no row does not render a
 * plainer advisor, it renders **era one's advisor standing in era nine** — a costume that is
 * not merely unauthored but actively wrong.
 *
 * So this is a full `Record<EraId, AdvisorDress>`. An era added to `ERA_SEQUENCE` without a
 * row here is a **type error**, which is the cheapest possible version of "a new era cannot
 * silently arrive undressed". `advisorDress.test.ts` holds the same line at runtime, where
 * a cast or a widened type has no say.
 */
export const ADVISOR_DRESS: Readonly<Record<EraId, AdvisorDress>> = {
  /**
   * ERA ONE — a Prehistoric elder in a hide tunic and a stone hood, with a lashed timber
   * staff. `era-01-prehistoric/style-guide.md` §6c, and it is the character's OWN default
   * rather than a copy of it: this is the identical object the component falls back to, so
   * the two cannot drift and there is no second place to edit era one.
   */
  prehistoric: ORU_ERA_ONE_DRESS,

  /**
   * ERA TWO — a grain keeper. `era-02-neolithic/style-guide.md`: *"A woven flax wrap —
   * **woven**, which is the visible break from Oru's hide tunic and the cheapest way to date
   * the advance on a person — belted with a cord, over bare feet. A **fired-clay** bead at
   * the throat … She carries a **tally tablet of impressed clay** … held flat in one hand;
   * it is her counterpart to his staff. A shallow **winnowing basket** on her hip. No stone
   * hood, no charms."*
   *
   * **The staff going away is the point of this row**, and it is why era two is the row to
   * get right: era two is the first advance and whatever it does sets the pattern for the
   * other eight. Era one's silhouette is dominated by a full-height pole; era two has no
   * pole at all, so the very first advance a learner ever sees changes the outline and not
   * just the colours.
   *
   * **No face paint.** The guide rules era one's ochre markings out in terms, so `faceMark`
   * is `null` here and in every later era. (The guide's own sentence names them by the
   * register era one held when it was written; that register is retired — see
   * `eraDressing.ts`' era-one row — and the markings it describes are unchanged.)
   */
  neolithic: {
    id: "neolithic",
    described: "a woven flax wrap and a fired-clay bead",
    garment: "#E4D9BC",
    garmentDeep: "#C8B999",
    over: "plain",
    overColour: "#D5C6A4",
    trim: "#B39A6B",
    token: "bead",
    accent: "#A2503A",
    accentDeep: "#7D3D1F",
    // Bare feet, so the leg and the foot are the person's own tones rather than a garment's.
    leg: "#B07A4E",
    foot: "#A9713F",
    head: "tied",
    headColour: "#4A3A2C",
    headTrim: "#B39A6B",
    carried: "tablet",
    carriedColour: "#A2503A",
    carriedTrim: "#E4D9BC",
    // Chaff off the winnowing basket, which is the era's own air.
    motes: ["#D9C288", "#E4D9BC", "#C8B999", "#B39A6B"],
    faceMark: null,
  },

  /**
   * ERA THREE — a weights-and-measures official. `era-03-bronze-age/style-guide.md`: *"A
   * long fringed wool mantle over one shoulder, in undyed cream, belted. A **bronze** pin at
   * the shoulder … At his belt a small **banded chest** of graded weights … He carries a
   * **hand balance** on a short trestle-pole, beam and pans of bronze … Hair and beard oiled
   * and squared off … No crown, no staff of rank, no gold."*
   *
   * **Bronze is the era's one metal note**, so the pin, the beam and the pans are all one
   * value and the patina accent `#7F8C6E` is its shadow rather than a second metal. `no
   * gold` is the guide's own instruction and it agrees with `City_Art_Bible.md` §1.3, which
   * reserves `#FFB703` for mastery.
   */
  bronze_age: {
    id: "bronze_age",
    described: "a fringed cream mantle and a bronze hand balance",
    garment: "#D8CDB4",
    garmentDeep: "#B9AC8E",
    over: "mantle",
    overColour: "#E2D9C2",
    trim: "#8A6F4C",
    token: "pin",
    accent: "#A8823F",
    accentDeep: "#7F8C6E",
    leg: "#B07A4E",
    foot: "#7A5C40",
    head: "squared",
    headColour: "#3A2C20",
    headTrim: "#2E231A",
    carried: "balance",
    carriedColour: "#A8823F",
    carriedTrim: "#7F8C6E",
    motes: ["#8A6E33", "#A8823F", "#7F8C6E", "#B9AC8E"],
    faceMark: null,
  },

  /**
   * ERA FOUR — a harbour architect. `era-04-classical/style-guide.md`: *"An undyed wool
   * exomis — one shoulder bare, belted, knee-length — over sandals with cross-strapping. A
   * **lime** dust that has settled into the weave and pales the whole figure … A folded
   * **wax tablet** and stylus at the belt. He carries a **groma** across one shoulder: a
   * cross-staff on a pole with four plumb-lines hanging from its arms … A **terracotta**-red
   * band at the hem is the era's one strong colour."*
   *
   * **The lime dust is why the garment is paler than the era's own body hue** rather than
   * equal to it: the guide has it *"flattening toward the `#ECE4D3` parchment ground"*, and
   * a limestone-coloured figure against limestone buildings would lose the silhouette that
   * §3 of the Art Bible asks for.
   *
   * The pole comes BACK here, three eras after era one's staff went away, and it is a
   * different pole: era one's is a plain vertical, this one carries a cross and four hanging
   * lines. Eras three and four are the only two that share `over: "mantle"`, and the balance
   * against the groma is what keeps them apart at any size.
   */
  classical: {
    id: "classical",
    described: "a lime-dusted exomis and a surveyor's groma",
    garment: "#DDD4B8",
    garmentDeep: "#BFB79B",
    over: "mantle",
    overColour: "#E7E0CB",
    trim: "#A2957A",
    token: "hem",
    accent: "#B4674A",
    accentDeep: "#7A756A",
    leg: "#B07A4E",
    foot: "#8A6A45",
    head: "crop",
    headColour: "#4A3B2A",
    headTrim: "#3A2E20",
    carried: "groma",
    carriedColour: "#B08968",
    carriedTrim: "#8A6A45",
    motes: ["#ECE4D3", "#E1DAC4", "#D2C8AA", "#C6BEA4"],
    faceMark: null,
  },

  /**
   * ERA FIVE — a guild warden. `era-05-medieval/style-guide.md`: *"A plain wool kirtle in the
   * era's lime-washed **daub** off-white, over a darker underdress, with a linen wimple and
   * veil. A **leather** girdle carrying a purse, a set of scales folded flat, and a **tally
   * stick** notched down one edge — the tally is her counterpart to Oru's staff, and it is a
   * record rather than an ornament. She carries a small **chalked slate** under one arm … A
   * single band of **lead**-grey at the cuff. No fur, no jewellery, no chain of office."*
   *
   * **The wimple and veil are the strongest headwear in the run** and this row leans on
   * them: they widen the head, cover the throat and fall onto both shoulders, so era five is
   * legible from the outline alone at the smallest size the character is ever drawn.
   */
  medieval: {
    id: "medieval",
    described: "a lime-washed kirtle, a linen wimple and a chalked slate",
    garment: "#B7B6A6",
    garmentDeep: "#5E4A3A",
    over: "plain",
    overColour: "#C3C2B2",
    trim: "#6B5238",
    token: "cuff",
    accent: "#8A9199",
    accentDeep: "#5E4A3A",
    leg: "#5E4A3A",
    foot: "#4A3A2C",
    head: "veil",
    headColour: "#DDD9C9",
    headTrim: "#B7B2A0",
    carried: "slate",
    carriedColour: "#3E3A34",
    carriedTrim: "#E8E4D8",
    motes: ["#9D9C8C", "#B7B6A6", "#8A9199", "#C3C2B2"],
    faceMark: null,
  },

  /**
   * ERA SIX — an architect and surveyor. `era-06-early-modern/style-guide.md`: *"A plain wool
   * overgown in the **stucco** body hue over a darker underdress, sleeves pushed back and
   * tied at the elbow. A folded linen head-cloth rather than a jewelled coif — she works
   * outdoors. At her belt, a pair of **dividers** and a folded rule. She carries a **drawing
   * board** the size of a forearm, with a pinned sheet on it, and a **plumb line** hangs
   * from its corner and swings when she moves … **Lead**-grey ribbon at the cuff picks up
   * the domes. No gold anywhere, and nothing that glitters."*
   *
   * **This is the one era whose garment IS its body hue**, on the guide's own instruction —
   * *"overgown in the warm-buff body hue `#C7A48E`, underdress a deeper tone of the
   * same"* — and it is safe here because the era's buildings are plaster at that value
   * while the figure carries a dark slate cuff, a timber board and a pale pinned sheet that
   * the wall behind him does not.
   *
   * **⚑ THE OVERGOWN MOVED WITH THE ERA TWICE, and this row is why neither ruling was only
   * documentation.** The guide first re-pitched era six from warm stucco `#E9C2A1` to a
   * dusty-rose pass, then the final Northern Early Modern review selected warm buff under
   * darker slate and sheet lead. This row now follows that final body and roof pair on the
   * ladder's most-watched surface — the one figure on screen the eye is already following.
   * `test/eraSixBodyHue.test.ts` holds the overgown and cuff to `plague-tones.ts`'s pin.
   */
  renaissance: {
    id: "renaissance",
    described: "a stucco overgown, a linen head-cloth and a drawing board",
    garment: "#C7A48E",
    garmentDeep: "#9B7967",
    over: "gown",
    overColour: "#C7A48E",
    trim: "#596675",
    token: "cuff",
    accent: "#596675",
    accentDeep: "#3D4955",
    leg: "#9B7967",
    foot: "#5A4534",
    head: "cloth",
    headColour: "#E7DEC9",
    headTrim: "#D8CDB3",
    carried: "board",
    carriedColour: "#A67F5E",
    carriedTrim: "#ECE4D3",
    motes: ["#C7A48E", "#D8CDB3", "#9B7967", "#596675"],
    faceMark: null,
  },

  /**
   * ERA SEVEN — a works engineer. `era-07-industrial/style-guide.md`: *"A dark serge work
   * jacket over a high-necked blouse, sleeves buttoned back, and a plain skirt over sturdy
   * boots. Cotton drill apron with a long pocket down the front holding a **folding rule**
   * and calipers. A **brass**-cased pocket watch on a chain, which is the era's one bright
   * metal and the era's own obsession. She carries a **ruled ledger** under one arm … **Soot**
   * at the cuff and hem, because §2 makes soot a finish and a character who works here would
   * carry it. No jewellery."*
   *
   * **The apron is what makes this read at a distance.** Serge on soot-darkened brick is a
   * dark figure on a dark island, so the unbleached cotton panel down her front is the only
   * thing separating her from the ground, exactly as the guide places it — *"apron in the
   * unbleached cotton that reads against the machine-made brick body hue."*
   */
  industrial: {
    id: "industrial",
    described: "a serge jacket, a drill apron and a ruled ledger",
    garment: "#3E4247",
    garmentDeep: "#2F3337",
    over: "apron",
    overColour: "#CDC3AC",
    trim: "#6A6257",
    token: "watch",
    accent: "#B08D57",
    accentDeep: "#8A6B3C",
    leg: "#33383D",
    foot: "#241F1C",
    head: "pinned",
    headColour: "#4A342A",
    headTrim: "#3A281F",
    carried: "ledger",
    carriedColour: "#5A3A2E",
    carriedTrim: "#CDC3AC",
    motes: ["#5A5852", "#77736B", "#3E4247", "#8E5F4E"],
    faceMark: null,
  },

  /**
   * ERA EIGHT — a systems analyst. `era-08-atomic/style-guide.md`: *"A white cotton lab coat,
   * unbuttoned, over a plain shift dress in a muted period colour, with low block-heeled
   * shoes. Horn-rimmed glasses pushed up when she is not reading. A **clipboard** with a
   * **strip chart** folded over it, the trace visible … A **slide rule** in the coat's breast
   * pocket, which is her counterpart to Oru's staff … An **anodised aluminium** pen clip is
   * the era's one bright metal note. No lanyard, no badge reel, nothing that reads as a later
   * century's office."*
   *
   * **The glasses sit ABOVE the eyes**, which is the guide's *"pushed up when she is not
   * reading"* and is also a rendering requirement: the `squint` pose swaps the eye pair, and
   * a rim drawn across the eyes would cover the one part of the face that carries the pose.
   */
  atomic_age: {
    id: "atomic_age",
    described: "a lab coat, horn-rimmed glasses and a strip-chart clipboard",
    garment: "#6E9C9A",
    garmentDeep: "#547B79",
    over: "coat",
    overColour: "#EFEDE6",
    trim: "#CFCCC2",
    token: "clip",
    accent: "#AFB6BB",
    accentDeep: "#868D93",
    leg: "#C9C4BA",
    foot: "#3A3630",
    head: "glasses",
    headColour: "#4A3A30",
    headTrim: "#2E2723",
    carried: "clipboard",
    carriedColour: "#B9A98C",
    carriedTrim: "#F2EFE4",
    motes: ["#B9B5AC", "#EFEDE6", "#6E9C9A", "#AFB6BB"],
    faceMark: null,
  },

  /**
   * ERA NINE — a network operations lead. `era-09-information/style-guide.md`, and its own
   * heading calls this *"the hardest one to dress"*: *"§2 records that the era's real absence
   * is **visible hand-work of any kind** — nothing shows that a person made it — and a
   * character has to survive that without becoming a mannequin. So: a fine merino crew-neck
   * over plain trousers, everything **seamless-looking, machine-finished, and utterly without
   * a visible stitch, weave or wear mark**. Soft trainers. A **lanyard** with a blank white
   * card … He carries a **tablet**, held flat, showing … the **display panel**, a static
   * readout rather than a graph … **The one deliberate exception is a paper coffee cup**,
   * because a figure made entirely of finished surfaces reads as an asset and not a person."*
   *
   * **The absence is drawn as an absence**: no binding at the cuff, no hem band, no fringe,
   * no pattern anywhere. The coffee cup is the only soft, dented object on the figure and it
   * is why he still reads as somebody rather than as a product shot.
   */
  information_age: {
    id: "information_age",
    described: "a seamless merino crew-neck, a lanyard and a tablet",
    garment: "#7FA0A8",
    garmentDeep: "#63838B",
    over: "plain",
    overColour: "#7FA0A8",
    trim: "#5A6B74",
    token: "lanyard",
    accent: "#96A1AB",
    accentDeep: "#5A6B74",
    leg: "#4E5860",
    foot: "#CFD3D4",
    head: "crop",
    headColour: "#332E2B",
    headTrim: "#241F1C",
    carried: "slab",
    carriedColour: "#39424A",
    carriedTrim: "#B9D2D8",
    motes: ["#96A1AB", "#7FA0A8", "#C3CDD3", "#63838B"],
    faceMark: null,
  },

  /**
   * ERA TEN — a signal engineer, and the last of his ten dressings.
   * `era-10-cyberpunk/style-guide.md`: *"A layered technical jacket with a high collar over a
   * close-fitting base layer, cargo trousers, boots with the strapping visible. The jacket
   * carries **one emissive trim line** along the shoulder seam and cuff — the era's signature
   * move, light used as *trim* and never as a surface … A **coiled patch cable** over one
   * shoulder. They carry a **handheld field meter** with a small animated readout …
   * **Retrofit is visible on the figure**: the jacket is newer than the boots, and one panel
   * of it is a different generation."*
   *
   * **The trim is `#5FD0D8` and never gold.** The guide states the limit itself, citing the
   * Art Bible: *"An advisor who glows the colour of a mastery star is a legibility bug, not a
   * style choice."* `advisorDress.test.ts` asserts the whole table against `#FFB703` rather
   * than trusting this comment.
   */
  cyberpunk: {
    id: "cyberpunk",
    described: "a high-collared technical jacket with one emissive trim line",
    garment: "#2E323A",
    garmentDeep: "#22252B",
    over: "jacket",
    overColour: "#4A4E58",
    trim: "#5A6070",
    token: "seam",
    accent: "#5FD0D8",
    accentDeep: "#2E8F98",
    leg: "#3A3F47",
    foot: "#1C1E23",
    head: "collar",
    headColour: "#241F22",
    headTrim: "#5A6070",
    carried: "meter",
    carriedColour: "#2E323A",
    carriedTrim: "#5FD0D8",
    motes: ["#5FD0D8", "#2E8F98", "#9AE4EA", "#5A6070"],
    faceMark: null,
  },
};

/**
 * The clothes the advisor is in while the city stands in this era.
 *
 * **Total, and deliberately not `null`-returning.** See the header: an era with no costume
 * does not draw a plainer advisor, it draws the previous era's advisor, which is worse than
 * either. The `Record` above makes the missing row impossible at compile time and this
 * throws rather than falling back, on the `eraBuildableRadius` discipline — a silent default
 * would keep working while quietly no longer being the era's own dress.
 */
export function advisorDressFor(eraId: EraId): AdvisorDress {
  const dress = ADVISOR_DRESS[eraId];
  if (!dress) {
    throw new Error(`Era "${eraId}" is in ERA_SEQUENCE and has no advisor dressing.`);
  }
  return dress;
}

/**
 * The three parts of a costume that change its OUTLINE rather than its colour.
 *
 * `City_Art_Bible.md` §3 is silhouette-first and this character is drawn at two very
 * different sizes — around 120px in the onboarding reel, `clamp(132px, 30vh, 232px)` over
 * the island during a crisis. A pair of costumes that differed only in hue would be the same
 * figure at the smaller of the two, so this is what `advisorDress.test.ts` measures adjacent
 * eras on. Exported rather than inlined in the test because it is a property of the design
 * and the test is only where it is checked.
 */
export function dressSilhouette(
  dress: AdvisorDress,
): readonly [AdvisorDress["head"], AdvisorDress["over"], AdvisorDress["carried"]] {
  return [dress.head, dress.over, dress.carried];
}

/** Every era's dressing, in the authored order. The population any sweep over this starts from. */
export function everyAdvisorDress(): readonly {
  readonly eraId: EraId;
  readonly dress: AdvisorDress;
}[] {
  return ERA_SEQUENCE.map((era) => ({ eraId: era.id, dress: advisorDressFor(era.id) }));
}
