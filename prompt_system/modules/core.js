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

    const lines = [
      'Strict catalog edit. Follow every active entity instruction exactly and suppress creative reinterpretation.',
      'Prioritize realism, product clarity, and commercial usefulness over editorial styling or generative novelty.',
      'This is the default strict cleanup base for catalog work. It is not a styling preset and it is not a redesign layer.',
      'Keep all edits physically believable and scoped to the intended entity only.',
      'Treat the canonical job as the behavioral source of truth and obey active reference authority boundaries.',
      'Accessory behavior is not part of the base layer. Styling additions belong to active entity or preset layers only.',
      'Do not invent optional accessories, props, scene drama, logos, or extra styling not explicitly requested.',
      ...(context.coreRules?.coreRules || []),
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
