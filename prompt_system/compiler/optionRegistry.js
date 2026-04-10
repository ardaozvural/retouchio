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

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('._') && /\.(jpg|jpeg|png|webp)$/i.test(name))
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

function buildSubjectReferenceEntries(rootDir, relPaths = []) {
  const entries = [];
  const seen = new Set();

  for (const relPath of relPaths) {
    const baseDir = path.join(rootDir, relPath);
    if (!fs.existsSync(baseDir)) {
      continue;
    }

    const ids = listDirectories(baseDir);
    for (const referenceId of ids) {
      if (seen.has(referenceId)) {
        continue;
      }
      seen.add(referenceId);
      const refDir = path.join(baseDir, referenceId);
      const files = listImageFiles(refDir);
      const previewFile = files[0] || null;
      const relativeDir = path.relative(rootDir, refDir).replaceAll(path.sep, '/');
      entries.push({
        reference_id: referenceId,
        preview: previewFile ? `/${relativeDir}/${previewFile}` : null,
        fileCount: files.length,
        path: relativeDir,
      });
    }
  }

  return entries.sort((a, b) => String(a.reference_id || '').localeCompare(String(b.reference_id || ''), 'en'));
}

function buildDiscoverySnapshot(rootDir, standard) {
  const strategy = standard.directoryStrategy || {};
  const subjectReferenceEntries = buildSubjectReferenceEntries(rootDir, strategy.subject || ['refs/subjects']);

  return {
    subjectReferenceIds: subjectReferenceEntries.map((item) => item.reference_id),
    subjectReferenceEntries,
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

  registry.entities.subject.referenceIds = snapshot.subjectReferenceIds;
  registry.entities.subject.references = snapshot.subjectReferenceEntries;
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
        source: 'system',
        variant: 'identity_reference',
        reference_id: '',
        reference_ids: [],
        face_refinement: 'preserve',
        pose_refinement: 'preserve',
      },
      garment: {
        mode: 'preserve',
        refinement_level: 'preserve',
        variant: 'source_garment',
        detail_refs: {
          material: [],
          pattern: [],
        },
      },
      footwear: {
        mode: 'replace',
        source: 'reference',
        placement: 'on_feet',
        variant: 'sandal',
        asset_id: 'footwear_0001',
      },
      headwear: {
        mode: 'add',
        source: 'reference',
        placement: 'on_head',
        variant: 'bandana',
        asset_id: 'headwear_bandana_0001',
      },
      accessory: {
        mode: 'apply',
        items: [
          {
            family: 'eyewear',
            variant: 'sunglasses',
            mode: 'preserve',
            source: 'system',
            placement: 'auto',
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
