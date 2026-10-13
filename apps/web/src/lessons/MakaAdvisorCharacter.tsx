import "./makaAdvisor.css";

/**
 * ERA TWO'S ADVISOR CHARACTER — ported from Evan's `Gridwork Eras` export, kept verbatim on
 * the advisor shelf as `apps/web/src/city/art/sources/MakaAdvisor.dc.html` so this port can
 * be checked against its original rather than trusted. Same delivery medium as Oru's:
 * absolutely-positioned percentage boxes, so the character scales with whatever square its
 * host gives it.
 *
 * ## ⚑ THE FILE NAME IS THE ART'S NAME. IT IS NOT A RULING ON WHO ERA TWO'S ADVISOR IS
 *
 * **Era two's advisor is Oru, re-dressed as a grain keeper. This file is that costume, and
 * `maka` is the costume's name, not a person's.** Evan settled it on 2026-07-31 — *"oru
 * redressed"* — closing a three-way disagreement this header used to report as open: the code
 * shipped `Ket`, `D-ET9` retired that name for Oru re-dressed, and the delivered art arrived
 * as `MakaAdvisor.dc.html`. `city/eraDressing.ts`' `ERA_ADVISORS` now carries the ruling and
 * is the only place the name lives.
 *
 * **The file was NOT renamed to follow it, deliberately.** The shelf's rule is *"the filename
 * says what the art is"*, and this file is Evan's delivered export kept byte-for-byte so the
 * port can be checked against it — renaming it would break the one property the shelf exists
 * for. Under D-ET9 one advisor wears ten costumes, so a costume that took the person's name
 * would need a number after it to stay unique; `maka` is the right grain for a drawing token
 * and carries no claim about the cast. The line that keeps that honest is not this comment
 * but `eraAdvisorArt.test.tsx`, which fails if the spoken name is ever derived from the
 * drawing token.
 *
 * The two have always been separate in this codebase, and nothing below crosses the line:
 *
 *   - **No learner-facing string comes from this file.** The advisor's spoken name resolves
 *     through `advisorNameForEra` → `ERA_ADVISORS`. Settling the name moved that table and
 *     moved nothing here, which is the claim this separation was made to be able to keep.
 *   - **The character is `aria-hidden` and wordless**, exactly as Oru's is, so it carries no
 *     meaning that a screen-reader user could lose. Every word the advisor says lives in
 *     `AdvisorNpc`'s `aria-live` bubble.
 *   - `maka` in {@link MakaMood} and in `eraAdvisor.ts`' `AdvisorArt` union names **the
 *     drawing**, after the file it was ported from — the convention `art/sources/README.md`
 *     states as *"the filename says what the art is"*, and the same convention that makes
 *     `art: "oru"` a drawing token rather than a claim about era one's cast.
 *
 * ## WHAT SHIPPED VERSUS WHAT THE GUIDE AUTHORED
 *
 * The guide's dressing paragraph authors a woven flax wrap, a fired-clay bead at the throat,
 * an impressed clay tally tablet and a winnowing basket. The delivered drawing is close but
 * not a transcription of it: the wrap reads as an apron panel over a tunic, the bead survives
 * as a three-bead necklace, the tablet-and-basket pair reads as one held object, and the
 * drawing adds a **loaded handcart with a turning wheel** that the guide does not author.
 * The art is ported as delivered — the source is the authority for the art — and the
 * divergence is recorded in that guide's advisor section for Evan rather than corrected here.
 *
 * ## THE POSES
 *
 * The `mood` prop drives the delivery's own `data-props` enum, which is era one's four names
 * exactly — era two keeps the whole vocabulary, which is what makes the first advance prove
 * D-ERA28's mechanism without exercising the loss:
 *   - `idle`   — the free arm sways, open (blinking) eyes, a closed mouth line
 *   - `talk`   — the mouth line fades to an open, chattering mouth
 *   - `point`  — the free arm swings up to point at the work
 *   - `squint` — the open eyes swap to narrowed ones (reading, weighing, unconvinced)
 *
 * All motion is CSS, keyed off `data-mood` and scoped under `.maka-advisor` in
 * `makaAdvisor.css`, and gated by `prefers-reduced-motion` — so this component is pure,
 * static markup and swapping moods never re-mounts anything. Every mood-dependent part is
 * present at every mood; CSS decides which one shows.
 *
 * **{@link MakaMood} is declared here rather than aliased to `OruMood`**, and that is the
 * whole of the type-level safety D-ERA28 asks for: `eraAdvisor.ts`' pose row is a union
 * discriminated on `art`, so an era declaring `art: "maka"` must map every lesson beat to a
 * pose *this* union offers. The day an advisor's art is drawn in fewer poses, narrowing its
 * own union is a compile error at every beat that asked for the pose it lost.
 */
