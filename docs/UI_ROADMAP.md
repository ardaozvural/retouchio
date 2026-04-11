# UI Roadmap

This roadmap is grounded in current code. It distinguishes between what already exists, what is missing, and what should logically happen next.

## Already Implemented

- separate pages for Production Flow, Reference Library, Target Inputs, and Batch Jobs
- inline subject upload inside Production Flow
- inline reference upload and input-set upload modals inside Production Flow
- visible styling controls for eyewear, bag, headwear, and footwear
- visible advanced authoring controls for scene, output profile, global negative rules, extra accessory rows, and draft tooling
- visible compile inspect surface for selections, canonical JSON, prompt, references, and compile summary
- compile, dry-check, run, cancel, download, and compare-preview actions
- dedicated Batch Jobs review page with output-only and compare modes
- real approve, reject, and retry actions backed by server persistence

## Implemented With Intentional Scope

- Production Flow remains the main authoring surface, not a raw canonical editor.
- Primary visible controls cover the common path: input source, subject, garment detail refs, and primary styling slots.
- Advanced visible controls cover lower-frequency but real compile-active fields.
- Internal backing fields still exist for some visible shells, but they are no longer hidden authoring-only controls.

## Not Implemented Yet

- richer workflow state beyond `in_review`, `approved`, `rejected`
- multi-step review assignment, ownership, or approval queues
- broader audit/report surfaces beyond the current attempt-grouped review UI

## Grounded Next Milestones

1. Expose the frozen authority contract consistently anywhere the UI explains source, reference, or asset binding behavior.
2. Decide whether the internal mirror controls behind visible shells should be thinned further or left as implementation detail.
3. Decide whether Batch Jobs should surface staged-input traceability more explicitly or keep using the current manifest-backed preview behavior.
4. Add lightweight history/status cues in Job Builder for newly created retry attempts.
5. Remove or correct stale example assets and sample jobs so the UI cannot teach users bad ids.

## UI Truth to Preserve

- `workflowType` is a view preset, not canonical job state
- Batch Jobs is a separate page
- compare mode is a preview mode, not a selection workflow
- current approve and regenerate buttons now call real persisted actions, but they are still intentionally thin entry points rather than a full review console
