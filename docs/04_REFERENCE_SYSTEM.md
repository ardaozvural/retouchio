# Reference System

## Source of Truth

The active reference contract is split across:

- `prompt_system/registry/assetBankStandard.v1.json`
- `prompt_system/compiler/assetBank.js`
- `prompt_system/compiler/resolveRefs.js`
- `prompt_system/compiler/optionRegistry.js`
- upload endpoints in `job_builder_server.js`

The asset bank standard defines naming rules and candidate directories.

## Reference Families

| Family | Schema location | Naming pattern | Active read directories | Current discovered assets |
| --- | --- | --- | --- | --- |
| Subject | `entities.subject.reference_id` | `^subject_[0-9]{4}$` | `refs/subjects` | `subject_0002` to `subject_0005` |
| Garment material detail | `entities.garment.detail_refs.material[]` | `^material_detail_[0-9]{4}$` | `refs/garment_details/material` | none |
| Garment pattern detail | `entities.garment.detail_refs.pattern[]` | `^pattern_detail_[0-9]{4}$` | `refs/garment_details/pattern` | `pattern_detail_0001` |
| Footwear | `entities.footwear.asset_id` | `^footwear_[0-9]{4}$` | `refs/accessories/footwear` | `footwear_0001` to `footwear_0003` |
| Headwear | `entities.headwear.asset_id` | `^headwear_(bandana|hat|headband)_[0-9]{4}$` | `refs/accessories/headwear`, `refs/accessories/hat` | `headwear_bandana_0001` |
| Eyewear | `entities.accessory.items[].asset_id` | `^sunglasses_[0-9]{4}$` | `refs/accessories/eyewear` | none |
| Bag | `entities.accessory.items[].asset_id` | `^bag_[0-9]{4}$` | `refs/accessories/bag` | none |
| Neckwear | `entities.accessory.items[].asset_id` | `^neck_scarf_[0-9]{4}$` | `refs/accessories/neckwear`, `refs/accessories/scarf` | none |

## Directory Strategy

Resolver behavior is directory-first.

For each candidate base directory:

1. check `<baseDir>/<assetId>/` and load all image files inside it
2. if that does not exist, check for a flat file in `<baseDir>` whose basename matches `assetId`

The active upload paths always write directory-style assets, not flat files.

## Upload Paths

Subject upload:

- `refs/subjects/<reference_id>/ref_01.<ext>`

Asset upload:

- footwear: `refs/accessories/footwear/<asset_id>/ref_01.<ext>`
- headwear: `refs/accessories/headwear/<asset_id>/ref_01.<ext>`
- eyewear: `refs/accessories/eyewear/<asset_id>/ref_01.<ext>`
- bag: `refs/accessories/bag/<asset_id>/ref_01.<ext>`
- neckwear: `refs/accessories/neckwear/<asset_id>/ref_01.<ext>`
- garment material: `refs/garment_details/material/<asset_id>/ref_01.<ext>`
- garment pattern: `refs/garment_details/pattern/<asset_id>/ref_01.<ext>`

## Discovery Model

`buildOptionRegistry()` starts from `prompt_system/registry/frozenOptions.v1.json` and then overwrites asset lists with live filesystem discovery.

The live discovery result is what matters at runtime.

This means:

- frozen registry content is seed data
- runtime discovery is authoritative for what is actually resolvable in the checkout
- docs or sample JSON that mention missing asset ids are stale, even if those ids still appear in the frozen registry

## Compatibility-Only Paths

The asset bank standard still includes older read locations:

- `refs/accessories/hat`
- `refs/accessories/scarf`

These are read-path compatibility only.

The active upload routes write to:

- `refs/accessories/headwear`
- `refs/accessories/neckwear`

## Noise Filtering

Resolver and discovery code ignore:

- files starting with `._`
- `.DS_Store`-style noise because only image extensions are collected

## Current Population Truth

The standard expects 10 top-level asset-bank directories.

This checkout currently has all 10 expected directories present.

Population is uneven:

- subject references are populated
- footwear is populated
- bandana headwear is populated
- garment pattern has one populated asset
- garment material is empty
- eyewear, bag, and neckwear families are structurally supported but empty

## Validation Relationship

Validation checks two separate things:

1. naming compliance against the standard regex
2. resolvability in the actual candidate directories

That distinction matters because a correctly named id can still be unresolved if the asset bank is empty.

