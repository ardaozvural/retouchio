# Canonical Schema

## Canonical Center

The active behavioral schema is canonical job `version: "2"`.

Normalization always returns this shape:

```json
{
  "version": "2",
  "jobId": "string",
  "displayName": "string",
  "inputSource": "batch_input or inputs/sets/<id>",
  "entities": {
    "subject": {},
    "garment": {},
    "footwear": {},
    "headwear": {},
    "accessory": {},
    "scene": {},
    "output_profile": {},
    "global_negative_rules": {}
  },
  "meta": {
    "source_format": "mixed or legacy_slots",
    "legacy_active_slots": []
  }
}
```

Top-level frozen fields are defined in `prompt_system/compiler/schemaConstants.js`.

Allowed top-level fields:

- `version`
- `jobId`
- `displayName`
- `inputSource`
- `entities`
- `meta`

Anything else is warning-only compatibility residue.

## Active Entities

| Entity | Supported modes | Compile-active fields | Runtime-active fields | Notes |
| --- | --- | --- | --- | --- |
| `subject` | `preserve`, `transfer_identity` | `mode`, `source`, `reference_id`, `face_refinement`, `pose_refinement` | `reference_id` only resolves when `source === "reference"` | Subject is the only entity where compiler and resolver both gate on `source`. |
| `garment` | `preserve`, `restyle`, `ignore` | `mode`, `refinement_level`, `detail_refs.material`, `detail_refs.pattern` | `detail_refs.*` always resolve if present | Visible UI uses `refinement_level`; normalized output usually keeps `mode: "preserve"` unless explicitly ignored. |
| `footwear` | `preserve`, `replace`, `remove`, `ignore` | `mode`, `source`, `placement`, `variant`, `asset_id` | `asset_id` resolves whenever `mode !== "ignore"` and `asset_id` exists | Resolver does not check `source`. |
| `headwear` | `preserve`, `add`, `replace`, `remove`, `ignore` | `mode`, `source`, `placement`, `variant`, `asset_id` | `asset_id` resolves whenever mode is not `ignore` or `remove` and `asset_id` exists | Resolver does not check `source`. |
| `accessory` | `apply`, `ignore` | `mode`, `items[]` | `items[]` | Item-level behavior matters more than entity-level mode. |
| `scene` | `apply`, `preserve`, `ignore` | `mode`, `profile`, `rules` | none | Compile-only scene instructions. |
| `output_profile` | `apply`, `ignore` | `mode`, `profile` | `profile` also selects `imageConfig` | Runtime uses `imageConfig` from the compiled result. |
| `global_negative_rules` | `apply`, `ignore` | `mode`, `items[]` | none | Compile-only negative rule append. |

Accessory item modes:

- `preserve`
- `add`
- `replace`
- `remove`
- `ignore`

## Subject Semantics

Canonical subject defaults:

```json
{
  "mode": "preserve",
  "source": "system",
  "variant": "identity_reference",
  "reference_id": null,
  "reference_ids": [],
  "face_refinement": "preserve",
  "pose_refinement": "preserve"
}
```

Behavior:

- `transfer_identity` forces `source` to `reference`.
- `reference_id` is required when `mode` is `transfer_identity`.
- `source: reference` without `reference_id` is invalid.
- In `preserve` mode, subject refs are support-only according to the prompt.

Supported refinement levels:

- `preserve`
- `light`
- `pro`

## Garment Semantics

Canonical garment defaults:

```json
{
  "mode": "preserve",
  "refinement_level": "preserve",
  "variant": "source_garment",
  "detail_refs": {
    "material": [],
    "pattern": []
  }
}
```

Important code truth:

- `normalizeSemanticModes()` converts legacy `clean` into `mode: "preserve"` plus `refinement_level: "minimal"`.
- It converts legacy `restyle` into `mode: "preserve"` plus `refinement_level: "repair"` unless already specified.
- The visible Job Builder product control is effectively an intent switch for `refinement_level`, not a real redesign mode.

Current garment behavior is therefore:

- `ignore`: no garment module output
- `preserve + preserve`: lock garment with no extra cleanup authority
- `preserve + minimal`: light product-safe cleanup
- `preserve + repair`: stronger product-faithful correction

## Footwear Semantics

Canonical footwear defaults:

```json
{
  "mode": "ignore",
  "variant": null,
  "source": "system",
  "placement": "on_feet",
  "asset_id": null,
  "asset_ids": [],
  "slot_key": null
}
```

