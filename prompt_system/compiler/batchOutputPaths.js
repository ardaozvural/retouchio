const fs = require('fs');
const path = require('path');

function safeBatchDirName(batchName) {
  return String(batchName || 'batch')
    .replace(/^batches\//i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 96) || 'batch';
}

function getBatchOutputRoot(rootDir) {
  return path.resolve(rootDir, 'batch_output');
}

function assertInsideRoot(rootPath, candidatePath) {
  if (!(candidatePath === rootPath || candidatePath.startsWith(`${rootPath}${path.sep}`))) {
    throw new Error('Invalid batch output path.');
  }
}

function resolveBatchOutputWriteDir(rootDir, batchName) {
  const outputRoot = getBatchOutputRoot(rootDir);
  const safeBatchName = safeBatchDirName(batchName);
  const outputDir = path.resolve(outputRoot, safeBatchName);
  assertInsideRoot(outputRoot, outputDir);
  return {
    outputRoot,
    outputDir,
    safeBatchName,
    outputSource: 'standard',
  };
}

function resolveBatchOutputReadDir(rootDir, batchName) {
  const writeTarget = resolveBatchOutputWriteDir(rootDir, batchName);
  const standardExists = fs.existsSync(writeTarget.outputDir) && fs.statSync(writeTarget.outputDir).isDirectory();
  if (standardExists) {
    return writeTarget;
  }
  return {
    outputRoot: writeTarget.outputRoot,
    outputDir: writeTarget.outputRoot,
    safeBatchName: writeTarget.safeBatchName,
    outputSource: 'legacyFlat',
  };
}

function buildBatchOutputImageUrl(outputSource, safeBatchName, fileName) {
  const safeFile = path.basename(String(fileName || '').trim());
  if (!safeFile) {
    return null;
  }
  if (outputSource === 'legacyFlat') {
    return `/batch_output/${safeFile}`;
  }
  return `/batch_output/${safeBatchName}/${safeFile}`;
}

module.exports = {
  safeBatchDirName,
  resolveBatchOutputWriteDir,
  resolveBatchOutputReadDir,
  buildBatchOutputImageUrl,
};
