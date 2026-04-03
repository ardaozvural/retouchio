const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getStandardPath(rootDir) {
  return path.join(rootDir, 'prompt_system', 'registry', 'assetBankStandard.v1.json');
}

function loadAssetBankStandard(rootDir = path.resolve(__dirname, '..', '..')) {
  const standardPath = getStandardPath(rootDir);
  if (!fs.existsSync(standardPath)) {
    throw new Error(`Asset bank standard file not found: ${standardPath}`);
  }

  return readJson(standardPath);
}

function toAbsoluteDirs(rootDir, relPaths = []) {
  return relPaths.map((relPath) => path.join(rootDir, relPath));
}

function getCandidateDirsForEntity(standard, rootDir, entityKey, accessoryFamily = null) {
  const strategy = standard.directoryStrategy || {};

  if (entityKey === 'accessory') {
    const byFamily = strategy.accessoryByFamily || {};
    return toAbsoluteDirs(rootDir, byFamily[accessoryFamily] || []);
  }

  const relPaths = strategy[entityKey] || [];
  return toAbsoluteDirs(rootDir, relPaths);
}

function getAllExpectedDirs(standard, rootDir) {
  const strategy = standard.directoryStrategy || {};
  const dirs = [];

  dirs.push(...toAbsoluteDirs(rootDir, strategy.subject || []));
  dirs.push(...toAbsoluteDirs(rootDir, strategy.garmentMaterial || []));
  dirs.push(...toAbsoluteDirs(rootDir, strategy.garmentPattern || []));
  dirs.push(...toAbsoluteDirs(rootDir, strategy.footwear || []));
  dirs.push(...toAbsoluteDirs(rootDir, strategy.headwear || []));

  for (const familyDirs of Object.values(strategy.accessoryByFamily || {})) {
    dirs.push(...toAbsoluteDirs(rootDir, familyDirs || []));
  }

  return [...new Set(dirs)];
}

function buildAssetBankHealth(rootDir = path.resolve(__dirname, '..', '..')) {
  const standard = loadAssetBankStandard(rootDir);
  const expectedDirs = getAllExpectedDirs(standard, rootDir);
  const existingDirs = expectedDirs.filter((dirPath) => fs.existsSync(dirPath));
  const missingDirs = expectedDirs.filter((dirPath) => !fs.existsSync(dirPath));

  return {
    standardMeta: standard.meta || null,
    expectedDirs,
    existingDirs,
    missingDirs,
  };
}

function matchesPattern(patternText, value) {
  if (!patternText) {
    return true;
  }

  const regex = new RegExp(patternText);
  return regex.test(String(value || ''));
}

function validateAssetIdWithStandard(standard, entityKey, value, accessoryFamily = null) {
  if (!value) {
    return {
      valid: true,
      pattern: null,
    };
  }

  const namingPatterns = standard.namingPatterns || {};
  let patternText = null;

  if (entityKey === 'subject') {
    patternText = namingPatterns.subjectReferenceId;
  } else if (entityKey === 'garmentMaterial') {
    patternText = namingPatterns.garmentMaterialDetailId;
  } else if (entityKey === 'garmentPattern') {
    patternText = namingPatterns.garmentPatternDetailId;
  } else if (entityKey === 'footwear') {
    patternText = namingPatterns.footwearAssetId;
  } else if (entityKey === 'headwear') {
    patternText = namingPatterns.headwearAssetId;
  } else if (entityKey === 'accessory') {
    patternText = namingPatterns.accessoryAssetIdsByFamily?.[accessoryFamily] || null;
  }

  const valid = matchesPattern(patternText, value);

  return {
    valid,
    pattern: patternText,
  };
}

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('._') && /\.(jpg|jpeg|png|webp)$/i.test(name));
}

function hasAssetInCandidateDirs(assetId, candidateDirs = []) {
  if (!assetId) {
    return false;
  }

  for (const baseDir of candidateDirs) {
    if (!baseDir || !fs.existsSync(baseDir)) {
      continue;
    }

    const directDir = path.join(baseDir, assetId);
    if (fs.existsSync(directDir) && fs.statSync(directDir).isDirectory() && listImageFiles(directDir).length > 0) {
      return true;
    }

    const directFile = listImageFiles(baseDir).some((fileName) => path.parse(fileName).name === assetId);
    if (directFile) {
      return true;
    }
  }

  return false;
}

module.exports = {
  loadAssetBankStandard,
  getCandidateDirsForEntity,
  buildAssetBankHealth,
  validateAssetIdWithStandard,
  hasAssetInCandidateDirs,
};
