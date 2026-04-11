const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function assertInsideRoot(rootPath, candidatePath) {
  if (!(candidatePath === rootPath || candidatePath.startsWith(`${rootPath}${path.sep}`))) {
    throw new Error('Invalid staging path.');
  }
}

function toPortableRelative(rootDir, absolutePath) {
  return path.relative(rootDir, absolutePath).split(path.sep).join('/');
}

function makeRunId() {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function resolveRunStagingPaths(rootDir, runIdRaw) {
  const runsRoot = path.resolve(rootDir, 'staging', 'runs');
  const runId = String(runIdRaw || makeRunId())
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 96) || makeRunId();
  const runDir = path.resolve(runsRoot, runId);
  assertInsideRoot(runsRoot, runDir);

  return {
    runsRoot,
    runId,
    runDir,
    inputsDir: path.join(runDir, 'inputs'),
    runtimeJobPath: path.join(runDir, 'job.runtime.json'),
    batchJsonlPath: path.join(runDir, 'batch_requests.jsonl'),
  };
}

function stageRunInputs({ rootDir, inputSource, inputDir, inputFiles, runId }) {
  const paths = resolveRunStagingPaths(rootDir, runId);
  ensureDir(paths.runsRoot);
  ensureDir(paths.runDir);
  ensureDir(paths.inputsDir);

  const mappings = [];
  for (let index = 0; index < inputFiles.length; index += 1) {
    const fileName = String(inputFiles[index] || '').trim();
    if (!fileName) {
      continue;
    }

    const sourcePath = path.join(inputDir, fileName);
    const stagedPath = path.join(paths.inputsDir, fileName);
    fs.copyFileSync(sourcePath, stagedPath);

    mappings.push({
      index,
      fileName,
      requestKey: path.parse(fileName).name || null,
      originalInputSource: inputSource,
      originalInputPath: toPortableRelative(rootDir, sourcePath),
      stagedInputPath: toPortableRelative(rootDir, stagedPath),
    });
  }

  const originalInputFiles = mappings.map((item) => ({
    index: item.index,
    fileName: item.fileName,
    requestKey: item.requestKey,
    inputSource: item.originalInputSource,
    relativePath: item.originalInputPath,
  }));

  const stagedInputFiles = mappings.map((item) => ({
    index: item.index,
    fileName: item.fileName,
    requestKey: item.requestKey,
    relativePath: item.stagedInputPath,
    originalInputPath: item.originalInputPath,
    originalInputFile: item.fileName,
  }));

  return {
    ...paths,
    stagingMode: 'copied_inputs',
    stagedInputSource: toPortableRelative(rootDir, paths.inputsDir),
    runDirRelative: toPortableRelative(rootDir, paths.runDir),
    runtimeJobRelativePath: toPortableRelative(rootDir, paths.runtimeJobPath),
    batchJsonlRelativePath: toPortableRelative(rootDir, paths.batchJsonlPath),
    mappings,
    originalInputFiles,
    stagedInputFiles,
  };
}

module.exports = {
  ensureDir,
  toPortableRelative,
  makeRunId,
  resolveRunStagingPaths,
  stageRunInputs,
};
