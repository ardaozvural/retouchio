# Changelog

## 2026-04-11
- Refactored active subject control around `preserve` and `transfer_identity`, with canonical write-path support for `source`, `reference_id`, `reference_ids`, `face_refinement`, and `pose_refinement`.
  affected files: `prompt_system/compiler/schemaConstants.js`, `prompt_system/compiler/resolveEntity.js`, `prompt_system/compiler/validateCanonicalJob.js`, `prompt_system/compiler/optionRegistry.js`, `prompt_system/registry/frozenOptions.v1.json`, `prompt_system/schemas/canonicalJob.example.json`, `jobs/job_0001.canonical.json`
- Updated Job Builder subject UI to the active `Model / Yüz / Poz` control surface and mapped it to the new canonical subject fields.
  affected files: `ui/job-builder/app.js`, `ui/job-builder/index.html`
- Rebuilt subject prompt semantics as ordered identity, face refinement, and pose refinement blocks, and conditioned compiler/global negative/reference binding behavior for `transfer_identity`.
  affected files: `prompt_system/modules/subject.js`, `prompt_system/modules/core.js`, `prompt_system/modules/global_negative_rules.js`, `prompt_system/compiler/buildPrompt.js`
- Kept backward compatibility on the read path for legacy subject values while keeping the new schema as the active write path.
  affected files: `prompt_system/compiler/resolveEntity.js`, `ui/job-builder/app.js`
- Synced status docs to the current repo state after the subject-control compiler changes.
  affected files: `docs/PROJECT_STATUS.md`, `docs/CHANGELOG.md`, `docs/NEXT_STEPS.md`, `docs/MASTER_SYSTEM_ARCHITECTURE.md`

## [Checkpoint — UI Architecture & Visual System Stabilization]
- separated major product surfaces into real pages
- unified the product under a shared visual system
- refactored Production Flow into a clearer step-based interface
- moved Batch Jobs into a standalone monitoring/review surface
- improved styling UX toward a decision-based interaction model
- reduced the internal/debug-heavy feel in the main path

## [UI + Execution Stabilization]
- Introduced fixed bottom execution bar for persistent run controls.
- Separated authoring, execution, and monitoring layers in Job Builder UI.
- Normalized styling system UX (footwear, headwear, accessory alignment).
- Introduced advanced control isolation for garment detail refs.
- Added structured tagging system for output evaluation.
- Implemented batch-scoped output storage and pairing logic.
- Added compare mode in output review.

## 2026-04-01
- Migrated prompt generation from monolithic flow to modular compiler.
  affected files: `edit.js`, `prompt_system/compiler/buildPrompt.js`, `prompt_system/modules/*`
- Added canonical job schema as runtime behavioral center.
  affected files: `jobs/*.canonical.json`, `prompt_system/schemas/*`, `prompt_system/compiler/resolveEntity.js`
- Added entity-driven reference resolution.
  affected files: `prompt_system/compiler/resolveRefs.js`, `prompt_system/compiler/assetBank.js`
- Added internal Job Builder UI.
  affected files: `job_builder_server.js`, `ui/job-builder/*`
- Added frozen option registry and asset bank standard.
  affected files: `prompt_system/compiler/optionRegistry.js`, `prompt_system/registry/frozenOptions.v1.json`, `prompt_system/registry/assetBankStandard.v1.json`, `refs/README.md`
- Added validation and preview/readiness panels in builder.
  affected files: `prompt_system/compiler/validateCanonicalJob.js`, `prompt_system/compiler/dryBatchCheck.js`, `ui/job-builder/*`
- Added save/load job persistence in builder.
  affected files: `job_builder_server.js`, `ui/job-builder/app.js`
- Added dry batch readiness check.
  affected files: `prompt_system/compiler/dryBatchCheck.js`, `job_builder_server.js`, `ui/job-builder/app.js`
- Added run-batch integration using existing `edit.js`.
  affected files: `job_builder_server.js`, `ui/job-builder/app.js`
- Added batch registry and batch monitor panel.
  affected files: `prompt_system/compiler/batchRegistry.js`, `job_builder_server.js`, `ui/job-builder/*`
- Added batch cancel and batch download support.
  affected files: `job_builder_server.js`, `ui/job-builder/app.js`
- Added Asset Manager UI.
  affected files: `ui/asset-manager/*`, `job_builder_server.js`
- Added asset upload pipeline and preview grid.
  affected files: `job_builder_server.js`, `ui/asset-manager/*`
- Added Asset Manager -> Job Builder binding.
  affected files: `ui/asset-manager/app.js`, `ui/job-builder/app.js`
- Added Target Inputs managed surface and input set endpoints.
  affected files: `job_builder_server.js`, `ui/input-manager/*`, `ui/job-builder/app.js`
- Added shared internal app shell.
  affected files: `ui/shared/shell.css`, `ui/shared/shell.js`
- Added left sidebar navigation across tool screens.
  affected files: `ui/job-builder/index.html`, `ui/asset-manager/index.html`, `ui/input-manager/index.html`
- Added active route highlighting in shared navigation.
  affected files: `ui/shared/shell.js`, `ui/*/index.html`
- Connected Batch Jobs navigation to the real Job Builder batch section (`/job-builder#batch-jobs`).
  affected files: `ui/job-builder/index.html`, `ui/shared/shell.js`
- Added docs memory set and master architecture alignment.
  affected files: `docs/*.md`
- Synced docs memory set to current system reality as a save point.
  affected files: `docs/PROJECT_STATUS.md`, `docs/CHANGELOG.md`, `docs/NEXT_STEPS.md`, `docs/CODEX_TASK_BOARD.md`, `docs/UI_ROADMAP.md`
