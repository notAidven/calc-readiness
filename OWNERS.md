# Ownership map

One owner per build area, so nothing is unassigned and no two people edit the same files. Engine lanes are exclusive. Shared packages have a frozen interface (frozen by agreement Day 1) and one owner for the implementation behind it. Changing a frozen interface or another owner's lane is owner-gated, not an all-hands (see "Cross-lane change policy" below).

| Area | Owner | Notes |
|---|---|---|
| `engines/diagnostic` | **Gabe** | placement/pretest engine; writes placement_estimate, never mastery |
| `engines/lesson` | **Anthony** | lesson engine + content packs; submits evidence |
| `engines/game` | **Evan** | city-builder, storms, checkpoints; reads mastery, sets checkpoint flag only |
| `packages/shared-state-schema` | **Gabe** | types only; owner-gated per the cross-lane change policy (a broad, multi-lane schema break still warrants an all-hands) |
| `packages/shared-components` | **Gabe** | graph widget (SVG) + math input/checkAnswer; built once, consumed by all |
| `packages/skill-graph` | **Gabe** | registry + invariant test; edge changes gated by CI |
| `packages/item-bank` | **Anthony** (2026-07-31) | The whole package, content and code alike: schema/templates, the validation harness, the answer-checker, serving/grading and the immutability machinery, as well as every item pack. Gabe built all of the machinery and the D1 bank + 12-node spine items, and that history is unchanged; the ownership is not. `docs/Content_Authoring_Split.md` §11 is the authority; see "Content ownership" below. |
| `packages/shared-components` — the **answer checker** | **Anthony** (2026-07-31) | `product-answer-checker.ts` and its companions (`domain-sampling.ts`, `pipe-notation.ts`, the interactive comparators) move with the item bank: they decide whether a learner's answer is right, which is learning, not game. The rest of `packages/shared-components` stays Gabe's. |
| `apps/web/src/lessons/**` | **Anthony** (2026-07-31) | The lesson layer: the practice/CFU host, `answerFormat`, and **every interactive widget including the shared kinds under `interactive/kinds/`**. This closes a real gap — `apps/web` had no row in this table at all, which is recorded as the underlying cause of `docs/Post_MVP_Backlog.md` item 13 being unassignable. |
| `packages/shared-mastery-service` | **Anthony** | load-balanced off Gabe; lesson engine is the main caller |
| `scripts/`, CI, root config | **Gabe** | structure/infra |

## Content ownership — Anthony has the learning, Gabe has the game (RULED 2026-07-31)

**The team lead, 2026-07-31:** *"anthony owns all the content now"* and *"all machinery related to lesson stuff is his now."* **`docs/Content_Authoring_Split.md` §11 is the authority** and is deliberately not restated here — read it there, and change it there.

**The line, which is the rule for anything not listed:** Anthony has the **learning** — what the learner is taught and how the teaching is judged. Gabe has the **game** — the world the learner is taught inside. So Anthony holds lesson JSON, item packs, the item bank, every interactive widget **including the shared kinds**, the answer checker, the lesson validators, the six authoring skills and the `lesson-planner` agent; Gabe holds the city and its 3D layer, the crises, the era model and progressions, the economy, persistence, the diagnostic, and CI/tooling. Evan's design lane is untouched by *this* ruling. **(Amended 2026-08-05: it is no longer wholly untouched. Gabe overrode his own §1.1 ruling for the intro onboarding's advisor voice and era one's advisor register; eras two to ten's personas and voices remain Evan's. `docs/Content_Authoring_Split.md` §1.1 carries the supersession, its narrow scope, and what it leaves open.)**

**This is a change of OWNERSHIP, not of exclusivity.** The lead is playing a flex role and *"might be able to pick up some content work from anthony if need be."* Anthony owns and drives the content; Gabe authoring a lesson under that ownership is the arrangement working, not a reversal, and needs no new ruling. Gabe deciding *what* gets authored, or overriding a bar Anthony has set, would be — that is ownership, and it would take a dated amendment in the split doc. Detail in §11.4 there.

