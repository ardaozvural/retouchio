# Production Flow Interaction to Compile Map

## Page Surfaces

Primary pages:

- `/job-builder` = Production Flow authoring surface
- `/asset-manager` = reference library and reference upload surface
- `/input-manager` = managed input set surface
- `/batch-jobs` = batch monitoring and review surface

## Primary Visible Production Flow Controls

These controls are visible in the active Job Builder shell and change canonical behavior.

| Visible control | Canonical target | Compile effect | Runtime effect | Status |
| --- | --- | --- | --- | --- |
| Target input set selector | `inputSource` | none directly | selects input directory used by dry-check and runtime | Compile-active |
| Model identity mode | `entities.subject.mode` | changes subject identity block and reference binding | changes whether subject ref can be required and resolved | Compile-active |
| Subject reference selection/upload | `entities.subject.reference_id`, `reference_ids`, `source` | changes subject authority wording | changes subject ref resolution | Compile-active |
| Face refinement | `entities.subject.face_refinement` | changes facial refinement rules | none | Compile-active |
| Pose refinement | `entities.subject.pose_refinement` | changes pose refinement rules | none | Compile-active |
| Product behavior buttons | `entities.garment.refinement_level` | changes garment cleanup intensity | none | Compile-active |
| Garment material refs | `entities.garment.detail_refs.material[]` | adds material authority lines | resolves garment material refs | Compile-active |
| Garment pattern refs | `entities.garment.detail_refs.pattern[]` | adds pattern authority lines | resolves garment pattern refs | Compile-active |
| Eyewear action | primary accessory item mode | adds preserve/add/replace/remove eyewear rules | resolves eyewear ref only when item mode is `add` or `replace`, item `source` is `reference`, and `asset_id` exists | Compile-active |
| Eyewear source | primary accessory item source | affects reference authority activation | gates resolver upload together with item mode and `asset_id` | Compile-active |
| Eyewear placement | primary accessory item placement | changes placement wording | none | Compile-active |
| Eyewear asset | primary accessory item `asset_id` | only participates in slot reference binding when the shared authority gate is active | does nothing by itself; stale `asset_id` values are stripped and warned | Compile-active |
| Bag action | primary accessory item mode | adds preserve/add/replace/remove bag rules | resolves bag ref only when item mode is `add` or `replace`, item `source` is `reference`, and `asset_id` exists | Compile-active |
| Bag source | primary accessory item source | affects reference authority activation | gates resolver upload together with item mode and `asset_id` | Compile-active |
| Bag placement | primary accessory item placement | changes placement wording | none | Compile-active |
| Bag asset | primary accessory item `asset_id` | only participates in slot reference binding when the shared authority gate is active | does nothing by itself; stale `asset_id` values are stripped and warned | Compile-active |
| Headwear mode | `entities.headwear.mode` | changes headwear rules | must be `add` or `replace` for reference upload | Compile-active |
| Headwear source | `entities.headwear.source` | affects intent/reference binding sections | must be `reference` for headwear ref upload | Compile-active |
| Headwear placement | `entities.headwear.placement` | changes placement wording | none | Compile-active |
| Headwear variant | `entities.headwear.variant` | selects headwear slot/fallback behavior | none | Compile-active |
| Headwear asset | `entities.headwear.asset_id` | only participates in slot reference binding when the shared authority gate is active | does nothing by itself; stale `asset_id` values are stripped and warned | Compile-active |
| Footwear mode | `entities.footwear.mode` | changes footwear rules | must be `replace` for reference upload | Compile-active |
| Footwear source | `entities.footwear.source` | affects intent/reference binding sections | must be `reference` for footwear ref upload | Compile-active |
| Footwear variant | `entities.footwear.variant` | selects footwear slot/fallback behavior | none | Compile-active |
| Footwear asset | `entities.footwear.asset_id` | only participates in slot reference binding when the shared authority gate is active | does nothing by itself; stale `asset_id` values are stripped and warned | Compile-active |
| Derle | compile API call | produces prompt and canonical preview | none | Action |
| Kontrol | dry-check API call | none | validates refs and input source | Action |
| Toplu Çalıştır | run-batch API call | none | spawns `edit.js` | Action |
| İptal Et | batch cancel API call | none | cancels active remote batch | Action |

## Advanced Visible Controls

These controls are now visible in the `Gelişmiş` card. They remain compile-active or operational, but they are no longer hidden.

