# Compile Variant Matrix

This document extracts the current compile behavior directly from the live compiler path:

- `prompt_system/compiler/buildPrompt.js`
- `prompt_system/compiler/resolveEntity.js`
- `prompt_system/modules/subject.js`
- `prompt_system/modules/garment.js`
- `prompt_system/modules/footwear.js`
- `prompt_system/modules/headwear.js`
- `prompt_system/modules/accessory.js`
- `config/slot_rules.json`
- `config/core_rules.json`

## Compiler Flow

`buildPrompt()` currently does this:

1. `normalizeJob()` converts mixed or legacy input into the normalized compiler job.
2. `buildCompilerIntentJob()` strips inactive reference authority from:
   - `subject.reference_id/reference_ids`
   - `footwear.asset_id/asset_ids`
   - `headwear.asset_id/asset_ids`
   - `accessory.items[*].asset_id/asset_ids`
3. Modules compile in this order:
   - `core`
   - `subject`
   - `garment`
   - `footwear`
   - `headwear`
   - `accessory`
   - `scene`
   - `output_profile`
   - `global_negative_rules`
4. After module compilation, `buildPrompt()` appends:
   - `Intent Binding` built from the normalized canonical job
   - `Reference Binding` built from the stripped compiler-intent job

Important consequence:

- Mode activation and reference authority are not the same thing.
- A mode like `replace` or `add` can still compile as active even if reference authority was stripped.
- Stripping mostly removes `reference_id` / `asset_id`, not the mode itself.

## Subject Matrix

Reference authority is considered active only when all of these are true:

- `mode !== "ignore"`
- `source === "reference"`
- `reference_id` is truthy

| Normalized state entering `buildPrompt()` | Module branch in `subject.compile()` | Prompt result from module | Extra `buildPrompt()` sections |
| --- | --- | --- | --- |
| `mode=ignore` | early return | no Subject section | no subject line in `Intent Binding`; no subject line in `Reference Binding` |
| `mode=preserve`, no active reference authority | preserve fallback branch | `Subject Lock Rules` uses `context.coreRules.subjectLockRules` plus extra preserve lines; `Subject Anatomy Rules`; `Subject Reference Rules` fallback says use target image as fallback identity authority | no subject line in `Intent Binding`; `Reference Binding` does not add subject authority |
| `mode=preserve`, `source=reference`, `reference_id` present | `usesReferenceIdentity=true` branch | `Subject Lock Rules` switches to "active model source" wording; `Subject Anatomy Rules`; `Subject Reference Rules` uses `context.coreRules.subjectReferenceRules` | `Intent Binding`: referenced model is active identity source; `Reference Binding`: subject refs are identity authority |
| `mode=replace`, `reference_id` present | replace branch | strong identity replacement wording in `Subject Lock Rules`; `Subject Anatomy Rules`; `Subject Reference Rules` uses strict identity-lock rules from `core_rules.json` | `Intent Binding`: actively replace target identity toward referenced model; `Reference Binding`: subject refs are identity replacement authority |
| `mode=replace`, no `reference_id` after normalization | replace branch with no active ref | still emits strong replacement wording in `Subject Lock Rules`; fallback `Subject Reference Rules` says identity replacement cannot be completed from a reference source | no subject line in `Intent Binding`; no subject line in `Reference Binding` |

Notes:

- `normalizeSubjectSource()` forces `mode=replace` to `source=reference`.
- If `mode=ignore` and a reference exists, normalization flips the subject back to `preserve`.
- `buildCompilerIntentJob()` strips subject ref fields when active reference authority is not actually present.

## Garment Matrix

Garment does not use the same reference stripping pass as subject/footwear/headwear/accessory. Its compile behavior is additive inside one `Garment Rules` section.

Raw mode normalization:

- raw `mode=clean` -> normalized to `mode=preserve`, `refinement_level=minimal`
- raw `mode=restyle` -> normalized to `mode=preserve`, `refinement_level=repair`

| Normalized garment condition | Module branch in `garment.compile()` | Prompt result from module | Extra `buildPrompt()` sections |
| --- | --- | --- | --- |
| `mode=ignore` | early return | no Garment section | no garment refinement line in `Intent Binding`; `Reference Binding` still keeps its base "Target image = garment, pose class, and framing authority." line |
| `mode=preserve`, `refinement_level=preserve` | base garment branch | base garment authority lines only; no extra cleanup intensity lines | no garment-specific `Intent Binding` addition |
| `mode=preserve`, `refinement_level=minimal` | base branch + minimal refinement branch | adds minimal cleanup limits: gentle lint cleanup, minor edge tidy-up, subtle fold cleanup, restrained catalog polish | `Intent Binding`: minimal product-safe cleanup while garment remains authority |
| `mode=preserve`, `refinement_level=repair` | base branch + repair refinement branch | adds stronger professional correction language, but still no redesign/restyling | `Intent Binding`: stronger product-faithful correction while garment remains authority |
| `detail_refs.material` non-empty | material fidelity branch | adds material-reference authority for fabric, surface texture, stitching, trim, sheen, thickness, light response | `Reference Binding`: garment material refs become texture/surface/stitching authority |
| `detail_refs.pattern` non-empty | pattern fidelity branch | adds pattern/detail authority for pattern, print, logo, writing, geometry, scale, placement | `Reference Binding`: garment pattern refs become print/geometry/placement authority |
| `rule_groups` or `sections.rules` arrays present | append-only branch | raw strings are appended directly into `Garment Rules` | no special extra section; they stay inside module output |

