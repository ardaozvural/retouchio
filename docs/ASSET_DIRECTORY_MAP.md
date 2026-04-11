# Asset Directory Map

This document maps the runtime-facing asset and storage directories that are intentionally kept out of Git.

Goal:

- keep code, compiler logic, schemas, and docs in the repository
- keep uploaded assets, generated jobs, local manifests, and run artifacts out of the repository

## Summary

| Path | Verified purpose in repo | Keep in Git |
| --- | --- | --- |
| `inputs/` | Uploaded target input sets used by Input Manager and Job Builder | No |
| `refs/` | Subject and styling reference asset bank discovered by resolver and option registry | No for image assets; directory contract only |
| `jobs/generated/` | Saved/generated canonical job files produced by builder flows | No |
| `data/` | Runtime data root; current code uses `data/batches/` for local registry and manifests | No for runtime contents |

## `inputs/`

Verified usage:

- Input upload endpoints write input sets under `inputs/sets/<input_set_id>/`.
- The server serves these files back through `/inputs/...`.
- The current code writes `_meta.json` plus `target_XX` image files.

Rebuildable skeleton:

```text
inputs/
  sets/
    <input_set_id>/
      _meta.json
      target_01.jpg
      target_02.png
```

Notes:

- `<input_set_id>` is generated from the uploaded set name plus a timestamp.
- `inputs/` is runtime content and should not be committed.

## `refs/`

Verified usage:

- Reference discovery follows `prompt_system/registry/assetBankStandard.v1.json`.
- Subject uploads write to `refs/subjects/<subject_id>/`.
- Asset uploads write to family-specific directories under `refs/accessories/` and `refs/garment_details/`.
- Resolver and option registry read these directories as the active asset bank.

Rebuildable skeleton:

```text
refs/
  subjects/
    <subject_id>/
      ref_01.jpg
  garment_details/
    material/
      <material_detail_id>/
        ref_01.jpg
    pattern/
      <pattern_detail_id>/
        ref_01.jpg
  accessories/
    footwear/
      <footwear_id>/
        ref_01.jpg
    headwear/
      <headwear_id>/
        ref_01.jpg
    eyewear/
      <eyewear_id>/
        ref_01.jpg
    bag/
      <bag_id>/
        ref_01.jpg
    neckwear/
      <neckwear_id>/
        ref_01.jpg
```

Verified canonical paths:

- `refs/subjects/<subject_id>/`
- `refs/garment_details/material/`
- `refs/garment_details/pattern/`
- `refs/accessories/headwear/`
- `refs/accessories/eyewear/`
- `refs/accessories/bag/`
- `refs/accessories/neckwear/`

Additional verified path in current repo:

- `refs/accessories/footwear/`

Compatibility-only paths still supported by resolver logic:

- `refs/accessories/hat/`
- `refs/accessories/scarf/`

Notes:

- `refs/README.md` remains the tracked naming reference, but uploaded image assets under `refs/` should not be committed.
- Naming patterns for ids are defined in `prompt_system/registry/assetBankStandard.v1.json`.

## `jobs/generated/`

Verified usage:

- Generated canonical jobs are written to `jobs/generated/` by `prompt_system/compiler/jobPersistence.js`.
- File names are stored as `<base_name>.canonical.json` with numeric suffixes when needed.

Rebuildable skeleton:

```text
jobs/
  generated/
    <job_name>.canonical.json
    <job_name>-1.canonical.json
```

Notes:

- `jobs/*.canonical.json` sample jobs can stay versioned.
- `jobs/generated/` is runtime output and should not be committed.

## `data/`

Verified usage:

- Current code uses `data/batches/registry.json` as the local batch registry.
- Current code also writes per-batch manifest files under `data/batches/`.

Rebuildable skeleton:

```text
data/
  batches/
    registry.json
    <batch_id>.manifest.json
```

Notes:

- In current repo code, `data/batches/` is the only verified runtime subdirectory under `data/`.
- Runtime data under `data/` should not be committed.

## Git Ignore Strategy

Applied ignore intent:

- ignore `inputs/`, `refs/`, and `jobs/generated/` because they hold uploaded or generated local artifacts
- ignore `data/batches/` instead of all `data/` because current code only verifies runtime writes in that subtree
- ignore `batch_requests.jsonl` and `*.log` because they are local run artifacts

## `.gitkeep` Strategy

No new `.gitkeep` files were added.

Reason:

- `jobs/generated/` is created on demand by `ensureGeneratedJobsDir()`
- `data/batches/` is created on demand by `ensureRegistryFile()`
- `inputs/sets/` is created by the input upload flow
- `refs/...` directories are created by upload flows or manual asset placement

The current repo already documents the asset-bank contract in tracked docs and registry files, so extra empty placeholder directories are not required for reconstruction.
