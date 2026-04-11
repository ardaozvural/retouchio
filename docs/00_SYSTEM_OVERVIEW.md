# System Overview

Audit basis: code paths traced on 2026-04-11. The source of truth is the live Node.js code in `job_builder_server.js`, `edit.js`, `prompt_system/compiler/*`, `prompt_system/modules/*`, and the UI event code under `ui/*`.

## Current Identity

This repository is currently a local filesystem-backed batch image editing workbench for Gemini image generation.

The active product/runtime name in code is `Retouchio`.

`RenderForge` does not appear as an active runtime or UI brand in the traced code. It only exists as external naming around the repo or older docs.

## Active System Spine

1. A canonical job payload is assembled in the Job Builder UI or submitted directly to the server.
2. `job_builder_server.js` merges defaults, validates the job, and optionally compiles it.
3. `buildPrompt(job)` normalizes the job into canonical schema `version: "2"` and compiles the prompt from modular entities.
4. `resolveReferences(canonicalJob)` resolves reference files from `refs/`.
5. The server stages the selected target images into `staging/runs/<runId>/inputs/` and writes a runtime job file for that run.
6. `edit.js` uploads the staged target image set and resolved references to Gemini, writes a run-local `batch_requests.jsonl`, and submits the batch.
7. The server records batch metadata in `data/batches/registry.json` and writes a per-batch manifest in `data/batches/<safeBatchName>.manifest.json`.
8. Batch status, cancel, download, and output pairing flow through server APIs and the separate Batch Jobs UI.

## What Decides Behavior

Behavior is decided by the canonical job plus the compiler.

- Canonical normalization: `prompt_system/compiler/resolveEntity.js`
- Validation: `prompt_system/compiler/validateCanonicalJob.js`
- Prompt assembly: `prompt_system/compiler/buildPrompt.js`
- Module order: `prompt_system/order.js`
- Module rules: `prompt_system/modules/*`
- Asset discovery and naming rules: `prompt_system/compiler/assetBank.js` and `prompt_system/registry/assetBankStandard.v1.json`

## What Only Executes Behavior

These parts are operational, not behavioral.

- `edit.js` uploads files, builds JSONL, and submits Gemini batch jobs against the staged runtime snapshot.
- `job_builder_server.js` serves the UI, exposes APIs, saves jobs, snapshots manifests, and tracks batch state.
- `batch_poll_download.js` is a manual CLI helper for poll-and-download.

## Major Code Truths

- The behavioral center is canonical schema `version: "2"`, not the old slot-based JSON shape.
- The active compiler is the JavaScript modular compiler under `prompt_system/compiler` and `prompt_system/modules`, not the older Python `prompt_contracts` stack.
- Validation and dry-check are real server features.
- The Python `validator/` toolchain exists, but it is not integrated into the Node compile or run path.
- Persistence is local JSON and local directories. There is no database.
- Batch review is local to the running workspace. Review tags on the Batch Jobs page are stored in browser `localStorage`, not persisted server-side.

## Biggest Active Architectural Realities

- The server is a single-process Node HTTP server, not a distributed backend.
- Only one `run-batch` request can run at a time per server process because of the in-memory `batchRunInProgress` guard.
- Server-backed runs treat `inputs/sets/*` and `batch_input/` as source libraries and copy selected inputs into `staging/runs/<runId>/inputs/` before execution.
- The UI exposes only part of the canonical system. Scene, output profile, global negative rules, extra accessory rows, save/load, and some review tools still live in a hidden control store.

## Active vs Partial vs Legacy vs Missing

Active:

- Job Builder server and UI
- Canonical v2 normalization and validation
- Modular prompt compiler
- Filesystem asset bank discovery
- Gemini batch submission, status, cancel, and download
- Batch registry, manifests, and output pairing

Partial:

- Asset population across supported families
- Visible UI coverage of all canonical entities
- Review workflow beyond preview and local tagging

Legacy compatibility:

- Slot-era job normalization
- Legacy flat `batch_output/` read fallback
- Legacy top-level fields such as `subjectReference`, `outputProfile`, and `activeSlots`

Missing:

- Durable approval workflow
- Queueing and retries
- Multi-run orchestration
- Integrated JS test suite
- Integrated Python validator dependencies and runtime hookup
