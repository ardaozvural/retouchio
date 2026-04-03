# Canonical Job Schema

## Purpose

The canonical job schema is the single source of behavioral truth for the active system.

It defines:

- prompt behavior
- entity intent
- reference routing inputs
- output profile selection

The runtime runner does not define behavior on its own. It executes the compiled result of the canonical job.

## Top-Level Structure

```json
{
  "version": "2",
  "jobId": "job_0001",
  "displayName": "retouchio-example-job",
  "inputSource": "batch_input",
  "entities": {}
}
```

## Top-Level Fields

| Field | Purpose |
| --- | --- |
| `version` | Schema version. Current canonical version is `2`. |
| `jobId` | Stable job identifier. |
| `displayName` | Human-readable runtime label. |
| `inputSource` | Input directory used by the runtime runner. |
| `entities` | Behavioral center of the job. |

## Entity List

The active canonical entity set is:

- `subject`
- `garment`
- `footwear`
- `headwear`
- `accessory`
- `scene`
- `output_profile`
- `global_negative_rules`

## Mode Semantics

`mode` always describes behavior.

Allowed active semantics:

| Entity | Allowed Modes |
| --- | --- |
| `subject` | `preserve`, `ignore` |
| `garment` | `preserve`, `restyle`, `ignore` |
| `footwear` | `preserve`, `replace`, `remove` (`ignore` tolerated for legacy jobs) |
| `headwear` | `preserve`, `add`, `replace`, `remove` (`ignore` tolerated for legacy jobs) |
| `accessory` | `apply`, `ignore` |
| `accessory.items[*]` | `preserve`, `add`, `replace`, `remove` (`ignore` tolerated for legacy jobs) |
| `scene` | `apply`, `preserve`, `ignore` |
| `output_profile` | `apply`, `ignore` |
| `global_negative_rules` | `apply`, `ignore` |

Mode rules:

- `mode` is behavior only.
- `variant` is subtype selection.
- `profile` is named profile selection.
- `asset_id` points to a reference asset.
- `source` records whether an entity/item should use a reference asset as visual authority or allow system selection.
- `placement` records worn/use-context intent that the compiler must preserve.
- `reference_id` points to an authority reference such as subject identity.
- `items` is used for multi-item groups such as accessories.

## Key Fields

| Field | Meaning |
| --- | --- |
| `mode` | Behavioral action for the entity. |
| `variant` | Entity subtype or product subtype. |
| `source` | Canonical intent for `reference` vs `system` authority selection. |
| `placement` | Canonical intent for worn/use placement context. |
| `asset_id` | Primary reference asset identifier. |
| `asset_ids` | Optional multi-asset compatibility field. |
| `reference_id` | Primary identity or authority reference identifier. |
| `reference_ids` | Optional multi-reference compatibility field. |
| `profile` | Named configuration profile. |
| `items` | Multi-item list, used primarily by `accessory`. |
| `detail_refs` | Optional garment fidelity references. |
| `slot_key` | Compatibility-only residue from the legacy slot system. Not primary architecture. |

## Canonical Example

```json
{
  "version": "2",
  "jobId": "job_0001",
  "displayName": "retouchio-bandana-footwear-job-0001",
  "inputSource": "batch_input",
  "entities": {
    "subject": {
      "mode": "preserve",
      "variant": "identity_reference",
      "reference_id": "subject_0001"
    },
    "garment": {
      "mode": "preserve",
      "variant": "source_garment",
      "detail_refs": {
        "material": [],
        "pattern": []
      }
    },
    "footwear": {
      "mode": "replace",
      "source": "reference",
      "placement": "on_feet",
      "variant": "sandal",
      "asset_id": "footwear_0001"
    },
    "headwear": {
      "mode": "add",
      "source": "reference",
      "placement": "on_head",
      "variant": "bandana",
      "asset_id": "headwear_bandana_0001"
    },
    "accessory": {
      "mode": "apply",
      "items": [
        {
          "family": "eyewear",
          "variant": "sunglasses",
          "mode": "add",
          "source": "reference",
          "placement": "on_eyes",
          "asset_id": "sunglasses_0001"
        },
        {
          "family": "bag",
          "variant": "hand_bag",
          "mode": "add",
          "source": "reference",
          "placement": "on_shoulder",
          "asset_id": "bag_0003"
        },
        {
          "family": "neckwear",
          "variant": "neck_scarf",
          "mode": "add",
          "source": "system",
          "placement": "auto",
          "asset_id": "neck_scarf_0001"
        }
      ]
    },
    "scene": {
      "mode": "apply",
      "profile": "studio_catalog"
    },
    "output_profile": {
      "mode": "apply",
      "profile": "catalog_4x5_2k"
    },
    "global_negative_rules": {
      "mode": "apply",
      "items": []
    }
  }
}
```

