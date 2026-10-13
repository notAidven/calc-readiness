# Offline-authored content

Runtime generation is out of scope. Validated, versioned content lands here
before it is published to the item-bank bucket.

- `items/d1/`: authoring guide for the D1 item packs. The authored packs
  currently live as typed, validated modules in `packages/item-bank/src/d1/`
  (a single source that feeds both the diagnostic bank and the answer checker);
  the `@cr/item-bank` harness validates them.
- `lessons/d1/`: one content pack per node (`NUM.S` ... `NUM.5`), consumed by
  `apps/web`.

Do not add an answer category until the browser/server checker spike has cleared
it. Practice items and pre/post items must use separate immutable IDs.
