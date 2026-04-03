const path = require('path');
const { buildOptionRegistry } = require('./optionRegistry');
const {
  getCandidateDirsForEntity,
  hasAssetInCandidateDirs,
  loadAssetBankStandard,
  validateAssetIdWithStandard,
} = require('./assetBank');
const {
  FROZEN_ACCESSORY_ITEM_MODES,
  FROZEN_ENTITY_MODE_MAP,
  FROZEN_ENTITY_NAMES,
  FROZEN_SCHEMA_VERSION,
  FROZEN_TOP_LEVEL_FIELDS,
} = require('./schemaConstants');

const INTENT_SOURCES = ['system', 'reference'];
const INTENT_PLACEMENTS = {
  footwear: ['on_feet'],
  headwear: ['auto', 'on_head'],
  eyewear: ['auto', 'on_eyes', 'on_head', 'in_hand'],
  bag: ['auto', 'in_hand', 'on_forearm', 'on_shoulder', 'crossbody'],
};

function ensureArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function pushUnsupported(errors, pathLabel, value, allowed) {
  errors.push(`${pathLabel} has unsupported value "${value}". Supported: ${allowed.join(', ')}`);
}

function pushInvalidAsset(errors, pathLabel, assetId, check) {
  errors.push(
    `${pathLabel}="${assetId}" does not match asset bank naming convention${check.pattern ? ` (${check.pattern})` : ''}.`
  );
}

function pushInvalidType(errors, pathLabel, expected) {
  errors.push(`${pathLabel} must be ${expected}.`);
}

function validateAssetExists(warnings, pathLabel, assetId, candidateDirs) {
  if (!assetId) {
    return;
  }

  if (!hasAssetInCandidateDirs(assetId, candidateDirs)) {
    warnings.push(`${pathLabel}="${assetId}" is not resolvable from refs directories (${candidateDirs.join(', ')}).`);
  }
}

function validateIntentField(errors, pathLabel, value, allowed) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  if (typeof value !== 'string') {
    pushInvalidType(errors, pathLabel, 'a string');
    return;
  }
  if (!allowed.includes(value)) {
    pushUnsupported(errors, pathLabel, value, allowed);
  }
}

