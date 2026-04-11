# Master System Architecture

## Single-Source Synthesis

The active system is a local Retouchio batch-editing stack whose behavioral center is canonical job schema `version: "2"` and whose operational center is a Node HTTP server plus `edit.js`.

## End-to-End Spine

1. The user edits state in Production Flow or submits a job payload directly to the server.
2. The server merges defaults and validates against the live discovered registry and asset bank standard.
3. The compiler normalizes the job into canonical v2 and emits a prompt from ordered entity modules.
4. The resolver loads reference files from `refs/`.
5. The server stages selected target inputs into `staging/runs/<runId>__<attemptId>/inputs/` and writes a runtime job file that points `edit.js` at that staged snapshot.
6. `edit.js` uploads refs and staged target inputs, writes JSONL, and submits a Gemini batch.
7. The server and CLI utilities monitor, cancel, and download batch results.
8. Outputs are saved to `batch_output/<safeBatchName>/`, paired back to original and staged inputs through manifests, and persisted as reviewable output records.
9. Approve, reject, and retry operate on persisted `runId`, `attemptId`, and `outputId` state.

## Active Components

Behavioral:

- `prompt_system/compiler/resolveEntity.js`
- `prompt_system/compiler/validateCanonicalJob.js`
- `prompt_system/compiler/buildPrompt.js`
- `prompt_system/modules/*`
- `prompt_system/compiler/resolveRefs.js`

Operational:

- `job_builder_server.js`
- `edit.js`
- `batch_poll_download.js`
- `prompt_system/compiler/batchRegistry.js`
- `prompt_system/compiler/batchOutputPaths.js`
- `prompt_system/compiler/jobPersistence.js`

UI:

- `/job-builder`
- `/asset-manager`
- `/input-manager`
- `/batch-jobs`

Job Builder surface split:

- primary visible authoring: input source, subject, garment detail refs, primary styling slots
- advanced visible authoring: scene, output profile, global negative rules, extra accessory rows, save/load/sample/reset, inspect shortcuts
- UI-only state: workflow presets, panel open state, inspect tab state, compare mode

## Behavioral Truths

- canonical schema is the active source of behavioral truth
- module order is fixed and meaningful
- output profile selects runtime `imageConfig`
- scene/output/global-negative entities are real compile layers and now live in the visible advanced authoring section
- subject reference authority is active only when `source === "reference"` and `reference_id` exists
- footwear, headwear, and accessory item reference authority now use the same shared gate across compiler, resolver, and request assembly

## Operational Truths

- persistence is filesystem-only
- there is no database
- one server process handles both UI and APIs
- one in-memory lock guards `run-batch`
- server-backed runs stage inputs per run instead of moving source files
- run lineage is file-backed as `job -> run -> attempt -> output`
- review decisions are server-persisted in `data/batches/registry.json`

## Legacy Truths

Still present:

- slot-era field normalization
- flat `batch_output` read fallback
- old job examples
- Python `validator/`
- Python `prompt_contracts/`

Not active in the main Node execution spine:

- `validator/*`
- `prompt_contracts/*`

## Most Important Risks

- staged run directories will accumulate without retention or cleanup rules
- internal mirror controls still exist behind some visible shells
- stale examples and frozen registry seeds
- direct manual CLI execution can still bypass server-side staging
- weak key pairing when filename stems collide
- stale reference fields still exist in older payloads, but they are now stripped and surfaced via authority warnings
- retry history is file-backed, but fully live retry still depends on successful Gemini submission
