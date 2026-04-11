# Compile Variant Matrix

## Scope

This matrix describes current compile and runtime behavior after the Phase 1 authority freeze.

## Entity Mode Matrix

| Entity | Mode | Prompt output | Ref upload behavior | Notes |
| --- | --- | --- | --- | --- |
| Subject | `preserve` | preserves target identity; active subject refs stay support-only | uploads only when `source=reference` and `reference_id` exists | coherent compile/runtime gate |
| Subject | `transfer_identity` | uses facial identity reference only when active subject authority exists | uploads only when `source=reference` and `reference_id` exists | invalid missing-ref cases now warn and fall back to preserve behavior in compiler output |
| Garment | `preserve` | garment lock plus selected refinement level | detail refs upload only when listed and garment is not `ignore` | active |
| Garment | `restyle` | normalized toward `preserve + repair` semantics | detail refs upload only when listed and garment is not `ignore` | compatibility wording remains |
| Garment | `ignore` | garment module omitted | material and pattern refs are skipped | direct listed refs no longer leak through ignore mode |
| Footwear | `preserve` | preserve original footwear | no reference upload | stale `asset_id` is stripped and warned |
| Footwear | `replace` + `source=reference` + `asset_id` | replacement can use locked reference authority | uploads footwear refs | active reference path |
| Footwear | `replace` + `source=system` | replacement stays system-driven | no reference upload | stale `asset_id` is stripped and warned |
| Footwear | `remove` | remove footwear only | no reference upload | active removal path |
| Footwear | `ignore` | no footwear section | no reference upload | compatibility mode |
| Headwear | `preserve` | preserve existing headwear state | no reference upload | stale `asset_id` is stripped and warned |
| Headwear | `add/replace` + `source=reference` + `asset_id` | headwear can use locked local design authority | uploads headwear refs | active reference path |
| Headwear | `add/replace` + `source=system` | add/replace stays system-driven | no reference upload | stale `asset_id` is stripped and warned |
| Headwear | `remove` | remove headwear only | no reference upload | active removal path |
| Headwear | `ignore` | no headwear section | no reference upload | compatibility mode |
| Accessory entity | `apply` | compiles active items only | item-level | active |
| Accessory entity | `ignore` | accessory module omitted | no accessory ref upload | item refs are suppressed |
| Accessory item | `preserve` | preserve existing family state | no reference upload | stale `asset_id` is stripped and warned |
| Accessory item | `add/replace` + `source=reference` + `asset_id` | item can use locked local design authority | uploads accessory refs | active reference path |
| Accessory item | `add/replace` + `source=system` | item stays system-driven | no reference upload | stale `asset_id` is stripped and warned |
| Accessory item | `remove` | remove item only | no reference upload | active removal path |
| Accessory item | `ignore` | item omitted | no reference upload | compatibility mode |

## Source Semantics Matrix

| Entity family | `source=system` effect | `source=reference` effect | Runtime truth |
| --- | --- | --- | --- |
| Subject | no replacement identity authority | subject ref can become support-only or transfer identity authority | resolver honors the same gate as compiler |
| Garment detail refs | not applicable | not applicable | direct listed refs upload only when garment is active |
| Footwear | reference fields are stripped from compiler authority and runtime upload | full reference authority is active only in `replace` mode with explicit `source=reference` and `asset_id` | missing `source` normalizes to `system`; resolver matches compiler |
| Headwear | reference fields are stripped from compiler authority and runtime upload | full reference authority is active only in `add/replace` with explicit `source=reference` and `asset_id` | missing `source` normalizes to `system`; resolver matches compiler |
| Accessory items | reference fields are stripped from compiler authority and runtime upload | full reference authority is active only in `add/replace` with explicit `source=reference` and `asset_id` | missing item `source` normalizes to `system`; resolver matches compiler |

## Variant Coverage Matrix

| Area | Variants advertised in code | Variants with discovered assets in this checkout | Notes |
| --- | --- | --- | --- |
| Subject | `identity_reference` | subject refs only, not variant-scoped | active |
| Garment | `source_garment` | target garment only | active |
| Footwear | `sandal`, `heel`, `loafer` | asset bank currently resolves `footwear_0001..0003`; registry variant list is `sandal` | compile vocabulary is broader than current discovered registry |
| Headwear | `bandana`, `hat`, `headband` | only `headwear_bandana_0001` discovered | variant support is broader than current asset bank |
| Accessory eyewear | `sunglasses` | none discovered | structurally supported, currently empty |
| Accessory bag | `hand_bag` | none discovered | structurally supported, currently empty |
| Accessory neckwear | `neck_scarf` | none discovered | structurally supported, currently empty |
| Output profile | `catalog_4x5_2k`, `catalog_square_2k` | both discovered | active |
| Scene profile | `studio_catalog` | active | compile-only |

## Slot Rule Coverage Matrix

| Slot rule key | Used by | Present in config | Current runtime meaning |
| --- | --- | --- | --- |
| `footwear` | footwear replace | yes | reference-specific slot rules only compile when footwear reference authority is active |
| `headwear_bandana` | headwear bandana | yes | reference-specific slot rules only compile when headwear reference authority is active |
| `headwear_hat` | headwear hat | yes | active config, no discovered hat asset |
| `headwear_headband` | headwear headband | no | variant exists, slot rule missing |
| `eyewear_sunglasses` | eyewear | yes | reference-specific slot rules only compile when accessory reference authority is active |
| `bag_hand_bag` | bag | yes | reference-specific slot rules only compile when accessory reference authority is active |
| `neck_scarf` | neckwear | yes | reference-specific slot rules only compile when accessory reference authority is active |

## Highest-Risk Matrix Insight

The previous non-subject authority mismatch has been removed by the shared authority gate.

Current remaining risk is stale payload quality:

- older jobs can still carry stale `asset_id` values
- older jobs missing explicit non-subject `source` now fall back to `system` and lose reference authority until resaved with explicit intent
- those fields are now stripped and warned instead of activating silent runtime uploads
