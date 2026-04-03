# UI Roadmap

## Current State
- internal job builder exists
- canonical job object is source of truth
- compile preview works
- JSON preview works
- validation works
- registry-driven select fields exist
- asset discovery is connected
- save/load jobs works
- dry batch check works
- run batch works
- fixed bottom execution bar is implemented
- Batch Jobs page exists
- Asset Manager exists
- Target Inputs exists
- reference assets can be uploaded, previewed, and bound into Job Builder
- target input sets can be uploaded, previewed, deleted, and bound into Job Builder inputSource
- shared internal shell exists across tool screens
- sidebar navigation works across Job Builder, Asset Manager, and Target Inputs
- Batch Jobs is reachable from shared navigation
- real page separation is implemented across Production Flow, Reference Library, Target Inputs, and Batch Jobs
- Production Flow is now the main job-setup surface
- Batch Jobs is now a dedicated monitoring/review page
- Reference Library and Target Inputs visually align with the same product system
- shared shell and visual system now unify the major pages
- pages now behave as one internal product surface instead of isolated screens
- styling has shifted toward a more decision-based UX
- output review supports compare mode
- tagging system is available for structured evaluation
- advanced vs core UI separation is introduced
- output/result flow direction is established but still needs refinement

## What It Is Not Yet
- not yet final polished product UI
- not yet fully browser-validated across all real flows
- not yet fully connected to prompt-engine behavior
- result/output experience still needs final refinement
- not yet a full output review console
- not yet preset-driven UX; interaction is still primarily form-based
- no guided workflow; users still configure all fields manually
- not connected to validator gates
- not a prompt authoring CMS
- not a full production orchestration layer

## Next UI Milestones
1. Browser-level validation and final interaction polish
2. Output/review/result experience refinement
3. Prompt engine mapping
4. Real usage testing loop
5. Later: validator-linked refinement

## UX Rule
The UI is not a prompt editor.
It is a multi-surface product UI for canonical job building, reference asset management, target input management, and execution control.
Reference assets and target images must remain separate concepts.
