const FROZEN_SCHEMA_VERSION = '2';

const FROZEN_TOP_LEVEL_FIELDS = [
  'version',
  'jobId',
  'displayName',
  'inputSource',
  'entities',
  'meta',
];

const FROZEN_ENTITY_NAMES = [
  'subject',
  'garment',
  'footwear',
  'headwear',
  'accessory',
  'scene',
  'output_profile',
  'global_negative_rules',
];

const SUBJECT_MODES = ['preserve', 'transfer_identity'];
const SUBJECT_SOURCES = ['system', 'reference'];
const SUBJECT_REFINEMENT_LEVELS = ['preserve', 'light', 'pro'];

const FROZEN_ENTITY_MODE_MAP = {
  subject: SUBJECT_MODES,
  garment: ['preserve', 'restyle', 'ignore'],
  footwear: ['preserve', 'replace', 'remove', 'ignore'],
  headwear: ['preserve', 'add', 'replace', 'remove', 'ignore'],
  accessory: ['apply', 'ignore'],
  scene: ['apply', 'preserve', 'ignore'],
  output_profile: ['apply', 'ignore'],
  global_negative_rules: ['apply', 'ignore'],
};

const FROZEN_ACCESSORY_ITEM_MODES = ['preserve', 'add', 'replace', 'remove', 'ignore'];
const GARMENT_REFINEMENT_LEVELS = ['preserve', 'minimal', 'repair'];

const FROZEN_STABLE_FIELD_NAMES = [
  'version',
  'jobId',
  'displayName',
  'inputSource',
  'entities',
  'mode',
  'variant',
  'source',
  'placement',
  'asset_id',
  'reference_id',
  'reference_ids',
  'profile',
  'items',
  'detail_refs',
  'refinement_level',
  'face_refinement',
  'pose_refinement',
];

module.exports = {
  FROZEN_SCHEMA_VERSION,
  FROZEN_TOP_LEVEL_FIELDS,
  FROZEN_ENTITY_NAMES,
  FROZEN_ENTITY_MODE_MAP,
  FROZEN_ACCESSORY_ITEM_MODES,
  GARMENT_REFINEMENT_LEVELS,
  SUBJECT_MODES,
  SUBJECT_SOURCES,
  SUBJECT_REFINEMENT_LEVELS,
  FROZEN_STABLE_FIELD_NAMES,
};
