const SCENE_PROFILE_LINES = {
  studio_catalog: [
    'Replace the amateur environment with a clean studio infinity background.',
    'Use soft premium catalog lighting, grounded contact shadows, and clean edge separation.',
    'Use a neutral off-white or light warm studio background with no distracting floor seam or clutter.',
    'Keep the environment framing-safe for catalog cropping and marketplace reuse.',
    'Preserve believable foot grounding, subtle ambient occlusion, and floor falloff under both feet.',
  ],
};

module.exports = {
  id: 'scene',
  label: 'Scene',
  supportedModes: ['apply', 'preserve', 'ignore'],
  variants: ['infinity_background', 'source_scene'],
  ruleGroups: ['scene_rules', 'background_grounding'],
  compile({ entity }) {
    if (!entity || entity.mode === 'ignore') {
      return [];
    }

    const lines = [];

    if (entity.mode === 'preserve') {
      lines.push('Preserve the original scene family unless a stronger scene rule explicitly overrides it.');
      lines.push('Do not introduce random props, set pieces, or editorial environmental drama.');
    }

    if (entity.mode === 'apply' && entity.profile) {
      lines.push(...(SCENE_PROFILE_LINES[entity.profile] || []));
      lines.push('Keep the background calm, neutral, and subordinate to the garment and active accessories.');
    }

    if (Array.isArray(entity.rules)) {
      lines.push(...entity.rules);
    }

    return [
      {
        id: 'scene_rules',
        label: 'Scene Rules',
        lines,
      },
    ];
  },
};
