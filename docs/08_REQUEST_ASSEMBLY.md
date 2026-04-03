# Request Assembly

## Assembly Order

The current runtime in `edit.js` assembles request parts in this order:

1. target image
2. subject references
3. garment material detail references
4. garment pattern detail references
5. footwear references
6. headwear references
7. accessory references
8. final instruction text

## Stable Label Text

Current runtime label strings:

- `Target input image: <fileName>`
- `Subject reference 1: preserve identity from this reference.`
- `Garment material detail reference 1: preserve fabric/material fidelity from this reference.`
- `Garment pattern detail reference 1: preserve exact pattern scale and density from this reference.`
- `Footwear reference 1: use this as the exact design reference for footwear.`
- `Headwear reference 1: use this as the exact design reference for headwear.`
- `Accessory eyewear reference 1: use this as the exact design reference for this accessory.`
- `Apply the compiled catalog edit rules to this target image.`

## Entity-to-Request Mapping

| Entity Group | Request Part Type |
| --- | --- |
| target image | target authority input |
| `subject` | identity authority refs |
| `garment.detail_refs.material` | material fidelity refs |
| `garment.detail_refs.pattern` | pattern fidelity refs |
| `footwear` | footwear design refs |
| `headwear` | headwear design refs |
| `accessory.items` | accessory family design refs |
| compiled prompt | final instruction text |

## Why Order Matters

The order reduces ambiguity and cross-reference leakage.

- Target image comes first because it anchors garment structure, pose class, and framing.
- Subject refs come next because identity authority must be established before styling references appear.
- Garment detail refs come before replace-style accessory refs because garment fidelity is structurally more important than styling.
- Footwear and headwear refs follow as explicit replacement or add authorities.
- Accessory refs come later because they are scoped styling inputs, not global authorities.
- Final instruction text comes last so the model receives a clean compiled rule set after all image authorities are present.
