# Migration Log

## Phase 1: Monolithic Prompt Runtime

- `edit.js` used a single large prompt path
- behavior and prompt text were tightly coupled
- runtime carried too much behavioral knowledge

## Phase 2: Legacy Slot System

- `activeSlots` and `selectedAccessoryAssetIds` became the main input pattern
- slot-based routing improved runtime control
- prompt generation and reference routing were still tied to slot logic

## Phase 3: Modular Prompt Compiler

- `prompt_system/compiler/buildPrompt.js` became the prompt compiler entry point
- modular entity compilers were introduced under `prompt_system/modules/*`
- the canonical job schema became the intended behavioral model

## Phase 4: Entity-Driven Reference Runtime

- `prompt_system/compiler/resolveRefs.js` became the runtime reference resolver
- runtime request assembly became entity-driven
- prompt compiler and reference resolver now operate on canonical entities

## Current State

- Prompt generation is modular.
- The canonical job schema is the source of behavioral truth.
- Reference routing is entity-driven.
- `edit.js` is the stable runtime runner.
- `batch_poll_download.js` remains the post-submit poll/download path.

## Compatibility Layer

Compatibility is still handled through normalization.

- Legacy slot-shaped input is accepted.
- `resolveEntity.js` maps legacy slot input into canonical entities.
- Runtime execution happens only after normalization.
- Legacy slot fields remain only as compatibility input for normalization.

## Legacy Slot System Status

The legacy slot system still exists, but only as compatibility input.

It is not:

- the runtime authority
- the reference routing authority
- the long-term schema target

Residue still visible in compatibility fields:

- `activeSlots`
- `selectedAccessoryAssetIds`
- `slot_key`

## Next Milestone

- freeze canonical schema
- freeze reference directory strategy
- connect UI to canonical job construction
- keep validator work as a later integration step