**What this retires.** The per-node / whole-domain split in every form it held — the even 15/15, the 22/22, the net 29/27, and §10.4's 26/30 — together with the per-owner authoring-share counters and the question of whether their denominators re-base. With one owner there is no share to denominate.

**What it does not touch.** No authored history is reattributed: Gabe authored D2, D3 and D4 and built the machinery, Anthony authored D1's lessons and D5, D7, D8 and D10. No file, node id or directory moves, and no item-bank snapshot moves. The **cross-lane change policy below is unchanged and now reads the other way across this boundary** — a change to the item bank, the checker or a lesson validator takes **Anthony's** review.

**Superseded — the two earlier arrangements, kept so the record reads straight.** This section first recorded the 2026-07-23 scope change that moved all 30 remaining item packs to Anthony with Gabe retaining the schema/harness/checker; that was replaced 2026-07-25 by the per-node split by domain (Gabe 22 / Anthony 22, later Gabe 26 / Anthony 30). Both are now history. The one thread running through all three is that items tie to the lesson they assess; what changed each time is who does the tying, and it is now one person for both halves.

**Wave-2 draft PR #16 — CLOSED, no longer an open loop.** That same note left the disposition of Gabe's wave-2 draft (**PR #16**, `gabe/expansion-wave-2`) as *"hand it off to Anthony or close it by agreement with him."* It was settled the same day: **PR #16 was CLOSED as superseded on 2026-07-23 and never merged**, with an explanatory closing comment (the expansion authoring had been reassigned, so the Gabe-lane WIP draft was no longer the path forward). It was a read-only checkpoint with **no authored items to preserve**; branch `gabe/expansion-wave-2` (checkpoint `c380a72`) is retained for reference only. **No further coordination is needed.**

## Post-MVP: cosmetic economy (ratified amendment, Contracts §8)
The ratified cosmetic-economy amendment (Days 13-24 ranked expansion; `docs/Contracts_Amendment_Cosmetic_Economy.md`, normative in `docs/Contracts.md` §8) splits along the existing lanes, no new owner:
- **Gabe** owns the economy **shared types, tables/grants/migrations, and service APIs** (`grantResource`/`purchaseCosmetic`/`getWallet`/`getInventory`/`equipCosmetic`) — it extends `packages/shared-state-schema`, `db/migrations`, and adds a new authoritative economy service, all his frozen-interface areas.
- **Evan** owns the **game-side consumption** in `engines/game`: surfacing server-verified earn triggers, the cosmetic store/UI, and the `equipCosmetic` selection call (the only client economy write).
- Purely additive and expansion-scope; it does not change any MVP ownership above and upholds the one-way invariant (resources/cosmetics never gate learning or storm access).

## Load check (why mastery-service went to Anthony)
- Gabe: diagnostic lane + 3 shared packages (state-schema, skill-graph, components incl. the graph widget + math input, both heavy). Heaviest.
- Anthony: lesson lane + content packs.
- Evan: game lane (large, single).

Assigning mastery-service to Anthony balances the load and pairs the builder with its primary consumer (lessons). If Anthony ends up overloaded once real estimates land, it can move to Gabe, the interface is frozen either way, so the owner can swap without breaking consumers.

## The rule that makes this safe
Anything in `packages/*` is a **frozen interface** agreed by all three Day 1. After that, only the named owner edits the implementation, and consumers build against the interface. Changing an interface is a deliberate, owner-approved change, never a casual commit.

### Cross-lane change policy (amended 2026-07-23)
Changing a frozen interface, or another owner's `packages/*` / engine lane, does **NOT** require a full all-hands.
- It **DOES** require the **owning developer's review and explicit approval** — in-person or async sign-off both count — and the change must be documented in three places: the **PR description**, the **changing developer's work log**, and the **relevant spec/doc**.
- A full **all-hands is reserved** only for changes with **no clear single owner**, or changes that **break broadly across multiple lanes**.
- This governs the change *process*; the frozen interfaces themselves are unchanged by this amendment.

See `docs/Contracts.md` (Change control) and `docs/Architecture.md` §6.
