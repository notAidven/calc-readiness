/**
 * Oru — the one advisor the whole run has, drawn in whichever era's clothes he is standing
 * in. Ported from the in-repo design source `apps/web/src/city/art/sources/OruAdvisor.dc.html`
 * (absolutely-positioned percentage boxes, so the character scales with whatever square its
 * host gives it).
 *
 * ## ⚑ ONE PERSON, TEN COSTUMES (D-ET9) — and the split is drawn, not just asserted
 *
 * **D-ET9, the team lead, verbatim:** *"There is one continuous advisor for the whole run,
 * re-themed per era. Not ten advisors."* This file expresses that as a line through the
 * character rather than as a comment above it:
 *
 *  - **The BODY is written into the markup and no dress can reach it.** Skin, the three-tone
 *    face model, the eyes and their glint, the mouth and the tongue are literals below,
 *    identical in all ten eras. That is the person, and there is one of him.
 *  - **The DRESS is the {@link AdvisorDress} parameter** — garment, over-garment, headwear,
 *    what he carries, footwear, the one era token, and the motes in the air around him.
 *    Every one of those is a per-era value and none of them is a person.
 *
 * So an era advance changes what he is wearing and cannot change who he is, because the
 * costume has no field that could. `D-ERA28`'s surviving half is what makes the change legal
 * at all: the advisor is one of the four things an advance still re-dresses.
 *
 * ## The dress arrives as a PROP, and the ten values live in the city lane
 *
 * This file declares what a costume IS and draws it; `apps/web/src/city/advisorDress.ts`
 * holds the ten values, keyed off `ERA_SEQUENCE`. That split is deliberate and it is
 * ownership: the era model and its progressions are the city's, and this component is the
 * character. It also keeps this file free of imports, which
 * `OruAdvisorCharacter.test.tsx` asserts (an inline style or a module of its own is how the
 * `prefers-reduced-motion` gate gets escaped).
 *
 * {@link ORU_ERA_ONE_DRESS} is the default, so every caller that does not know or care about
 * the era gets exactly the character that shipped before there were any others.
 *
 * ## Silhouette first, because he is read at two very different sizes
 *
 * `City_Art_Bible.md` §3 is silhouette-first, and this character is ~120px tall in the
 * onboarding reel and `clamp(132px, 30vh, 232px)` during a crisis. A costume that separated
 * only on colour would collapse to the same figure at the small size, so **every era changes
 * at least two of the three silhouette-bearing parts**: {@link AdvisorDress.head},
 * {@link AdvisorDress.over} and {@link AdvisorDress.carried}. `advisorDress.test.ts` asserts
 * that as a property of the table rather than leaving it to the eye.
 *
 * ## The four poses
 *
 * The `mood` prop drives four — the delivery's own `data-props` enum, which is NOT
 * CityGuide's four (Oru has no `wave` and no `cheer`):
 *   - `idle`   — the free arm sways, open (blinking) eyes, a closed mouth line
 *   - `talk`   — the mouth line fades to an open, chattering mouth
 *   - `point`  — the free arm swings up to point at the work
 *   - `squint` — the open eyes swap to narrowed ones (reading, weighing, unconvinced)
 *
 * All motion is CSS, keyed off `data-mood` and scoped under `.oru-advisor` in `styles.css`,
 * and gated by `prefers-reduced-motion` — so this component is pure, static markup and
 * swapping moods never re-mounts anything. Every mood-dependent part is present at every
 * mood; CSS decides which one shows. **A part that moves must carry `oru-advisor__swing`,
 * `oru-advisor__mote`, `oru-advisor__arm` or `oru-advisor__eye`**, because those are the
 * classes the reduced-motion block stands down and `oruAdvisorMotion.browser.test.tsx`
 * measures the covered set against the live CSSOM at every dress.
 *
 * The character is decorative and carries no meaning: it is `aria-hidden` and wordless,
 * because everything the advisor says belongs in the bubble's DOM (`AdvisorNpc`).
 */
export type OruMood = "idle" | "talk" | "point" | "squint";

/**
 * WHAT IS ON HIS HEAD, which is the silhouette part read first at the small size.
 *
 * Each member is one era's guide taken literally: `hood` is era one's stone hood, `veil` is
 * era five's linen wimple and veil, `collar` is era ten's high jacket collar. `crop` is the
 * bare-headed form and is the only one two eras share (four and nine), which is allowed
 * because both of those separate hard on the other two parts.
 */
export type AdvisorHead =
  | "hood"
  | "tied"
  | "squared"
  | "crop"
  | "veil"
  | "cloth"
  | "pinned"
  | "glasses"
  | "collar";

/** The over-garment: the shoulder line, which is the silhouette read at middle distance. */
export type AdvisorOver =
  | "cape"
  | "plain"
  | "mantle"
  | "gown"
  | "apron"
  | "coat"
  | "jacket";

/**
 * WHERE THE ERA PUTS ITS ONE STRONG COLOUR, which every guide places somewhere specific.
 *
 * This is a placement and not an ornament budget: era one has stone beads at the throat,
 * era four a terracotta band at the hem, era seven a brass watch on a chain, era ten one
 * emissive line along the shoulder seam. **Four of the ten guides say "no jewellery" in as
 * many words**, so a necklace drawn unconditionally would have put one on every era that
 * forbids it — which is what this union exists to stop.
 */
export type AdvisorToken =
  | "beads"
  | "bead"
  | "pin"
  | "hem"
  | "cuff"
  | "watch"
  | "clip"
  | "lanyard"
  | "seam";

/**
 * WHAT HE IS CARRYING — the era's counterpart to Oru's staff, which every one of the ten
 * guides names explicitly and calls out as exactly that.
 *
 * Three are poles (`staff`, `balance`, `groma`) and seven are held in the hand, so the
 * run's tall vertical appears and disappears rather than merely changing colour. That is
 * the largest single silhouette lever the character has.
 */
export type AdvisorCarried =
  | "staff"
  | "tablet"
  | "balance"
  | "groma"
  | "slate"
  | "board"
  | "ledger"
  | "clipboard"
  | "slab"
  | "meter";

/**
 * ONE ERA'S CLOTHES. Not a person: there is no name, no voice and no face here, because
 * D-ET9 rules those continuous and this is the half that is allowed to move.
 */
export interface AdvisorDress {
  /** The era this dressing belongs to. Reported on the DOM so a test can read it. */
  readonly id: string;
  /** The costume in a few words, taken from the era's own guide. Enters no learner copy. */
  readonly described: string;
  /** The garment body: tunic, wrap, kirtle, base layer. */
  readonly garment: string;
  /** A deeper tone of it: the hem, the underdress, the shading. */
  readonly garmentDeep: string;
  /** The shoulder line's form, and the colour it is drawn in. */
  readonly over: AdvisorOver;
  readonly overColour: string;
  /** Belt, cuff, binding: the era's second garment colour. */
  readonly trim: string;
  /** The era's one token, where its guide puts it, in this colour and its shadow. Never
   *  mastery gold (`City_Art_Bible.md` §1.3). */
  readonly token: AdvisorToken;
  readonly accent: string;
  readonly accentDeep: string;
  /** Legs, and what is on the feet. Bare-legged eras carry a skin tone here. */
  readonly leg: string;
  readonly foot: string;
  /** Headwear form, its cloth and its second tone. */
  readonly head: AdvisorHead;
  readonly headColour: string;
  readonly headTrim: string;
  /** The instrument, its body and its second tone. */
  readonly carried: AdvisorCarried;
  readonly carriedColour: string;
  readonly carriedTrim: string;
  /** The four drifting motes: era one's hearth embers, era ten's signal glints. */
  readonly motes: readonly [string, string, string, string];
  /**
   * Ochre marks on the brow and cheeks, or `null`. Era one's ochre markings are that era's
   * DRESSING and era two's guide says so in terms — *"repeating them here would make this a
   * copy of that costume rather than a change of it"* — so this is paint and not a feature
   * of his face. (The guide names them for the register era one held when it was written.
   * That register is retired; the paint is not. See `city/eraDressing.ts`' era-one row.)
   */
  readonly faceMark: string | null;
}

