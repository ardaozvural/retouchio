# Asset Directory Map

## Repo-Facing Runtime Directories

| Path | Role | Tracked in git | Current behavior |
| --- | --- | --- | --- |
| `refs/` | reference asset bank | ignored | source of truth for subject, garment detail, footwear, headwear, and accessory refs |
| `inputs/` | managed input sets | ignored | contains named input-set folders under `inputs/sets/*` |
| `staging/runs/` | per-run staged input snapshots and runtime job files | ignored | active server-backed runtime staging area |
| `jobs/generated/` | saved generated canonical jobs | ignored | server writes canonical snapshots here |
| `data/batches/` | batch registry and manifests | ignored | holds `registry.json` and per-batch manifests |
| `batch_output/` | downloaded batch outputs | ignored | per-batch output directories plus legacy flat read fallback |
| `batch_input/` | default legacy input source | ignored | direct runtime input directory |
| `input_cmpltd/` | legacy completed-input sink | ignored | no longer used by the default staged server runtime |
| `batch_requests.jsonl` | legacy root submission artifact | ignored | fallback when no staged runtime job provides a run-local JSONL path |

## Asset Bank Layout

Current standard directories:

- `refs/subjects`
- `refs/garment_details/material`
- `refs/garment_details/pattern`
- `refs/accessories/footwear`
- `refs/accessories/headwear`
- `refs/accessories/hat`
- `refs/accessories/eyewear`
- `refs/accessories/bag`
- `refs/accessories/neckwear`
- `refs/accessories/scarf`

Current populated ids in this checkout:

- subjects: `subject_0002`, `subject_0003`, `subject_0004`, `subject_0005`
- garment pattern: `pattern_detail_0001`
- footwear: `footwear_0001`, `footwear_0002`, `footwear_0003`
- headwear: `headwear_bandana_0001`

Current empty but expected families:

- garment material
- eyewear
- bag
- neckwear
- hat compatibility path
- scarf compatibility path

## Managed Input Layout

Managed inputs live under:

- `inputs/sets/<inputSetId>/_meta.json`
- `inputs/sets/<inputSetId>/target_01.<ext>`
- `inputs/sets/<inputSetId>/target_02.<ext>`

The server creates input-set ids from the user-supplied name plus timestamp.

Managed input sets are now treated as source libraries. The default server-backed batch path copies selected files into `staging/runs/<runId>/inputs/` before execution.

## Run Staging Layout

Server-backed run staging lives under:

- `staging/runs/<runId>/inputs/<inputFile>`
- `staging/runs/<runId>/job.runtime.json`
- `staging/runs/<runId>/batch_requests.jsonl`

## Batch Registry Layout

Registry file:

- `data/batches/registry.json`

Registry record shape includes:

- `id`
- `batchName`
- `sourceJobFile`
- `sourceJobId`
- `runId`
- `inputSource`
- `stagedInputSource`
- `stageDir`
- `inputFileCount`
- `createdAt`
- `lastKnownState`
- `downloaded`
- `cancelled`
- `completedAt`
- `lastCheckedAt`
- `lastError`

Manifest file:

- `data/batches/<safeBatchName>.manifest.json`

Manifest payload includes:

- `batchName`
- `safeBatchName`
- `sourceJobFile`
- `sourceJobId`
- `runId`
- `inputSource`
- `stagedInputSource`
- `stageDir`
- `runtimeJobFile`
- `inputFiles`
- `requestItems`
- `requestKeyToInputFile`
- `originalInputFiles`
- `stagedInputFiles`

## Output Layout

Standard output path:

- `batch_output/<safeBatchName>/batch_result.jsonl`
- `batch_output/<safeBatchName>/<requestKey>.png`

Legacy read fallback:

- `batch_output/batch_result.jsonl`
- `batch_output/<requestKey>.png`

## Current Ignore Strategy

`.gitignore` excludes:

- `node_modules/`
- `.venv-validator/`
- `.env`
- `.DS_Store`
- `._*`
- `batch_output/`
- `batch_input/`
- `input_cmpltd/`
- `inputs/`
- `staging/`
- `refs/`
- `jobs/generated/`
- `data/batches/`
- `batch_requests.jsonl`
- `*.log`

## Important Operational Detail

The directory contract is now non-destructive in the default server-backed path.

- `inputs/sets/*` remain source libraries
- `batch_input/` is also staged per run when launched from the server
- `staging/runs/<runId>/inputs/` is the active execution source for normal server-backed runs
- manifests retain both original and staged input paths
- `input_cmpltd/` remains legacy residue, not the active sink