Validation rules:

- `replace` requires `asset_id` or `variant`
- `remove` must not carry `asset_id`
- `preserve` with `asset_id` is warning-only, not hard error

Compile truth:

- `replace` can emit slot-rule reference language if `asset_id` exists
- `preserve` and `remove` do not use reference slot rules

Runtime truth:

- any non-ignored footwear entity with `asset_id` triggers reference resolution, even if `source` is `system`

## Headwear Semantics

Canonical headwear defaults:

```json
{
  "mode": "ignore",
  "variant": null,
  "source": "system",
  "placement": "auto",
  "asset_id": null,
  "asset_ids": [],
  "slot_key": null
}
```

Validation rules:

- `add` and `replace` warn if both `asset_id` and `variant` are empty
- `remove` must not carry `asset_id`
- `preserve` with `asset_id` is warning-only

Runtime truth:

- any headwear entity with mode not `ignore` or `remove` and with `asset_id` will resolve reference files, regardless of `source`

## Accessory Semantics

Canonical accessory defaults:

```json
{
  "mode": "apply",
  "items": []
}
```

Each item is family-scoped.

Current families from the active registry model:

- `eyewear`
- `bag`
- `neckwear`

Current variants from registry:

- eyewear: `sunglasses`
- bag: `hand_bag`
- neckwear: `neck_scarf`

Runtime truth:

- item refs resolve whenever item `mode` is not `ignore` or `remove` and `asset_id` exists
- resolver does not check `source`

## Scene, Output Profile, and Global Negative Rules

Scene:

- Active profile discovered in code: `studio_catalog`
- `apply` emits studio background rules
- `preserve` keeps original scene family

Output profile:

- Active discovered profiles in this checkout: `catalog_4x5_2k`, `catalog_square_2k`
- Compile output selects `imageConfig`
- Runtime falls back to `4:5` and `2K` if `imageConfig` is absent

Global negative rules:

- built-in fail rules always compile when mode is `apply`
- custom `items[]` are appended verbatim

## Compile-Active Stable Field Names

`schemaConstants.js` defines these as stable field names:

- `version`
- `jobId`
- `displayName`
- `inputSource`
- `entities`
- `mode`
- `variant`
- `source`
- `placement`
- `asset_id`
- `reference_id`
- `reference_ids`
- `profile`
- `items`
- `detail_refs`
- `refinement_level`
- `face_refinement`
- `pose_refinement`

## Compatibility Residue Still Accepted by Normalization

These are not the canonical center, but the code still reads them.

| Field or pattern | Where it appears | Current role |
| --- | --- | --- |
| `subjectReference` | top level | mapped into `entities.subject.reference_id` |
| `outputProfile` | top level | mapped into `entities.output_profile.profile` |
| `activeSlots` | top level | legacy slot activation |
| `selectedAccessoryAssetIds` | top level | legacy slot asset binding |
| `reference` | legacy entity field | mapped to `asset_id` or `reference_id` in some entity branches |
| `slot_key` | footwear/headwear/accessory item | compatibility-only naming hook for slot rules |
| `asset_ids`, `reference_ids` | canonical/legacy mixed | arrays collapsed to primary `asset_id` or `reference_id` |
| `validator` | top level legacy job field | ignored by active Node runtime |

Important limit:

Compatibility support is not full production support. Validation still runs on the submitted job shape before normalization side effects become visible in runtime behavior.

## Validation Truth

`validateCanonicalJob()` checks the submitted job against:

- frozen schema version and entity modes
- discovered runtime registry
- asset bank naming standard
- asset existence in candidate directories

It returns:

- `errors`
- `warnings`
- `futureHooks`

`futureHooks` are placeholders only. They do not perform real drift detection or shape validation yet.

## Current Runtime Discovery Snapshot

This checkout currently resolves the following active options through `buildOptionRegistry()`:

- subject references: `subject_0002`, `subject_0003`, `subject_0004`, `subject_0005`
- garment material refs: none discovered
- garment pattern refs: `pattern_detail_0001`
- footwear assets: `footwear_0001`, `footwear_0002`, `footwear_0003`
- headwear assets: `headwear_bandana_0001`
- accessory assets: none discovered for eyewear, bag, or neckwear
- output profiles: `catalog_4x5_2k`, `catalog_square_2k`

This means the canonical schema supports more combinations than the current asset bank can actually satisfy.

