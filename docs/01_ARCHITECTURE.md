# Architecture

## Layer Map

| Layer | Active code | Responsibility | Notes |
| --- | --- | --- | --- |
| UI | `ui/job-builder/*`, `ui/asset-manager/*`, `ui/input-manager/*`, `ui/batch-jobs/*`, `ui/shared/shell.js` | Collect user intent, preview canonical state, call server APIs | Job Builder is the main authoring surface. It now splits supported fields into primary-visible and advanced-visible controls. Batch Jobs is a separate page. |
| HTTP server | `job_builder_server.js` | Serve pages, static files, compile/dry-check/run APIs, asset and input upload/delete APIs, batch APIs | Plain `http.createServer`, not Express. |
| Compiler | `prompt_system/compiler/*` | Normalize jobs, validate jobs, compile prompt, resolve refs, discover registry, persist generated jobs | This is the active behavioral layer. |
| Prompt modules | `prompt_system/modules/*` | Emit entity-specific prompt sections | Ordered by `prompt_system/order.js`. |
| Runtime submitter | `edit.js` | Upload references and staged targets, assemble Gemini requests, write JSONL, submit batch | Operational layer. |
| Batch utilities | `batch_poll_download.js`, batch registry/output helpers | Poll, download, decode JSONL outputs, pair outputs back to inputs | Manual CLI plus server-backed UI flow. |
| Filesystem storage | `refs/`, `inputs/`, `staging/runs/`, `jobs/generated/`, `data/batches/`, `batch_output/`, `input_cmpltd/` | Asset bank, immutable source inputs, per-run staged inputs, saved jobs, batch registry, manifests, output files | No database layer exists. |
| Legacy/parallel residue | `prompt_contracts/*`, `validator/*`, `jobs/job_0001.json` | Historical compatibility and offline experiments | Not on the active Node execution path. |

## Behavioral Boundary

The repository has a clear split between behavioral code and operational code.

Behavioral:

- `normalizeJob()`
- `validateCanonicalJob()`
- `buildPrompt()`
- module compilers in `prompt_system/modules/*`
- asset bank naming and discovery rules

Operational:

- multipart upload handling
- static file serving
- saving JSON files
- Gemini file upload and batch creation
- polling, cancelling, downloading
- output image extraction and pairing

This matters because UI controls only matter if they change canonical fields that survive normalization and then affect compiler or resolver behavior. In the current Job Builder, supported compile-active fields are either primary-visible or advanced-visible. Raw `garment.mode` and top-level `accessory.mode` are derived values, not direct authoring controls.

## End-to-End Request Architecture

1. The UI builds or edits a job-shaped object.
2. The server merges in a default job shape.
3. Validation runs against the submitted job.
4. Compilation normalizes to canonical v2 and emits prompt text.
5. Runtime resolves local references from `refs/`.
6. Server-backed runtime stages selected input files into `staging/runs/<runId>__<attemptId>/inputs/`.
7. Runtime uploads reference files and staged target files to Gemini.
8. Runtime writes `batch_requests.jsonl` and submits a batch against `gemini-3.1-flash-image-preview`.
9. Results are downloaded into `batch_output/<safeBatchName>/`.
10. Output pairing uses the manifest plus request keys plus `batch_result.jsonl`.

## Server Responsibilities

`job_builder_server.js` is both the UI server and the backend API.

Page routes:

- `/job-builder`
- `/asset-manager`
- `/input-manager`
- `/batch-jobs`

Static content:

- `/job-builder/app.js`, `/job-builder/styles.css`
- `/asset-manager/app.js`, `/asset-manager/styles.css`
- `/input-manager/app.js`, `/input-manager/styles.css`
- `/batch-jobs/app.js`, `/batch-jobs/styles.css`
- `/shared/shell.js`, `/shared/shell.css`
- `/refs/*`, `/inputs/*`, `/staging/*` image previews, `/batch_output/*`, `/batch_input/*`

Core APIs:

- bootstrap, compile, dry-check, save, run-batch
- asset upload/list/delete
- subject upload
- input-set upload/list/delete
- batch list/status/refresh-all/cancel/download/outputs
- batch output approve/reject
- batch retry

## Compiler Architecture

`buildPrompt()` loads three config files:

- `config/core_rules.json`
- `config/slot_rules.json`
- `config/output_profiles.json`

It then:

1. normalizes the job with `normalizeJob()`
2. applies the shared reference-authority decision layer and builds a compiler-only copy with inactive authority stripped
3. compiles modules in fixed order
4. appends `Intent Binding`
5. appends `Reference Binding`
6. returns `prompt`, `canonicalJob`, `sections`, `imageConfig`, and an inspectable `authority` report

Module order is fixed:

1. `core`
2. `subject`
3. `garment`
4. `footwear`
5. `headwear`
6. `accessory`
7. `scene`
8. `output_profile`
9. `global_negative_rules`

## Persistence Architecture

Saved state is file-backed.

- Generated jobs: `jobs/generated/*.canonical.json`
- Staged runs: `staging/runs/<runId>__<attemptId>/`
- Batch registry: `data/batches/registry.json`
- Logical run records: `runs[]` in `data/batches/registry.json`
- Persisted output records: `outputs[]` in `data/batches/registry.json`
- Per-batch manifests: `data/batches/<safeBatchName>.manifest.json`
- Batch results: `batch_output/<safeBatchName>/batch_result.jsonl` and `*.png`
- Asset bank: `refs/...`
- Managed input sets: `inputs/sets/<inputSetId>/`

No SQL database, object store, or remote registry exists in the traced code.

## Architectural Risks

- Single-process run lock: `batchRunInProgress` blocks concurrent `run-batch` calls only within one server instance.
- Staging retention: per-run input snapshots accumulate unless something cleans them up.
- Direct CLI bypass: manual `edit.js` execution can still skip server-side staging if the caller points `inputSource` at a source directory.
- Internal mirror surface: some visible shells still write through hidden backing controls, which keeps a small parity risk even though the supported authoring surface is now explicit.
- Older payloads can still carry stale reference fields, but those fields are now stripped and warned instead of activating runtime uploads.
