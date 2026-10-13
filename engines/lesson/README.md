# @cr/lesson  (Anthony's lane)

Lesson engine: mini-lesson, check-for-understanding, 5-item practice set, scaffolded hints, reveal. Submits evidence to @cr/mastery-service (never writes mastery directly). Lesson content packs live here (one lesson shell = one reusable engine + node-specific content; 3 D1 MVP shells, provisional pending instructional-design review).

**Error typing: deferred post-MVP (2026-07-20).** The whole capability — resolving wrong answers to a node misconception, targeted feedback, and routing/re-weighting — is out of MVP scope (granular lessons + adaptive-diagnostic descent already localize failures). No MVP requirement to build against a misconception vocabulary or tag items. Error tags would never affect mastery regardless. The optional `misconception_tag` log field stays defined so this needs no schema change later. See docs/Error_Typing_Spec.md.

Stay in this dir + lesson content files. Build against frozen shared interfaces.