Notes:

- Material and pattern branches stack with refinement branches.
- If no material refs exist, garment falls back to "do not smooth away texture/stitching/fabric structure."
- If no pattern refs exist, garment falls back to preserving existing pattern/print/logo crispness and placement.

## Footwear Matrix

Reference authority is considered active only when all of these are true:

- `mode === "replace"`
- `source === "reference"`
- `asset_id` is truthy

Current listed variants (`sandal`, `heel`, `loafer`) all map to the `footwear` slot in `config/slot_rules.json`.

| Normalized footwear condition | Module branch in `footwear.compile()` | Prompt result from module | Extra `buildPrompt()` sections |
| --- | --- | --- | --- |
| `mode=ignore` | early return | no Footwear section | no footwear additions |
| `mode=preserve` | preserve branch | preserve original footwear unchanged; no replacement/removal/restyling; preserve silhouette, finish, color family, wear condition, foot integration | no footwear-specific `Intent Binding`; no footwear authority line in `Reference Binding` |
| `mode=replace`, `source=reference`, `asset_id` retained | replace branch with active ref authority | replace original footwear; include slot `referenceBindingText`; include slot rules for exact product lock; add non-remove integration lines | `Intent Binding`: referenced footwear is visual authority + on-feet placement line; `Reference Binding`: footwear refs are locked design authority |
| `mode=replace`, `source=system` or no `asset_id` after stripping | replace branch without active ref authority | replace original footwear still stays active; slot rules still apply because slot config exists; only `referenceBindingText` is skipped | `Intent Binding`: still adds placement line, but not the "referenced footwear is visual authority" line; `Reference Binding`: no footwear authority line |
| `mode=replace`, no slot mapping and no variant | generic replace fallback | replace original footwear with tightly controlled footwear result; generic lock wording instead of slot rules | same as above; only reference-authority extras appear if active ref survived stripping |
| `mode=remove` | remove branch | remove footwear completely; no substitute items; preserve anatomy and grounding; extra remove-only cleanup lines | no footwear-specific `Intent Binding`; no footwear authority line in `Reference Binding` |

Notes:

- `buildCompilerIntentJob()` strips inactive `asset_id`, but it does not deactivate `mode=replace`.
- Because slot rules are not gated by `asset_id`, replace mode can still emit strong replacement/product-lock wording even when explicit reference authority is absent.

## Headwear Matrix

Reference authority is considered active only when all of these are true:

- `mode === "add"` or `mode === "replace"`
- `source === "reference"`
- `asset_id` is truthy

Current slot mapping:

- `bandana` -> `headwear_bandana`
- `hat` -> `headwear_hat`
- `headband` -> no slot rule file entry, so generic variant lines are used

| Normalized headwear condition | Module branch in `headwear.compile()` | Prompt result from module | Extra `buildPrompt()` sections |
| --- | --- | --- | --- |
| `mode=ignore` | early return | no Headwear section | no headwear additions |
| `mode=preserve` | preserve branch | preserve original headwear state; do not add headwear if none exists; uploaded refs cannot override while preserving | no headwear-specific `Intent Binding`; no headwear authority line in `Reference Binding` |
| `mode=remove` | remove branch | remove existing headwear cleanly; do not replace it; preserve hairline/scalp coverage logic/local realism | no headwear-specific `Intent Binding`; no headwear authority line in `Reference Binding` |
| `mode=add`, slot-mapped variant (`bandana` or `hat`), active ref retained | add branch + slot branch | add requested headwear; include slot `referenceBindingText`; include slot rules; append local-only, identity-protection, hair interaction, no-face-occlusion lines | `Intent Binding`: referenced headwear is visual authority; placement line appears if placement resolves to `on_head`; `Reference Binding`: headwear refs are locked design authority |
| `mode=replace`, slot-mapped variant (`bandana` or `hat`), active ref retained | replace branch + slot branch | replace existing headwear, or add it if absent; include slot `referenceBindingText`; include slot rules; append local-only and identity-protection lines | same authority additions as above |
| `mode=add` or `mode=replace`, slot-mapped variant but no active ref retained | add/replace branch + slot branch without ref text | add/replace still stays active; slot rules still apply; only `referenceBindingText` is skipped | `Intent Binding`: may still add placement line, but not "referenced headwear is visual authority"; `Reference Binding`: no headwear authority line |
| `mode=add` or `mode=replace`, unmapped variant such as `headband` | add/replace branch + generic variant branch | add/replace header lines plus generic variant lines from `GENERIC_VARIANT_LINES` | authority extras appear only if active ref survives stripping |

