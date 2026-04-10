# Master System Architecture

## Core Principle

The system is designed around deterministic control over generative behavior.

Behavior is decided before runtime execution, not improvised during request submission.

## Spine

The active system follows this spine:

`job config -> normalize + validate -> compiler -> resolver -> runtime runner`

Operational roles:

- job config is the behavioral center
- normalization resolves compatibility inputs into canonical entity state
- validation gates dry check and run execution
- compiler produces the final prompt sections and output config
- resolver loads runtime reference files from canonical entities
- runtime runner applies compiled decisions to the batch payload

## Behavioral Center

The canonical job schema is the source of behavioral truth.

It defines:

- entity behavior
- reference authority inputs
- scene and output profile behavior
- global negative rules
- subject identity, face refinement, and pose refinement behavior

The legacy slot system is not the primary architecture. It remains compatibility input for normalization.

The default global base prompt is still a strict cleanup layer, but subject-aware rewrites are now applied during compilation.

- no uncontrolled redesign
- no accessory injection unless an active entity requests it
- pose behavior is conditioned by the active subject refinement level
- styling additions belong to entity or preset layers, not the base layer

## Subject Control Model

The active canonical subject schema is:

- `mode`: `preserve` | `transfer_identity`
- `source`: `system` | `reference`
- `reference_id` / `reference_ids`
- `face_refinement`: `preserve` | `light` | `pro`
- `pose_refinement`: `preserve` | `light` | `pro`

Compiler behavior:

- subject instructions compile in fixed order: identity -> face refinement -> pose refinement
- `transfer_identity` makes the uploaded subject reference the facial identity authority
- `preserve` keeps the target image as the subject identity authority
- subject references in `preserve` mode are supporting-only, not replacement identity authority
- core rules and global negative rules are conditioned by subject mode instead of staying static

## Runtime Model

The runtime runner is `edit.js`.

Its job is operational, not interpretive:

- load job
- compile prompt
- resolve references
- upload target and refs
- assemble request parts
- write JSONL
- submit batch
- hand off polling and download

Runtime rule:

> The runtime runner applies compiled decisions. It does not invent behavior.

## Reference Model

The active reference model is entity-driven.

Reference authority is resolved from canonical entities, then injected into the runtime payload in a stable order.

Primary reference roles:

- in `transfer_identity`, subject reference = facial identity authority
- target image remains body, pose class, framing, garment, and scene continuity authority
- in `preserve`, target image = subject identity authority and subject refs are supporting-only
- garment detail references = material, texture, pattern, and close-up fidelity authority
- footwear references = footwear design authority
- headwear references = headwear design authority
- accessory references = scoped item design authority only, never identity authority

## Validator Position

Validator logic is an active gate in dry check and run preparation.

It is still not the primary behavioral brain of the system; canonical job state and compiler decisions remain primary.

## Production Truth

Current production truth:

- modular prompt compiler is active
- canonical job schema is active
- canonical validation is active in dry check and run preparation
- entity-driven reference resolver is active
- stable batch runner is active
- legacy slot handling is compatibility-only
- higher-level output registry, retry flow, and orchestration are not yet present
