module.exports = {
  id: 'global_negative_rules',
  label: 'Global Negative Rules',
  supportedModes: ['apply', 'ignore'],
  variants: [],
  ruleGroups: ['fail_rules', 'negative_items'],
  compile({ entity, context }) {
    if (!entity || entity.mode === 'ignore') {
      return [];
    }

    const lines = [
      ...(context.coreRules?.failRules || []),
      'Do not add extra people, extra limbs, random props, logos, text, or watermarks.',
      'Do not redesign the garment, alter silhouette family, shorten hemline, or change print logic.',
      'Do not create floating items, broken shadows, detached footwear, or impossible ground contact.',
      'Do not introduce anatomy corruption, duplicated fingers, broken joints, or distorted facial structure.',
      'Do not leave background artifacts, studio gear, cutout halos, or dirty masking edges.',
      'Do not shift white balance into unnatural color casts or overprocess the image into plastic retouch.',
    ];

    if (Array.isArray(entity.items)) {
      lines.push(...entity.items);
    }

    return [
      {
        id: 'global_negative_rules',
        label: 'Global Negative Rules',
        lines,
      },
    ];
  },
};
