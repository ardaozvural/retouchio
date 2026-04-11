# Project Status

## Present Reality

This repository is currently a working local Retouchio batch-editing stack with:

- a Node HTTP server
- a canonical v2 job model
- a modular JavaScript prompt compiler
- a filesystem-discovered asset bank
- Gemini batch submission and download
- a multi-page UI for authoring, asset management, input management, and batch review

## What Is Actually Working

- compile from canonical or mixed job payloads
- dry-check against live asset and input directories
- save generated canonical jobs
- submit Gemini batches through `edit.js`
- stage per-run input snapshots before server-backed execution
- track batch status in local registry JSON
- download outputs into per-batch directories
- pair outputs back to inputs using manifests and request keys
- persist output review state as `in_review`, `approved`, or `rejected`
- mark one final output per `(runId, requestKey)`
- retry from an existing run or request key into a new attempt without overwriting older outputs
- manage references and input sets through dedicated UIs

## What Is Only Partially Working

- full asset-bank coverage across all supported families
- thinner internal UI state shape behind visible Job Builder shells
- broader review workflow beyond approve / reject / retry
- end-to-end retry verification against a live Gemini batch account in this checkout

## What Is Not True Yet

- there is no database-backed persistence layer
- there is no integrated validator step in compile or run
- there is no trustworthy multi-user or multi-run orchestration layer
- there is no committed Python dependency manifest for `validator/`, and `python3 -m validator.tests.synthetic_tests` currently fails without `numpy`

## Biggest Drift Corrected by This Audit

- code is Retouchio-first, not an actively branded RenderForge runtime
- `package.json` is still named `nanobanana-test`, which is naming drift rather than current product truth
- canonical v2 is the active system center
- Batch Jobs is a separate page, not a sub-view inside Job Builder
- the supported Job Builder surface now shows primary and advanced compile-active controls explicitly, while remaining hidden fields act only as backing mirrors or legacy residue
- Phase 1 now makes non-subject reference authority deterministic across compiler, resolver, and request assembly
- missing non-subject `source` now defaults to `system`, so stale asset-only payloads no longer activate refs
- Phase 2 now makes the default server-backed input lifecycle non-destructive by staging inputs per run instead of moving source files
- Phase 3 now surfaces supported compile-active Job Builder fields as either primary-visible or advanced-visible controls, and removes raw `garment.mode` and top-level `accessory.mode` from direct authoring
- Phase 4 now turns outputs into a real file-backed decision workflow with explicit run, attempt, output, review, final-selection, and retry behavior