/**
 * ERA ONE'S DRESSING, and the default every caller gets.
 *
 * Transcribed from the values this component carried inline before there was a second era,
 * so the character that shipped is byte-for-byte the character that ships. Era one's guide
 * §6c is the authority for the palette placement — *"Oru sits inside the era palette rather
 * than beside it"* — and its table names the hide tunic, the cape and hem, the timber staff
 * and the stone hood.
 */
export const ORU_ERA_ONE_DRESS: AdvisorDress = {
  id: "prehistoric",
  described: "a hide tunic and a stone hood",
  garment: "#836444",
  garmentDeep: "#5F4730",
  over: "cape",
  overColour: "#6B563E",
  trim: "#59462F",
  token: "beads",
  accent: "#D6CDB2",
  accentDeep: "#36695F",
  leg: "#7A5C40",
  foot: "#5F4730",
  head: "hood",
  headColour: "#C4BCA8",
  headTrim: "#BAB29D",
  carried: "staff",
  carriedColour: "#8B6C46",
  carriedTrim: "#A88F63",
  motes: ["#D9622E", "#E08A46", "#D9622E", "#E8A05C"],
  faceMark: "#A83A16",
};

/* -------------------------------------------------------------------------- */
/* The body, which no dress reaches                                            */
/* -------------------------------------------------------------------------- */

/**
 * THE ONE PERSON. Ten costumes hang on this and none of them may change it, which is D-ET9
 * expressed as the set of constants a dress has no field for.
 */
const SKIN = "#C08A5A";
const SKIN_DEEP = "#B07A4E";
const SKIN_LIGHT = "#CE9C6C";
const SKIN_SHADE = "#AE7748";
const EYE = "#2A251E";
const EYE_GLINT = "#F7F1E2";
const MOUTH_LINE = "#7A4034";
const MOUTH_OPEN = "#6E3226";
const TONGUE = "#B2604C";
const CHEEK_SHADE = "#585245";
const GROUND_SHADOW = "rgba(74,58,42,0.24)";

/* -------------------------------------------------------------------------- */
/* One percentage-boxed part                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One absolutely-positioned box. Every visible part of the character is one of these.
 *
 * The props are primitives rather than a style object because this file may not import
 * React's `CSSProperties` (see the header on why it imports nothing at all), and a loose
 * `Record<string, string>` does not typecheck against `style`.
 */
function Part(part: {
  readonly cls?: string;
  readonly left?: string;
  readonly top?: string;
  readonly bottom?: string;
  readonly width?: string;
  readonly height?: string;
  readonly radius?: string;
  readonly fill?: string;
  readonly opacity?: number;
  readonly turn?: string;
  readonly origin?: string;
}) {
  return (
    <div
      className={part.cls ? `oru-advisor__part ${part.cls}` : "oru-advisor__part"}
      style={{
        left: part.left,
        top: part.top,
        bottom: part.bottom,
        width: part.width,
        height: part.height,
        borderRadius: part.radius,
        background: part.fill,
        opacity: part.opacity,
        transform: part.turn,
        transformOrigin: part.origin,
      }}
    />
  );
}

/**
 * A pair of boxes on a hanging cord, which is the shape five of the ten instruments end
 * in: era one's stone charm, era three's two balance pans, era four's four plumb-lines and
 * era six's plumb bob.
 *
 * `oru-advisor__swing` is the class the reduced-motion block stands down, so a hanging part
 * that forgets it is caught by `oruAdvisorMotion.browser.test.tsx` rather than shipping as
 * motion nobody can turn off.
 */
