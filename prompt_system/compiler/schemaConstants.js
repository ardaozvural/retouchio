const FROZEN_SCHEMA_VERSION = '2';

const FROZEN_TOP_LEVEL_FIELDS = [
  'version',
  'jobId',
  'displayName',
  'inputSource',
  'entities',
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

const FROZEN_ENTITY_MODE_MAP = {
  subject: ['preserve', 'ignore'],
  garment: ['preserve', 'restyle', 'ignore'],
  footwear: ['preserve', 'replace', 'remove', 'ignore'],
  headwear: ['add', 'replace', 'remove', 'ignore'],
  accessory: ['apply', 'ignore'],
  scene: ['apply', 'preserve', 'ignore'],
  output_profile: ['apply', 'ignore'],
  global_negative_rules: ['apply', 'ignore'],
};

const FROZEN_ACCESSORY_ITEM_MODES = ['add', 'replace', 'remove', 'ignore'];

const FROZEN_STABLE_FIELD_NAMES = [
  'version',
  'jobId',
  'displayName',
  'inputSource',
  'entities',
  'mode',
  'variant',
  'asset_id',
  'reference_id',
  'profile',
  'items',
  'detail_refs',
];

module.exports = {
  FROZEN_SCHEMA_VERSION,
  FROZEN_TOP_LEVEL_FIELDS,
  FROZEN_ENTITY_NAMES,
  FROZEN_ENTITY_MODE_MAP,
  FROZEN_ACCESSORY_ITEM_MODES,
  FROZEN_STABLE_FIELD_NAMES,
};
