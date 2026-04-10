# Next Steps

## Completed
- Main run path already uses canonical validation and prompt compilation before batch execution.
- Subject control schema, UI mapping, and compiler conditioning for `preserve` and `transfer_identity` are already active in the repo.

## In Progress
- Legacy subject compatibility reads still exist for older saved values such as `replace`, `lock`, and `ignore`.
- Old subject constraints styling residue still exists in `ui/job-builder/styles.css`.

## Blocked
- Output registry is not implemented.
- Retry-pack handling for failed outputs is not implemented.
- Higher-level production orchestration beyond the current batch runner flow is not implemented.

## Next
- Add compiler regression coverage for subject identity authority, face refinement, pose refinement, and reference binding output.
- Remove remaining legacy subject compatibility branches after saved jobs are migrated to the new subject schema.
- Remove unused `.model-constraints-*` CSS left from the old subject constraints surface.
- Implement output registry, retry handling, and orchestration only after the current compiler/runtime path is locked.
