const fs = require('fs');
const path = require('path');

const {
  getCandidateDirsForEntity,
  loadAssetBankStandard,
  validateAssetIdWithStandard,
} = require('./assetBank');
const { createReferenceAuthorityState } = require('./referenceAuthority');

function listImageFiles(dirPath) {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('._') && /\.(jpg|jpeg|png|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function resolveImageAsset(candidateDirs, assetId) {
  if (!assetId) {
    return [];
  }

  for (const baseDir of candidateDirs) {
    if (!baseDir || !fs.existsSync(baseDir)) {
      continue;
    }

    const directDir = path.join(baseDir, assetId);
    if (fs.existsSync(directDir) && fs.statSync(directDir).isDirectory()) {
      const matches = listImageFiles(directDir).map((fileName) => path.join(directDir, fileName));
      if (matches.length > 0) {
        return matches;
      }
    }

    const matches = listImageFiles(baseDir)
      .filter((fileName) => path.parse(fileName).name === assetId)
      .map((fileName) => path.join(baseDir, fileName));

    if (matches.length > 0) {
      return matches;
    }
  }

  throw new Error(`Reference asset "${assetId}" not found in candidate directories: ${candidateDirs.join(', ')}`);
}

function ensureArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function assertStandardId(standard, entityKey, value, accessoryFamily = null) {
  const check = validateAssetIdWithStandard(standard, entityKey, value, accessoryFamily);
  if (!check.valid) {
    throw new Error(
      `Asset id "${value}" does not match ${entityKey} naming standard${check.pattern ? ` (${check.pattern})` : ''}.`
    );
  }
}

function resolveReferences(canonicalJob, options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..', '..');
  const standard = loadAssetBankStandard(rootDir);
  const authorityState = createReferenceAuthorityState(canonicalJob);
  const uploads = authorityState.report.runtime_expected_uploads;

  const refs = {
    subject: [],
    garment: {
      material: [],
      pattern: [],
    },
    footwear: [],
    headwear: [],
    accessory: [],
  };

  if (uploads.subject.length > 0) {
    const referenceId = uploads.subject[0];
    assertStandardId(standard, 'subject', referenceId);
    refs.subject = resolveImageAsset(
      getCandidateDirsForEntity(standard, rootDir, 'subject'),
      referenceId
    );
  }

  const materialDetailRefs = ensureArray(uploads.garment?.material);
  for (const detailId of materialDetailRefs) {
    assertStandardId(standard, 'garmentMaterial', detailId);
    refs.garment.material.push(
      ...resolveImageAsset(
        getCandidateDirsForEntity(standard, rootDir, 'garmentMaterial'),
        detailId
      )
    );
  }

  const patternDetailRefs = ensureArray(uploads.garment?.pattern);
  for (const detailId of patternDetailRefs) {
    assertStandardId(standard, 'garmentPattern', detailId);
    refs.garment.pattern.push(
      ...resolveImageAsset(
        getCandidateDirsForEntity(standard, rootDir, 'garmentPattern'),
        detailId
      )
    );
  }

  if (uploads.footwear.length > 0) {
    const footwearAssetId = uploads.footwear[0];
    assertStandardId(standard, 'footwear', footwearAssetId);
    refs.footwear = resolveImageAsset(
      getCandidateDirsForEntity(standard, rootDir, 'footwear'),
      footwearAssetId
    );
  }

  if (uploads.headwear.length > 0) {
    const headwearAssetId = uploads.headwear[0];
    assertStandardId(standard, 'headwear', headwearAssetId);
    refs.headwear = resolveImageAsset(
      getCandidateDirsForEntity(standard, rootDir, 'headwear'),
      headwearAssetId
    );
  }

  for (const item of uploads.accessory || []) {
    assertStandardId(standard, 'accessory', item.asset_id, item.family);
    const candidateDirs = getCandidateDirsForEntity(standard, rootDir, 'accessory', item.family);

    refs.accessory.push({
      family: item.family,
      variant: item.variant,
      label: item.label || item.variant || item.family || 'accessory',
      files: resolveImageAsset(candidateDirs, item.asset_id),
    });
  }

  return refs;
}

module.exports = {
  resolveReferences,
};
