# Reference Behavior

## Reference Types

- target image
- subject references
- garment material detail references
- garment pattern detail references
- footwear references
- headwear references
- accessory family references

## Reference Roles

- Target image: garment structure, pose class, and framing authority
- Subject refs: identity authority
- Garment material refs: fabric and material fidelity authority
- Garment pattern refs: pattern scale, density, and geometry authority
- Footwear refs: exact design authority only when `mode=replace` and canonical `source=reference`
- Headwear refs: exact design authority only when `mode=add` or `mode=replace` and canonical `source=reference`
- Accessory refs: family-based styling authority only when `mode=add` or `mode=replace` and canonical `source=reference`

## Source And Placement Intent

- `source` is now persisted canonical intent, not temporary UI state.
- `source=reference` means the compiler must include the resolved reference image and treat it as visual authority for that entity/item.
- `source=system` means the compiler should not overstate reference authority, even if compatibility data still contains an asset id.
- `preserve` means stay loyal to the original target-image slot state and must not activate uploaded slot authority.
- `placement` is now persisted canonical intent and must be carried into prompt language as use-context behavior.
- Example: `bag + source=reference + placement=on_shoulder` means the bag reference is design authority and the bag should be carried naturally on the shoulder.

## Priority Rules

- Subject identity authority outranks all style references.
- The target image remains garment structure authority unless a future garment replacement model explicitly changes that rule.
- Garment structure cannot be overridden by accessories.
- Garment material and pattern refs affect garment fidelity only.
- Footwear `replace` mode activates footwear authority.
- Headwear and accessory authority activate only in explicit override modes.
- Accessory refs cannot alter garment silhouette.
- Headwear may affect head styling, but it must not introduce identity drift.

## Conflict Resolution

Use this precedence when signals conflict:

1. subject identity authority
2. target image for garment structure, pose class, and framing
3. garment material and pattern fidelity references
4. active replacement authorities such as footwear or headwear
5. accessory styling references

Operational rules:

- Identity beats styling.
- Geometry beats styling.
- Garment fidelity beats accessory spillover.
- Accessory detail can refine its own item, but it cannot rewrite the garment or the person.
- Headwear can affect local head styling, but not face identity.