export type MakaMood = "idle" | "talk" | "point" | "squint";

export function MakaAdvisorCharacter({ mood = "idle" }: { mood?: MakaMood }) {
  return (
    <div className="maka-advisor" data-mood={mood} aria-hidden="true">
      {/* chaff drifting up off the threshing patch (the first four children — the CSS
          stagger keys off that, as Oru's embers do) */}
      <div
        className="maka-advisor__part maka-advisor__mote"
        style={{
          left: "20%",
          top: "26%",
          width: "2.4%",
          height: "2.4%",
          borderRadius: "50%",
          background: "#C58461",
        }}
      />
      <div
        className="maka-advisor__part maka-advisor__mote"
        style={{
          left: "77%",
          top: "34%",
          width: "2%",
          height: "2%",
          borderRadius: "50%",
          background: "#D8B48E",
        }}
      />
      <div
        className="maka-advisor__part maka-advisor__mote"
        style={{
          left: "72%",
          top: "56%",
          width: "1.7%",
          height: "1.7%",
          borderRadius: "50%",
          background: "#B4714F",
        }}
      />
      <div
        className="maka-advisor__part maka-advisor__mote"
        style={{
          left: "25%",
          top: "50%",
          width: "1.6%",
          height: "1.6%",
          borderRadius: "50%",
          background: "#E0C9A6",
        }}
      />

      {/* ground shadow */}
      <div
        className="maka-advisor__part"
        style={{
          left: "27%",
          top: "88%",
          width: "47%",
          height: "7.5%",
          borderRadius: "50%",
          background: "rgba(74,58,42,0.22)",
        }}
      />

      {/* the loaded handcart beside her, its wheel turning — outside the bobbing body group,
          so the cart stands still while she moves */}
      <div
        className="maka-advisor__part"
        style={{ left: "15%", top: "62%", width: "20%", height: "26%" }}
      >
        <div
          className="maka-advisor__part"
          style={{
            left: "14%",
            top: "56%",
            width: "72%",
            height: "18%",
            borderRadius: "50%",
            background: "#8B6C48",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "6%",
            top: "60%",
            width: "88%",
            height: "36%",
            borderRadius: "14% 14% 46% 46%",
            background: "#9E7C57",
          }}
        />
        <div
          className="maka-advisor__part maka-advisor__wheel"
          style={{
            left: "20%",
            top: "26%",
            width: "60%",
            height: "34%",
            borderRadius: "50%",
            background: "#B4714F",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "32%",
            top: "14%",
            width: "36%",
            height: "24%",
            borderRadius: "44% 44% 30% 30%",
            background: "#C58461",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "38%",
            top: "8%",
            width: "24%",
            height: "10%",
            borderRadius: "50%",
            background: "#9C5B3D",
          }}
        />
      </div>

      <div className="maka-advisor__part maka-advisor__body" style={{ inset: 0 }}>
        {/* feet and legs */}
        <div
          className="maka-advisor__part"
          style={{
            left: "35.5%",
            top: "82.5%",
            width: "13.5%",
            height: "7.5%",
            borderRadius: "44% 44% 38% 38%",
            background: "#6C5138",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "51%",
            top: "82.5%",
            width: "13.5%",
            height: "7.5%",
            borderRadius: "44% 44% 38% 38%",
            background: "#6C5138",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "40.5%",
            top: "72%",
            width: "8.5%",
            height: "12%",
            borderRadius: "40%",
            background: "#C08A5A",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "51%",
            top: "72%",
            width: "8.5%",
            height: "12%",
            borderRadius: "40%",
            background: "#C08A5A",
          }}
        />

        {/* the free arm — sways on idle/talk/squint, swings up to point on `point`. Its
            woven cuff is the band across the forearm. */}
        <div
          className="maka-advisor__part maka-advisor__arm"
          style={{ left: "63.5%", top: "49%", width: "9%", height: "23%" }}
        >
          <div
            className="maka-advisor__part"
            style={{
              left: 0,
              top: 0,
              width: "100%",
              height: "84%",
              borderRadius: "45%",
              background: "#C08A5A",
            }}
          />
          <div
            className="maka-advisor__part"
            style={{
              left: "-10%",
              bottom: "-10%",
              width: "120%",
              height: "44%",
              borderRadius: "50%",
              background: "#B07A4E",
            }}
          />
          <div
            className="maka-advisor__part"
            style={{
              left: "-4%",
              top: "34%",
              width: "108%",
              height: "9%",
              borderRadius: "999px",
              background: "#E6D8BC",
              opacity: 0.75,
            }}
          />
        </div>

        {/* tunic, hem, the pale apron panel and its top edge, two dust smudges */}
        <div
          className="maka-advisor__part"
          style={{
            left: "31.5%",
            top: "45%",
            width: "37%",
            height: "31%",
            borderRadius: "30% 30% 22% 22%",
            background: "#A2603F",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "30.5%",
            top: "71.5%",
            width: "39%",
            height: "5.5%",
            borderRadius: "22%",
            background: "#7E4630",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "34%",
            top: "52%",
            width: "32%",
            height: "22%",
            borderRadius: "8% 8% 30% 30%",
            background: "#D8C7A4",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "34%",
            top: "52%",
            width: "32%",
            height: "3%",
            borderRadius: "40%",
            background: "#C4B18C",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "44%",
            top: "60%",
            width: "9%",
            height: "9%",
            borderRadius: "44% 30% 40% 34%",
            background: "#B4714F",
            opacity: 0.3,
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "39%",
            top: "66%",
            width: "6%",
            height: "6%",
            borderRadius: "40%",
            background: "#B4714F",
            opacity: 0.22,
          }}
        />

        {/* shoulder cape, its two caps, and the collar */}
        <div
          className="maka-advisor__part"
          style={{
            left: "29.5%",
            top: "44%",
            width: "41%",
            height: "15%",
            borderRadius: "40% 40% 32% 32%",
            background: "#8B4E34",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "33%",
            top: "55%",
            width: "8%",
            height: "5%",
            borderRadius: "50%",
            background: "#8B4E34",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "59%",
            top: "55.5%",
            width: "8%",
            height: "5%",
            borderRadius: "50%",
            background: "#8B4E34",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "41%",
            top: "43%",
            width: "18%",
            height: "7%",
            borderRadius: "0 0 58% 58%",
            background: "#7E4630",
          }}
        />

        {/* the holding arm (static), its hand, and the object it carries flat */}
        <div
          className="maka-advisor__part"
          style={{
            left: "27.5%",
            top: "49.5%",
            width: "9%",
            height: "22%",
            borderRadius: "45%",
            background: "#C08A5A",
            transform: "rotate(6deg)",
            transformOrigin: "50% 10%",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "25.5%",
            top: "62%",
            width: "11.5%",
            height: "9.5%",
            borderRadius: "50%",
            background: "#B07A4E",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "23.5%",
            top: "64.5%",
            width: "9%",
            height: "7%",
            borderRadius: "44% 44% 50% 50%",
            background: "#C58461",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "25.6%",
            top: "63.2%",
            width: "4.8%",
            height: "2%",
            borderRadius: "999px",
            background: "#9C5B3D",
          }}
        />

        {/* bead necklace, the middle one in the era's fired-clay tone */}
        <div
          className="maka-advisor__part"
          style={{
            left: "44%",
            top: "47.5%",
            width: "3.6%",
            height: "3.6%",
            borderRadius: "50%",
            background: "#C2AE83",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "48.4%",
            top: "49%",
            width: "3.6%",
            height: "4.6%",
            borderRadius: "50%",
            background: "#B4714F",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "52.8%",
            top: "47.5%",
            width: "3.6%",
            height: "3.6%",
            borderRadius: "50%",
            background: "#C2AE83",
          }}
        />

        {/* neck */}
        <div
          className="maka-advisor__part"
          style={{
            left: "46%",
            top: "39%",
            width: "8%",
            height: "6.5%",
            borderRadius: "35%",
            background: "#B07A4E",
          }}
        />

        {/* head and ears */}
        <div
          className="maka-advisor__part"
          style={{
            left: "34%",
            top: "15%",
            width: "32%",
            height: "31%",
            borderRadius: "49% 49% 46% 46%",
            background:
              "radial-gradient(70% 62% at 40% 32%,#CE9C6C 0%,#C08A5A 74%,#AE7748 100%)",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "32.2%",
            top: "27%",
            width: "5%",
            height: "6.5%",
            borderRadius: "50%",
            background: "#C08A5A",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "63.2%",
            top: "27%",
            width: "5%",
            height: "6.5%",
            borderRadius: "50%",
            background: "#C08A5A",
          }}
        />

        {/* hair: the cap and two side locks, then the banded headband and its three pale
            tiles — the visible break from Oru's stone hood */}
        <div
          className="maka-advisor__part"
          style={{
            left: "33.4%",
            top: "12%",
            width: "33.2%",
            height: "10.5%",
            borderRadius: "52% 52% 20% 20%",
            background: "#3F332A",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "31.8%",
            top: "17.5%",
            width: "7%",
            height: "12%",
            borderRadius: "60% 20% 40% 50%",
            background: "#3F332A",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "61.2%",
            top: "17.5%",
            width: "7%",
            height: "12%",
            borderRadius: "20% 60% 50% 40%",
            background: "#3F332A",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "32.6%",
            top: "16.5%",
            width: "34.8%",
            height: "4.6%",
            borderRadius: "999px",
            background: "#B4714F",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "37%",
            top: "17.4%",
            width: "3.4%",
            height: "2.8%",
            borderRadius: "2px",
            background: "#E6D8BC",
            opacity: 0.8,
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "48.4%",
            top: "17.4%",
            width: "3.4%",
            height: "2.8%",
            borderRadius: "2px",
            background: "#E6D8BC",
            opacity: 0.8,
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "59.8%",
            top: "17.4%",
            width: "3.4%",
            height: "2.8%",
            borderRadius: "2px",
            background: "#E6D8BC",
            opacity: 0.8,
          }}
        />

        {/* brows */}
        <div
          className="maka-advisor__part"
          style={{
            left: "39.4%",
            top: "24.4%",
            width: "7.2%",
            height: "1.7%",
            borderRadius: "3px",
            background: "#4A3C31",
            transform: "rotate(-4deg)",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "53.4%",
            top: "24.4%",
            width: "7.2%",
            height: "1.7%",
            borderRadius: "3px",
            background: "#4A3C31",
            transform: "rotate(4deg)",
          }}
        />

        {/* open (blinking) eyes — hidden on `squint` */}
        <div
          className="maka-advisor__part maka-advisor__eyes-open"
          style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        >
          <div
            className="maka-advisor__part maka-advisor__eye"
            style={{
              left: "40.4%",
              top: "27.8%",
              width: "4.8%",
              height: "6%",
              borderRadius: "50%",
              background: "#2A251E",
            }}
          >
            <div
              className="maka-advisor__part"
              style={{
                left: "30%",
                top: "16%",
                width: "36%",
                height: "26%",
                borderRadius: "50%",
                background: "#F7F1E2",
              }}
            />
          </div>
          <div
            className="maka-advisor__part maka-advisor__eye"
            style={{
              left: "54.8%",
              top: "27.8%",
              width: "4.8%",
              height: "6%",
              borderRadius: "50%",
              background: "#2A251E",
            }}
          >
            <div
              className="maka-advisor__part"
              style={{
                left: "30%",
                top: "16%",
                width: "36%",
                height: "26%",
                borderRadius: "50%",
                background: "#F7F1E2",
              }}
            />
          </div>
        </div>

        {/* narrowed eyes — shown on `squint` */}
        <div
          className="maka-advisor__part maka-advisor__eyes-narrow"
          style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        >
          <div
            className="maka-advisor__part"
            style={{
              left: "39.6%",
              top: "29.5%",
              width: "6.4%",
              height: "1.8%",
              borderRadius: "60% 60% 20% 20%",
              background: "#2A251E",
            }}
          />
          <div
            className="maka-advisor__part"
            style={{
              left: "54%",
              top: "29.5%",
              width: "6.4%",
              height: "1.8%",
              borderRadius: "60% 60% 20% 20%",
              background: "#2A251E",
            }}
          />
        </div>

        {/* nose and the two cheek notes */}
        <div
          className="maka-advisor__part"
          style={{
            left: "48.6%",
            top: "31.2%",
            width: "2.8%",
            height: "4.4%",
            borderRadius: "44% 44% 50% 50%",
            background: "#B07A4E",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "60.6%",
            top: "31%",
            width: "5%",
            height: "3.4%",
            borderRadius: "40%",
            background: "#B4714F",
            opacity: 0.34,
            transform: "rotate(-12deg)",
          }}
        />
        <div
          className="maka-advisor__part"
          style={{
            left: "34.6%",
            top: "32.6%",
            width: "4.4%",
            height: "2.8%",
            borderRadius: "40%",
            background: "#B4714F",
            opacity: 0.28,
            transform: "rotate(10deg)",
          }}
        />

        {/* mouth: the closed line (default) fades out for the chattering mouth on `talk` */}
        <div
          className="maka-advisor__part maka-advisor__mouth-line"
          style={{
            left: "46.2%",
            top: "39.6%",
            width: "7.6%",
            height: "1.3%",
            borderRadius: "999px",
            background: "#7A4034",
          }}
        />
        <div
          className="maka-advisor__part maka-advisor__mouth-talk"
          style={{
            left: "47%",
            top: "39%",
            width: "6%",
            height: "5%",
            borderRadius: "44% 44% 50% 50%",
            background: "#6E3226",
          }}
        >
          <div
            className="maka-advisor__part"
            style={{
              left: "22%",
              bottom: "8%",
              width: "56%",
              height: "34%",
              borderRadius: "50% 50% 40% 40%",
              background: "#B2604C",
            }}
          />
        </div>
      </div>
    </div>
  );
}
