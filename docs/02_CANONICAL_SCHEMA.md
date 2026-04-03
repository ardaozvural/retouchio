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
| `footwear` | `replace`, `preserve`, `ignore` |
| `headwear` | `add`, `replace`, `remove`, `ignore` |
| `accessory` | `apply`, `ignore` |
| `accessory.items[*]` | `add`, `replace`, `remove`, `ignore` |
| `scene` | `apply`, `preserve`, `ignore` |
| `output_profile` | `apply`, `ignore` |
| `global_negative_rules` | `apply`, `ignore` |

Mode rules:

- `mode` is behavior only.
- `variant` is subtype selection.
- `profile` is named profile selection.
- `asset_id` points to a reference asset.
- `reference_id` points to an authority reference such as subject identity.
- `items` is used for multi-item groups such as accessories.

## Key Fields

| Field | Meaning |
| --- | --- |
| `mode` | Behavioral action for the entity. |
| `variant` | Entity subtype or product subtype. |
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
      "variant": "sandal",
      "asset_id": "footwear_0001"
    },
    "headwear": {
      "mode": "add",
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
          "asset_id": "sunglasses_0001"
        },
        {
          "family": "bag",
          "variant": "hand_bag",
          "mode": "add",
          "asset_id": "bag_0003"
        },
        {
          "family": "neckwear",
          "variant": "neck_scarf",
          "mode": "add",
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

- Used when footwear is replaced or explicitly preserved by asset authority

```json
{
  "mode": "replace",
  "variant": "sandal",
  "asset_id": "footwear_0001"
}
```

### `headwear`

- Used for add, replace, remove, or ignore behavior

```json
{
  "mode": "add",
  "variant": "bandana",
  "asset_id": "headwear_bandana_0001"
}
```

### `accessory`

- Holds multi-item accessory intent
- Each item carries its own behavior

```json
{
  "mode": "apply",
  "items": [
    {
      "family": "eyewear",
      "variant": "sunglasses",
      "mode": "add",
      "asset_id": "sunglasses_0001"
    }
  ]
}
```

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
