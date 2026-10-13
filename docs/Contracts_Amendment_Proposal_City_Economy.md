# SUPERSEDED — Proposal: persistent city economy (D1 city-builder)

> **STATUS: SUPERSEDED / HISTORICAL. Do not build against this document.**
>
> This was Evan's *proposal* to amend `docs/Contracts.md` for a persistent city
> economy. It has been **superseded by the ratified cosmetic-economy amendment**,
> approved at the 2026-07-20 all-hands and folded into the authoritative contract.
> It is retained only for historical context and must not be treated as in force.
>
> **Authoritative economy contract — read these instead:**
>
> - `docs/Contracts.md` **§8** — *Cosmetic economy (post-MVP ranked expansion,
>   ratified 2026-07-20)* — the **normative** source (types, tables, APIs, RLS,
>   invariants INV-COS-1..5).
> - `docs/Contracts_Amendment_Cosmetic_Economy.md` — the ratified amendment's
>   rationale / detail / approval record.
>
> There is now ONE authoritative economy contract (Contracts §8).

## How the ratified contract differs from this proposal

The ratified §8 differs from this proposal in vocabulary, shape, ownership, and
timing. Non-exhaustive, but the load-bearing differences:

- **Tables:** ratified `resource_wallet`, `resource_grant_ledger`,
  `cosmetic_catalog`, `owned_cosmetic`, `equipped_cosmetic` — vs. this proposal's
  `student_city_wallet`, `city_reward_grant`, `student_city_unlock`, `storm_run`.
- **Resources:** ratified models a **single generic `balance`**. A multi-resource
  model (`materials` / `prestige`) is an explicit **open product decision** in the
  ratified doc, not something that was ratified.
- **APIs:** ratified `grantResource` / `purchaseCosmetic` / `getWallet` /
  `getInventory` / `equipCosmetic`, idempotent on **`event_id`** — vs. this
  proposal's `grantCityReward` / `spendOnCityUnlock` / `submitStormRun` /
  `getCityWallet` / `getCityUnlocks`.
- **Storm / checkpoint:** ratified keeps `engines/game` as the **sole**
  `neighborhood_state.checkpoint_cleared` writer and the economy service **never**
  writes `neighborhood_state`; the ratified economy has **no `storm_run` table**.
- **Earn rates / reward amounts:** an explicit **open product decision** in the
  ratified doc (not fixed by the contract).
- **Ownership & timing:** the ratified economy **shared types, tables/RLS/
  migrations, and service APIs are Gabe's**, scheduled for the **Days 13-24 ranked
  expansion** (the frozen Day-12 MVP contract, §1–§6, is unchanged). **Evan** owns
  the **game-side consumption** (surfacing server-verified earn triggers, the
  store/cosmetic UI, and `equipCosmetic`).

See `docs/Contracts.md` §8 and `docs/Contracts_Amendment_Cosmetic_Economy.md` for
the normative details.
