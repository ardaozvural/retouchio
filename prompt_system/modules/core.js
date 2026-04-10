function buildConditionalIdentityLines(subject = {}) {
  if (subject.mode === 'transfer_identity') {
    return [
      'Facial identity must follow the uploaded subject reference.',
      'Preserve the target body, skin continuity, hair continuity, pose direction, framing, garment continuity, and scene structure.',
    ];
  }

  return [
    'Keep the target subject identity unchanged: preserve face, body, skin continuity, and hair continuity as target-led anchors.',
  ];
}

function buildConditionalPoseLine(subject = {}) {
  if (subject.pose_refinement === 'pro') {
    return 'Allow professional pose refinement while keeping camera angle, body direction, pose class, and framing target-led.';
  }
  if (subject.pose_refinement === 'light') {
    return 'Allow light pose refinement while keeping camera angle, body direction, pose class, and framing target-led.';
  }
  return 'Pose correction is limited: preserve camera angle, body orientation, and framing. Only allow minor professional cleanup such as straighter posture, relaxed shoulders, and subtle stance refinement.';
}

function rewriteCoreRules(coreRules = [], subject = {}) {
  return coreRules.flatMap((line) => {
    if (String(line).startsWith('Keep model identity unchanged:')) {
      return buildConditionalIdentityLines(subject);
    }
    if (String(line).startsWith('Pose correction is limited:')) {
      return [buildConditionalPoseLine(subject)];
    }
    return [line];
  });
}

module.exports = {
  id: 'core',
  label: 'Core',
  supportedModes: ['apply', 'ignore'],
  variants: [],
  ruleGroups: ['core_rules', 'obedience_rules'],
  compile({ entity, context, job }) {
    if (!entity || entity.mode === 'ignore') {
      return [];
    }

    const subject = job?.entities?.subject || {};
    const lines = [
      'Strict catalog edit. Follow every active entity instruction exactly and suppress creative reinterpretation.',
      'Prioritize realism, product clarity, and commercial usefulness over editorial styling or generative novelty.',
      'Treat the canonical job as the behavioral source of truth and obey active reference authority boundaries.',
      'Keep all edits physically believable and scoped to the intended entity only.',
      'Do not invent optional accessories, props, scene drama, logos, or extra styling not explicitly requested.',
      ...rewriteCoreRules(context.coreRules?.coreRules || [], subject),
    ];

    if ((job?.entities?.accessory?.items || []).length === 0 && job?.entities?.headwear?.mode === 'ignore') {
      lines.push('Do not add any accessory or headwear in the default cleanup pass unless an active styling entity explicitly requests it.');
    }

    return [
      {
        id: 'core_rules',
        label: 'Core Rules',
        lines,
      },
    ];
  },
};
