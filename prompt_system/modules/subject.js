const SUBJECT_REFINEMENT_BLOCKS = {
  face: {
    preserve: [
      'Preserve the facial presentation as much as possible.',
      'Do not introduce beautification, expression change, makeup styling, or smile enhancement beyond natural cleanup.',
    ],
    light: [
      'Apply light facial refinement only.',
      'Allow subtle cleanup in expression, gaze, facial tension, and natural presentation.',
      'Keep the result realistic and controlled.',
      'Do not over-beautify or alter facial identity.',
    ],
    pro: [
      'Apply stronger but still realistic facial refinement.',
      'You may improve facial presentation through a more confident expression, subtle smile control, cleaner gaze, and very light beauty retouching.',
      'Keep the person natural and recognizable.',
      'Do not alter core facial identity.',
    ],
  },
  pose: {
    preserve: [
      'Preserve the existing pose and body presentation.',
      'Keep the current body direction and stance unchanged.',
      'Do not introduce pose stylization beyond natural stabilization.',
    ],
    light: [
      'Apply light pose refinement while preserving the original body direction.',
      'Keep front, side, back, or angled orientation consistent.',
      'Allow small professional improvements in head angle, shoulders, arms, hands, posture balance, and leg placement.',
    ],
    pro: [
      'Apply professional pose refinement while preserving the original body direction.',
      'Keep the same overall orientation of the subject, but upgrade the amateur stance into a cleaner professional model presentation.',
      'You may more actively refine head position, shoulders, arms, hands, posture balance, leg placement, and confidence of stance.',
    ],
  },
};

const SUBJECT_IDENTITY_BLOCKS = {
  preserve: [
    'Preserve the identity of the person in the target image.',
    'Do not change the person into someone else.',
    'If subject references are present, use them only as supporting consistency references, not as a replacement identity source.',
  ],
  transfer_identity: [
    'Use the uploaded subject reference as the authoritative facial identity source.',
    'Transfer the reference identity onto the target subject.',
    'Preserve the target body, skin continuity, hair continuity, pose direction, framing, garment continuity, and scene structure.',
    'If the original visible face conflicts with the reference identity, the reference identity must win.',
    'Do not treat this as a loose resemblance or minor beautification task.',
  ],
};

function normalizeRefinement(value) {
  if (value === 'light' || value === 'pro') {
    return value;
  }
  return 'preserve';
}

function getFaceRefinementLines(mode, faceRefinement) {
  if (mode === 'transfer_identity' && faceRefinement === 'preserve') {
    return [
      'Preserve the facial presentation as much as possible after identity transfer.',
      'Do not introduce beautification, expression change, makeup styling, or smile enhancement beyond natural cleanup.',
    ];
  }

  return SUBJECT_REFINEMENT_BLOCKS.face[faceRefinement];
}

module.exports = {
  id: 'subject',
  label: 'Subject',
  supportedModes: ['preserve', 'transfer_identity'],
  variants: ['identity_reference'],
  ruleGroups: ['subject_identity', 'subject_face_refinement', 'subject_pose_refinement'],
  compile({ entity }) {
    if (!entity) {
      return [];
    }

    const mode = entity.mode === 'transfer_identity' ? 'transfer_identity' : 'preserve';
    const faceRefinement = normalizeRefinement(entity.face_refinement);
    const poseRefinement = normalizeRefinement(entity.pose_refinement);

    return [
      {
        id: 'subject_identity_block',
        label: 'Subject Identity',
        lines: SUBJECT_IDENTITY_BLOCKS[mode],
      },
      {
        id: 'subject_face_refinement_block',
        label: 'Subject Face Refinement',
        lines: getFaceRefinementLines(mode, faceRefinement),
      },
      {
        id: 'subject_pose_refinement_block',
        label: 'Subject Pose Refinement',
        lines: SUBJECT_REFINEMENT_BLOCKS.pose[poseRefinement],
      },
    ];
  },
};
