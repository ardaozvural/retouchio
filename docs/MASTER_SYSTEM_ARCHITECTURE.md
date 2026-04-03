# Master System Architecture

## Core Principle

The system is designed around deterministic control over generative creativity.

Behavior should be decided before runtime execution, not improvised during request submission.

## Spine

The active system follows this spine:

`job config -> contract + mode -> resolver -> compiler -> runtime runner`

Operational roles:

- job config is the behavioral center
- contract and mode define intended behavior
- resolver normalizes and routes entities
- compiler produces the final prompt and output config
- runtime runner applies compiled decisions to the batch payload

## Behavioral Center

The canonical job schema is the source of behavioral truth.

It defines:

- entity behavior
- reference authority inputs
- scene and output profile behavior
- global negative rules

The legacy slot system is not the primary architecture. It remains only as compatibility input for normalization.

The default global base prompt is a strict cleanup layer.

- no redesign
- no accessory injection
- limited pose correction only
- styling additions belong to entity or preset layers, not the base layer

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

- subject references for identity authority
- garment detail references for material and pattern fidelity
- footwear references for footwear design authority
- headwear references for headwear design authority
- accessory family references for scoped styling authority

## Validator Position

Validator logic is secondary gate infrastructure.

It is not the primary brain of the system and it is not the active production center.

Its long-term role is to verify outputs after generation, not to replace job-driven behavioral control.

## Production Truth

Current production truth:

- modular prompt compiler is active
- canonical job schema is active
- entity-driven reference resolver is active
- stable batch runner is active
- legacy slot handling is compatibility-only
- Python path is not the active production center