| Advanced control or section | Canonical target | Current role |
| --- | --- | --- |
| `jobId`, `displayName` | top-level canonical metadata | saved job name, batch naming, manifest traceability |
| `sceneMode`, `sceneProfile` | `entities.scene.*` | compile-active scene configuration |
| `outputProfileMode`, `outputProfileProfile` | `entities.output_profile.*` | compile-active output profile and image config selection |
| `globalNegativeMode`, `globalNegativeItems` | `entities.global_negative_rules.*` | compile-active negative rules |
| `addAccessoryButton` and extra `accessoryItems` rows | `entities.accessory.items[]` | compile-active extra accessories, including neckwear |
| `saveJobButton`, `loadSavedJobButton`, `savedJobSelect` | job persistence only | operational save/load tooling |
| `loadSampleButton`, `sampleJobSelect`, `resetDefaultButton` | job replacement only | operational drafting tools |
| `openCanonicalInspectButton`, `openPromptInspectButton` | no canonical mutation | open compile inspect tabs intentionally |
| `copyJsonButton`, `downloadJsonButton`, `copyPromptButton` | no canonical mutation | export helpers for real compile outputs |

## Removed From Direct Authoring

These raw fields still exist in normalization or internal mirror logic, but they are not part of the supported authoring surface.

| Raw field | Current behavior |
| --- | --- |
| `entities.garment.mode` | not directly authored; Job Builder always writes `preserve` and exposes `refinement_level` instead |
| `entities.accessory.mode` | not directly authored; Job Builder always writes `apply` and exposes item-level accessory rows instead |
| hidden backing selects for subject and primary styling slots | still used as internal mirrors, but visible shell controls are the supported authoring path |

## UI-Only State

These visible or hidden states do not change canonical compile/runtime behavior.

| UI state | Proof | Status |
| --- | --- | --- |
| `workflowType` | derived by `deriveWorkflowType()` or manually toggled; not persisted into job | UI-only |
| `face_identity` and `advanced` workflow views | visibility presets only | UI-only |
| review strip sentence and review cards | rendered summaries only | UI-only |
| compile inspect open state and active tab | panel state only | UI-only |
| hero preview compare mode | preview-only | UI-only |
| `approvedVariationKey` | rendered badge state only; no setter-backed approval workflow | UI-only residue |
| `approveOutputButton` | calls `handlePrimaryResultAction()` which refreshes state or opens preview | not a real approval action |
| `regenerateOutputButton` | always hidden and disabled in current render path | not implemented |

## Cross-Page Handoff Mapping

Asset Manager handoff:

- storage key: `retouchio.asset_binding.v1`
- written by `/asset-manager`
- consumed by `/job-builder`

Effect:

- footwear binding forces footwear into `replace + source=reference + asset_id`
- headwear binding forces headwear into `add + source=reference + asset_id`
- eyewear, bag, and neckwear bindings either update an existing item or append a new item with `mode=add`, `source=reference`, and `asset_id`

Input Manager handoff:

- storage key: `retouchio.input_set_binding.v1`
- written by `/input-manager`
- consumed by `/job-builder`

Effect:

- updates `job.inputSource` to `inputs/sets/<inputSetId>`

Inline subject upload:

- Job Builder uses `/api/subjects/upload`
- returned `reference_id` is inserted into subject selection

Inline reference upload:

- Job Builder uses `/api/assets/upload`
- uploaded asset is immediately bound into canonical job state

Inline input upload:

- Job Builder uses `/api/inputs/upload`
- new input set is immediately selected as `inputSource`

## Batch Jobs Surface Mapping

`/batch-jobs` is a separate page, not a hash section inside Job Builder.

Its active behavior:

- list known batches from the server registry
- refresh one or all batch statuses
- cancel pending/running batches
- download completed outputs
- open output review modal
- compare output to input when pairing data exists

Its review tagging is local-only:

- storage key: `retouchio.batch_review_tags.v1`
- persistence: browser `localStorage`
- server: no review-tag API exists

## Important UI Truths

- The visible Production Flow shell now has an explicit split between primary authoring and advanced authoring.
- Supported compile-active controls are no longer hidden; they are either primary-visible or advanced-visible.
- Neckwear remains compile-active through accessory rows even though it is not a first-class visible styling card.
- The compile inspect panel is the supported prompt/JSON preview surface.
- The UI usually clears `asset_id` when reference authority is turned off. If stale asset fields survive, the shared authority layer now strips and warns instead of uploading them.
