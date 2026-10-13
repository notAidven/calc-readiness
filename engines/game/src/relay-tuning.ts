/**
 * Every magnitude used by the redesigned Intrusion.
 *
 * The approved rule is explicit in data: Restore resolves the current round against the
 * shutters already closed, then reopens all of them. Keeping it beside the other numbers
 * makes the exhaustive proof and the reducer read the same model.
 */
export const RELAY = {
  bands: 9,
  opens_dark: 4,
  rounds: 3,
  questions_per_round: 3,
  feed_bands: 3,
  shutters: 3,
  block_per_correct: 1,
  shutters_persist: true,
  restore_base: 1,
  restore_per_correct: 1,
  restore_reopens_all: true,
  copy_silences_feed: false,
  verification_bands_per_correct: 1,
  window: {
    eras_back: 2,
    shares_percent: [40, 35, 25] as const,
  },
} as const;
