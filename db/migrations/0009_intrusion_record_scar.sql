-- The Intrusion leaves a visible record scar that withholds no capacity. It therefore
-- cannot ride `civic`, whose meaning is a suspended contribution. The magnitude and the
-- one-use verification state belong to this subject alone; every older damage row keeps
-- both columns null.
--
-- The `subject_kind` value itself is added by `0009_crisis_damage_record_value.sql`, which
-- sorts before this file and commits in its own transaction. It cannot live here: Postgres
-- rejects a new enum value used in the transaction that added it (55P04), and the check
-- constraint below uses it. See that file for the full reasoning.

alter table public.city_crisis_damage
  drop constraint city_crisis_damage_subject_is_event_id_safe;

alter table public.city_crisis_damage
  add constraint city_crisis_damage_subject_is_event_id_safe
  check (
    (
      subject_kind in ('building', 'ground')
      and subject <> ''
      and position(':' in subject) = 0
    )
    or
    (
      subject_kind in ('civic', 'record')
      and subject ~ '^civic:[a-z0-9_]+:(0|[1-9][0-9]*)$'
    )
  );

alter table public.city_crisis_damage
  add column bands_dark integer,
  add column verification_attempted boolean;

alter table public.city_crisis_damage
  add constraint city_crisis_damage_record_shape
  check (
    (
      subject_kind = 'record'
      and bands_dark between 1 and 9
      and verification_attempted is not null
    )
    or
    (
      subject_kind <> 'record'
      and bands_dark is null
      and verification_attempted is null
    )
  );

grant update (bands_dark, verification_attempted)
  on public.city_crisis_damage to app_service;

comment on type public.crisis_damage_subject is
  'A ruined building, scarred ground cell, suspended civic placement, or an overwritten '
  'public record. Record damage is visible but withholds no capacity.';

comment on column public.city_crisis_damage.bands_dark is
  'For record damage only: 1..9 bands still overwritten. Null for every other kind.';

comment on column public.city_crisis_damage.verification_attempted is
  'For record damage only: whether its one optional three-question verification was spent.';