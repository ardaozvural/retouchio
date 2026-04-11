# Runtime Flow

## Active Runtime Entry Points

Primary server-backed runtime:

- `POST /api/job-builder/compile`
- `POST /api/job-builder/dry-check`
- `POST /api/job-builder/run-batch`
- `GET /api/batch/status`
- `POST /api/batch/refresh-all`
- `POST /api/batch/cancel`
- `POST /api/batch/download`
- `GET /api/batch/outputs`
- `POST /api/batch/output/approve`
- `POST /api/batch/output/reject`
- `POST /api/batch/retry`

Direct CLI runtime:

- `node edit.js <job-file>`
- `node batch_poll_download.js <batch-name>`

## Compile Flow

`POST /api/job-builder/compile`

1. Parse JSON body.
2. Merge default job shape with `mergeDefaultJob()`.
3. Build runtime registry with `buildOptionRegistry()`.
4. Validate with `validateCanonicalJob()`.
5. Compile with `buildPrompt()`.
6. Return `prompt`, `canonicalJob`, `imageConfig`, and validation payload.

This path does not touch Gemini.

## Dry Check Flow

`POST /api/job-builder/dry-check`

1. Parse JSON body.
2. Merge defaults.
3. Build runtime registry.
4. Run `runDryBatchCheck()`.

`runDryBatchCheck()` performs:

1. validation
2. prompt compilation
3. reference resolution
4. input source existence check
5. input image count check

A dry check is considered ready only when `errors.length === 0`.

## Run Batch Flow

`POST /api/job-builder/run-batch`

1. Reject if `batchRunInProgress` is already true.
2. Parse JSON body.
3. Merge defaults.
4. Build runtime registry.
5. Run dry check.
6. Fail early if readiness is false.
7. Snapshot the first 10 sorted input files from the resolved input source.
8. Create `staging/runs/<runId>__<attemptId>/inputs/` and copy the selected input files into that attempt-local snapshot.
9. Save the canonical source job to `jobs/generated/*.canonical.json`.
10. Write `staging/runs/<runId>__<attemptId>/job.runtime.json` with `inputSource` redirected to the staged input directory.
11. Spawn `node edit.js <staged runtime job path>`.
12. Parse `BATCH_JOB_NAME` and `BATCH_STATE` markers from child stdout/stderr.
13. Upsert `data/batches/registry.json`.
14. Write `data/batches/<safeBatchName>.manifest.json` with original-to-staged input mappings.
15. Persist a file-backed run lineage: `jobId -> runId -> attemptId -> batchName`.
16. Mark the new attempt as the latest attempt for that run.
17. Return run result, readiness payload, job file info, and batch registry snapshot.
18. Clear the in-memory run lock in `finally`.

## `edit.js` Runtime Sequence

`edit.js` is the actual submitter.

1. Load job config from the provided file path, or fall back to legacy no-arg mode.
2. Ensure `batch_input/` and `batch_output/` exist.
3. Resolve `inputDir` from `job.inputSource`. In the server-backed path this points at `staging/runs/<runId>__<attemptId>/inputs/`.
4. List input images and sort them by filename.
5. Slice the first 10 files only.
6. Compile prompt with `buildPrompt(job)`.
7. Resolve refs with `resolveReferences(canonicalJob)`.
8. Optionally exit on `DRY_RUN`.
9. Upload all resolved reference images.
10. Upload each target input image.
11. Assemble one JSONL request row per input.
12. Write `batch_requests.jsonl` into the run staging directory when `job.runtime.batchJsonlPath` exists, or into repo root as a legacy fallback.
13. Upload the JSONL file to Gemini.
14. Create a Gemini batch against model `gemini-3.1-flash-image-preview`.
15. Print batch markers to stdout.

`edit.js` no longer moves source input files during normal staged runs.

## Request Output Artifacts

Submission artifact:

- `staging/runs/<runId>__<attemptId>/batch_requests.jsonl` in the server-backed staged path
- `batch_requests.jsonl` in repo root only as a legacy fallback

Saved job artifact:

- `jobs/generated/<name>.canonical.json`

Per-run staging artifacts:

- `staging/runs/<runId>__<attemptId>/inputs/<file>`
- `staging/runs/<runId>__<attemptId>/job.runtime.json`

Batch registry:

- `data/batches/registry.json`

Registry entity families:

- `jobs[]`: one record per submitted batch attempt
- `runs[]`: one logical run lineage, shared across retries
- `outputs[]`: one persisted output record per `(runId, attemptId, requestKey, outputPath)`

Per-batch manifest:

- `data/batches/<safeBatchName>.manifest.json`

Downloaded batch outputs:

- `batch_output/<safeBatchName>/batch_result.jsonl`
- `batch_output/<safeBatchName>/<requestKey>.png`

Legacy read fallback:

- `batch_output/batch_result.jsonl`
- `batch_output/<requestKey>.png`

## Batch Status, Cancel, and Download

Status:

- `GET /api/batch/status?batchName=...`
- fetches Gemini batch state
- updates registry metadata

Refresh all:

- `POST /api/batch/refresh-all`
- iterates every known record and refreshes state

Cancel:

- `POST /api/batch/cancel`
- allowed only for `PENDING` or `RUNNING` states

Download:

- `POST /api/batch/download`
- only works after the remote batch reports success
- downloads the JSONL file
- extracts image parts
- writes `*.png` outputs under the per-batch output directory
- syncs persisted output records when outputs are inspected

## Review and Attempt Flow

Persisted output states:

- `in_review`
- `approved`
- `rejected`

Persisted run states:

- `pending`
- `running`
- `succeeded`
- `failed`

Persisted review actions:

- `POST /api/batch/output/approve`
  - sets `review_state = approved`
  - sets `is_final = true`
  - unsets any other final output for the same `(runId, requestKey)`
- `POST /api/batch/output/reject`
  - sets `review_state = rejected`
  - clears `is_final`
- `POST /api/batch/retry`
  - reuses the saved canonical job from `sourceJobFile`
  - reuses the run's input mapping
  - creates a new `attemptId`
  - stages a fresh runtime snapshot
  - submits a new batch attempt without overwriting older outputs

`GET /api/batch/outputs` now returns attempt-grouped review payloads:

- current attempt items in `items`
- full run history in `attempts[]`
- persisted `outputId`, `review_state`, and `is_final` on each output item

## Output Pairing Flow

Output review uses `buildBatchOutputList()`.

Pairing priority:

1. `manifest.requestItems`
2. `manifest.requestKeyToInputFile`
3. ordered remaining `manifest.inputFiles`
4. keys parsed from `batch_result.jsonl`
5. leftover outputs without input matches
6. leftover inputs without output matches

Important limits:

- request keys are built from filename stems
- duplicate stems cause `requestKeyToInputFile` collisions to be dropped
- pairing then falls back to weaker heuristics
- when request items include staged input paths, Batch Jobs preview uses the staged snapshot first and falls back to original input paths only when needed

## Operational Constraints

- `JOB_BUILDER_BATCH_TIMEOUT_MS` defaults to 30 minutes
- only one `run-batch` call can execute per server process
- Gemini-backed actions require `GEMINI_API_KEY`
- compile, save, and dry-check do not require a Gemini client

## Runtime Risks

- The server lock is process-local only.
- staged run directories accumulate until something cleans them up
- direct manual `node edit.js <job-file>` usage can still bypass server-side staging if the caller points `inputSource` at a source directory directly
- `edit.js` and server batch handling are tightly coupled through stdout markers, not a formal RPC contract.
- retry creation is server-backed, but a full live retry still depends on successful Gemini batch submission