function validateCanonicalJob(job, options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..', '..');
  const registry = options.registry || buildOptionRegistry(rootDir);
  const standard = loadAssetBankStandard(rootDir);
  const entities = job?.entities || {};
  const registryEntities = registry.entities || {};
  const errors = [];
  const warnings = [];
  const futureHooks = {
    shapeValidation: [
      'footwear presence/absence verification for preserve, replace, and remove modes',
      'headwear presence/absence verification for preserve, add, replace, and remove modes',
    ],
    accessoryExistenceValidation: [
      'family-scoped existence checks for eyewear, bag, and neckwear accessory items',
    ],
    driftDetection: [
      'footwear replacement drift detection against reference authority',
      'headwear and accessory local-scope drift detection',
    ],
  };

  if (job?.version && job.version !== FROZEN_SCHEMA_VERSION) {
    errors.push(`version must be "${FROZEN_SCHEMA_VERSION}". Received "${job.version}".`);
  }

  const unknownTopLevelFields = Object.keys(job || {}).filter((field) => !FROZEN_TOP_LEVEL_FIELDS.includes(field));
  if (unknownTopLevelFields.length > 0) {
    warnings.push(`Unknown top-level fields detected: ${unknownTopLevelFields.join(', ')}`);
  }

  if (!job?.jobId) {
    warnings.push('jobId is empty. A stable identifier is recommended.');
  }

  if (!job?.displayName) {
    warnings.push('displayName is empty. A readable runtime label is recommended.');
  }

  if (!job?.inputSource) {
    warnings.push('inputSource is empty. Runtime usually expects batch_input.');
  }

  const unknownEntityKeys = Object.keys(entities).filter((entityKey) => !FROZEN_ENTITY_NAMES.includes(entityKey));
  if (unknownEntityKeys.length > 0) {
    warnings.push(`Unknown entity keys detected: ${unknownEntityKeys.join(', ')}`);
  }

  for (const entityId of FROZEN_ENTITY_NAMES) {
    const entity = entities[entityId];
    if (!entity) {
      warnings.push(`${entityId} is missing. Normalization will fill defaults.`);
      continue;
    }

    const allowedModes = FROZEN_ENTITY_MODE_MAP[entityId] || [];
    if (!allowedModes.includes(entity.mode)) {
      pushUnsupported(errors, `${entityId}.mode`, entity.mode, allowedModes);
    }
  }

  const subject = entities.subject || {};
  if (subject.mode === 'preserve' && !subject.reference_id) {
    warnings.push('subject.mode is preserve but reference_id is empty.');
  }
  if (subject.reference_id) {
    const check = validateAssetIdWithStandard(standard, 'subject', subject.reference_id);
    if (!check.valid) {
      pushInvalidAsset(errors, 'subject.reference_id', subject.reference_id, check);
    }
    if (registryEntities.subject?.referenceIds?.length > 0 && !registryEntities.subject.referenceIds.includes(subject.reference_id)) {
      warnings.push(`subject.reference_id "${subject.reference_id}" is not in discovered registry list.`);
    }
    validateAssetExists(
      warnings,
      'subject.reference_id',
      subject.reference_id,
      getCandidateDirsForEntity(standard, rootDir, 'subject')
    );
  }

  const garment = entities.garment || {};
  if (garment.detail_refs && !Array.isArray(garment.detail_refs.material || [])) {
    errors.push('garment.detail_refs.material must be an array.');
  }
  if (garment.detail_refs && !Array.isArray(garment.detail_refs.pattern || [])) {
    errors.push('garment.detail_refs.pattern must be an array.');
  }
  for (const [index, detailId] of ensureArray(garment.detail_refs?.material).entries()) {
    const check = validateAssetIdWithStandard(standard, 'garmentMaterial', detailId);
    if (!check.valid) {
      pushInvalidAsset(errors, `garment.detail_refs.material[${index}]`, detailId, check);
    }
    validateAssetExists(
      warnings,
      `garment.detail_refs.material[${index}]`,
      detailId,
      getCandidateDirsForEntity(standard, rootDir, 'garmentMaterial')
    );
  }
  for (const [index, detailId] of ensureArray(garment.detail_refs?.pattern).entries()) {
    const check = validateAssetIdWithStandard(standard, 'garmentPattern', detailId);
    if (!check.valid) {
      pushInvalidAsset(errors, `garment.detail_refs.pattern[${index}]`, detailId, check);
    }
    validateAssetExists(
      warnings,
      `garment.detail_refs.pattern[${index}]`,
      detailId,
      getCandidateDirsForEntity(standard, rootDir, 'garmentPattern')
    );
  }

  const footwear = entities.footwear || {};
  const footwearVariants = registryEntities.footwear?.variants || [];
  const footwearAssets = registryEntities.footwear?.assetIds || [];
  if (footwear.variant && footwearVariants.length > 0 && !footwearVariants.includes(footwear.variant)) {
    pushUnsupported(errors, 'footwear.variant', footwear.variant, footwearVariants);
  }
  validateIntentField(errors, 'footwear.source', footwear.source, INTENT_SOURCES);
  validateIntentField(errors, 'footwear.placement', footwear.placement, INTENT_PLACEMENTS.footwear);
  if (footwear.mode === 'replace' && !footwear.asset_id && !footwear.variant) {
    errors.push('footwear.mode is replace but both asset_id and variant are empty.');
  }
  if (footwear.mode === 'remove' && footwear.asset_id) {
    errors.push('footwear.mode is remove so asset_id must be empty.');
  }
  if (footwear.mode === 'replace' && footwear.asset_id && footwearAssets.length === 0) {
    warnings.push('No footwear assets discovered in refs/accessories/footwear.');
  }
  if (footwear.mode === 'preserve' && footwear.asset_id) {
    warnings.push('footwear.mode is preserve; asset_id is not required and will not override original footwear.');
  }
  if (footwear.asset_id && footwear.mode !== 'remove') {
    const check = validateAssetIdWithStandard(standard, 'footwear', footwear.asset_id);
    if (!check.valid) {
      pushInvalidAsset(errors, 'footwear.asset_id', footwear.asset_id, check);
    }
    if (registryEntities.footwear?.assetIds?.length > 0 && !registryEntities.footwear.assetIds.includes(footwear.asset_id)) {
      warnings.push(`footwear.asset_id "${footwear.asset_id}" is not in discovered registry list.`);
    }
    validateAssetExists(
      warnings,
      'footwear.asset_id',
      footwear.asset_id,
      getCandidateDirsForEntity(standard, rootDir, 'footwear')
    );
  }

  const headwear = entities.headwear || {};
  const headwearVariants = registryEntities.headwear?.variants || [];
  const headwearAssets = registryEntities.headwear?.assetIds || [];
  if (headwear.variant && headwearVariants.length > 0 && !headwearVariants.includes(headwear.variant)) {
    pushUnsupported(errors, 'headwear.variant', headwear.variant, headwearVariants);
  }
  validateIntentField(errors, 'headwear.source', headwear.source, INTENT_SOURCES);
  validateIntentField(errors, 'headwear.placement', headwear.placement, INTENT_PLACEMENTS.headwear);
  if ((headwear.mode === 'add' || headwear.mode === 'replace') && !headwear.asset_id && !headwear.variant) {
    warnings.push(`headwear.mode is ${headwear.mode} but both asset_id and variant are empty.`);
  }
  if (headwear.mode === 'preserve' && headwear.asset_id) {
    warnings.push('headwear.mode is preserve; asset_id is not required and will not override original headwear.');
  }
  if (headwear.mode === 'remove' && headwear.asset_id) {
    errors.push('headwear.mode is remove so asset_id must be empty.');
  }
  if ((headwear.mode === 'add' || headwear.mode === 'replace') && headwear.asset_id && headwearAssets.length === 0) {
    warnings.push('No headwear assets discovered in refs/accessories/headwear.');
  }
  if (headwear.asset_id && headwear.mode !== 'remove') {
    const check = validateAssetIdWithStandard(standard, 'headwear', headwear.asset_id);
    if (!check.valid) {
      pushInvalidAsset(errors, 'headwear.asset_id', headwear.asset_id, check);
    }
    if (registryEntities.headwear?.assetIds?.length > 0 && !registryEntities.headwear.assetIds.includes(headwear.asset_id)) {
      warnings.push(`headwear.asset_id "${headwear.asset_id}" is not in discovered registry list.`);
    }
    validateAssetExists(
      warnings,
      'headwear.asset_id',
      headwear.asset_id,
      getCandidateDirsForEntity(standard, rootDir, 'headwear')
    );
  }

  const accessory = entities.accessory || {};
  if (accessory.mode === 'apply' && !Array.isArray(accessory.items)) {
    errors.push('accessory.mode is apply but accessory.items is not an array.');
  }
  const accessoryFamilies = registryEntities.accessory?.families || [];
  const accessoryModes = registryEntities.accessory?.itemModes || FROZEN_ACCESSORY_ITEM_MODES;
  for (const [index, item] of ensureArray(accessory.items).entries()) {
    if (!item) {
      continue;
    }

    if (item.mode && accessoryModes.length > 0 && !accessoryModes.includes(item.mode)) {
      pushUnsupported(errors, `accessory.items[${index}].mode`, item.mode, accessoryModes);
    }
    validateIntentField(errors, `accessory.items[${index}].source`, item.source, INTENT_SOURCES);

    if (item.family && accessoryFamilies.length > 0 && !accessoryFamilies.includes(item.family)) {
      pushUnsupported(errors, `accessory.items[${index}].family`, item.family, accessoryFamilies);
      continue;
    }
    if (!item.family && item.mode !== 'ignore') {
      errors.push(`accessory.items[${index}].family is required when mode is ${item.mode}.`);
      continue;
    }

    const allowedVariants = registryEntities.accessory?.variantsByFamily?.[item.family] || [];
    const allowedPlacements = INTENT_PLACEMENTS[item.family] || ['auto'];
    validateIntentField(errors, `accessory.items[${index}].placement`, item.placement, allowedPlacements);
    if (item.variant && allowedVariants.length > 0 && !allowedVariants.includes(item.variant)) {
      pushUnsupported(errors, `accessory.items[${index}].variant`, item.variant, allowedVariants);
    }

    if ((item.mode === 'add' || item.mode === 'replace') && !item.asset_id && !item.variant) {
      warnings.push(`accessory.items[${index}] is ${item.mode} but both asset_id and variant are empty.`);
    }
    if (item.mode === 'preserve' && item.asset_id) {
      warnings.push(
        `accessory.items[${index}].mode is preserve; asset_id is not required and will not override original ${item.family || 'accessory'}.`
      );
    }

    if (item.mode === 'remove' && item.asset_id) {
      errors.push(`accessory.items[${index}].mode is remove so asset_id must be empty.`);
      continue;
    }

    if (item.asset_id && item.mode !== 'remove') {
      const check = validateAssetIdWithStandard(standard, 'accessory', item.asset_id, item.family);
      if (!check.valid) {
        pushInvalidAsset(errors, `accessory.items[${index}].asset_id`, item.asset_id, check);
      }
      const familyRegistryAssets = registryEntities.accessory?.assetIdsByFamily?.[item.family] || [];
      if (familyRegistryAssets.length === 0) {
        warnings.push(`No ${item.family} assets discovered in standard refs directories.`);
      }
      if (familyRegistryAssets.length > 0 && !familyRegistryAssets.includes(item.asset_id)) {
        warnings.push(`accessory.items[${index}].asset_id "${item.asset_id}" is not in discovered ${item.family} asset list.`);
      }
      validateAssetExists(
        warnings,
        `accessory.items[${index}].asset_id`,
        item.asset_id,
        getCandidateDirsForEntity(standard, rootDir, 'accessory', item.family)
      );
    }
  }

  const scene = entities.scene || {};
  const sceneProfiles = registryEntities.scene?.profiles || [];
  if (scene.profile && sceneProfiles.length > 0 && !sceneProfiles.includes(scene.profile)) {
    pushUnsupported(errors, 'scene.profile', scene.profile, sceneProfiles);
  }
  if (scene.mode === 'apply' && !scene.profile) {
    errors.push('scene.mode is apply but profile is empty.');
  }

  const outputProfile = entities.output_profile || {};
  const outputProfiles = registryEntities.output_profile?.profiles || [];
  if (outputProfile.profile && outputProfiles.length > 0 && !outputProfiles.includes(outputProfile.profile)) {
    pushUnsupported(errors, 'output_profile.profile', outputProfile.profile, outputProfiles);
  }
  if (outputProfile.mode === 'apply' && !outputProfile.profile) {
    errors.push('output_profile.mode is apply but profile is empty.');
  }

  const globalNegativeRules = entities.global_negative_rules || {};
  if (globalNegativeRules.items && !Array.isArray(globalNegativeRules.items)) {
    errors.push('global_negative_rules.items must be an array.');
  }

  if (entities.footwear?.slot_key || entities.headwear?.slot_key) {
    warnings.push('slot_key detected. Legacy slot fields are compatibility-only and not runtime authority.');
  }

  return {
    errors,
    warnings,
    futureHooks,
  };
}

module.exports = {
  validateCanonicalJob,
};
