# Codex Task Board

## P0

| Task | Outcome | Code area |
| --- | --- | --- |
| Align non-subject resolver gating with compiler authority rules | remove compile/runtime ambiguity for footwear, headwear, and accessory refs | `prompt_system/compiler/resolveRefs.js`, `buildPrompt.js`, UI state cleanup |
| Add staged-run retention and cleanup policy | keep per-run staging auditable without unbounded filesystem growth | `job_builder_server.js`, `staging/runs/*` |

## P1

| Task | Outcome | Code area |
| --- | --- | --- |
| Expose or intentionally hide scene/output/global-negative controls | restore UI-to-canonical parity | `ui/job-builder/*` |
| Clean stale examples and registry seeds | remove misleading ids and sample payloads | `jobs/*`, `prompt_system/schemas/*`, `prompt_system/registry/*` |
| Add tests around normalization, resolver, and manifest pairing | protect the active execution spine | `prompt_system/compiler/*` |

## P2

| Task | Outcome | Code area |
| --- | --- | --- |
| Decide whether Python validator becomes active or archived | remove architectural ambiguity | `validator/*`, server integration points |
| Decide whether `prompt_contracts/*` stays experimental or is removed | reduce duplicate system narratives | `prompt_contracts/*` |
| Implement real approval state if output review is meant to be operational | close the gap between preview and production workflow | `ui/job-builder/*`, `ui/batch-jobs/*`, server APIs |
