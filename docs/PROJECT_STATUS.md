# Project Status

## Completed
- Active execution spine is `job config -> normalize + validate -> buildPrompt -> resolveRefs -> edit.js`.
- Main execution flow validates canonical jobs before compile/run via `job_builder_server.js` and `prompt_system/compiler/validateCanonicalJob.js`.
- Dry batch readiness check validates the job, compiles the prompt, resolves references, and verifies the input source via `prompt_system/compiler/dryBatchCheck.js`.
- Canonical job schema remains the behavioral source of truth for compiler and runtime decisions.
- Subject control refactor is active in the canonical schema with `mode`, `source`, `reference_id`, `reference_ids`, `face_refinement`, and `pose_refinement`.
- Subject prompt compilation is active as three ordered blocks: identity -> face refinement -> pose refinement.
- `transfer_identity` semantics are enforced across `prompt_system/modules/subject.js`, `prompt_system/modules/core.js`, `prompt_system/modules/global_negative_rules.js`, and `prompt_system/compiler/buildPrompt.js`.
- `preserve` mode keeps target identity authority; subject references remain supporting-only instead of replacement identity authority.
- `transfer_identity` mode treats the uploaded subject reference as facial identity authority while keeping target-led body, skin continuity, hair continuity, pose direction, framing, garment continuity, and scene continuity.
- Entity-driven reference resolution remains active for subject, garment detail, footwear, headwear, and accessory references.
- Internal multi-page UI is active across `/job-builder`, `/asset-manager`, `/input-manager`, and `/batch-jobs`, with shared shell/navigation.
- Compile preview, canonical JSON preview, dry check, batch monitor, review tagging, and batch-scoped output storage are present in the repo.

## In Progress
- Legacy subject compatibility reads are still active in normalization and UI hydration for old values such as `replace`, `lock`, and `ignore`.
- Subject control cleanup is not fully finished at stylesheet level; `ui/job-builder/styles.css` still contains `.model-constraints-*` residue even though the user-facing constraints control has been removed.

## Blocked
- There is no separate output registry implementation in the current compiler/runtime path; the repo currently exposes `batchRegistry` plus filesystem output folders instead.
- There is no retry-pack flow for failed batch outcomes in the repo.
- There is no production orchestration layer beyond the current `job_builder_server.js` plus `edit.js` batch flow.

## Next
- Add compiler regression coverage for subject `preserve` vs `transfer_identity` prompt output and authority binding behavior.
- Remove remaining legacy subject compatibility branches after saved jobs no longer require old subject values.
- Remove unused `.model-constraints-*` stylesheet residue left behind by the old subject constraints UI.
- Implement the missing output registry, retry flow, and higher-level production orchestration only after the current compiler path is considered stable.
