-- Civic placements use `civic:<catalogue-id>:<sequence>`. The generic event-id builder
-- validates those delimiter-separated parts independently and then rejoins them, so the
-- database must admit exactly that structured form while skill and Town Hall ids remain
-- one colon-free part.
alter table public.city_placement
  drop constraint city_placement_id_is_event_id_safe;

alter table public.city_placement
  add constraint city_placement_id_is_event_id_safe
  check (
    (
      kind in ('skill', 'town_hall')
      and placement_id <> ''
      and position(':' in placement_id) = 0
    )
    or
    (
      kind = 'civic'
      and placement_id ~ '^civic:[a-z0-9_]+:(0|[1-9][0-9]*)$'
    )
  );

-- A crisis may suspend a civic placement under the same structured id. Building and
-- ground repair subjects remain colon-free because each is one event-id part.
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
      subject_kind = 'civic'
      and subject ~ '^civic:[a-z0-9_]+:(0|[1-9][0-9]*)$'
    )
  );

comment on constraint city_placement_id_is_event_id_safe on public.city_placement is
  'Skill and Town Hall ids are one event-id part. Civic ids are validated as the '
  'structured parts civic:<catalogue-id>:<sequence>.';

comment on constraint city_crisis_damage_subject_is_event_id_safe
  on public.city_crisis_damage is
  'Building and ground subjects are one event-id part. Civic suspension subjects use '
  'the validated civic:<catalogue-id>:<sequence> placement identity.';