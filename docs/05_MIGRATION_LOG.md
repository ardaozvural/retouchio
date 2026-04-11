# Migration Log

This file is reconstructed from code reality, not commit history.

## Inferred Evolution

## Phase 1: Slot-Era Jobs

Older jobs used:

- top-level `subjectReference`
- top-level `outputProfile`
- top-level `activeSlots`
- top-level `selectedAccessoryAssetIds`
- entity-level `reference`
- slot names such as `headwear_bandana`, `footwear`, and `neck_scarf`

Proof:

- `jobs/job_0001.json`
- `LEGACY_SLOT_MAP` in `prompt_system/compiler/resolveEntity.js`
- `applyLegacySlotMapping()` and `applyExistingEntityMapping()`

## Phase 2: Canonical v2 Normalization Layer

The repo introduced canonical `version: "2"` jobs with entity blocks under `entities`.

Normalization now translates older shapes into canonical fields.

Proof:

- `normalizeJob()` in `resolveEntity.js`
- `schemaConstants.js`
- `jobs/job_0001.canonical.json`
- `prompt_system/schemas/canonicalJob.example.json`

## Phase 3: Modular Compiler and Runtime Discovery

The active system compiles prompt sections through modular JavaScript compilers and discovers real assets from the filesystem.

Proof:

- `buildPrompt()`
- `prompt_system/modules/*`
- `buildOptionRegistry()`
- `assetBankStandard.v1.json`

## What Still Survives from the Old System

Read-path or normalization compatibility still exists for:

- slot activation
- old top-level fields
- legacy entity `reference` fields
- `slot_key`
- `asset_ids` and `reference_ids`
- no-arg legacy mode in `edit.js`
- flat `batch_output/` read fallback

## What Is No Longer the Active Center

These systems exist, but they are not the active runtime spine:

- `prompt_contracts/*` Python prompt contract resolver
- `validator/*` Python shape validator
- top-level `validator` config block inside old jobs

No traced Node runtime import path calls into `prompt_contracts`.

No compile, dry-check, or run server endpoint invokes the Python validator.

## Compatibility Limits

Legacy support is partial, not complete.

Examples:

- `jobs/job_0001.json` still normalizes toward canonical intent, but it fails dry-check in this checkout because it points at missing `subject_0001`.
- validation still inspects the submitted job shape, so older incomplete shapes can fail before normalized behavior is fully helpful.

## Current Migration Residue Worth Fixing

- stale examples still mention missing asset ids
- frozen registry still includes asset ids not present in the live asset bank
- visible UI no longer exposes every canonical field even though the compiler still supports them
- resolver behavior for non-subject refs is looser than compiler authority semantics

