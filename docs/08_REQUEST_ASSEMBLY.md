# Request Assembly

## Runtime Assembly Function

Gemini request assembly happens in `edit.js`, inside `buildRequestForImage()`.

Each input image becomes one JSONL row.

In the server-backed runtime path, those target inputs come from a per-run staged snapshot under `staging/runs/<runId>/inputs/`, not directly from `inputs/sets/*` or `batch_input/`.

## Shared Gate

Reference inclusion is now driven by the same authority decision used by the compiler.

Runtime does not decide reference upload from `asset_id` alone anymore.

`resolveReferences()` reads `runtime_expected_uploads` from the shared authority layer and only resolves those refs.

That means request assembly only includes refs that passed the shared gate.

## JSONL Row Shape

```json
{
  "key": "<input filename stem>",
  "request": {
    "contents": [
      {
        "role": "user",
        "parts": []
      }
    ],
    "systemInstruction": {
      "parts": [
        {
          "text": "<compiled prompt>"
        }
      ]
    },
    "generationConfig": {
      "responseModalities": ["IMAGE"],
      "imageConfig": {
        "aspectRatio": "4:5 or 1:1",
        "imageSize": "2K"
      }
    }
  }
}
```

## What Goes into `systemInstruction`

Only the compiled prompt text goes into `systemInstruction`.

That prompt already contains:

- core rules
- subject rules
- garment rules
- footwear rules
- headwear rules
- accessory rules
- scene rules
- output profile rules
- global negative rules
- intent binding
- reference binding

## What Goes into `contents[0].parts`

The user content carries the target image and all resolved reference files, in fixed order.

Exact order:

1. text: `Target input image: <fileName>`
2. target input image fileData
3. subject references, each as text then fileData
4. garment material detail references, each as text then fileData
5. garment pattern detail references, each as text then fileData
6. footwear references, each as text then fileData
7. headwear references, each as text then fileData
8. accessory references grouped by family, each as text then fileData
9. final text: `Apply the compiled catalog edit rules to this target image.`

## Injection Conditions

Subject refs are injected only when:

- `entities.subject.source === "reference"`
- `entities.subject.reference_id` exists

Garment material refs are injected only when:

- `entities.garment.mode !== "ignore"`
- ids remain listed in `entities.garment.detail_refs.material`

Garment pattern refs are injected only when:

- `entities.garment.mode !== "ignore"`
- ids remain listed in `entities.garment.detail_refs.pattern`

Footwear refs are injected only when:

- `entities.footwear.mode === "replace"`
- `entities.footwear.source === "reference"`
- `entities.footwear.asset_id` exists

Headwear refs are injected only when:

- `entities.headwear.mode` is `add` or `replace`
- `entities.headwear.source === "reference"`
- `entities.headwear.asset_id` exists

Accessory item refs are injected only when:

- `entities.accessory.mode !== "ignore"`
- item mode is `add` or `replace`
- item `source === "reference"`
- item `asset_id` exists

Important:

For footwear, headwear, and accessory items, `asset_id` alone no longer activates upload.

Missing non-subject `source` also does not activate upload. Normalization defaults missing non-subject `source` fields to `system`.

## Authority Report

`buildPrompt()` now returns an `authority` block that declares:

- which entities are active
- which references are active authorities
- which stale fields were stripped
- which uploads runtime expects
- which authority warnings were emitted

Server compile and dry-check responses include that block as well.

## Request Key Semantics

The request `key` is `path.parse(fileName).name`.

Server-backed staging preserves the original filename when it copies inputs into the run snapshot, so request keys stay aligned with the original source filenames.

This same key is later used for:

- output image filenames
- manifest request item mapping
- batch output pairing

The manifest now stores both original and staged input paths per request item, so pairing can preserve traceability without depending on destructive input moves.

Risk:

- duplicate filename stems across different inputs still collapse key uniqueness

## Image Config Source

`imageConfig` comes from `buildPrompt()`:

- selected by `entities.output_profile.profile`
- read from `config/output_profiles.json`

If no `imageConfig` is returned, `edit.js` falls back to:

- `aspectRatio: "4:5"`
- `imageSize: "2K"`
