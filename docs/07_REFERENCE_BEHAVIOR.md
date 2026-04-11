# Reference Behavior

## Current Contract

Reference authority is now decided by one shared layer: `prompt_system/compiler/referenceAuthority.js`.

Both the compiler and the resolver use that same decision result.

That shared layer exports an inspectable authority block with:

- `active_entities`
- `active_reference_authorities`
- `stripped_reference_fields`
- `runtime_expected_uploads`
- `authority_warnings`

## Subject

Subject references are active only when:

- `entities.subject.source === "reference"`
- `entities.subject.reference_id` exists after normalization

When active:

- `preserve` mode treats subject refs as supporting consistency references
- `transfer_identity` treats the subject ref as facial identity authority
- resolver uploads the subject ref
- request assembly includes the subject ref

When inactive:

- compiler strips `reference_id` and `reference_ids` from the compiler-side job
- resolver uploads nothing
- request assembly includes nothing

If `transfer_identity` is requested without an active subject reference, the authority report emits a warning and the compiler falls back to preserve behavior.

## Garment Detail Refs

Garment detail refs are direct listed fidelity refs. They do not use a `source` field.

Material refs are active only when:

- `entities.garment.mode !== "ignore"`
- `entities.garment.detail_refs.material[]` contains ids

Pattern refs are active only when:

- `entities.garment.mode !== "ignore"`
- `entities.garment.detail_refs.pattern[]` contains ids

When garment mode is `ignore`, garment detail refs are stripped from compiler-side behavior and skipped by the resolver/runtime path.

## Footwear

Footwear reference authority is active only when all of these are true:

- `entities.footwear.mode === "replace"`
- `entities.footwear.source === "reference"`
- `entities.footwear.asset_id` exists after normalization

If `source` is missing, normalization now defaults footwear to `system`. `asset_id` alone does not upgrade footwear into reference authority.

When active:

- the compiler keeps footwear reference authority
- footwear slot reference-binding text can compile
- resolver uploads the footwear refs
- request assembly includes them

When inactive:

- stale `asset_id` and `asset_ids` are stripped from the compiler-side job
- resolver uploads nothing
- request assembly includes nothing
- the authority report emits a warning if stale asset fields remain

`source !== "reference"` is now a hard runtime gate for footwear refs.

## Headwear

Headwear reference authority is active only when all of these are true:

- `entities.headwear.mode` is `add` or `replace`
- `entities.headwear.source === "reference"`
- `entities.headwear.asset_id` exists after normalization

If `source` is missing, normalization now defaults headwear to `system`. `asset_id` alone does not upgrade headwear into reference authority.

Inactive headwear refs are stripped and skipped exactly the same way as footwear.

`source !== "reference"` is now a hard runtime gate for headwear refs.

## Accessory Items

Accessory item reference authority is active only when all of these are true:

- `entities.accessory.mode !== "ignore"`
- item `mode` is `add` or `replace`
- item `source === "reference"`
- item `asset_id` exists after normalization

If item `source` is missing, normalization now defaults that item to `system`. `asset_id` alone does not upgrade the item into reference authority.

Inactive item refs are stripped and skipped.

This applies equally to:

- eyewear
- bag
- neckwear
- any future accessory item that follows the same item contract

`source !== "reference"` is now a hard runtime gate for accessory refs.

## Compiler and Resolver Alignment

The old mismatch is gone.

Compiler and resolver now agree on all reference families covered by the active authority layer:

- subject
- garment material detail refs
- garment pattern detail refs
- footwear
- headwear
- accessory items

## Warning Behavior

Inactive reference fields are not silently treated as active.

Instead, the authority report emits warnings for cases such as:

- non-reference source with stale `asset_id`
- ignored garment detail refs under `garment.mode = "ignore"`
- `transfer_identity` without an active subject ref
- reference source declared without an actual `asset_id`

These warnings are advisory. They do not re-activate stripped refs.
