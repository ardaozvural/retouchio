const coreModule = require('../modules/core');
const subjectModule = require('../modules/subject');
const garmentModule = require('../modules/garment');
const footwearModule = require('../modules/footwear');
const headwearModule = require('../modules/headwear');
const accessoryModule = require('../modules/accessory');
const sceneModule = require('../modules/scene');
const outputProfileModule = require('../modules/output_profile');
const globalNegativeRulesModule = require('../modules/global_negative_rules');

const MODULES = {
  core: coreModule,
  subject: subjectModule,
  garment: garmentModule,
  footwear: footwearModule,
  headwear: headwearModule,
  accessory: accessoryModule,
  scene: sceneModule,
  output_profile: outputProfileModule,
  global_negative_rules: globalNegativeRulesModule,
};

const LEGACY_SLOT_MAP = {
  footwear: {
    entityId: 'footwear',
    mode: 'replace',
    variant: 'default',
    slot_key: 'footwear',
  },
  headwear_bandana: {
    entityId: 'headwear',
    mode: 'add',
    variant: 'bandana',
    slot_key: 'headwear_bandana',
  },
  headwear_hat: {
    entityId: 'headwear',
    mode: 'add',
    variant: 'hat',
    slot_key: 'headwear_hat',
  },
  neck_scarf: {
    entityId: 'accessory',
    mode: 'add',
    item: {
      family: 'neckwear',
      variant: 'neck_scarf',
      label: 'Neck Scarf',
      slot_key: 'neck_scarf',
      mode: 'add',
    },
  },
};