Notes:

- As with footwear, stripping removes `asset_id`, not mode activation.
- Slot rules for `bandana` and `hat` are stronger and more specific than the generic `headband` fallback.

## Accessory Matrix

Entity-level behavior:

- `accessory.mode=ignore` returns no sections at all.
- `accessory.mode=apply` means "compile the item list"; actual behavior is controlled by each `items[*].mode`.

Reference authority is considered active per item only when all of these are true:

- `item.mode === "add"` or `item.mode === "replace"`
- `item.source === "reference"`
- `item.asset_id` is truthy

Current slot-rule coverage now includes:

- `eyewear_sunglasses`
- `bag_hand_bag`
- `neck_scarf`

| Accessory item condition | Module branch in `accessory.compile()` | Prompt result from module | Extra `buildPrompt()` sections |
| --- | --- | --- | --- |
| entity `mode=ignore` | early return | no Accessory sections | no accessory additions |
| item `mode=ignore` | item skipped | no section for that item | no item-level additions |
| item `mode=preserve` | preserve branch | preserve original family state; if target has none, do not add one; uploaded refs cannot override while preserving; always ends with scope line | no accessory-specific `Intent Binding`; no accessory authority line unless another item has active ref authority |
| item `mode=add`, active ref retained | add branch | add requested accessory; if slot rule exists and `asset_id` remains, include slot `referenceBindingText`; then slot rules or generic family/variant lines; always ends with scope line | `Intent Binding`: referenced item is visual authority + placement line when family/placement has one; `Reference Binding`: shared accessory authority line appears if any item retains ref authority |
| item `mode=replace`, active ref retained | replace branch | replace existing family item or add if absent; include slot `referenceBindingText` if slot+asset present; then slot rules or generic family/variant lines; always ends with scope line | same as above |
| item `mode=add` or `replace`, no active ref retained | add/replace branch without active ref text | add/replace still stays active; `referenceBindingText` drops out; slot rules still apply if slot exists; otherwise generic eyewear/bag/neckwear/family fallback lines are used | placement line may still appear in `Intent Binding`; no accessory authority line in `Reference Binding` unless another item has active ref authority |
| item `mode=remove` | remove branch | remove family item; do not replace it; adds extra clean-removal line; always ends with scope line | no accessory-specific `Intent Binding`; no item-specific authority line in `Reference Binding` |

Notes:

- Each accessory item becomes its own prompt section.
- Every item section ends with the same scope guard: it must affect only its own item and must not redesign garment, pose class, or subject identity.
- `sunglasses`, `hand_bag`, and `neck_scarf` can use slot-rule strictness.
- Remaining accessory cases still fall back to generic family or variant wording when no slot rule is mapped.

## Observations

### Repetition and redundancy

- The system intentionally repeats authority language in multiple layers:
  - entity module output
  - `Intent Binding`
  - `Reference Binding`
- The strongest repetition appears in footwear and slot-mapped headwear:
  - module says replace or lock the product
  - slot rules say strict visual lock / no drift
  - `Reference Binding` adds another locked-authority summary line

### Authority wording strength

- Strongest product-lock wording: footwear slot rules.
  - "strict visual lock"
  - "exact product identity"
  - "no reinterpretation, no drift, and no substitution"
- Very strong identity wording: subject replacement plus `core_rules.subjectReferenceRules`.
  - "primary identity authority"
  - "strict identity lock"
- Strong but scoped fidelity wording: garment material/pattern refs.
  - authority is limited to texture/surface/stitching or print/logo/placement fidelity
  - garment does not become a "replace with reference product" entity
- Weakest current reference-specific wording: accessory fallbacks that do not resolve to a slot rule. After the slot-rule extension, `sunglasses` and `hand_bag` no longer rely only on generic family wording.

### Mode-vs-authority split

- The compiler cleanly separates "active mode" from "active reference authority."
- This produces a few important edge cases:
  - `subject.mode=replace` without a surviving `reference_id` still compiles replacement language, then adds a fallback line saying replacement cannot be completed from a reference source.
  - `footwear.mode=replace` or `headwear.mode=add/replace` can still compile strong add/replace instructions even after `asset_id` was stripped.
  - accessory item `add/replace` behaves the same way: mode stays active, but explicit reference-lock wording disappears if no active reference survives.

### BuildPrompt-specific nuance

- `Intent Binding` is built from the normalized canonical job, not the stripped compiler-intent job.
- `Reference Binding` is built from the stripped compiler-intent job.
- That means:
  - placement or refinement intent can still be restated even when explicit ref authority was stripped
  - explicit "refs = authority" lines only appear when reference authority survives the stripping pass
