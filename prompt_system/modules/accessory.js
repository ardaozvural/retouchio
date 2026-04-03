const GENERIC_ACCESSORY_LINES = {
  sunglasses: [
    'Sunglasses must sit naturally on the eyes or on top of the head and must remain minimal, premium, and physically believable.',
    'Do not distort face shape, eye spacing, nose bridge geometry, or hairline when placing eyewear.',
  ],
  hand_bag: [
    'The bag must integrate naturally with hand, shoulder, or forearm placement and obey gravity.',
    'Do not let the bag cover critical garment zones, distort pose balance, or alter body proportions.',
  ],
  shoulder_bag: [
    'The bag must integrate naturally with hand, shoulder, or forearm placement and obey gravity.',
    'Do not let the bag cover critical garment zones, distort pose balance, or alter body proportions.',
  ],
  neck_scarf: [
    'Treat neckwear as a neck-zone accessory only and do not collapse it into headwear.',
    'Keep overlap natural and do not cover critical garment design details or distort neckline structure.',
  ],
};

module.exports = {
  id: 'accessory',
  label: 'Accessory',
  supportedModes: ['apply', 'ignore'],
  variants: ['eyewear', 'bag', 'neckwear'],
  ruleGroups: ['item_rules', 'scope_rules'],
  compile({ entity, context }) {
    if (!entity || entity.mode === 'ignore') {
      return [];
    }

    const items = Array.isArray(entity.items) ? entity.items : [];
    const sections = [];

    for (const item of items) {
      if (!item || item.mode === 'ignore') {
        continue;
      }

      const slotConfig = item.slot_key ? context.slotRules?.slots?.[item.slot_key] : null;
      const lines = [];
      const familyLabel = item.family || 'accessory';
      const variantLabel = item.variant || familyLabel;

      if (item.mode === 'preserve') {
        lines.push(`You must preserve the original ${familyLabel} state from the target image.`);
        lines.push(`If no ${familyLabel} item exists in the target image, do not add one.`);
        lines.push(`Do not use uploaded ${familyLabel} references as override authority while preservation is active.`);
      } else if (item.mode === 'add') {
        lines.push(`You must add a ${variantLabel} accessory in the ${familyLabel} family.`);
      } else if (item.mode === 'replace') {
        lines.push(`You must replace any existing ${familyLabel} item with a ${variantLabel} accessory.`);
        lines.push(`If no ${familyLabel} item exists, you must add a ${variantLabel} accessory instead.`);
      } else if (item.mode === 'remove') {
        lines.push(`You must remove any ${familyLabel} item from the result.`);
        lines.push(`Do not replace removed ${familyLabel} with a new ${familyLabel} item.`);
      }

      if (item.mode !== 'remove' && item.mode !== 'preserve') {
        if (slotConfig?.referenceBindingText && item.asset_id) {
          lines.push(slotConfig.referenceBindingText);
        }

        if (Array.isArray(slotConfig?.rules) && slotConfig.rules.length > 0) {
          lines.push(...slotConfig.rules);
        } else if (item.variant && GENERIC_ACCESSORY_LINES[item.variant]) {
          lines.push(...GENERIC_ACCESSORY_LINES[item.variant]);
        } else if (item.family === 'bag') {
          lines.push(
            'The bag must integrate naturally with hand, shoulder, or forearm placement and obey gravity.',
            'Do not let the bag cover critical garment zones or alter body proportions.'
          );
        } else if (item.family === 'eyewear') {
          lines.push(
            'Eyewear must sit naturally on the face or on top of the head without distorting subject identity.',
            'Keep eyewear minimal, premium, and physically believable.'
          );
        } else if (item.family === 'neckwear') {
          lines.push(
            'Neckwear must stay in the neck styling zone only and must not become headwear.',
            'Keep overlap natural and do not cover critical garment design details.'
          );
        } else {
          lines.push('This accessory must remain tightly scoped to its own family and placement logic only.');
        }
      }

      if (Array.isArray(item.rules)) {
        lines.push(...item.rules);
      }

      if (item.mode === 'remove') {
        lines.push(`Remove ${familyLabel} cleanly without altering subject identity or garment fidelity.`);
      }

      lines.push('This accessory must affect only its own item. It must not redesign the garment, shift pose class, or change subject identity.');

      sections.push({
        id: `accessory_${item.variant || item.family || 'item'}`,
        label: `Accessory: ${item.label || item.variant || item.family || 'Item'}`,
        lines,
      });
    }

    return sections;
  },
};