function Hanging(hang: {
  readonly left: string;
  readonly top: string;
  readonly width: string;
  readonly height: string;
  readonly cordWidth: string;
  readonly cordDrop: string;
  readonly cord: string;
  readonly bob: string;
  readonly bobRadius: string;
}) {
  return (
    <div
      className="oru-advisor__part oru-advisor__swing"
      style={{ left: hang.left, top: hang.top, width: hang.width, height: hang.height }}
    >
      <div
        className="oru-advisor__part"
        style={{
          left: `calc(50% - ${hang.cordWidth} / 2)`,
          top: 0,
          width: hang.cordWidth,
          height: hang.cordDrop,
          background: hang.cord,
        }}
      />
      <div
        className="oru-advisor__part"
        style={{
          left: "6%",
          bottom: 0,
          width: "88%",
          height: `calc(100% - ${hang.cordDrop})`,
          borderRadius: hang.bobRadius,
          background: hang.bob,
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Headwear — nine forms, one per era's own guide                              */
/* -------------------------------------------------------------------------- */

function Headwear({ dress }: { readonly dress: AdvisorDress }) {
  const { head, headColour, headTrim } = dress;

  if (head === "hood") {
    // Era one: the stone hood with its notched teeth, and the two hide straps under it.
    return (
      <>
        <Part
          left="33.4%"
          top="12.5%"
          width="33.2%"
          height="9.5%"
          radius="52% 52% 34% 34%"
          fill={headColour}
        />
        <Part
          left="32.6%"
          top="19%"
          width="5.6%"
          height="8%"
          radius="50% 20% 40% 50%"
          fill={headTrim}
        />
        <Part
          left="61.8%"
          top="19%"
          width="5.6%"
          height="8%"
          radius="20% 50% 50% 40%"
          fill={headTrim}
        />
        <Part
          left="39.4%"
          top="24.2%"
          width="7.2%"
          height="1.7%"
          radius="3px"
          fill="#9A9280"
          turn="rotate(-5deg)"
        />
        <Part
          left="53.4%"
          top="24.2%"
          width="7.2%"
          height="1.7%"
          radius="3px"
          fill="#9A9280"
          turn="rotate(5deg)"
        />
        <Part
          left="38.6%"
          top="32.5%"
          width="8.6%"
          height="1.4%"
          radius="3px"
          fill="#A9744A"
          opacity={0.55}
          turn="rotate(9deg)"
        />
        <Part
          left="52.8%"
          top="32.5%"
          width="8.6%"
          height="1.4%"
          radius="3px"
          fill="#A9744A"
          opacity={0.55}
          turn="rotate(-9deg)"
        />
      </>
    );
  }

  if (head === "tied") {
    // Era two: bare-headed, hair gathered at the nape with a flax cord. No stone hood and
    // no charms — the guide is explicit that era one's markings stay in era one.
    return (
      <>
        <Part
          left="33.2%"
          top="13%"
          width="33.6%"
          height="10.5%"
          radius="52% 52% 30% 30%"
          fill={headColour}
        />
        <Part
          left="62.5%"
          top="21%"
          width="8.5%"
          height="9%"
          radius="50%"
          fill={headColour}
        />
        <Part
          left="63%"
          top="24%"
          width="7.5%"
          height="1.8%"
          radius="999px"
          fill={headTrim}
        />
      </>
    );
  }

  if (head === "squared") {
    // Era three: hair and beard oiled and squared off, which is the period's own read for
    // a man of office. The squared jaw is the whole silhouette change.
    return (
      <>
        <Part
          left="32.6%"
          top="12.2%"
          width="34.8%"
          height="10%"
          radius="18% 18% 4% 4%"
          fill={headColour}
        />
        <Part
          left="35.5%"
          top="36%"
          width="29%"
          height="11.5%"
          radius="6% 6% 26% 26%"
          fill={headColour}
        />
        <Part
          left="37%"
          top="41%"
          width="26%"
          height="4.5%"
          radius="4% 4% 30% 30%"
          fill={headTrim}
        />
      </>
    );
  }

  if (head === "crop") {
    // Eras four and nine: bare-headed, hair cropped close. The only form two eras share,
    // and they separate on the over-garment and the instrument instead.
    return (
      <>
        <Part
          left="33.6%"
          top="13.4%"
          width="32.8%"
          height="8.6%"
          radius="50% 50% 22% 22%"
          fill={headColour}
        />
        <Part
          left="33.8%"
          top="19%"
          width="4.6%"
          height="6.5%"
          radius="40% 10% 40% 50%"
          fill={headTrim}
        />
        <Part
          left="61.6%"
          top="19%"
          width="4.6%"
          height="6.5%"
          radius="10% 40% 50% 40%"
          fill={headTrim}
        />
      </>
    );
  }

  if (head === "veil") {
    // Era five: a linen wimple and veil. It sits ON the crown rather than over it, hugs the
    // cheek on each side and covers the throat, so the head reads wider and squarer than
    // any other era's — the strongest headwear silhouette in the run.
    //
    // **Its first draft read as a helmet**, and the two things that did it are worth
    // recording because the same trap is one wrong number away in `cloth` and `hood`: the
    // crown started ABOVE the head's own top (15%) rather than on it, and the cheek panels
    // ran to the jaw at a width that put more linen than face in the outline.
    return (
      <>
        <Part
          left="32%"
          top="13.8%"
          width="36%"
          height="8.5%"
          radius="50% 50% 24% 24%"
          fill={headColour}
        />
        <Part
          left="31.5%"
          top="19.5%"
          width="5.5%"
          height="13%"
          radius="40% 12% 40% 30%"
          fill={headColour}
        />
        <Part
          left="63%"
          top="19.5%"
          width="5.5%"
          height="13%"
          radius="12% 40% 30% 40%"
          fill={headColour}
        />
        {/* The wimple at the throat, BELOW the jaw: a fold any higher reads as a beard. */}
        <Part
          left="41%"
          top="43%"
          width="18%"
          height="5%"
          radius="30% 30% 46% 46%"
          fill={headTrim}
        />
        <Part
          left="34%"
          top="16.6%"
          width="32%"
          height="2.4%"
          radius="999px"
          fill={headTrim}
        />
      </>
    );
  }

  if (head === "cloth") {
    // Era six: a folded linen head-cloth rather than a jewelled coif, because she works
    // outdoors. One fold falls behind the near shoulder.
    //
    // **The fold is in `headTrim` and the trim is a full tone darker than the cloth**,
    // because era six's linen is *"just off the `#ECE4D3` parchment ground"* and the ground
    // is what the whole city is drawn on: without an edge, the outline this headwear exists
    // to make simply is not there.
    return (
      <>
        <Part
          left="31.5%"
          top="13.2%"
          width="37%"
          height="10.5%"
          radius="48% 48% 26% 26%"
          fill={headColour}
        />
        <Part
          left="30%"
          top="18.5%"
          width="7.5%"
          height="16%"
          radius="40% 16% 46% 34%"
          fill={headTrim}
        />
        <Part
          left="32.5%"
          top="20.6%"
          width="35%"
          height="2.6%"
          radius="999px"
          fill={headTrim}
        />
      </>
    );
  }

  if (head === "pinned") {
    // Era seven: hair pinned up off the collar, which is what a person working beside line
    // shafting actually does with it.
    return (
      <>
        <Part
          left="34%"
          top="13.2%"
          width="32%"
          height="8.4%"
          radius="50% 50% 20% 20%"
          fill={headColour}
        />
        <Part
          left="43%"
          top="8.4%"
          width="14%"
          height="7.5%"
          radius="50%"
          fill={headColour}
        />
        <Part
          left="45.5%"
          top="10.5%"
          width="9%"
          height="1.8%"
          radius="999px"
          fill={headTrim}
        />
      </>
    );
  }

  if (head === "glasses") {
    // Era eight: horn-rimmed glasses pushed up onto the head when she is not reading, over
    // hair set close. The rims sit ABOVE the eyes, so neither eye pair is occluded.
    return (
      <>
        <Part
          left="33.4%"
          top="13%"
          width="33.2%"
          height="9%"
          radius="50% 50% 24% 24%"
          fill={headColour}
        />
        <Part
          left="37.5%"
          top="18.4%"
          width="10%"
          height="5.4%"
          radius="34%"
          fill={headTrim}
        />
        <Part
          left="52.5%"
          top="18.4%"
          width="10%"
          height="5.4%"
          radius="34%"
          fill={headTrim}
        />
        <Part
          left="47%"
          top="20.2%"
          width="6%"
          height="1.5%"
          radius="999px"
          fill={headTrim}
        />
      </>
    );
  }

  // Era ten: the technical jacket's high collar. It stands BESIDE and BEHIND the neck
  // rather than across the chest — a collar wide enough to reach the shoulders reads as a
  // scarf, and on a figure this dark it swallowed the whole upper body. Its one emissive
  // line is `Token`'s, at the shoulder seam.
  return (
    <>
      <Part
        left="34.6%"
        top="13.6%"
        width="30.8%"
        height="8%"
        radius="48% 48% 20% 20%"
        fill={headColour}
      />
      <Part
        left="36.5%"
        top="37.5%"
        width="9%"
        height="9.5%"
        radius="40% 6% 6% 24%"
        fill={headTrim}
        turn="rotate(-9deg)"
      />
      <Part
        left="54.5%"
        top="37.5%"
        width="9%"
        height="9.5%"
        radius="6% 40% 24% 6%"
        fill={headTrim}
        turn="rotate(9deg)"
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The era's one strong colour, worn where its own guide puts it               */
/* -------------------------------------------------------------------------- */

function Token({ dress }: { readonly dress: AdvisorDress }) {
  const { token, accent, accentDeep } = dress;

  if (token === "beads") {
    // Era one: undressed-stone beads at the throat.
    return (
      <>
        <Part
          left="44%"
          top="47.5%"
          width="3.4%"
          height="3.4%"
          radius="50%"
          fill={accent}
        />
        <Part
          left="48.3%"
          top="49%"
          width="3.4%"
          height="4.4%"
          radius="50%"
          fill={accent}
        />
        <Part
          left="52.6%"
          top="47.5%"
          width="3.4%"
          height="3.4%"
          radius="50%"
          fill={accent}
        />
      </>
    );
  }

  if (token === "bead") {
    // Era two: ONE fired-clay bead at the throat, which is the era's own signature material
    // and its first appearance on a character. One and not three, because era one's string
    // of stone is era one's dressing.
    return (
      <Part left="47.8%" top="48%" width="4.4%" height="4.4%" radius="50%" fill={accent} />
    );
  }

  if (token === "pin") {
    // Era three: a bronze pin at the shoulder, which is where the era puts its metal — at
    // the joint, exactly as its buildings do.
    return (
      <>
        <Part
          left="55%"
          top="46.5%"
          width="5.2%"
          height="5.2%"
          radius="50%"
          fill={accent}
        />
        <Part
          left="56.4%"
          top="47.9%"
          width="2.4%"
          height="2.4%"
          radius="50%"
          fill={accentDeep}
        />
      </>
    );
  }

  if (token === "hem") {
    // Era four: a terracotta-red band at the hem, the era's one strong colour, taken from
    // its roofs. It is also the only thing anchoring a lime-dusted figure against a pale
    // limestone island, which is why it is a band and not a thread.
    //
    // Set INSIDE the garment's own width rather than across it: a full-width bar in a
    // strong colour under a pale figure read as a plank he was standing on.
    return (
      <Part left="34%" top="74.5%" width="32%" height="2.2%" radius="999px" fill={accent} />
    );
  }

  if (token === "cuff") {
    // Eras five and six: a single band of lead-grey at the cuff. Both wrists, because one
    // would read as a bracelet and the guides are explicit that there is no jewellery.
    return (
      <>
        <Part
          left="63.2%"
          top="66.5%"
          width="9.6%"
          height="2.2%"
          radius="999px"
          fill={accent}
        />
        <Part
          left="27.2%"
          top="66%"
          width="9.6%"
          height="2.2%"
          radius="999px"
          fill={accent}
        />
      </>
    );
  }

  if (token === "watch") {
    // Era seven: the brass-cased pocket watch on its chain — the era's one bright metal and
    // the era's own obsession.
    return (
      <>
        <Part
          left="57%"
          top="57.5%"
          width="9%"
          height="1.4%"
          radius="999px"
          fill={accent}
          turn="rotate(14deg)"
        />
        <Part
          left="63.5%"
          top="60%"
          width="6.5%"
          height="6.5%"
          radius="50%"
          fill={accent}
        />
        <Part
          left="65%"
          top="61.5%"
          width="3.5%"
          height="3.5%"
          radius="50%"
          fill={accentDeep}
        />
      </>
    );
  }

  if (token === "clip") {
    // Era eight: the anodised aluminium pen clip in the coat's breast pocket. The guide
    // rules out a lanyard and a badge reel by name, so this is the whole of it.
    return (
      <Part left="57.5%" top="52%" width="2%" height="7%" radius="999px" fill={accent} />
    );
  }

  if (token === "lanyard") {
    // Era nine: a lanyard with a BLANK white card, which is the era's own way of saying a
    // person is authorised without saying who they are.
    return (
      <>
        <Part
          left="44%"
          top="46.5%"
          width="1.4%"
          height="9%"
          radius="999px"
          fill={accentDeep}
          turn="rotate(-8deg)"
        />
        <Part
          left="55%"
          top="46.5%"
          width="1.4%"
          height="9%"
          radius="999px"
          fill={accentDeep}
          turn="rotate(8deg)"
        />
        <Part left="45%" top="54.5%" width="10%" height="7%" radius="8%" fill="#F4F5F5" />
      </>
    );
  }

  // Era ten: ONE emissive line along the shoulder seam and the cuff. Light used as TRIM and
  // never as a surface, which is the rule §1 sets for the era's buildings and which the
  // advisor obeys too — so this is a line and not a panel, and it is the era's own accent
  // rather than the reserved mastery gold.
  return (
    <>
      <Part left="31%" top="46.6%" width="38%" height="1.1%" radius="999px" fill={accent} />
      <Part
        left="63.5%"
        top="67.5%"
        width="9%"
        height="1.2%"
        radius="999px"
        fill={accent}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The over-garment — the shoulder line                                        */
/* -------------------------------------------------------------------------- */

function OverGarment({ dress }: { readonly dress: AdvisorDress }) {
  const { over, overColour, trim } = dress;

  if (over === "cape") {
    // Era one: the hide shoulder cape with its two bone studs and the collar above it.
    return (
      <>
        <Part
          left="29.5%"
          top="44%"
          width="41%"
          height="17%"
          radius="42% 42% 34% 34%"
          fill={overColour}
        />
        <Part left="33%" top="57%" width="8%" height="5%" radius="50%" fill={overColour} />
        <Part
          left="59%"
          top="57.5%"
          width="8%"
          height="5%"
          radius="50%"
          fill={overColour}
        />
        <Part
          left="41%"
          top="43%"
          width="18%"
          height="7.5%"
          radius="0 0 58% 58%"
          fill={trim}
        />
      </>
    );
  }

  if (over === "mantle") {
    // Eras three and four: a long mantle over ONE shoulder, leaving the other bare. The
    // diagonal is the silhouette — era three's fringed wool, era four's exomis.
    //
    // **The bottom edge is a FRINGE and not a band**, which is era three's own word for it
    // and is also what fixed it: a full-width bar in the belt colour read as a plank the
    // figure was standing on rather than as the end of a garment.
    return (
      <>
        <Part
          left="30.5%"
          top="44.5%"
          width="26%"
          height="33%"
          radius="46% 20% 12% 18%"
          fill={overColour}
        />
        <Part left="32%" top="77%" width="1.8%" height="3.4%" fill={trim} />
        <Part left="36%" top="77.2%" width="1.8%" height="3%" fill={trim} />
        <Part left="40%" top="77%" width="1.8%" height="3.4%" fill={trim} />
        <Part left="44%" top="77.2%" width="1.8%" height="2.8%" fill={trim} />
        <Part left="48%" top="77%" width="1.8%" height="3.2%" fill={trim} />
        <Part left="52%" top="77.2%" width="1.8%" height="2.8%" fill={trim} />
        <Part
          left="41%"
          top="43.2%"
          width="18%"
          height="6%"
          radius="0 0 58% 58%"
          fill={trim}
        />
      </>
    );
  }

  if (over === "gown") {
    // Era six: a plain wool overgown, sleeves pushed back and TIED AT THE ELBOW, which is
    // the read the guide asks for, so the tie is drawn on the sleeve rather than implied.
    return (
      <>
        <Part
          left="29.5%"
          top="44%"
          width="41%"
          height="20%"
          radius="40% 40% 12% 12%"
          fill={overColour}
        />
        <Part
          left="63.2%"
          top="58.5%"
          width="9.6%"
          height="2.4%"
          radius="999px"
          fill={dress.garmentDeep}
        />
        <Part
          left="27.2%"
          top="59%"
          width="9.6%"
          height="2.4%"
          radius="999px"
          fill={dress.garmentDeep}
        />
        <Part
          left="41%"
          top="43.2%"
          width="18%"
          height="6.5%"
          radius="0 0 52% 52%"
          fill={trim}
        />
      </>
    );
  }

  if (over === "apron") {
    // Era seven: the serge jacket, and over it a cotton drill apron with the long front
    // pocket the guide names, holding the folding rule and the calipers.
    return (
      <>
        <Part
          left="29.5%"
          top="44%"
          width="41%"
          height="18%"
          radius="38% 38% 10% 10%"
          fill={trim}
        />
        <Part
          left="37.5%"
          top="49%"
          width="25%"
          height="33%"
          radius="14% 14% 6% 6%"
          fill={overColour}
        />
        {/* The long front pocket, holding the folding rule and the calipers. */}
        <Part
          left="43%"
          top="63%"
          width="14%"
          height="10%"
          radius="8%"
          fill={dress.garmentDeep}
          opacity={0.42}
        />
        <Part
          left="44.6%"
          top="61.5%"
          width="2.4%"
          height="8%"
          radius="999px"
          fill={dress.trim}
        />
        <Part
          left="52.6%"
          top="62%"
          width="2.2%"
          height="6.5%"
          radius="999px"
          fill={dress.trim}
        />
        <Part
          left="41%"
          top="43.2%"
          width="18%"
          height="6.5%"
          radius="0 0 52% 52%"
          fill={trim}
        />
      </>
    );
  }

  if (over === "coat") {
    // Era eight: the lab coat, worn unbuttoned, so it is TWO panels with the shift dress
    // between them. The pen clip is the era's one bright metal note.
    return (
      <>
        <Part
          left="29%"
          top="44%"
          width="42%"
          height="14%"
          radius="40% 40% 8% 8%"
          fill={overColour}
        />
        <Part
          left="29%"
          top="50%"
          width="14%"
          height="30%"
          radius="10% 4% 8% 10%"
          fill={overColour}
        />
        <Part
          left="57%"
          top="50%"
          width="14%"
          height="30%"
          radius="4% 10% 10% 8%"
          fill={overColour}
        />
        <Part
          left="41%"
          top="43.2%"
          width="18%"
          height="6%"
          radius="0 0 52% 52%"
          fill={trim}
        />
      </>
    );
  }

  if (over === "jacket") {
    // Era ten: the layered technical jacket. Its emissive line is `Token`'s, because it is
    // the era's ONE strong colour and every other era's is drawn there too.
    return (
      <>
        <Part
          left="28.5%"
          top="44%"
          width="43%"
          height="19%"
          radius="34% 34% 8% 8%"
          fill={overColour}
        />
        {/* RETROFIT, worn on the figure: one jacket panel is a different generation from
            the rest of it, which is this era's whole method (build on top, remove nothing). */}
        <Part
          left="56%"
          top="50.5%"
          width="12%"
          height="12%"
          radius="6%"
          fill={trim}
          opacity={0.5}
        />
        <Part
          left="41%"
          top="43.2%"
          width="18%"
          height="6%"
          radius="0 0 40% 40%"
          fill={trim}
        />
      </>
    );
  }

  // `plain` — eras two, five and nine. No over-garment at all: a neckline and nothing on
  // the shoulders, which is itself a silhouette and is why those three read narrow.
  return (
    <>
      <Part
        left="38%"
        top="43.4%"
        width="24%"
        height="6.5%"
        radius="0 0 60% 60%"
        fill={trim}
      />
      <Part
        left="31.5%"
        top="45.5%"
        width="37%"
        height="6%"
        radius="46% 46% 20% 20%"
        fill={overColour}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* What he carries — the era's counterpart to Oru's staff                      */
/* -------------------------------------------------------------------------- */

function Carried({ dress }: { readonly dress: AdvisorDress }) {
  const { carried, carriedColour, carriedTrim, accent, accentDeep } = dress;

  if (carried === "staff") {
    // Era one: the lashed timber staff, its bindings, its thatch tuft and a stone charm.
    return (
      <>
        <Part
          left="20.5%"
          top="6%"
          width="3.2%"
          height="86%"
          radius="999px"
          fill={`linear-gradient(90deg,#5A412A 0%,${carriedColour} 42%,#77593A 100%)`}
        />
        <Part
          left="19.4%"
          top="26%"
          width="5.4%"
          height="2%"
          radius="999px"
          fill={accentDeep}
        />
        <Part
          left="19.4%"
          top="47%"
          width="5.4%"
          height="2%"
          radius="999px"
          fill={carriedTrim}
        />
        <Part
          left="19.4%"
          top="66%"
          width="5.4%"
          height="2%"
          radius="999px"
          fill={accentDeep}
        />
        <div
          className="oru-advisor__part oru-advisor__swing"
          style={{ left: "14%", top: "0.5%", width: "16%", height: "9%" }}
        >
          <Part
            left="38%"
            top="0"
            width="7%"
            height="100%"
            radius="999px"
            fill="#A98A52"
            turn="rotate(-13deg)"
          />
          <Part
            left="46%"
            top="-4%"
            width="7%"
            height="104%"
            radius="999px"
            fill="#BFA268"
            turn="rotate(-3deg)"
          />
          <Part
            left="54%"
            top="0"
            width="7%"
            height="100%"
            radius="999px"
            fill="#82683B"
            turn="rotate(8deg)"
          />
          <Part
            left="30%"
            top="6%"
            width="6%"
            height="94%"
            radius="999px"
            fill="#93875F"
            turn="rotate(-22deg)"
          />
          <Part
            left="62%"
            top="8%"
            width="6%"
            height="92%"
            radius="999px"
            fill="#A98A52"
            turn="rotate(17deg)"
          />
          <Part
            left="34%"
            top="76%"
            width="32%"
            height="9%"
            radius="999px"
            fill={accentDeep}
          />
        </div>
        <Hanging
          left="18.6%"
          top="60%"
          width="7%"
          height="6.5%"
          cordWidth="8%"
          cordDrop="58%"
          cord={carriedTrim}
          bob={accent}
          bobRadius="40% 40% 50% 50%"
        />
      </>
    );
  }

  if (carried === "tablet") {
    // Era two: the impressed clay tally tablet, held flat in one hand — §1's own descendant
    // of Oru's notched post — and the shallow winnowing basket on her hip. The tall
    // vertical is GONE, which is the change the first advance has to make legible.
    return (
      <>
        <Part
          left="14.5%"
          top="56%"
          width="19%"
          height="23%"
          radius="10%"
          fill={carriedColour}
        />
        <Part
          left="17.5%"
          top="60%"
          width="13%"
          height="1.9%"
          radius="999px"
          fill={carriedTrim}
        />
        <Part
          left="17.5%"
          top="65%"
          width="13%"
          height="1.9%"
          radius="999px"
          fill={carriedTrim}
        />
        <Part
          left="17.5%"
          top="70%"
          width="8%"
          height="1.9%"
          radius="999px"
          fill={carriedTrim}
        />
        <Part
          left="66%"
          top="62%"
          width="20%"
          height="13%"
          radius="12% 12% 48% 48%"
          fill="#B08968"
        />
        <Part
          left="66%"
          top="61.5%"
          width="20%"
          height="3%"
          radius="999px"
          fill="#8A6A45"
        />
      </>
    );
  }

  if (carried === "balance") {
    // Era three: a hand balance on a short trestle-pole, beam and pans of bronze. The pans
    // hang and swing, and the beam is what makes the silhouette a T rather than a line —
    // which is also the era's whole mathematics, what balances what.
    return (
      <>
        <Part
          left="20.5%"
          top="30%"
          width="3%"
          height="62%"
          radius="999px"
          fill="#8A6A45"
        />
        <Part
          left="9%"
          top="30%"
          width="26%"
          height="2.4%"
          radius="999px"
          fill={carriedColour}
        />
        <Hanging
          left="8%"
          top="31.5%"
          width="10%"
          height="12%"
          cordWidth="6%"
          cordDrop="52%"
          cord={carriedTrim}
          bob={carriedColour}
          bobRadius="8% 8% 46% 46%"
        />
        <Hanging
          left="26%"
          top="31.5%"
          width="10%"
          height="12%"
          cordWidth="6%"
          cordDrop="52%"
          cord={carriedTrim}
          bob={carriedColour}
          bobRadius="8% 8% 46% 46%"
        />
        {/* The banded chest of graded weights at his belt. */}
        <Part left="62%" top="63%" width="15%" height="11%" radius="8%" fill="#B08968" />
        <Part
          left="62%"
          top="67%"
          width="15%"
          height="2%"
          radius="999px"
          fill={carriedColour}
        />
      </>
    );
  }

  if (carried === "groma") {
    // Era four: the groma across one shoulder — a cross-staff on a pole with four
    // plumb-lines hanging from its arms. The cross reads at any size, and the lines swing.
    return (
      <>
        <Part
          left="20.5%"
          top="14%"
          width="3%"
          height="78%"
          radius="999px"
          fill={carriedColour}
        />
        <Part
          left="8%"
          top="17.5%"
          width="28%"
          height="2.2%"
          radius="999px"
          fill={carriedColour}
        />
        <Part
          left="20.8%"
          top="16.6%"
          width="2.4%"
          height="4%"
          radius="50%"
          fill={carriedTrim}
        />
        <Hanging
          left="8.4%"
          top="19.4%"
          width="4%"
          height="11%"
          cordWidth="26%"
          cordDrop="74%"
          cord={carriedTrim}
          bob={accentDeep}
          bobRadius="40% 40% 60% 60%"
        />
        <Hanging
          left="17.4%"
          top="19.4%"
          width="4%"
          height="9%"
          cordWidth="26%"
          cordDrop="72%"
          cord={carriedTrim}
          bob={accentDeep}
          bobRadius="40% 40% 60% 60%"
        />
        <Hanging
          left="23.4%"
          top="19.4%"
          width="4%"
          height="9%"
          cordWidth="26%"
          cordDrop="72%"
          cord={carriedTrim}
          bob={accentDeep}
          bobRadius="40% 40% 60% 60%"
        />
        <Hanging
          left="32.4%"
          top="19.4%"
          width="4%"
          height="11%"
          cordWidth="26%"
          cordDrop="74%"
          cord={carriedTrim}
          bob={accentDeep}
          bobRadius="40% 40% 60% 60%"
        />
        {/* The folded wax tablet and its stylus, at the belt. */}
        <Part left="63%" top="63%" width="13%" height="10%" radius="6%" fill={accentDeep} />
        <Part
          left="69%"
          top="63%"
          width="1.6%"
          height="10%"
          radius="999px"
          fill={carriedTrim}
        />
      </>
    );
  }

  if (carried === "slate") {
    // Era five: a small chalked slate under one arm, and the notched tally stick at the
    // girdle beside the folded scales. The tally is her counterpart to Oru's staff and it
    // is a record rather than an ornament, so it is short and worn, not carried aloft.
    return (
      <>
        <Part left="16%" top="55%" width="19%" height="23%" radius="6%" fill="#6B5238" />
        <Part
          left="17.6%"
          top="56.6%"
          width="15.8%"
          height="19.8%"
          radius="3%"
          fill={carriedColour}
        />
        <Part
          left="19.4%"
          top="60%"
          width="12%"
          height="1.6%"
          radius="999px"
          fill={carriedTrim}
        />
        <Part
          left="19.4%"
          top="65%"
          width="12%"
          height="1.6%"
          radius="999px"
          fill={carriedTrim}
        />
        <Part
          left="19.4%"
          top="70%"
          width="7.5%"
          height="1.6%"
          radius="999px"
          fill={carriedTrim}
        />
        <Part
          left="63%"
          top="61%"
          width="3.4%"
          height="16%"
          radius="999px"
          fill="#8A6A45"
          turn="rotate(6deg)"
        />
        <Part left="63.4%" top="64%" width="3%" height="1.4%" fill={accentDeep} />
        <Part left="63.6%" top="67%" width="3%" height="1.4%" fill={accentDeep} />
        <Part left="63.8%" top="70%" width="3%" height="1.4%" fill={accentDeep} />
      </>
    );
  }

  if (carried === "board") {
    // Era six: the drawing board the size of a forearm with a pinned sheet on it, and the
    // plumb line hanging from its corner. The board is a tool and not a badge, so it is
    // held at her side rather than displayed.
    return (
      <>
        <Part
          left="11%"
          top="50%"
          width="24%"
          height="29%"
          radius="4%"
          fill={carriedColour}
        />
        <Part
          left="13.5%"
          top="52.5%"
          width="19%"
          height="22%"
          radius="2%"
          fill={carriedTrim}
        />
        <Part
          left="16%"
          top="57%"
          width="14%"
          height="1.4%"
          radius="999px"
          fill={accentDeep}
        />
        <Part
          left="16%"
          top="61%"
          width="9.5%"
          height="1.4%"
          radius="999px"
          fill={accentDeep}
        />
        <Part
          left="16%"
          top="65%"
          width="14%"
          height="1.4%"
          radius="999px"
          fill={accentDeep}
        />
        {/* The plumb line, hanging from the BOARD'S OWN CORNER — the guide's words — so it
            reads as part of the instrument rather than as something dropped by her feet. */}
        <Hanging
          left="32.5%"
          top="76%"
          width="5%"
          height="11%"
          cordWidth="14%"
          cordDrop="66%"
          cord={accent}
          bob={accentDeep}
          bobRadius="30% 30% 60% 60%"
        />
        {/* The pair of dividers at her belt, closed. */}
        <Part
          left="64%"
          top="62%"
          width="2%"
          height="12%"
          radius="999px"
          fill={accent}
          turn="rotate(9deg)"
        />
        <Part
          left="67%"
          top="62%"
          width="2%"
          height="12%"
          radius="999px"
          fill={accent}
          turn="rotate(-9deg)"
        />
      </>
    );
  }

  if (carried === "ledger") {
    // Era seven: the ruled ledger under one arm — §1's tally descendant, the printed
    // ledger, in columns and bound — and the brass-cased pocket watch on its chain, which
    // is the era's one bright metal and the era's own obsession.
    return (
      <>
        <Part
          left="12.5%"
          top="54%"
          width="22%"
          height="25%"
          radius="3% 6% 6% 3%"
          fill={carriedColour}
        />
        <Part
          left="15.5%"
          top="55.5%"
          width="18%"
          height="22%"
          radius="0 4% 4% 0"
          fill={carriedTrim}
        />
        <Part left="21%" top="55.5%" width="1%" height="22%" fill={carriedColour} />
        <Part left="27%" top="55.5%" width="1%" height="22%" fill={carriedColour} />
        <Part
          left="12.5%"
          top="54%"
          width="3.4%"
          height="25%"
          radius="3% 0 0 3%"
          fill={accentDeep}
        />
      </>
    );
  }

  if (carried === "clipboard") {
    // Era eight: the clipboard with a strip chart folded over it and the trace visible, and
    // the slide rule in the coat's breast pocket. The chart's trace is the era's own habit
    // drawn on the object she holds: how fast a thing is changing.
    return (
      <>
        <Part
          left="12%"
          top="52%"
          width="22%"
          height="28%"
          radius="4%"
          fill={carriedColour}
        />
        <Part
          left="14%"
          top="56%"
          width="18%"
          height="22%"
          radius="2%"
          fill={carriedTrim}
        />
        <Part
          left="19%"
          top="51%"
          width="8%"
          height="3.4%"
          radius="30%"
          fill={accentDeep}
        />
        {/* The trace: four rising steps, which is a chart a person can read at 120px. */}
        <Part left="15.5%" top="72%" width="4%" height="1.4%" fill="#3A3630" />
        <Part left="19.5%" top="68%" width="4%" height="1.4%" fill="#3A3630" />
        <Part left="23.5%" top="63%" width="4%" height="1.4%" fill="#3A3630" />
        <Part left="27.5%" top="59%" width="4%" height="1.4%" fill="#3A3630" />
        <Part left="19%" top="68%" width="1.2%" height="4.6%" fill="#3A3630" />
        <Part left="23%" top="63%" width="1.2%" height="5.6%" fill="#3A3630" />
        <Part left="27%" top="59%" width="1.2%" height="4.6%" fill="#3A3630" />
        {/* The slide rule, her counterpart to Oru's staff and the era's most honest
            instrument, in the coat's breast pocket beside the pen clip. */}
        <Part
          left="58%"
          top="53.5%"
          width="10%"
          height="2.6%"
          radius="10%"
          fill={accentDeep}
          turn="rotate(-6deg)"
        />
      </>
    );
  }

  if (carried === "slab") {
    // Era nine: the tablet held flat, showing the display panel — a static readout rather
    // than a graph, and the fact that it shows nothing handmade is the point. The paper
    // coffee cup in the other hand is the guide's one deliberate exception, because a
    // figure made entirely of finished surfaces reads as an asset and not as a person.
    return (
      <>
        <Part
          left="13%"
          top="57%"
          width="23%"
          height="16%"
          radius="6%"
          fill={carriedColour}
        />
        <Part
          left="15%"
          top="59%"
          width="19%"
          height="12%"
          radius="3%"
          fill={carriedTrim}
        />
        <Part left="17%" top="61.5%" width="10%" height="1.6%" fill={carriedColour} />
        <Part left="17%" top="65%" width="14%" height="1.6%" fill={carriedColour} />
        <Part
          left="66%"
          top="60%"
          width="10%"
          height="13%"
          radius="8% 8% 34% 34%"
          fill="#E6E7E5"
        />
        <Part
          left="65.4%"
          top="59.5%"
          width="11.2%"
          height="2.6%"
          radius="30%"
          fill="#C9C4BA"
        />
        <Part left="66%" top="64.5%" width="10%" height="2.4%" fill="#C9A98C" />
      </>
    );
  }

  // Era ten: the handheld field meter with its small readout — §1's tally descendant, the
  // animated display, one step past era one's prediction — and the coiled patch cable over
  // the shoulder. The readout's ticking is CSS, so it stands down with everything else.
  return (
    <>
      <Part
        left="15%"
        top="56%"
        width="16%"
        height="21%"
        radius="12%"
        fill={carriedColour}
      />
      <Part
        left="17.5%"
        top="58.5%"
        width="11%"
        height="8%"
        radius="8%"
        fill={carriedTrim}
      />
      <Part
        left="19%"
        top="68%"
        width="3.4%"
        height="3.4%"
        radius="30%"
        fill={accentDeep}
      />
      <Part
        left="24%"
        top="68%"
        width="3.4%"
        height="3.4%"
        radius="30%"
        fill={accentDeep}
      />
      {/* The meter's stub antenna, which is what `point` points with in this era. */}
      <Part
        left="21.5%"
        top="47%"
        width="1.6%"
        height="10%"
        radius="999px"
        fill={carriedTrim}
      />
      {/* THE COILED PATCH CABLE over one shoulder. Three loops of a dark cable with one
          highlight, rather than three bright bars: the era allows exactly ONE emissive note
          and `Token` has already spent it on the shoulder seam. */}
      <Part
        left="60.5%"
        top="39.5%"
        width="10%"
        height="2.2%"
        radius="999px"
        fill="#22252B"
        turn="rotate(-10deg)"
      />
      <Part
        left="61.5%"
        top="42.4%"
        width="10%"
        height="2.2%"
        radius="999px"
        fill="#2E323A"
        turn="rotate(-10deg)"
      />
      <Part
        left="62.5%"
        top="45.3%"
        width="9%"
        height="2.2%"
        radius="999px"
        fill="#22252B"
        turn="rotate(-10deg)"
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The character                                                               */
/* -------------------------------------------------------------------------- */

export function OruAdvisorCharacter({
  mood = "idle",
  dress = ORU_ERA_ONE_DRESS,
}: {
  mood?: OruMood;
  /**
   * WHAT HE IS WEARING. Defaults to era one's, so a surface that has no era to hand renders
   * the character exactly as it did before there was a second era to render.
   */
  dress?: AdvisorDress;
}) {
  return (
    <div className="oru-advisor" data-mood={mood} data-dress={dress.id} aria-hidden="true">
      {/* The four motes drifting up (the first four children — the CSS stagger keys off
          that). Era one's are hearth embers; era ten's are signal glints. */}
      <Part
        cls="oru-advisor__mote"
        left="18%"
        top="22%"
        width="2.6%"
        height="2.6%"
        radius="40%"
        fill={dress.motes[0]}
      />
      <Part
        cls="oru-advisor__mote"
        left="79%"
        top="31%"
        width="2.2%"
        height="2.2%"
        radius="50%"
        fill={dress.motes[1]}
      />
      <Part
        cls="oru-advisor__mote"
        left="74%"
        top="52%"
        width="1.9%"
        height="1.9%"
        radius="40%"
        fill={dress.motes[2]}
      />
      <Part
        cls="oru-advisor__mote"
        left="23%"
        top="47%"
        width="1.7%"
        height="1.7%"
        radius="50%"
        fill={dress.motes[3]}
      />

      {/* ground shadow */}
      <Part
        left="26%"
        top="86%"
        width="49%"
        height="8%"
        radius="50%"
        fill={GROUND_SHADOW}
      />

      <div className="oru-advisor__part oru-advisor__body" style={{ inset: 0 }}>
        {/* Slung behind the shoulder: era one's hide bundle. Drawn under everything so a
            later era's over-garment covers it where the guide gives it none. */}
        <Part
          left="58.5%"
          top="20%"
          width="11.5%"
          height="11.5%"
          radius="50%"
          fill={dress.garmentDeep}
          opacity={dress.over === "cape" ? 1 : 0}
        />

        {/* feet, legs, and their bindings */}
        <Part
          left="35.5%"
          top="79.5%"
          width="13.5%"
          height="7.5%"
          radius="44% 44% 38% 38%"
          fill={dress.foot}
        />
        <Part
          left="51%"
          top="79.5%"
          width="13.5%"
          height="7.5%"
          radius="44% 44% 38% 38%"
          fill={dress.foot}
        />
        <Part
          left="40.5%"
          top="69%"
          width="8.5%"
          height="13%"
          radius="40%"
          fill={dress.leg}
        />
        <Part
          left="51%"
          top="69%"
          width="8.5%"
          height="13%"
          radius="40%"
          fill={dress.leg}
        />
        <Part
          left="40.2%"
          top="73%"
          width="9.1%"
          height="1.9%"
          radius="40%"
          fill={dress.accentDeep}
        />
        <Part
          left="50.7%"
          top="74.5%"
          width="9.1%"
          height="1.9%"
          radius="40%"
          fill={dress.accentDeep}
        />

        {/* the free arm — sways on idle/talk/squint, swings up to point on `point` */}
        <div
          className="oru-advisor__part oru-advisor__arm"
          style={{ left: "63.5%", top: "49%", width: "9%", height: "23%" }}
        >
          <Part left="0" top="0" width="100%" height="84%" radius="45%" fill={SKIN} />
          <Part
            left="-10%"
            bottom="-10%"
            width="120%"
            height="44%"
            radius="50%"
            fill={SKIN_DEEP}
          />
        </div>

        {/* the garment body, its hem and the wear patch on it */}
        <Part
          left="31.5%"
          top="46%"
          width="37%"
          height="36%"
          radius="32% 32% 24% 24%"
          fill={dress.garment}
        />
        <Part
          left="30.5%"
          top="77.5%"
          width="39%"
          height="5.5%"
          radius="24%"
          fill={dress.garmentDeep}
        />
        <Part
          left="42%"
          top="58%"
          width="8.5%"
          height="11%"
          radius="44% 30% 40% 34%"
          fill={CHEEK_SHADE}
          opacity={0.42}
        />

        <OverGarment dress={dress} />

        {/* the near arm, which holds whatever this era carries, and its hand */}
        <Part
          left="27.5%"
          top="49.5%"
          width="9%"
          height="22%"
          radius="45%"
          fill={SKIN}
          turn="rotate(5deg)"
          origin="50% 10%"
        />
        <Part
          left="25.5%"
          top="62%"
          width="11.5%"
          height="9.5%"
          radius="50%"
          fill={SKIN_DEEP}
        />

        {/* the era's one strong colour, wherever its own guide puts it */}
        <Token dress={dress} />

        {/* neck */}
        <Part left="46%" top="39%" width="8%" height="6.5%" radius="35%" fill={SKIN_DEEP} />

        {/* head and ears — the person, in every era */}
        <Part
          left="34%"
          top="15%"
          width="32%"
          height="31%"
          radius="49% 49% 46% 46%"
          fill={`radial-gradient(70% 62% at 40% 32%,${SKIN_LIGHT} 0%,${SKIN} 74%,${SKIN_SHADE} 100%)`}
        />
        <Part left="32.2%" top="27%" width="5%" height="6.5%" radius="50%" fill={SKIN} />
        <Part left="63.2%" top="27%" width="5%" height="6.5%" radius="50%" fill={SKIN} />

        <Headwear dress={dress} />

        {/* open (blinking) eyes — hidden on `squint` */}
        <div
          className="oru-advisor__part oru-advisor__eyes-open"
          style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        >
          <div
            className="oru-advisor__part oru-advisor__eye"
            style={{
              left: "40.4%",
              top: "27.8%",
              width: "4.8%",
              height: "6%",
              borderRadius: "50%",
              background: EYE,
            }}
          >
            <Part
              left="30%"
              top="16%"
              width="36%"
              height="26%"
              radius="50%"
              fill={EYE_GLINT}
            />
          </div>
          <div
            className="oru-advisor__part oru-advisor__eye"
            style={{
              left: "54.8%",
              top: "27.8%",
              width: "4.8%",
              height: "6%",
              borderRadius: "50%",
              background: EYE,
            }}
          >
            <Part
              left="30%"
              top="16%"
              width="36%"
              height="26%"
              radius="50%"
              fill={EYE_GLINT}
            />
          </div>
        </div>

        {/* narrowed eyes — shown on `squint` */}
        <div
          className="oru-advisor__part oru-advisor__eyes-narrow"
          style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        >
          <Part
            left="39.6%"
            top="29.5%"
            width="6.4%"
            height="1.8%"
            radius="60% 60% 20% 20%"
            fill={EYE}
          />
          <Part
            left="54%"
            top="29.5%"
            width="6.4%"
            height="1.8%"
            radius="60% 60% 20% 20%"
            fill={EYE}
          />
        </div>

        {/* nose, the era's face paint if it has any, and the cheek shading */}
        <Part
          left="48.6%"
          top="31.2%"
          width="2.8%"
          height="4.4%"
          radius="44% 44% 50% 50%"
          fill={SKIN_DEEP}
        />
        <Part
          left="37.8%"
          top="35.8%"
          width="6.8%"
          height="1.8%"
          radius="2px"
          fill={dress.faceMark ?? undefined}
          opacity={dress.faceMark ? 0.92 : 0}
          turn="rotate(8deg)"
        />
        <Part
          left="55.4%"
          top="35.8%"
          width="6.8%"
          height="1.8%"
          radius="2px"
          fill={dress.faceMark ?? undefined}
          opacity={dress.faceMark ? 0.92 : 0}
          turn="rotate(-8deg)"
        />
        <Part
          left="49.1%"
          top="22.4%"
          width="1.9%"
          height="4.2%"
          radius="2px"
          fill={dress.faceMark ?? undefined}
          opacity={dress.faceMark ? 0.9 : 0}
        />
        <Part
          left="60.5%"
          top="30%"
          width="4.4%"
          height="3%"
          radius="40%"
          fill={CHEEK_SHADE}
          opacity={0.4}
          turn="rotate(-12deg)"
        />

        {/* mouth: the closed line (default) fades out for the chattering mouth on `talk` */}
        <Part
          cls="oru-advisor__mouth-line"
          left="46.2%"
          top="39.6%"
          width="7.6%"
          height="1.3%"
          radius="999px"
          fill={MOUTH_LINE}
        />
        <div
          className="oru-advisor__part oru-advisor__mouth-talk"
          style={{
            left: "47%",
            top: "39%",
            width: "6%",
            height: "5%",
            borderRadius: "44% 44% 50% 50%",
            background: MOUTH_OPEN,
          }}
        >
          <Part
            left="22%"
            bottom="8%"
            width="56%"
            height="34%"
            radius="50% 50% 40% 40%"
            fill={TONGUE}
          />
        </div>

        <Carried dress={dress} />
      </div>
    </div>
  );
}
