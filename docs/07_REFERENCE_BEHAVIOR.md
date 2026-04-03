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
- Footwear refs: exact design authority for footwear when replacement or explicit preservation is active
- Headwear refs: exact design authority for headwear
- Accessory refs: family-based styling authority for the referenced accessory only

## Priority Rules

- Subject identity authority outranks all style references.
- The target image remains garment structure authority unless a future garment replacement model explicitly changes that rule.
- Garment structure cannot be overridden by accessories.
- Garment material and pattern refs affect garment fidelity only.
- Footwear `replace` mode activates footwear authority.
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
