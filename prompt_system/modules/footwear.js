const VARIANT_TO_SLOT = {
  sandal: 'footwear',
  heel: 'footwear',
  loafer: 'footwear',
};

module.exports = {
  id: 'footwear',
  label: 'Footwear',
  supportedModes: ['preserve', 'replace', 'remove', 'ignore'],
  variants: ['sandal', 'heel', 'loafer'],
  ruleGroups: ['reference_binding', 'replacement_rules', 'foot_integration', 'grounding_rules'],
  compile({ entity, context }) {
    if (!entity || entity.mode === 'ignore') {
      return [];
    }

    const slotKey = entity.slot_key || VARIANT_TO_SLOT[entity.variant] || 'footwear';
    const slotConfig = context.slotRules?.slots?.[slotKey];
    const referenceAuthorityActive = Boolean(entity.reference_authority_active);
    const lines = [];

    if (entity.mode === 'preserve') {
      lines.push('You must preserve the original footwear from the target image unchanged.');
      lines.push('Do not replace, remove, restyle, simplify, or reinterpret the footwear; no other entity may override footwear preservation.');
      lines.push('Preserve original footwear silhouette, finish, color family, wear condition, and clean integration to the existing feet and lower-body pose.');
    } else if (entity.mode === 'replace') {
      lines.push('You must remove the original footwear and replace it with the requested footwear result; do not preserve any original footwear details once replacement is active.');
      if (referenceAuthorityActive && slotConfig?.referenceBindingText) {
        lines.push(slotConfig.referenceBindingText);
      }
      if (referenceAuthorityActive && Array.isArray(slotConfig?.rules) && slotConfig.rules.length > 0) {
        lines.push(...slotConfig.rules);
      } else if (entity.variant) {
        lines.push(`You must replace the original footwear with a ${entity.variant} result only.`);
        lines.push(`Lock overall ${entity.variant} silhouette, construction read, and finish to the requested footwear behavior.`);
      } else {
        lines.push('You must replace the original footwear with a tightly controlled footwear result only.');
        lines.push('Lock silhouette, construction read, sole logic, finish, and color family to the intended replacement.');
      }
    } else if (entity.mode === 'remove') {
      lines.push('You must remove footwear completely from the result and must not add replacement footwear, socks, slippers, or substitute styling items.');
      lines.push('Preserve foot anatomy, toe structure, ankle continuity, and believable grounding after footwear removal.');
      lines.push('Do not change garment length, lower drape, or pose class just to support footwear removal.');
    }

    if (entity.mode === 'remove') {
      lines.push('Feet must remain physically believable with clean ground interaction and no cutout artifacts.');
      lines.push('Do not leave partial soles, shoe fragments, floating shadows, or clipped toes.');
    } else {
      lines.push('Footwear must attach cleanly to the feet with believable perspective, scale, ankle alignment, and sole orientation relative to the body pose.');
      lines.push('Maintain realistic toe direction, heel contact, and clean ground contact; no floating shoes, broken shadows, or clipped feet.');
    }

    return [
      {
        id: 'footwear_rules',
        label: 'Footwear Rules',
        lines,
      },
    ];
  },
};