## Field Meanings

### `subject`

- Primary role: identity authority
- Typical shape:

```json
{
  "mode": "preserve",
  "reference_id": "subject_0001"
}
```

### `garment`

- Primary role: preserve garment authority from the target image
- Optional detail references reinforce fidelity only

```json
{
  "mode": "preserve",
  "detail_refs": {
    "material": ["material_detail_0001"],
    "pattern": ["pattern_detail_0001"]
  }
}
```

### `footwear`

- `preserve` means stay loyal to the footwear state already present in the target image
- `replace` means the uploaded footwear reference can become override authority when `source = reference`
- `remove` means explicitly remove footwear
- `source` is canonical authority intent: `reference` means the footwear ref is the visual authority only for explicit override modes; `system` means the compiler should not treat the asset as authority
- `placement` defaults to `on_feet`

```json
{
  "mode": "replace",
  "source": "reference",
  "placement": "on_feet",
  "variant": "sandal",
  "asset_id": "footwear_0001"
}
```

### `headwear`

- `preserve` means stay loyal to the original target-image headwear state
- `add` and `replace` are the only modes that can activate uploaded headwear reference authority
- `remove` explicitly removes headwear
- `source` persists whether the headwear ref should be treated as authority in an explicit override mode
- `placement` defaults to `auto` and may be promoted to explicit `on_head`

```json
{
  "mode": "add",
  "source": "reference",
  "placement": "on_head",
  "variant": "bandana",
  "asset_id": "headwear_bandana_0001"
}
```

### `accessory`

- Holds multi-item accessory intent
- Each item carries its own behavior
- `preserve` means stay loyal to the target-image state for that accessory family
- `add` and `replace` are the only modes that can activate uploaded accessory authority
- `remove` explicitly removes the accessory family item
- Each item may persist `source` and `placement` independently
- `reference` means visual authority plus use-context instructions
- `system` keeps authority open while still preserving placement intent when set

```json
{
  "mode": "apply",
  "items": [
    {
      "family": "eyewear",
      "variant": "sunglasses",
      "mode": "add",
      "source": "reference",
      "placement": "on_eyes",
      "asset_id": "sunglasses_0001"
    }
  ]
}
```

## Intent Defaults

- `footwear.source` defaults to `reference` when a footwear asset is active for a reference-using mode; otherwise `system`
- `footwear.placement` defaults to `on_feet`
- `headwear.source` defaults to `reference` when add/replace has an asset; otherwise `system`
- `headwear.placement` defaults to `auto`
- `accessory.items[*].source` defaults to `reference` when add/replace has an asset; otherwise `system`
- `accessory.items[*].placement` defaults to `auto`

## Intent Semantics

- `source = reference` means the compiler must treat the referenced asset as visual authority, include its resolved reference images, and pair that authority with the requested use context.
- `source = system` means the compiler should not overstate reference authority, even if compatibility data still contains an asset id.
- `preserve` means loyalty to the target image slot state, not uploaded reference authority.
- Uploaded slot authority only activates in explicit override modes such as `replace` or `add`.
- `placement` is canonical runtime intent, not a temporary UI draft field.
- Production Flow now persists these decisions into the canonical job instead of losing them between UI state and compiler state.
- `ignore` remains tolerated only for legacy compatibility and is no longer a user-facing styling mode in Production Flow.

### `scene`

- Applies scene behavior through a named profile

```json
{
  "mode": "apply",
  "profile": "studio_catalog"
}
```

### `output_profile`

- Selects image profile and output sizing behavior

```json
{
  "mode": "apply",
  "profile": "catalog_4x5_2k"
}
```

### `global_negative_rules`

- Carries reusable negative constraints

```json
{
  "mode": "apply",
  "items": [
    "Do not add unrelated props or extra people."
  ]
}
```
