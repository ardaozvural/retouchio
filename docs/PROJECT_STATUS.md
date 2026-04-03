# Project Status

## Completed
- canonical job schema is active and runtime-compatible.
- modular prompt compiler is active (`buildPrompt`).
- entity-driven reference resolver is active (`resolveRefs`).
- stable batch runner is active (`edit.js`).
- internal Job Builder UI exists and works.
- real multi-page UI separation is implemented across `/job-builder`, `/asset-manager`, `/input-manager`, and `/batch-jobs`.
- Target Inputs UI exists and works.
- frozen option registry exists and drives supported selections.
- asset bank standard exists and is wired to resolver/registry.
- basic validation is active.
- compile preview and canonical JSON preview are active.
- save/load jobs in builder is implemented.
- dry batch readiness check is implemented.
- builder-to-batch bridge via existing `edit.js` is implemented.
- batch registry is implemented.
- batch status refresh is implemented.
- batch cancel is implemented.
- batch download is implemented.
- Asset Manager UI is implemented.
- asset upload and preview is implemented.
- Asset Manager -> Job Builder binding is implemented.
- managed target input sets are implemented.
- target input upload, preview, delete-file, and delete-set are implemented.
- Target Inputs -> Job Builder inputSource binding is implemented.
- shared internal app shell is implemented.
- sidebar navigation is implemented.
- active route highlighting is implemented.
- Batch Jobs navigation is integrated into the shared shell.
- Production Flow direction is established as the main job setup surface.
- step-based Production Flow refactor is implemented.
- Job Builder UI action hierarchy is refactored (authoring vs execution vs monitoring).
- fixed bottom execution bar is implemented (`compile` / `dry check` / `run` / `cancel` remain reachable).
- Styling / Worn Items UX is normalized with better footwear, headwear, and accessory alignment.
- styling workflow is reworked into a more decision-based surface.
- advanced garment controls separation is implemented (detail refs moved into collapsed controls).
- developer tools are separated from the core user flow.
- advanced/internal controls no longer dominate the main user path.
- mode behavior rules are implemented across compiler + validator.
- output review system is upgraded with deterministic pairing and compare mode.
- batch output storage is standardized as `batch_output/<safe_batch_name>/`.
- output review tagging system is implemented for local structured feedback.
- Batch Jobs is isolated as a standalone monitor/review page.
- shared visual system is established across major pages.
- shared shell/card/button/modal/empty-state language is standardized.

## In Progress
- real browser-level UI validation across main pages.
- final interaction refinement from real usage.
- prompt engine mapping between UI decisions and compiled prompt behavior.
- asset bank population (eyewear, bag, neckwear, garment detail banks).
- output/result experience refinement.

## Missing
- validator integration in main execution flow.
- output registry implementation.
- retry packs for failed batch outcomes.
- production orchestration layer.
- richer output review tooling.

## Current Source of Truth
- runtime runner = `edit.js`
- canonical job schema = behavioral truth
- `buildPrompt` = prompt compiler
- `resolveRefs` = runtime ref authority
- `optionRegistry` = supported choices
- Asset Manager = reference ingestion surface
- Target Inputs = managed target input surface
- Job Builder = canonical job builder and execution surface
- shared shell = internal navigation and workspace layer
- `docs/MASTER_SYSTEM_ARCHITECTURE.md` = top-level architecture reference

## Operating Rules
- legacy slot system = compatibility-only
- user does not write prompts
- prompt is compiled from structured job state
- builder UI collects controlled selections, not free prompt text

## Known Risks
- `slot_key` compatibility residue.
- asset bank incompleteness.
- ref directory convention drift.
- mode semantic drift.
- UI/runtime mismatch if registry changes without docs sync.

## Immediate Focus
- browser-level UI validation across the major product pages.
- final interaction refinement based on real usage.
- prompt engine mapping between UI decisions and compiled prompt behavior.
- output/review/result experience strengthening.
- asset bank population.
- validator integration later.

## Checkpoint — UI Architecture & Visual System Stabilization
- backend and canonical architecture remain intact.
- the UI is now substantially more product-like, unified, and page-structured.
- shared shell, card, button, modal, and empty-state language now align the main product surfaces.
- Production Flow, Reference Library, Target Inputs, and Batch Jobs now read as one controlled product system instead of separate internal tools.
- the next phase shifts toward real usage testing, final interaction refinement, and prompt engine mapping.

## Save Point
- system state is stabilized through the multi-page UI split, shared visual system, execution visibility, and review tooling.
- the product now has a meaningful UI architecture and visual system checkpoint without changing backend or canonical behavior.
- the next milestone shifts from UI architecture establishment into browser validation, interaction refinement, and prompt engine mapping.
