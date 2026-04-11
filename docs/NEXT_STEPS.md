# Next Steps

These are the next logical implementation priorities based on current code reality.

## 1. Add Staging Retention and Cleanup Rules

The active server-backed path now stages every attempt under `staging/runs/<runId>__<attemptId>/`.

Next correction:

- define retention or cleanup rules for old staged runs
- decide whether completed staged inputs should remain indefinitely for auditability
- remove root-level `batch_requests.jsonl` fallback if the staged path is now the only supported server-backed flow

## 2. Add Review and Attempt Coverage

Phase 4 made approve / reject / retry real, but the active code still lacks automated coverage around that file-backed workflow.

Next correction:

- add coverage for `approveOutputRecord()` and `rejectOutputRecord()`
- add coverage for final-selection exclusivity across attempts for the same `requestKey`
- add coverage for retry input selection, especially request-key retries
- add coverage for legacy batch hydration into `runs[]` and `outputs[]`

## 3. Thin Internal Job Builder Mirror State

Phase 3 made the supported compile-active fields visible, but the UI still uses some hidden backing controls behind the visible shells.

Next correction:

- decide whether the visible shells should keep writing through internal mirror inputs
- or whether those mirror fields should be refactored into direct state mappers
- keep `garment.mode` and top-level `accessory.mode` as derived values only unless a real authoring need appears

## 4. Prune Stale Examples and Registry Seeds

Update or remove example ids that do not resolve in the current asset bank.

Targets:

- `prompt_system/schemas/canonicalJob.example.json`
- `jobs/job_0001.json`
- `jobs/job_0001.canonical.json` and any saved canonical examples missing explicit non-subject `source`
- any frozen registry seeds that mislead operators

## 5. Decide the Fate of the Python Validator and `prompt_contracts`

Either:

- integrate them into the active workflow with a dependency manifest and explicit server/runtime hooks

or:

- mark them as archived/experimental and stop implying they are part of the current production path

## 6. Add Basic Automated Coverage Around the Active Spine

Highest-value tests:

- normalization and compatibility cases
- resolver gating rules
- authority report coverage
- compile/output profile selection
- request key collision behavior
- manifest pairing behavior
- persisted review state and retry lineage
