# Architecture

The active architecture follows a contract + mode + resolver + compiler + runner spine.

## Job Layer

The Job Layer defines behavior.

- Input format is the canonical job schema.
- Behavioral center is `entities`.
- Each entity uses stable fields such as `mode`, `variant`, `asset_id`, `reference_id`, `profile`, and `items`.
- The legacy slot system is accepted only as compatibility input and is normalized before runtime execution.

## Compiler Layer

The Compiler Layer turns job intent into compiled prompt instructions.

- Entry point: `prompt_system/compiler/buildPrompt.js`
- Normalization: `prompt_system/compiler/resolveEntity.js`
- Module system: `prompt_system/modules/*`
- Output:
  - `canonicalJob`
  - compiled `prompt`
  - `imageConfig`

This layer decides behavior. The runtime does not.

Default global base behavior inside this layer is strict catalog cleanup only.

- Base cleanup is accessory-free by default.
- Styling additions belong to entity/preset layers, not the base layer.
- Pose correction in the base layer is limited and must not change orientation class, camera direction, or framing family.

## Reference Layer

The Reference Layer turns canonical entities into concrete image assets.

- Entry point: `prompt_system/compiler/resolveRefs.js`
- Source of truth: canonical entities, not slots
- Output groups:
  - subject
  - garment material details
  - garment pattern details
  - footwear
  - headwear
  - accessory families

## Runtime Layer

The Runtime Layer applies compiled decisions.

- Entry point: `edit.js`
- Poll/download: `batch_poll_download.js`
- Responsibilities:
  - load job
  - call compiler
  - call reference resolver
  - upload target and reference images
  - assemble request parts
  - write JSONL
  - submit batch

Runtime rule:

> The runtime runner applies compiled decisions. It does not invent behavior.

## UI/Workspace Layer

The internal UI/workspace layer provides operator surfaces over the same runtime spine.

- Job Builder = canonical job builder and execution surface
- Asset Manager = reference ingestion surface
- Target Inputs = managed target input surface
- shared shell = internal navigation/workspace layer across all surfaces
- Batch Jobs is currently a real section inside Job Builder (`/job-builder#batch-jobs`), not a separate backend/runtime system.

## Data Flow

1. Load job
2. Normalize to canonical
3. Compile prompt
4. Resolve references
5. Upload refs and target
6. Assemble request parts
7. Write JSONL
8. Submit batch and poll/download
