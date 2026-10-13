-- A COMMENT-ONLY MIGRATION, and it exists because a comment in an applied one went stale.
--
-- `0004_civilization_state.sql` minted `crisis_damage_subject` with all three members and
-- said of the third: *"`civic` is a SUSPENSION rather than a ruin: it is carried in the same
-- `CrisisDamage` record, it lifts by other means, and no repair spend is keyed by it."* That
-- was true of the day it was written and it is not a rule. The product lead ruled on
-- 2026-08-04 that a suspension is paid off — *"paying makes sense just to keep the model
-- consistent"* — so a repair spend IS keyed by it now, under
-- `repair:<damage_id>:civic:<placement_id>`, and `RepairSubjectKind` mirrors the enum's
-- three members again rather than its first two.
--
-- NO DDL. The enum already had the member and `0006` already admitted the structured
-- subject, so nothing about the schema changes; what changes is what the schema MEANS, and
-- an applied migration is a record of what ran rather than a document to edit. This is the
-- correction, in the place a reader of the database will find it.
comment on type public.crisis_damage_subject is
  'What a crisis damaged, as the three things it is allowed to damage: a ruined building, '
  'a scarred ground cell, or a civic placement whose contribution is suspended. All three '
  'are repair-spend subjects — a lift is priced from the civic catalogue at the teardown '
  'rate (@cr/economy civicLiftSuspensionCost) where the two ruin prices are the crisis''s '
  'own. Mirrors RepairSubjectKind exactly, because a subject kind is half of a repair '
  'spend''s key.';