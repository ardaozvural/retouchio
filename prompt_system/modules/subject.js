module.exports = {
  id: 'subject',
  label: 'Subject',
  supportedModes: ['preserve', 'ignore'],
  variants: ['identity_reference'],
  ruleGroups: ['subject_lock', 'pose_orientation', 'anatomy_realism', 'subject_reference'],
  compile({ entity, context }) {
    if (!entity || entity.mode === 'ignore') {
      return [];
    }

    const sections = [];
    const subjectLockRules = [
      ...(context.coreRules?.subjectLockRules || []),
      'Preserve the same body identity, shoulder width, torso proportions, limb proportions, and overall human read.',
      'Keep the same pose class, body-to-camera orientation, and camera relationship while allowing only premium catalog cleanup.',
      'Head posture may be refined for professionalism, but no exaggerated tilt, twist, or editorial expression drift is allowed.',
    ];

    const subjectAnatomyRules = [
      'Hands must remain anatomically correct with realistic finger count, joint direction, and natural contact behavior.',
      'Maintain realistic wrists, elbows, neck, jawline continuity, and clavicle transitions.',
      'Do not create duplicated limbs, broken joints, melted fingers, or anatomy shortcuts.',
      'Do not beautify, over-retouch skin, or reshape facial features or body volume.',
    ];

    if (subjectLockRules.length > 0) {
      sections.push({
        id: 'subject_lock_rules',
        label: 'Subject Lock Rules',
        lines: subjectLockRules,
      });
    }

    sections.push({
      id: 'subject_anatomy_rules',
      label: 'Subject Anatomy Rules',
      lines: subjectAnatomyRules,
    });

    if (entity.reference_id && (context.coreRules?.subjectReferenceRules || []).length > 0) {
      sections.push({
        id: 'subject_reference_rules',
        label: 'Subject Reference Rules',
        lines: context.coreRules.subjectReferenceRules,
      });
    } else {
      sections.push({
        id: 'subject_reference_fallback',
        label: 'Subject Reference Rules',
        lines: [
          'No subject reference set is supplied; use the target image as the fallback identity authority.',
        ],
      });
    }

    return sections;
  },
};
