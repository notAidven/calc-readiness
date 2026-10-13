import {
  type ClaimantId,
  SUCCESSION,
  type SuccessionCivicType,
  type SuccessionState,
  type SuccessionVerdict,
  successionHoldings,
  successionThreat,
} from "@cr/game";

/** Renderer-facing claimant identity. Pose and cut mark, never hue, carry the side. */
export interface SuccessionClaimantView {
  readonly id: ClaimantId;
  readonly label: string;
  readonly mark: "chevron" | "ring";
  readonly pose: "standing" | "seated";
}

export const SUCCESSION_CLAIMANTS: readonly SuccessionClaimantView[] = [
  {
    id: SUCCESSION.sides.player.claimant,
    label: "your assembly",
    mark: SUCCESSION.sides.player.mark,
    pose: SUCCESSION.sides.player.claimant,
  },
  {
    id: SUCCESSION.sides.rival.claimant,
    label: "the rival assembly",
    mark: SUCCESSION.sides.rival.mark,
    pose: SUCCESSION.sides.rival.claimant,
  },
];

const CLAIMANTS = new Map(SUCCESSION_CLAIMANTS.map((claimant) => [claimant.id, claimant]));

export function successionClaimant(id: ClaimantId): SuccessionClaimantView {
  const claimant = CLAIMANTS.get(id);
  if (!claimant) {
    throw new Error(`Succession claimant "${id}" is not registered.`);
  }
  return claimant;
}

export interface SuccessionBlockView {
  readonly warned_in_cycle: number;
  readonly to: ClaimantId;
  readonly mark: "chevron" | "ring";
}

export interface SuccessionDistrictView {
  readonly id: string;
  readonly label: string;
  readonly civic_label: string;
  readonly civic_type: SuccessionCivicType;
  readonly placement_id: string;
  readonly exposure: number;
  readonly allegiance: "neutral" | ClaimantId;
  readonly decided_by: "player" | "drift" | null;
  readonly decided_in_cycle: number | null;
  readonly figure: "none" | ClaimantId;
  readonly block: SuccessionBlockView | null;
  readonly warned_in_cycle: number | null;
  readonly decides_next: boolean;
  readonly claim: "unclaimed" | "claimed" | "contested";
  readonly holder: ClaimantId | null;
  readonly mark: "chevron" | "ring" | null;
  readonly suspendable: boolean;
  readonly suspended: boolean;
  readonly proposed_figure: ClaimantId | null;
  readonly proposed_claim: "reopen" | null;
  readonly proposed_holder: ClaimantId | null;
}

export interface SuccessionRailView {
  readonly batch: number;
  readonly influence: number;
  readonly earned: number;
  readonly spent: number;
  readonly districts_total: number;
  readonly player: number;
  readonly rival: number;
  readonly undecided: number;
  readonly threat_sentence: string;
}

export interface SuccessionBoardView {
  readonly board: string;
  readonly settled: boolean;
  readonly districts: readonly SuccessionDistrictView[];
  readonly rail: SuccessionRailView;
  readonly suspended: readonly string[];
}

export function successionView(state: SuccessionState): SuccessionBoardView {
  const threat = successionThreat(state);
  const holdings = successionHoldings(state.districts);
  const districts = state.districts.map((district): SuccessionDistrictView => {
    const holder =
      district.control === "player"
        ? SUCCESSION.sides.player.claimant
        : district.control === "rival"
          ? SUCCESSION.sides.rival.claimant
          : null;
    const isThreat = threat?.district_id === district.id;
    const proposal =
      state.proposal?.district_id === district.id ? state.proposal.kind : null;
    return {
      id: district.id,
      label: district.label,
      civic_label: district.civic.label,
      civic_type: district.civic.type,
      placement_id: district.civic.placement_id,
      exposure: district.exposure,
      allegiance: holder ?? "neutral",
      decided_by: district.decided_by === "rival" ? "drift" : district.decided_by,
      decided_in_cycle: district.decided_after_batch,
      figure: holder ?? "none",
      block: isThreat
        ? {
            warned_in_cycle: state.batch,
            to: SUCCESSION.sides.rival.claimant,
            mark: SUCCESSION.sides.rival.mark,
          }
        : null,
      warned_in_cycle: isThreat ? state.batch : null,
      decides_next: isThreat,
      claim:
        district.civic_state === "closed"
          ? "contested"
          : holder === null
            ? "unclaimed"
            : "claimed",
      holder,
      mark: holder === null ? null : successionClaimant(holder).mark,
      suspendable: district.civic.suspendable !== false,
      suspended: district.civic_state === "closed",
      proposed_figure: proposal === "rally" ? SUCCESSION.sides.player.claimant : null,
      proposed_claim: proposal === "reopen" ? "reopen" : null,
      proposed_holder: null,
    };
  });
  const undecided = districts.filter((district) => district.figure === "none").length;
  return {
    board: state.board,
    settled: state.phase === "settled",
    districts,
    rail: {
      batch: state.batch,
      influence: state.influence,
      earned: state.earned,
      spent: state.spent,
      districts_total: districts.length,
      player: holdings[SUCCESSION.sides.player.claimant],
      rival: holdings[SUCCESSION.sides.rival.claimant],
      undecided,
      threat_sentence:
        threat === null
          ? "Every district has decided."
          : `After the next three-question batch, the rival will claim the ${threat.district_label}. ${threat.civic_label} closes.`,
    },
    suspended: districts
      .filter((district) => district.suspended)
      .map((district) => district.placement_id),
  };
}

export const SUCCESSION_VERDICT_COPY: Readonly<
  Record<SuccessionVerdict, { readonly headline: string; readonly line: string }>
> = {
  best: {
    headline: "Your assembly holds the line",
    line: "The rival has wards of its own, but it did not take the whole civic quarter.",
  },
  partial: {
    headline: "A hard settlement",
    line: "The succession is decided. The city carries the division forward in stone.",
  },
  fractured: {
    headline: "The rival takes the city",
    line: "The succession ends under rival statues and shuttered civic doors.",
  },
};
