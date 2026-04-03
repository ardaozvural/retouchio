const fs = require('fs');
const path = require('path');

const { buildAssetBankHealth, loadAssetBankStandard } = require('./assetBank');
const {
  FROZEN_ACCESSORY_ITEM_MODES,
  FROZEN_ENTITY_MODE_MAP,
  FROZEN_ENTITY_NAMES,
  FROZEN_SCHEMA_VERSION,
} = require('./schemaConstants');

const FROZEN_REGISTRY_PATH = path.join('prompt_system', 'registry', 'frozenOptions.v1.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('._'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function loadFrozenRegistry(rootDir) {
  const frozenPath = path.join(rootDir, FROZEN_REGISTRY_PATH);
  if (!fs.existsSync(frozenPath)) {
    throw new Error(`Frozen registry not found: ${frozenPath}`);
  }

  return readJson(frozenPath);
}

function readOutputProfiles(rootDir) {
  const outputProfilesPath = path.join(rootDir, 'config', 'output_profiles.json');
  if (!fs.existsSync(outputProfilesPath)) {
    return [];
  }

  const outputProfiles = readJson(outputProfilesPath);
  return Object.keys(outputProfiles.profiles || {});
}

function readDirsFromStrategy(rootDir, relPaths = []) {
  return unique(relPaths.flatMap((relPath) => listDirectories(path.join(rootDir, relPath))));
}

function buildDiscoverySnapshot(rootDir, standard) {
  const strategy = standard.directoryStrategy || {};

  return {
    subjectReferenceIds: readDirsFromStrategy(rootDir, strategy.subject || ['refs/subjects']),
    garmentMaterialDetailIds: readDirsFromStrategy(rootDir, strategy.garmentMaterial || ['refs/garment_details/material']),
    garmentPatternDetailIds: readDirsFromStrategy(rootDir, strategy.garmentPattern || ['refs/garment_details/pattern']),
    footwearAssetIds: readDirsFromStrategy(rootDir, strategy.footwear || ['refs/accessories/footwear']),
    headwearAssetIds: readDirsFromStrategy(rootDir, strategy.headwear || ['refs/accessories/headwear']),
    accessoryAssetIdsByFamily: {
      eyewear: readDirsFromStrategy(rootDir, strategy.accessoryByFamily?.eyewear || ['refs/accessories/eyewear']),
      bag: readDirsFromStrategy(rootDir, strategy.accessoryByFamily?.bag || ['refs/accessories/bag']),
      neckwear: readDirsFromStrategy(rootDir, strategy.accessoryByFamily?.neckwear || ['refs/accessories/neckwear']),
    },
    outputProfiles: readOutputProfiles(rootDir),
  };
}

function buildOptionRegistry(rootDir = path.resolve(__dirname, '..', '..')) {
  const registry = clone(loadFrozenRegistry(rootDir));
  const standard = loadAssetBankStandard(rootDir);
  const snapshot = buildDiscoverySnapshot(rootDir, standard);
  const health = buildAssetBankHealth(rootDir);

  registry.entities.subject.referenceIds = snapshot.subjectReferenceIds.length > 0
    ? snapshot.subjectReferenceIds
    : (registry.entities.subject.referenceIds || ['subject_0001']);
  registry.entities.garment.detailRefs.material = snapshot.garmentMaterialDetailIds;
  registry.entities.garment.detailRefs.pattern = snapshot.garmentPatternDetailIds;
  registry.entities.footwear.assetIds = snapshot.footwearAssetIds;
  registry.entities.headwear.assetIds = snapshot.headwearAssetIds;
  registry.entities.accessory.assetIdsByFamily = {
    ...registry.entities.accessory.assetIdsByFamily,
    ...snapshot.accessoryAssetIdsByFamily,
  };

  if (snapshot.outputProfiles.length > 0) {
    registry.entities.output_profile.profiles = snapshot.outputProfiles;
  }

  for (const entityName of FROZEN_ENTITY_NAMES) {
    registry.entities[entityName] = registry.entities[entityName] || {};
    registry.entities[entityName].modes = [...(FROZEN_ENTITY_MODE_MAP[entityName] || [])];
  }
  registry.entities.accessory.itemModes = [...FROZEN_ACCESSORY_ITEM_MODES];

  registry.meta = {
    ...(registry.meta || {}),
    source: 'frozen_options_plus_runtime_discovery',
    filePath: FROZEN_REGISTRY_PATH,
    frozenBehaviorOptions: true,
    discoveryAppliedAt: new Date().toISOString(),
    assetBankStandard: standard.meta || null,
  };

  registry.assetBankHealth = {
    expectedDirCount: health.expectedDirs.length,
    existingDirCount: health.existingDirs.length,
    missingDirCount: health.missingDirs.length,
    missingDirs: health.missingDirs.map((dirPath) => path.relative(rootDir, dirPath)),
  };

  return registry;
}

function createDefaultBuilderJob() {
  return {
    version: FROZEN_SCHEMA_VERSION,
    jobId: 'job_0001',
    displayName: 'retouchio-job-builder-default',
    inputSource: 'batch_input',
    entities: {
      subject: {
        mode: 'preserve',
        variant: 'identity_reference',
        reference_id: 'subject_0001',
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
        mode: 'replace',
        variant: 'sandal',
        asset_id: 'footwear_0001',
      },
      headwear: {
        mode: 'add',
        variant: 'bandana',
        asset_id: 'headwear_bandana_0001',
      },
      accessory: {
        mode: 'apply',
        items: [
          {
            family: 'eyewear',
            variant: 'sunglasses',
            mode: 'ignore',
            asset_id: '',
          },
        ],
      },
      scene: {
        mode: 'apply',
        profile: 'studio_catalog',
      },
      output_profile: {
        mode: 'apply',
        profile: 'catalog_4x5_2k',
      },
      global_negative_rules: {
        mode: 'apply',
        items: [],
      },
    },
  };
}

module.exports = {
  buildOptionRegistry,
  createDefaultBuilderJob,
};
