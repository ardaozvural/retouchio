# Changelog

## 2026-04-11

- Rewrote the full `docs/` memory set from traced code reality instead of preserving older markdown narratives.
- Reset system identity to the active Retouchio runtime and removed stale sidecar `docs/._*.md` files.
- Documented the real execution spine: UI -> server -> canonical normalization -> compiler -> resolver -> `edit.js` -> Gemini batch -> registry/manifests -> Batch Jobs review.
- Implemented Phase 1 authority freeze: subject, garment detail refs, footwear, headwear, and accessory items now use one shared authority decision layer.
- Non-subject `source` fields now hard-gate runtime reference upload; `asset_id` alone no longer activates reference authority.
- Missing non-subject `source` now normalizes to `system` instead of inferring `reference` from `asset_id`.
- Added inspectable authority output with `active_entities`, `active_reference_authorities`, `stripped_reference_fields`, `runtime_expected_uploads`, and `authority_warnings`.
- Implemented Phase 2 input staging: server-backed runs now copy selected inputs into `staging/runs/<runId>/inputs/` and execute `edit.js` against the staged snapshot.
- Source input libraries under `inputs/sets/*` and `batch_input/` are no longer moved by the default server-backed runtime path.
- Batch manifests now record both original and staged input paths, runtime job file location, and per-request original-to-staged mappings.
- Implemented Phase 3 UI/canonical parity: supported compile-active Job Builder fields now appear as primary-visible or advanced-visible controls instead of silent hidden authoring state.
- Added a visible advanced authoring card for `scene`, `output_profile`, `global_negative_rules`, extra accessory rows, job metadata, save/load/sample/reset tools, and inspect shortcuts.
- Removed raw `garment.mode` and top-level `accessory.mode` from direct authoring flow; they remain derived/internal values.
- Corrected UI drift during Phase 3: Batch Jobs is a separate page, compile/prompt/JSON preview is intentionally routed through Derleme Incelemesi, and approve/regenerate actions were still placeholders at that phase boundary.
- Implemented Phase 4 output review persistence: `data/batches/registry.json` now stores explicit `runs[]` and `outputs[]` entities alongside batch attempt records.
- Added persisted output review decisions with `review_state = in_review | approved | rejected` and `is_final` final-selection semantics per `(runId, requestKey)`.
- Added server-backed retry that creates a new `attemptId`, reuses the saved canonical job, reuses the run input mapping, and stages a fresh runtime snapshot without overwriting older attempt outputs.
- Updated Batch Jobs UI to use real approve, reject, and retry actions instead of browser-local review tags.
- Updated Job Builder result actions so approve/retry now target real persisted output and attempt state instead of preview-only placeholders.
- Corrected storage/runtime drift: managed input sets are now treated as immutable sources in the default server-backed path, and `input_cmpltd/` is legacy residue instead of the active sink.
- Marked Python `validator/` and `prompt_contracts/` as non-integrated legacy or experimental systems in the active Node stack.