function clone(value) {
  if (value === undefined || value === null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function ensureArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function createBaseEntities(defaultOutputProfile) {
  return {
    subject: {
      mode: 'preserve',
      variant: 'identity_reference',
      reference_id: null,
      reference_ids: [],
    },
    garment: {
      mode: 'preserve',
      variant: 'source_garment',
      detail_refs: {
        material: [],
        pattern: [],
      },
    },
    footwear: {
      mode: 'ignore',
      variant: null,
      asset_id: null,
      asset_ids: [],
      slot_key: null,
    },
    headwear: {
      mode: 'ignore',
      variant: null,
      asset_id: null,
      asset_ids: [],
      slot_key: null,
    },
    accessory: {
      mode: 'apply',
      items: [],
    },
    scene: {
      mode: 'apply',
      profile: 'studio_catalog',
      variant: 'infinity_background',
    },
    output_profile: {
      mode: 'apply',
      profile: defaultOutputProfile,
    },
    global_negative_rules: {
      mode: 'apply',
      items: [],
    },
  };
}

function normalizeSemanticModes(entities) {
  if (entities.subject.mode === 'lock') {
    entities.subject.mode = 'preserve';
  }

  if (entities.scene.mode && entities.scene.mode !== 'apply' && entities.scene.mode !== 'preserve' && entities.scene.mode !== 'ignore') {
    entities.scene.profile = entities.scene.profile || entities.scene.mode;
    entities.scene.mode = 'apply';
  }

  if (entities.output_profile.mode === 'use_profile') {
    entities.output_profile.mode = 'apply';
  }

  if (entities.global_negative_rules.mode === 'enforce') {
    entities.global_negative_rules.mode = 'apply';
  }

  if (entities.accessory.mode && entities.accessory.mode !== 'apply' && entities.accessory.mode !== 'ignore') {
    entities.accessory.mode = 'apply';
  }
}

function applyLegacySlotMapping(job, entities) {
  const activeSlots = ensureArray(job.activeSlots);
  const selectedAccessoryAssetIds = job.selectedAccessoryAssetIds || {};

  for (const slotName of activeSlots) {
    const mapping = LEGACY_SLOT_MAP[slotName];
    if (!mapping) {
      continue;
    }

    const assetIds = ensureArray(selectedAccessoryAssetIds[slotName]);
    if (mapping.entityId === 'accessory' && mapping.item) {
      entities.accessory.mode = entities.accessory.mode === 'ignore' ? mapping.mode : entities.accessory.mode;
      entities.accessory.items.push({
        ...mapping.item,
        asset_id: assetIds[0] || null,
        asset_ids: assetIds,
      });
      continue;
    }

    const current = entities[mapping.entityId] || {};
    entities[mapping.entityId] = {
      ...current,
      mode: current.mode === 'ignore' ? mapping.mode : current.mode,
      variant: current.variant || mapping.variant,
      slot_key: current.slot_key || mapping.slot_key,
      asset_id: current.asset_id || assetIds[0] || null,
      asset_ids: current.asset_ids?.length ? current.asset_ids : assetIds,
    };
  }
}

function applyExistingEntityMapping(job, entities) {
  const legacyEntities = job.entities || {};

  if (legacyEntities.subject?.reference && !entities.subject.reference_id) {
    entities.subject.mode = entities.subject.mode === 'ignore' ? 'preserve' : entities.subject.mode;
    entities.subject.reference_id = legacyEntities.subject.reference;
  }

  if (legacyEntities.garment?.mode) {
    entities.garment.mode = legacyEntities.garment.mode;
  }

  if (legacyEntities.footwear) {
    entities.footwear.mode = legacyEntities.footwear.mode || entities.footwear.mode;
    entities.footwear.asset_id = entities.footwear.asset_id || legacyEntities.footwear.reference || null;
    entities.footwear.asset_ids = entities.footwear.asset_ids?.length
      ? entities.footwear.asset_ids
      : ensureArray(legacyEntities.footwear.reference);
  }

  if (legacyEntities.headwear) {
    entities.headwear.mode = legacyEntities.headwear.mode || entities.headwear.mode;
    entities.headwear.asset_id = entities.headwear.asset_id || legacyEntities.headwear.reference || null;
    entities.headwear.asset_ids = entities.headwear.asset_ids?.length
      ? entities.headwear.asset_ids
      : ensureArray(legacyEntities.headwear.reference);

    if (!entities.headwear.variant) {
      if (String(legacyEntities.headwear.reference || '').includes('bandana')) {
        entities.headwear.variant = 'bandana';
      } else if (String(legacyEntities.headwear.reference || '').includes('hat')) {
        entities.headwear.variant = 'hat';
      }
    }
  }

  if (legacyEntities.accessory?.items && Array.isArray(legacyEntities.accessory.items)) {
    entities.accessory.mode = legacyEntities.accessory.mode || 'add';
    entities.accessory.items.push(...clone(legacyEntities.accessory.items));
  }
}

function normalizeJob(job, options = {}) {
  const defaultOutputProfile = options.defaultOutputProfile || 'catalog_4x5_2k';
  const baseEntities = createBaseEntities(defaultOutputProfile);
  const isCanonicalJob = job.version === '2';
  const canonicalEntities = {
    ...baseEntities,
    ...(clone(job.entities) || {}),
  };

  canonicalEntities.subject = {
    ...baseEntities.subject,
    ...canonicalEntities.subject,
  };
  canonicalEntities.garment = {
    ...baseEntities.garment,
    ...canonicalEntities.garment,
    detail_refs: {
      ...baseEntities.garment.detail_refs,
      ...(canonicalEntities.garment?.detail_refs || {}),
    },
  };
  canonicalEntities.footwear = {
    ...baseEntities.footwear,
    ...canonicalEntities.footwear,
  };
  canonicalEntities.headwear = {
    ...baseEntities.headwear,
    ...canonicalEntities.headwear,
  };
  canonicalEntities.accessory = {
    ...baseEntities.accessory,
    ...canonicalEntities.accessory,
    items: clone(canonicalEntities.accessory?.items || []),
  };
  canonicalEntities.scene = {
    ...baseEntities.scene,
    ...canonicalEntities.scene,
  };
  canonicalEntities.output_profile = {
    ...baseEntities.output_profile,
    ...canonicalEntities.output_profile,
  };
  canonicalEntities.global_negative_rules = {
    ...baseEntities.global_negative_rules,
    ...canonicalEntities.global_negative_rules,
    items: clone(canonicalEntities.global_negative_rules?.items || []),
  };

  if (job.subjectReference && !canonicalEntities.subject.reference_id) {
    canonicalEntities.subject.mode = canonicalEntities.subject.mode === 'ignore' ? 'preserve' : canonicalEntities.subject.mode;
    canonicalEntities.subject.reference_id = job.subjectReference;
    canonicalEntities.subject.reference_ids = ensureArray(job.subjectReference);
  }

  if (job.outputProfile && !canonicalEntities.output_profile.profile) {
    canonicalEntities.output_profile.profile = job.outputProfile;
  }

  applyLegacySlotMapping(job, canonicalEntities);
  if (!isCanonicalJob) {
    applyExistingEntityMapping(job, canonicalEntities);
  }

  normalizeSemanticModes(canonicalEntities);

  canonicalEntities.subject.reference_ids = canonicalEntities.subject.reference_ids?.length
    ? canonicalEntities.subject.reference_ids
    : ensureArray(canonicalEntities.subject.reference_id);

  if (canonicalEntities.subject.reference_id && canonicalEntities.subject.mode === 'ignore') {
    canonicalEntities.subject.mode = 'preserve';
  }

  return {
    version: '2',
    jobId: job.jobId || 'unnamed-job',
    displayName: job.displayName || job.jobId || 'retouchio-job',
    inputSource: job.inputSource || 'batch_input',
    entities: canonicalEntities,
    meta: {
      source_format: job.entities ? 'mixed' : 'legacy_slots',
      legacy_active_slots: ensureArray(job.activeSlots),
    },
  };
}

function resolveEntity(entityId, entityConfig) {
  const mod = MODULES[entityId];
  if (!mod) {
    throw new Error(`Unknown entity module: ${entityId}`);
  }

  const normalizedEntity = {
    mode: mod.supportedModes[0],
    ...clone(entityConfig || {}),
  };

  if (!mod.supportedModes.includes(normalizedEntity.mode)) {
    throw new Error(
      `Unsupported mode "${normalizedEntity.mode}" for entity "${entityId}". Supported: ${mod.supportedModes.join(', ')}`
    );
  }

  return {
    module: mod,
    entity: normalizedEntity,
  };
}

module.exports = {
  MODULES,
  LEGACY_SLOT_MAP,
  normalizeJob,
  resolveEntity,
};
