module.exports = {
  id: 'output_profile',
  label: 'Output Profile',
  supportedModes: ['apply', 'ignore'],
  variants: [],
  ruleGroups: ['output_profile_rules'],
  compile({ entity, context }) {
    if (!entity || entity.mode === 'ignore') {
      return [];
    }

    const profileId = entity.profile || context.defaults.outputProfile;
    const profile = context.outputProfiles?.profiles?.[profileId];
    const lines = [
      ...(context.coreRules?.outputRules || []),
      ...(profile?.promptRules || []),
    ];

    if (profile?.imageConfig?.aspectRatio === '4:5') {
      lines.push('Frame for a premium 4:5 vertical catalog output with clean full-body readability.');
      lines.push('Keep head-to-toe coverage stable and avoid awkward crop pressure on footwear, headwear, or hemline.');
    }

    if (profile?.imageConfig?.aspectRatio === '1:1') {
      lines.push('Frame for a centered square catalog output while protecting garment completeness and silhouette readability.');
    }

    if (profile?.imageConfig?.imageSize) {
      lines.push(`Preserve detail fidelity consistent with a ${profile.imageConfig.imageSize} catalog deliverable.`);
    }

    return [
      {
        id: 'output_profile_rules',
        label: 'Output Profile Rules',
        lines,
      },
    ];
  },
};
