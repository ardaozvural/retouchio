const VARIANT_TO_SLOT = {
  bandana: 'headwear_bandana',
  hat: 'headwear_hat',
  headband: 'headwear_headband',
};

const GENERIC_VARIANT_LINES = {
  bandana: [
    'Interpret this slot as a compact head wrap or bandana only.',
    'Keep the wrap controlled, compact, and naturally anchored to the head.',
  ],
  hat: [
    'Interpret this slot as a hat only.',
    'Lock hat shape, scale, wear position, and finish to the intended product behavior.',
  ],
  headband: [
    'Interpret this slot as a headband only.',
    'Keep the headband narrow, controlled, and naturally integrated with the hairline.',
  ],
};

module.exports = {
  id: 'headwear',
  label: 'Headwear',
  supportedModes: ['preserve', 'add', 'replace', 'remove', 'ignore'],
  variants: ['bandana', 'hat', 'headband'],
  ruleGroups: ['reference_binding', 'coverage_rules', 'placement_rules', 'identity_protection'],
  compile({ entity, context }) {
    if (!entity || entity.mode === 'ignore') {
      return [];
    }

    const variantLabel = entity.variant || 'requested headwear';

    if (entity.mode === 'preserve') {
      return [
        {
          id: 'headwear_rules',
          label: 'Headwear Rules',
          lines: [
            'You must preserve the original headwear state from the target image; if the target image has no headwear, do not add any.',
            'Do not use uploaded headwear references as override authority while preservation is active. Keep existing headwear, hairline interaction, and local styling continuity believable and unchanged.',
          ],
        },
      ];
    }

    if (entity.mode === 'remove') {
      return [
        {
          id: 'headwear_rules',
          label: 'Headwear Rules',
          lines: [
            'You must remove any existing headwear cleanly and must not replace it with a new headwear item.',
            'Preserve believable hairline continuity, scalp coverage logic, and local styling realism without altering subject identity or garment visibility.',
          ],
        },
      ];
    }

    const slotKey = entity.slot_key || VARIANT_TO_SLOT[entity.variant];
    const slotConfig = slotKey ? context.slotRules?.slots?.[slotKey] : null;
    const lines = [];

    if (entity.mode === 'add') {
      lines.push(`You must add ${variantLabel} headwear if it is not already present. Do not reinterpret this as a different headwear family.`);
    }

    if (entity.mode === 'replace') {
      lines.push(`You must replace existing headwear with ${variantLabel} headwear, or add it if none is present.`);
      lines.push('Do not preserve incompatible original headwear once replacement is active.');
    }

    if (slotConfig?.referenceBindingText && entity.asset_id) {
      lines.push(slotConfig.referenceBindingText);
    }

    if (Array.isArray(slotConfig?.rules) && slotConfig.rules.length > 0) {
      lines.push(...slotConfig.rules);
    } else if (entity.variant && GENERIC_VARIANT_LINES[entity.variant]) {
      lines.push(...GENERIC_VARIANT_LINES[entity.variant]);
    } else {
      lines.push('You must keep headwear behavior tightly controlled and scoped to the requested headwear family only.');
    }

    lines.push('Headwear influence must stay local to the head styling zone only; do not change face shape, skin tone, feature spacing, or any identity-defining characteristic.');
    lines.push('Keep hair interaction believable and premium; no impossible attachment, random volume spikes, or identity drift.');
    lines.push('Do not let headwear hide the face or compete with garment readability.');

    return [
      {
        id: 'headwear_rules',
        label: 'Headwear Rules',
        lines,
      },
    ];
  },
};
