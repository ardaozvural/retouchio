const fs = require('fs');
const path = require('path');

const { buildPrompt } = require('./buildPrompt');
const { resolveReferences } = require('./resolveRefs');
const { validateCanonicalJob } = require('./validateCanonicalJob');

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

function summarizeResolvedRefs(refs) {
  const accessoryGroups = refs.accessory || [];
  const accessoryFiles = accessoryGroups.reduce((acc, group) => acc + (group.files?.length || 0), 0);

  return {
    subject: refs.subject?.length || 0,
    garmentMaterial: refs.garment?.material?.length || 0,
    garmentPattern: refs.garment?.pattern?.length || 0,
    footwear: refs.footwear?.length || 0,
    headwear: refs.headwear?.length || 0,
    accessoryGroups: accessoryGroups.length,
    accessoryFiles,
  };
}

function runDryBatchCheck(job, options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..', '..');
  const errors = [];
  const warnings = [];

  const validation = validateCanonicalJob(job, {
    rootDir,
    registry: options.registry,
  });
  errors.push(...validation.errors);
  warnings.push(...validation.warnings);

  let prompt = '';
  let canonicalJob = null;
  let imageConfig = null;
  let authority = null;
  try {
    const built = buildPrompt(job, { rootDir });
    prompt = built.prompt;
    canonicalJob = built.canonicalJob;
    imageConfig = built.imageConfig || null;
    authority = built.authority || null;
    if (!prompt || prompt.length < 50) {
      errors.push('Compiled prompt is invalid or empty.');
    }
  } catch (error) {
    errors.push(`buildPrompt failed: ${error.message}`);
  }

  let resolvedRefs = null;
  let resolvedRefSummary = null;
  if (canonicalJob) {
    try {
      resolvedRefs = resolveReferences(canonicalJob, { rootDir });
      resolvedRefSummary = summarizeResolvedRefs(resolvedRefs);
    } catch (error) {
      errors.push(`resolveReferences failed: ${error.message}`);
    }
  }

  const inputSource = canonicalJob?.inputSource || job?.inputSource || 'batch_input';
  const inputDir = path.join(rootDir, inputSource);
  const inputDirExists = fs.existsSync(inputDir) && fs.statSync(inputDir).isDirectory();
  if (!inputDirExists) {
    errors.push(`inputSource directory does not exist: ${inputSource}`);
  }
  const inputFiles = inputDirExists ? listImageFiles(inputDir) : [];
  if (inputFiles.length === 0) {
    errors.push(`No input images found in ${inputSource}.`);
  }

  const ready = errors.length === 0;

  return {
    ready,
    errors,
    warnings,
    validation,
    inputSource: {
      value: inputSource,
      exists: inputDirExists,
      directory: inputDir,
      fileCount: inputFiles.length,
      sampleFiles: inputFiles.slice(0, 10),
    },
    outputProfile: canonicalJob?.entities?.output_profile?.profile || null,
    imageConfig,
    authority,
    compiledPromptLength: prompt.length,
    resolvedRefSummary,
    canonicalJob,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  runDryBatchCheck,
};
