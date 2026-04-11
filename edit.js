require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { buildPrompt } = require('./prompt_system/compiler/buildPrompt');
const { resolveReferences } = require('./prompt_system/compiler/resolveRefs');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const MODEL = 'gemini-3.1-flash-image-preview';
const MAX_BATCH = 10;
const DEFAULT_OUTPUT_PROFILE = 'catalog_4x5_2k';
const DEFAULT_INPUT_SOURCE = 'batch_input';
const IMAGE_CONFIG = { aspectRatio: '4:5', imageSize: '2K' };

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureAiClient() {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is missing.');
  }
  return ai;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function listImageFiles(dirPath) {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('._') && /\.(jpg|jpeg|png|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function loadJobConfig(jobArg) {
  const legacyMode = !jobArg;
  let job = {
    jobId: 'legacy',
    displayName: 'legacy-batch-submit',
    inputSource: DEFAULT_INPUT_SOURCE,
    outputProfile: DEFAULT_OUTPUT_PROFILE,
    subjectReference: null,
    activeSlots: [],
    selectedAccessoryAssetIds: {},
  };

  if (jobArg) {
    const rootDir = __dirname;
    const jobPath = path.isAbsolute(jobArg) ? jobArg : path.resolve(rootDir, jobArg);
    if (!fs.existsSync(jobPath)) {
      throw new Error(`Job config not found: ${jobPath}`);
    }
    job = { ...job, ...readJson(jobPath) };
    job.jobConfigPath = jobPath;
  }

  return {
    legacyMode,
    job,
  };
}

async function uploadReferenceImage(filePath) {
  const client = ensureAiClient();
  const mimeType = guessMime(filePath);
  const uploadedFile = await client.files.upload({
    file: filePath,
    config: { mimeType },
  });

  return {
    filePath,
    mimeType,
    uri: uploadedFile.uri,
    name: uploadedFile.name,
  };
}

function buildRequestForImage({
  fileName,
  uploadedTarget,
  uploadedRefs,
  prompt,
  imageConfig,
}) {
  const parts = [];

  parts.push({ text: `Target input image: ${fileName}` });
  parts.push({ fileData: { fileUri: uploadedTarget.uri, mimeType: uploadedTarget.mimeType } });

  for (let index = 0; index < uploadedRefs.subject.length; index += 1) {
    const ref = uploadedRefs.subject[index];
    parts.push({ text: `Subject reference ${index + 1}: preserve identity from this reference.` });
    parts.push({ fileData: { fileUri: ref.uri, mimeType: ref.mimeType } });
  }

  for (let index = 0; index < uploadedRefs.garment.material.length; index += 1) {
    const ref = uploadedRefs.garment.material[index];
    parts.push({ text: `Garment material detail reference ${index + 1}: preserve fabric/material fidelity from this reference.` });
    parts.push({ fileData: { fileUri: ref.uri, mimeType: ref.mimeType } });
  }

  for (let index = 0; index < uploadedRefs.garment.pattern.length; index += 1) {
    const ref = uploadedRefs.garment.pattern[index];
    parts.push({ text: `Garment pattern detail reference ${index + 1}: preserve exact pattern scale and density from this reference.` });
    parts.push({ fileData: { fileUri: ref.uri, mimeType: ref.mimeType } });
  }

  for (let index = 0; index < uploadedRefs.footwear.length; index += 1) {
    const ref = uploadedRefs.footwear[index];
    parts.push({ text: `Footwear reference ${index + 1}: use this as the exact design reference for footwear.` });
    parts.push({ fileData: { fileUri: ref.uri, mimeType: ref.mimeType } });
  }

  for (let index = 0; index < uploadedRefs.headwear.length; index += 1) {
    const ref = uploadedRefs.headwear[index];
    parts.push({ text: `Headwear reference ${index + 1}: use this as the exact design reference for headwear.` });
    parts.push({ fileData: { fileUri: ref.uri, mimeType: ref.mimeType } });
  }

  for (const accessoryGroup of uploadedRefs.accessory) {
    for (let index = 0; index < accessoryGroup.refs.length; index += 1) {
      const ref = accessoryGroup.refs[index];
      parts.push({ text: `Accessory ${accessoryGroup.family} reference ${index + 1}: use this as the exact design reference for this accessory.` });
      parts.push({ fileData: { fileUri: ref.uri, mimeType: ref.mimeType } });
    }
  }

  parts.push({ text: 'Apply the compiled catalog edit rules to this target image.' });

  return {
    key: path.parse(fileName).name,
    request: {
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      systemInstruction: { parts: [{ text: prompt }] },
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: imageConfig || IMAGE_CONFIG,
      },
    },
  };
}

function resolveBatchJsonlPath(job) {
  const runtimeJsonlPath = String(job?.runtime?.batchJsonlPath || '').trim();
  if (!runtimeJsonlPath) {
    return path.resolve(__dirname, 'batch_requests.jsonl');
  }

  const jsonlPath = path.resolve(__dirname, runtimeJsonlPath);
  ensureDir(path.dirname(jsonlPath));
  return jsonlPath;
}

function writeBatchJsonl(requestLines, job) {
  const jsonlPath = resolveBatchJsonlPath(job);
  // Preserve the existing batch handoff format so batch submission and polling stay unchanged.
  fs.writeFileSync(jsonlPath, `${requestLines.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  return jsonlPath;
}

async function submitBatch(jsonlPath, displayName) {
  const client = ensureAiClient();
  const uploadedJsonl = await client.files.upload({
    file: jsonlPath,
    config: { mimeType: 'application/jsonl' },
  });
  console.log(`✅ Uploaded JSONL: ${uploadedJsonl.name}`);

  const batchJob = await client.batches.create({
    model: MODEL,
    src: uploadedJsonl.name,
    config: { displayName },
  });

  return batchJob;
}

async function uploadReferenceGroup(filePaths, logLabel) {
  const uploadedRefs = [];

  for (const filePath of filePaths) {
    const uploadedRef = await uploadReferenceImage(filePath);
    uploadedRefs.push(uploadedRef);
    console.log(`✅ Uploaded ${logLabel}: ${path.basename(filePath)} -> ${uploadedRef.name}`);
  }

  return uploadedRefs;
}

async function uploadResolvedReferences(refs) {
  const uploadedRefs = {
    subject: await uploadReferenceGroup(refs.subject, 'subject ref'),
    garment: {
      material: await uploadReferenceGroup(refs.garment.material, 'garment material ref'),
      pattern: await uploadReferenceGroup(refs.garment.pattern, 'garment pattern ref'),
    },
    footwear: await uploadReferenceGroup(refs.footwear, 'footwear ref'),
    headwear: await uploadReferenceGroup(refs.headwear, 'headwear ref'),
    accessory: [],
  };

  for (const accessoryGroup of refs.accessory) {
    uploadedRefs.accessory.push({
      family: accessoryGroup.family,
      variant: accessoryGroup.variant,
      refs: await uploadReferenceGroup(accessoryGroup.files, `${accessoryGroup.family} accessory ref`),
    });
  }

  return uploadedRefs;
}

async function main() {
  const jobArg = process.argv[2];
  const { legacyMode, job } = loadJobConfig(jobArg);

  ensureDir(path.join(__dirname, 'batch_input'));
  ensureDir(path.join(__dirname, 'batch_output'));

  const inputDir = path.resolve(__dirname, job.inputSource || DEFAULT_INPUT_SOURCE);
  if (!fs.existsSync(inputDir)) {
    throw new Error(`${job.inputSource || DEFAULT_INPUT_SOURCE}/ directory not found.`);
  }

  const files = listImageFiles(inputDir);
  if (files.length === 0) {
    throw new Error(`${job.inputSource || DEFAULT_INPUT_SOURCE}/ must contain at least one jpg/jpeg/png/webp file.`);
  }

  const batchFiles = files.slice(0, MAX_BATCH);
  const { prompt, canonicalJob, imageConfig } = buildPrompt(job);
  const refs = resolveReferences(canonicalJob, { rootDir: __dirname });
  if (!prompt || prompt.length < 50) {
    throw new Error('Compiled prompt is invalid or empty');
  }

  console.log('--- COMPILED PROMPT ---');
  console.log(prompt.slice(0, 1000));

  if (process.env.DRY_RUN) {
    console.log(prompt);
    console.log('------------------------------');
    process.exit(0);
  }

  console.log(`▶️ Preparing ${batchFiles.length} images for batch submission...`);
  if (legacyMode) {
    console.log('ℹ️ Running in legacy compatibility mode (no job config supplied).');
  } else {
    console.log(`ℹ️ Running job config: ${job.jobConfigPath}`);
  }
  if (job?.runtime?.runId) {
    console.log(`ℹ️ Run staging id: ${job.runtime.runId}`);
  }
  if (job?.runtime?.sourceInputSource) {
    console.log(`ℹ️ Source input library: ${job.runtime.sourceInputSource}`);
  }
  if (job?.runtime?.stagedInputSource) {
    console.log(`ℹ️ Staged input directory: ${job.runtime.stagedInputSource}`);
  }
  console.log(`ℹ️ Canonical job mode: ${canonicalJob.version}`);
  const uploadedRefs = await uploadResolvedReferences(refs);

  const requestLines = [];
  for (const fileName of batchFiles) {
    const fullPath = path.join(inputDir, fileName);
    const uploadedTarget = await uploadReferenceImage(fullPath);
    console.log(`✅ Uploaded target: ${fileName} -> ${uploadedTarget.name}`);

    requestLines.push(
      buildRequestForImage({
        fileName,
        uploadedTarget,
        uploadedRefs,
        prompt,
        imageConfig,
      })
    );
  }

  const jsonlPath = writeBatchJsonl(requestLines, job);
  console.log(`✅ JSONL ready: ${jsonlPath}`);

  const displayName = `${job.displayName || job.jobId || 'retouchio-batch'}-${batchFiles.length}-${Date.now()}`;
  const batchJob = await submitBatch(jsonlPath, displayName);

  console.log(`BATCH_JOB_NAME=${batchJob.name}`);
  console.log(`BATCH_STATE=${batchJob.state}`);
  console.log(`BATCH_COUNT=${batchFiles.length}`);
  console.log('📌 Batch submitted. Use batch_poll_download.js to poll and download the results.');
}

main().catch((err) => {
  console.error('❌ BATCH_SUBMIT_ERROR:', err?.message || err);
  process.exit(1);
});
