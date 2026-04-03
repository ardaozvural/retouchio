# Reference System

## Purpose

The active reference system is entity-driven.

Reference routing now follows:

`entity -> resolved files -> uploaded refs -> request parts`

The legacy slot system is compatibility-only input. It is not the runtime authority anymore.

## Directory Strategy

Current runtime conventions:

- `refs/subjects/<reference_id>/*`
- `refs/accessories/footwear/<asset_id>/*`
- `refs/accessories/headwear/<asset_id>/*`
- `refs/accessories/hat/<asset_id>/*`
- `refs/accessories/scarf/<asset_id>/*`

Forward conventions already prepared by the resolver:

- `refs/accessories/eyewear/<asset_id>/*`
- `refs/accessories/bag/<asset_id>/*`
- `refs/accessories/neckwear/<asset_id>/*`
- `refs/garment_details/material/<detail_id>/*`
- `refs/garment_details/pattern/<detail_id>/*`

Current repo reality:

- Subject, footwear, and bandana-style headwear references are populated.
- Hat and scarf fallback directories exist as compatibility paths.
- Garment detail, eyewear, bag, and neckwear family directories are part of the resolver convention but are not yet fully populated in the current asset bank.

## Reference Groups

### Subject Refs

Directory strategy:

- `refs/subjects/<reference_id>/*`

Behavior:

- Subject refs are identity authority.
- They lock face, body proportions, age impression, skin tone, and hair identity.
- They do not define garment structure, accessory styling, or scene behavior.

### Garment Material Detail Refs

Directory strategy:

- `refs/garment_details/material/<detail_id>/*`

Behavior:

- Material refs reinforce texture and fabric fidelity.
- They help preserve material read, surface character, and fabric behavior.
- They do not override pose, framing, or garment geometry.

### Garment Pattern Detail Refs

Directory strategy:

- `refs/garment_details/pattern/<detail_id>/*`

Behavior:

- Pattern refs reinforce scale, density, and pattern geometry.
- They affect garment fidelity only.
- They do not alter identity, pose, or scene intent.

### Footwear Refs

Directory strategy:

- `refs/accessories/footwear/<asset_id>/*`

Behavior:

- Footwear refs act as exact design authority when footwear mode activates replacement or explicit preservation.
- Their authority is limited to footwear.

### Headwear Refs

Directory strategy:

- Preferred: `refs/accessories/headwear/<asset_id>/*`
- Compatibility fallback for hat variants: `refs/accessories/hat/<asset_id>/*`

Behavior:

- Headwear refs act as exact design authority for headwear.
- They can influence head styling around the accessory.
- They must not cause identity drift.

### Accessory Family Refs

#### Eyewear

- `refs/accessories/eyewear/<asset_id>/*`
- Role: styling and design authority for eyewear only

#### Bag

- `refs/accessories/bag/<asset_id>/*`
- Role: styling and design authority for bag items only

#### Neckwear

- Preferred: `refs/accessories/neckwear/<asset_id>/*`
- Compatibility fallback: `refs/accessories/scarf/<asset_id>/*`
- Role: styling and design authority for neckwear only

Accessory behavior:

- Accessory refs are family-based styling references.
- They must not alter garment silhouette.
- They must not change subject identity.

## Request Injection Order

The current runtime injects references in this order:

1. target image
2. subject refs
3. garment material refs
4. garment pattern refs
5. footwear refs
6. headwear refs
7. accessory refs
8. final instruction text

This order is intentional. It keeps authority separation stable across identity, garment fidelity, replacement items, and styling accessories.
