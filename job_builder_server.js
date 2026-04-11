require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { GoogleGenAI } = require('@google/genai');

const { buildPrompt } = require('./prompt_system/compiler/buildPrompt');
const { buildOptionRegistry, createDefaultBuilderJob } = require('./prompt_system/compiler/optionRegistry');
const { validateCanonicalJob } = require('./prompt_system/compiler/validateCanonicalJob');
const { runDryBatchCheck } = require('./prompt_system/compiler/dryBatchCheck');
const {
  ensureGeneratedJobsDir,
  listGeneratedJobs,
  listSampleJobs,
  loadGeneratedJob,
  loadSampleJobByName,
  saveGeneratedJob,
} = require('./prompt_system/compiler/jobPersistence');
const { FROZEN_SCHEMA_VERSION } = require('./prompt_system/compiler/schemaConstants');
const {
  ensureRegistryFile,
  listBatchRecords,
  upsertBatchRecord,
  getBatchRecord,
  upsertRunRecord,
  getRunRecord,
  listRunAttempts,
  upsertOutputRecords,
  listOutputRecords,
  getOutputRecord,
  approveOutputRecord,
  rejectOutputRecord,
  getBatchOutputSummary,
  getRunOutputSummary,
} = require('./prompt_system/compiler/batchRegistry');
const {
  safeBatchDirName,
  resolveBatchOutputWriteDir,
  resolveBatchOutputReadDir,
  buildBatchOutputImageUrl,
} = require('./prompt_system/compiler/batchOutputPaths');
const {
  stageRunInputs,
  toPortableRelative,
  makeRunId,
} = require('./prompt_system/compiler/runStaging');

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const UI_DIR = path.join(ROOT_DIR, 'ui', 'job-builder');
const ASSET_MANAGER_UI_DIR = path.join(ROOT_DIR, 'ui', 'asset-manager');
const INPUT_MANAGER_UI_DIR = path.join(ROOT_DIR, 'ui', 'input-manager');
const BATCH_JOBS_UI_DIR = path.join(ROOT_DIR, 'ui', 'batch-jobs');
const SHARED_UI_DIR = path.join(ROOT_DIR, 'ui', 'shared');
const INPUT_SETS_ROOT = path.join(ROOT_DIR, 'inputs', 'sets');
const BATCH_OUTPUT_DIR = path.join(ROOT_DIR, 'batch_output');
const BATCH_MANIFEST_DIR = path.join(ROOT_DIR, 'data', 'batches');
const BATCH_RUN_TIMEOUT_MS = Number(process.env.JOB_BUILDER_BATCH_TIMEOUT_MS || 30 * 60 * 1000);
const LOG_SNIPPET_LIMIT = 4000;
const DOWNLOAD_LOG_LIMIT = 20;
const MAX_MULTIPART_BYTES = Number(process.env.ASSET_UPLOAD_MAX_BYTES || 50 * 1024 * 1024);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const EDIT_RUNTIME_MAX_BATCH = 10;
const SUBJECT_REFS_ROOT = path.join(ROOT_DIR, 'refs', 'subjects');

const ASSET_FAMILY_CONFIG = {
  footwear: {
    variants: ['sandal'],
    dirParts: ['refs', 'accessories', 'footwear'],
    buildPrefix: () => 'footwear_',
    inferVariant: () => 'sandal',
  },
  headwear: {
    variants: ['bandana', 'headband', 'hat'],
    dirParts: ['refs', 'accessories', 'headwear'],
    buildPrefix: (variant) => `headwear_${variant}_`,
    inferVariant: (assetId) => assetId.match(/^headwear_([a-z0-9_]+)_\d{4}$/)?.[1] || null,
  },
  eyewear: {
    variants: ['sunglasses'],
    dirParts: ['refs', 'accessories', 'eyewear'],
    buildPrefix: (variant) => `${variant}_`,
    inferVariant: () => 'sunglasses',
  },
  bag: {
    variants: ['hand_bag'],
    dirParts: ['refs', 'accessories', 'bag'],
    buildPrefix: () => 'bag_',
    inferVariant: () => 'hand_bag',
  },
  neckwear: {
    variants: ['neck_scarf'],
    dirParts: ['refs', 'accessories', 'neckwear'],
    buildPrefix: (variant) => `${variant}_`,
    inferVariant: () => 'neck_scarf',
  },
  garment_material: {
    variants: ['material_detail'],
    dirParts: ['refs', 'garment_details', 'material'],
    buildPrefix: () => 'material_detail_',
    inferVariant: () => 'material_detail',
  },
  garment_pattern: {
    variants: ['pattern_detail'],
    dirParts: ['refs', 'garment_details', 'pattern'],
    buildPrefix: () => 'pattern_detail_',
    inferVariant: () => 'pattern_detail',
  },
};

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

let batchRunInProgress = false;

function logStep(step, details = '') {
  const timestamp = new Date().toISOString();
  const suffix = details ? ` | ${details}` : '';
  console.log(`[${timestamp}] ${step}${suffix}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    return readJson(filePath);
  } catch (error) {
    return fallback;
  }
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((item) => String(item)))];
}

function resolveJobId(job) {
  return String(job?.jobId || job?.displayName || '').trim() || null;
}

function makeAttemptId(existingAttempts = []) {
  const numericIds = existingAttempts
    .map((item) => String(item?.attemptId || '').trim())
    .map((value) => value.match(/^attempt_(\d+)$/)?.[1] || null)
    .map((value) => (value ? Number(value) : null))
    .filter((value) => Number.isFinite(value));
  const next = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  return `attempt_${String(next).padStart(3, '0')}`;
}

function buildAttemptStageRunId(runId, attemptId) {
  return `${String(runId || 'run').trim()}__${String(attemptId || 'attempt').trim()}`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureGeminiClient() {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  return ai;
}

function normalizeBatchState(rawState) {
  const state = String(rawState || '').toUpperCase();
  if (state.includes('SUCCEEDED') || state === 'SUCCEEDED') return 'SUCCEEDED';
  if (state.includes('FAILED') || state === 'FAILED') return 'FAILED';
  if (state.includes('CANCELLED') || state.includes('CANCELED') || state === 'CANCELLED') return 'CANCELLED';
  if (state.includes('RUNNING') || state.includes('PROCESSING') || state === 'RUNNING') return 'RUNNING';
  if (state.includes('PENDING') || state.includes('QUEUED') || state === 'PENDING') return 'PENDING';
  return 'UNKNOWN';
}

function isTerminalBatchState(rawState) {
  const normalized = normalizeBatchState(rawState);
  return normalized === 'SUCCEEDED' || normalized === 'FAILED' || normalized === 'CANCELLED';
}

function decorateBatchRecord(record) {
  const normalized = normalizeBatchState(record?.lastKnownState);
  const hydratedRun = record?.runId ? (getRunRecord(ROOT_DIR, record.runId) || ensureRunRecordFromBatchRecord(record)) : null;
  const outputSummary = getBatchOutputSummary(ROOT_DIR, record?.batchName || '');
  const runSummary = record?.runId ? getRunOutputSummary(ROOT_DIR, record.runId) : getBatchOutputSummary(ROOT_DIR, record?.batchName || '');
  return {
    ...record,
    status: normalized,
    downloadNeeded: normalized === 'SUCCEEDED' && !record?.downloaded,
    outputSummary,
    runSummary,
    runRecord: hydratedRun,
  };
}

async function saveFileByName(fileName, targetPath) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing.');
  }

  const url = `https://generativelanguage.googleapis.com/download/v1beta/${fileName}:download?alt=media`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Download failed: ${response.status} ${response.statusText} - ${message}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(targetPath, buffer);
}

async function fetchBatchStatus(batchName) {
  const client = ensureGeminiClient();
  const job = await client.batches.get({ name: batchName });
  const rawState = job?.state || 'UNKNOWN';
  return {
    batchName: job?.name || batchName,
    stateRaw: rawState,
    state: normalizeBatchState(rawState),
    job,
  };
}

async function downloadBatchResult(batchName) {
  const status = await fetchBatchStatus(batchName);
  if (status.state !== 'SUCCEEDED') {
    throw new Error(`Batch is not downloadable yet. Current state: ${status.stateRaw}`);
  }

  const dest = status.job?.dest;
  if (!dest) {
    throw new Error('Batch succeeded but dest field is missing.');
  }

  const jsonlName = dest.fileName || dest.outputFile || dest.outputUri || dest.name;
  if (!jsonlName) {
    throw new Error('Batch output file name could not be resolved from dest.');
  }

  const outputTarget = resolveBatchOutputWriteDir(ROOT_DIR, batchName);
  ensureDir(outputTarget.outputRoot);
  const targetDir = outputTarget.outputDir;
  ensureDir(targetDir);

  const localJsonl = path.join(targetDir, 'batch_result.jsonl');
  await saveFileByName(jsonlName, localJsonl);

  const lines = fs.readFileSync(localJsonl, 'utf8')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  let savedCount = 0;
  let skippedCount = 0;
  const outputs = [];
  for (const line of lines) {
    let row = null;
    try {
      row = JSON.parse(line);
    } catch (_error) {
      skippedCount += 1;
      continue;
    }

    const key = row.key || `item_${savedCount + skippedCount + 1}`;
    const parts = row.response?.candidates?.[0]?.content?.parts || row.response?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data);
    if (!imagePart) {
      skippedCount += 1;
      continue;
    }

    const outputPath = path.join(targetDir, `${key}.png`);
    fs.writeFileSync(outputPath, Buffer.from(imagePart.inlineData.data, 'base64'));
    savedCount += 1;
    if (outputs.length < DOWNLOAD_LOG_LIMIT) {
      outputs.push(path.relative(ROOT_DIR, outputPath));
    }
  }

  return {
    batchName: status.batchName,
    state: status.state,
    stateRaw: status.stateRaw,
    outputDir: path.relative(ROOT_DIR, targetDir),
    jsonlPath: path.relative(ROOT_DIR, localJsonl),
    savedCount,
    skippedCount,
    lineCount: lines.length,
    outputSamples: outputs,
  };
}

function mergeDefaultJob(job) {
  const base = createDefaultBuilderJob();
  return {
    ...base,
    ...(job || {}),
    version: FROZEN_SCHEMA_VERSION,
    entities: {
      ...base.entities,
      ...(job?.entities || {}),
      subject: {
        ...base.entities.subject,
        ...(job?.entities?.subject || {}),
      },
      garment: {
        ...base.entities.garment,
        ...(job?.entities?.garment || {}),
        detail_refs: {
          ...base.entities.garment.detail_refs,
          ...(job?.entities?.garment?.detail_refs || {}),
        },
      },
      footwear: {
        ...base.entities.footwear,
        ...(job?.entities?.footwear || {}),
      },
      headwear: {
        ...base.entities.headwear,
        ...(job?.entities?.headwear || {}),
      },
      accessory: {
        ...base.entities.accessory,
        ...(job?.entities?.accessory || {}),
        items: Array.isArray(job?.entities?.accessory?.items)
          ? job.entities.accessory.items
          : base.entities.accessory.items,
      },
      scene: {
        ...base.entities.scene,
        ...(job?.entities?.scene || {}),
      },
      output_profile: {
        ...base.entities.output_profile,
        ...(job?.entities?.output_profile || {}),
      },
      global_negative_rules: {
        ...base.entities.global_negative_rules,
        ...(job?.entities?.global_negative_rules || {}),
        items: Array.isArray(job?.entities?.global_negative_rules?.items)
          ? job.entities.global_negative_rules.items
          : base.entities.global_negative_rules.items,
      },
    },
  };
}

function loadSampleJob() {
  return safeReadJson(path.join(ROOT_DIR, 'jobs', 'job_0001.canonical.json'), createDefaultBuilderJob());
}

function getJobsIndex() {
  ensureGeneratedJobsDir(ROOT_DIR);
  return {
    generated: listGeneratedJobs(ROOT_DIR),
    sample: listSampleJobs(ROOT_DIR),
  };
}

function loadBootstrap() {
  ensureRegistryFile(ROOT_DIR);
  const registry = buildOptionRegistry(ROOT_DIR);
  const inputSetsPayload = buildInputSetList(ROOT_DIR);
  const managedInputSources = inputSetsPayload.inputSets.map((setItem) => setItem.path);
  registry.inputSources = uniqueStrings(['batch_input', ...(registry.inputSources || []), ...managedInputSources]);
  const sampleJob = mergeDefaultJob(loadSampleJob());

  return {
    defaultJob: mergeDefaultJob(createDefaultBuilderJob()),
    sampleJob,
    registry,
    jobs: getJobsIndex(),
    batches: listBatchRecords(ROOT_DIR).map((item) => decorateBatchRecord(item)),
    inputSets: inputSetsPayload.inputSets,
    inputSetsSummary: inputSetsPayload.summary,
    systemInfo: {
      runtimeRunner: 'edit.js',
      compiler: 'buildPrompt(job)',
      referenceResolver: 'resolveReferences(canonicalJob)',
      registry: registry.meta || null,
      assetBankHealth: registry.assetBankHealth || null,
    },
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    sendText(res, 404, 'Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }[ext] || 'application/octet-stream';

  const content = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': content.length,
    'Cache-Control': 'no-store',
  });
  res.end(content);
}

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('._') && /\.(jpg|jpeg|png|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function normalizeFamily(input) {
  return String(input || '').trim().toLowerCase();
}

function normalizeVariant(input) {
  return String(input || '').trim().toLowerCase();
}

function getFamilyConfig(family, variant = null) {
  const config = ASSET_FAMILY_CONFIG[family];
  if (!config) {
    throw new Error(`Unsupported family: ${family}`);
  }
  if (variant != null && !config.variants.includes(variant)) {
    throw new Error(`Unsupported variant "${variant}" for family "${family}"`);
  }
  return config;
}

function getFamilyBaseDir(rootDir, family) {
  const config = getFamilyConfig(family);
  return path.join(rootDir, ...config.dirParts);
}

function buildAssetPrefix(family, variant) {
  const config = getFamilyConfig(family, variant);
  return config.buildPrefix(variant);
}

function assertSafeAssetId(assetId) {
  const normalized = String(assetId || '').trim();
  if (!normalized) {
    throw new Error('asset_id is required.');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
    throw new Error('asset_id contains invalid characters.');
  }
  return normalized;
}

function buildAssetIdPattern(prefix) {
  return new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d{4})$`);
}

function nextAssetIdForFamily(rootDir, family, variant) {
  const baseDir = getFamilyBaseDir(rootDir, family);
  ensureDir(baseDir);

  const prefix = buildAssetPrefix(family, variant);
  const pattern = buildAssetIdPattern(prefix);
  const entries = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('._'))
    .map((entry) => entry.name);

  let maxIndex = 0;
  for (const entry of entries) {
    const match = entry.match(pattern);
    if (!match) {
      continue;
    }
    const numeric = Number(match[1]);
    if (Number.isFinite(numeric) && numeric > maxIndex) {
      maxIndex = numeric;
    }
  }

  let next = maxIndex + 1;
  while (next < 10000) {
    const candidate = `${prefix}${String(next).padStart(4, '0')}`;
    const candidatePath = path.join(baseDir, candidate);
    if (!fs.existsSync(candidatePath)) {
      return candidate;
    }
    next += 1;
  }

  throw new Error(`Unable to allocate asset id for family "${family}" and variant "${variant}"`);
}

function nextSubjectReferenceId(rootDir) {
  ensureDir(SUBJECT_REFS_ROOT);
  const entries = fs
    .readdirSync(SUBJECT_REFS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('._'))
    .map((entry) => entry.name);

  let maxIndex = 0;
  for (const entry of entries) {
    const match = entry.match(/^subject_(\d{4})$/);
    if (!match) {
      continue;
    }
    const numeric = Number(match[1]);
    if (Number.isFinite(numeric) && numeric > maxIndex) {
      maxIndex = numeric;
    }
  }

  let next = maxIndex + 1;
  while (next < 10000) {
    const candidate = `subject_${String(next).padStart(4, '0')}`;
    const candidatePath = path.join(SUBJECT_REFS_ROOT, candidate);
    if (!fs.existsSync(candidatePath)) {
      return candidate;
    }
    next += 1;
  }

  throw new Error('Unable to allocate subject reference id.');
}

function inferVariantFromAssetId(family, assetId) {
  const config = getFamilyConfig(family);
  if (typeof config.inferVariant === 'function') {
    return config.inferVariant(assetId);
  }
  return null;
}

function resolveAssetDirectory(rootDir, family, assetId) {
  const safeAssetId = assertSafeAssetId(assetId);
  const baseDir = getFamilyBaseDir(rootDir, family);
  ensureDir(baseDir);
  const candidate = path.resolve(baseDir, safeAssetId);
  const resolvedBase = path.resolve(baseDir);
  if (!(candidate === resolvedBase || candidate.startsWith(`${resolvedBase}${path.sep}`))) {
    throw new Error('Invalid asset path.');
  }
  return {
    assetId: safeAssetId,
    baseDir,
    assetDir: candidate,
  };
}

function sanitizeUploadedName(fileName) {
  return path.basename(String(fileName || 'file')).replace(/[^\w.\-]+/g, '_');
}

function extensionFromMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('png')) return '.png';
  if (normalized.includes('webp')) return '.webp';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return '.jpg';
  return '.bin';
}

function resolveImageExtension(file) {
  const fromName = path.extname(file?.originalName || '').toLowerCase();
  if (IMAGE_EXTENSIONS.has(fromName)) {
    return fromName;
  }
  const fromMime = extensionFromMimeType(file?.mimeType || '').toLowerCase();
  if (IMAGE_EXTENSIONS.has(fromMime)) {
    return fromMime;
  }
  return null;
}

function parseContentDisposition(value) {
  const result = {};
  const text = String(value || '');
  const nameMatch = text.match(/name="([^"]+)"/i);
  const fileMatch = text.match(/filename="([^"]*)"/i);
  if (nameMatch) result.name = nameMatch[1];
  if (fileMatch) result.filename = fileMatch[1];
  return result;
}

function parseMultipartBody(bodyBuffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const fields = {};
  const files = [];
  let cursor = bodyBuffer.indexOf(delimiter);

  while (cursor !== -1) {
    let partStart = cursor + delimiter.length;
    const isClosing = bodyBuffer.slice(partStart, partStart + 2).toString('utf8') === '--';
    if (isClosing) {
      break;
    }

    if (bodyBuffer[partStart] === 13 && bodyBuffer[partStart + 1] === 10) {
      partStart += 2;
    }

    const nextBoundary = bodyBuffer.indexOf(delimiter, partStart);
    if (nextBoundary === -1) {
      break;
    }

    const rawPart = bodyBuffer.slice(partStart, nextBoundary - 2);
    const headerSeparator = rawPart.indexOf(Buffer.from('\r\n\r\n'));
    if (headerSeparator === -1) {
      cursor = nextBoundary;
      continue;
    }

    const headersRaw = rawPart.slice(0, headerSeparator).toString('utf8');
    const content = rawPart.slice(headerSeparator + 4);
    const headers = headersRaw.split('\r\n');
    const dispositionLine = headers.find((line) => /^content-disposition:/i.test(line));
    const typeLine = headers.find((line) => /^content-type:/i.test(line));
    if (!dispositionLine) {
      cursor = nextBoundary;
      continue;
    }

    const disposition = parseContentDisposition(dispositionLine);
    const fieldName = disposition.name || '';
    if (!fieldName) {
      cursor = nextBoundary;
      continue;
    }

    if (disposition.filename != null && disposition.filename !== '') {
      files.push({
        fieldName,
        originalName: sanitizeUploadedName(disposition.filename),
        mimeType: typeLine ? typeLine.split(':')[1].trim() : 'application/octet-stream',
        buffer: content,
      });
    } else {
      fields[fieldName] = content.toString('utf8').trim();
    }

    cursor = nextBoundary;
  }

  return { fields, files };
}

function parseMultipartFormData(req) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '');
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data.'));
      return;
    }

    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
    if (!boundary) {
      reject(new Error('Multipart boundary is missing.'));
      return;
    }

    const chunks = [];
    let totalBytes = 0;
    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_MULTIPART_BYTES) {
        reject(new Error(`Multipart payload too large. Max ${MAX_MULTIPART_BYTES} bytes.`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const bodyBuffer = Buffer.concat(chunks);
        resolve(parseMultipartBody(bodyBuffer, boundary));
      } catch (error) {
        reject(new Error(`Failed to parse multipart form-data: ${error.message}`));
      }
    });

    req.on('error', reject);
  });
}

function buildAssetList(rootDir) {
  const assetsByFamily = {};
  let totalAssets = 0;
  let totalFiles = 0;

  for (const family of Object.keys(ASSET_FAMILY_CONFIG)) {
    const baseDir = getFamilyBaseDir(rootDir, family);
    ensureDir(baseDir);
    const families = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('._'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, 'en'));

    const items = [];
    for (const assetId of families) {
      const assetDir = path.join(baseDir, assetId);
      const images = listImageFiles(assetDir);
      const preview = images[0] ? path.join(path.relative(ROOT_DIR, assetDir), images[0]).replaceAll(path.sep, '/') : null;
      items.push({
        asset_id: assetId,
        family,
        variant: inferVariantFromAssetId(family, assetId) || 'unknown',
        preview: preview ? `/${preview}` : null,
        images: images.map((fileName) => ({
          fileName,
          url: `/${path.join(path.relative(ROOT_DIR, assetDir), fileName).replaceAll(path.sep, '/')}`,
        })),
        fileCount: images.length,
        path: path.relative(ROOT_DIR, assetDir).replaceAll(path.sep, '/'),
      });
      totalAssets += 1;
      totalFiles += images.length;
    }
    assetsByFamily[family] = items;
  }

  return {
    assetsByFamily,
    summary: {
      totalAssets,
      totalFiles,
      families: Object.keys(ASSET_FAMILY_CONFIG).length,
    },
  };
}

function slugifyInputSetName(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return slug || 'input_set';
}

function isValidInputSetId(value) {
  return /^[a-z0-9][a-z0-9_]{2,79}$/.test(String(value || ''));
}

function createInputSetId(rootDir, name) {
  const base = slugifyInputSetName(name);
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  let candidate = `${base}_${stamp}`;
  let index = 1;
  ensureDir(INPUT_SETS_ROOT);

  while (fs.existsSync(path.join(INPUT_SETS_ROOT, candidate))) {
    candidate = `${base}_${stamp}_${String(index).padStart(2, '0')}`;
    index += 1;
    if (index > 99) {
      throw new Error('Unable to allocate unique input set id.');
    }
  }

  if (!isValidInputSetId(candidate)) {
    throw new Error(`Generated invalid inputSetId: ${candidate}`);
  }
  return candidate;
}

function resolveInputSetDir(rootDir, inputSetId) {
  const normalized = String(inputSetId || '').trim();
  if (!isValidInputSetId(normalized)) {
    throw new Error('Invalid inputSetId.');
  }
  ensureDir(INPUT_SETS_ROOT);
  const resolvedRoot = path.resolve(INPUT_SETS_ROOT);
  const candidate = path.resolve(INPUT_SETS_ROOT, normalized);
  if (!(candidate === resolvedRoot || candidate.startsWith(`${resolvedRoot}${path.sep}`))) {
    throw new Error('Invalid input set path.');
  }
  return {
    inputSetId: normalized,
    setDir: candidate,
  };
}

function listInputSetImageFiles(setDir) {
  if (!fs.existsSync(setDir) || !fs.statSync(setDir).isDirectory()) {
    return [];
  }
  return fs
    .readdirSync(setDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('._') && IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function readInputSetMeta(setDir, inputSetId) {
  const metaPath = path.join(setDir, '_meta.json');
  const fallbackStat = fs.existsSync(setDir) ? fs.statSync(setDir) : null;
  const fallbackCreatedAt = fallbackStat?.birthtime?.toISOString?.() || fallbackStat?.mtime?.toISOString?.() || new Date().toISOString();
  const fallbackName = inputSetId;

  const meta = safeReadJson(metaPath, null);
  if (!meta || typeof meta !== 'object') {
    return {
      name: fallbackName,
      createdAt: fallbackCreatedAt,
    };
  }

  return {
    name: String(meta.name || fallbackName),
    createdAt: String(meta.createdAt || fallbackCreatedAt),
  };
}

function writeInputSetMeta(setDir, meta) {
  const metaPath = path.join(setDir, '_meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    name: String(meta.name || '').trim(),
    createdAt: String(meta.createdAt || new Date().toISOString()),
  }, null, 2));
}

function buildInputSetList(rootDir) {
  ensureDir(INPUT_SETS_ROOT);
  const entries = fs
    .readdirSync(INPUT_SETS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('._'))
    .map((entry) => entry.name)
    .filter((id) => isValidInputSetId(id))
    .sort((a, b) => b.localeCompare(a, 'en'));

  const inputSets = entries.map((inputSetId) => {
    const setDir = path.join(INPUT_SETS_ROOT, inputSetId);
    const meta = readInputSetMeta(setDir, inputSetId);
    const files = listInputSetImageFiles(setDir);
    const previewFile = files[0] || null;
    const basePath = `inputs/sets/${inputSetId}`;
    return {
      inputSetId,
      name: meta.name,
      createdAt: meta.createdAt,
      fileCount: files.length,
      folderPath: basePath,
      path: basePath,
      preview: previewFile ? `/${basePath}/${previewFile}` : null,
      images: files.map((fileName) => ({
        fileName,
        url: `/${basePath}/${fileName}`,
      })),
    };
  });

  return {
    inputSets,
    summary: {
      totalSets: inputSets.length,
      totalFiles: inputSets.reduce((acc, item) => acc + (item.fileCount || 0), 0),
    },
  };
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function parseBatchMarkers(outputText) {
  const batchJobName = outputText.match(/BATCH_JOB_NAME=(.+)/)?.[1]?.trim() || null;
  const batchState = outputText.match(/BATCH_STATE=(.+)/)?.[1]?.trim() || null;
  return { batchJobName, batchState };
}

function getLogSnippet(stdout, stderr) {
  const combined = [stdout || '', stderr || ''].filter(Boolean).join('\n');
  if (combined.length <= LOG_SNIPPET_LIMIT) {
    return combined;
  }
  return combined.slice(combined.length - LOG_SNIPPET_LIMIT);
}

function runBatchWithEdit(jobFilePath) {
  return new Promise((resolve) => {
    const relativeJobPath = path.relative(ROOT_DIR, jobFilePath);
    const command = `node edit.js ${relativeJobPath}`;
    const args = ['edit.js', relativeJobPath];
    const startedAt = Date.now();

    const child = spawn('node', args, {
      cwd: ROOT_DIR,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timeoutHit = false;

    const timeout = setTimeout(() => {
      timeoutHit = true;
      child.kill('SIGTERM');
    }, BATCH_RUN_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      const outputText = `${stdout}\n${stderr}`;
      const markers = parseBatchMarkers(outputText);
      resolve({
        started: true,
        success: !timeoutHit && code === 0,
        timeout: timeoutHit,
        exitCode: code,
        command,
        durationMs: Date.now() - startedAt,
        ...markers,
        logsSnippet: getLogSnippet(stdout, stderr),
      });
    });
  });
}

function parseJobNameFromPath(pathname) {
  const prefix = '/api/job-builder/jobs/';
  if (!pathname.startsWith(prefix)) {
    return null;
  }
  return decodeURIComponent(pathname.slice(prefix.length));
}

function buildValidationAndCompile(inputJob, registry) {
  const validation = validateCanonicalJob(inputJob, { rootDir: ROOT_DIR, registry });
  if (validation.errors.length > 0) {
    return {
      ok: false,
      validation,
      error: 'Canonical job validation failed.',
    };
  }

  const { prompt, canonicalJob, imageConfig, authority } = buildPrompt(inputJob, { rootDir: ROOT_DIR });
  if (!prompt || prompt.length < 50) {
    return {
      ok: false,
      validation,
      error: 'Compiled prompt is invalid or empty',
    };
  }

  return {
    ok: true,
    validation,
    prompt,
    canonicalJob,
    imageConfig,
    authority,
  };
}

function resolveInputSourceDir(rootDir, inputSourceRaw) {
  const inputSource = String(inputSourceRaw || 'batch_input').trim() || 'batch_input';
  const resolvedRoot = path.resolve(rootDir);
  const dirPath = path.resolve(rootDir, inputSource);
  if (!(dirPath === resolvedRoot || dirPath.startsWith(`${resolvedRoot}${path.sep}`))) {
    throw new Error(`Invalid inputSource path: ${inputSource}`);
  }
  return {
    inputSource,
    dirPath,
  };
}

function getBatchManifestPath(rootDir, safeBatchName) {
  ensureDir(BATCH_MANIFEST_DIR);
  return path.join(BATCH_MANIFEST_DIR, `${safeBatchName}.manifest.json`);
}

function buildRequestItemsFromInputFiles(inputFiles = []) {
  return inputFiles.map((file, index) => ({
    index,
    key: path.parse(file).name || null,
    inputFile: file,
  }));
}

function buildRequestItemsFromStageMappings(mappings = []) {
  return mappings.map((item) => ({
    index: item.index,
    key: item.requestKey,
    inputFile: item.fileName,
    originalInputFile: item.fileName,
    originalInputPath: item.originalInputPath,
    stagedInputFile: item.fileName,
    stagedInputPath: item.stagedInputPath,
  }));
}

function buildRequestKeyToInputFile(requestItems = []) {
  const mapping = {};
  const collisions = new Set();

  for (const item of requestItems) {
    const key = String(item?.key || '').trim();
    const inputFile = String(item?.inputFile || '').trim();
    if (!key || !inputFile) {
      continue;
    }
    if (mapping[key] && mapping[key] !== inputFile) {
      collisions.add(key);
      continue;
    }
    mapping[key] = inputFile;
  }

  for (const key of collisions) {
    delete mapping[key];
  }
  return mapping;
}

function snapshotBatchInput(canonicalJob) {
  const resolved = resolveInputSourceDir(ROOT_DIR, canonicalJob?.inputSource || 'batch_input');
  const dirExists = fs.existsSync(resolved.dirPath) && fs.statSync(resolved.dirPath).isDirectory();
  const allInputFiles = dirExists ? listImageFiles(resolved.dirPath) : [];
  const inputFiles = allInputFiles.slice(0, EDIT_RUNTIME_MAX_BATCH);

  return {
    inputSource: resolved.inputSource,
    inputDir: resolved.dirPath,
    inputFiles,
    originalInputFiles: buildRequestItemsFromInputFiles(inputFiles).map((item) => ({
      index: item.index,
      fileName: item.inputFile,
      requestKey: item.key,
      relativePath: toPortableRelative(ROOT_DIR, path.join(resolved.dirPath, item.inputFile)),
    })),
    capturedAt: new Date().toISOString(),
  };
}

function buildRunAttemptPlan({ job, sourceJobFile, inputSnapshot, requestItems, originalInputFiles, runId = null }) {
  const nextRunId = String(runId || makeRunId()).trim();
  const existingRun = getRunRecord(ROOT_DIR, nextRunId);
  const existingAttempts = listRunAttempts(ROOT_DIR, nextRunId);
  const attemptId = makeAttemptId(existingAttempts);
  const jobId = resolveJobId(job) || existingRun?.jobId || existingRun?.sourceJobId || null;
  const stableRequestItems = Array.isArray(existingRun?.requestItems) && existingRun.requestItems.length > 0
    ? existingRun.requestItems
    : requestItems;
  const stableOriginalInputFiles = Array.isArray(existingRun?.originalInputFiles) && existingRun.originalInputFiles.length > 0
    ? existingRun.originalInputFiles
    : originalInputFiles;
  const stableInputFiles = Array.isArray(existingRun?.inputFiles) && existingRun.inputFiles.length > 0
    ? existingRun.inputFiles
    : inputSnapshot.inputFiles;
  const requestKeyToInputFile = Object.keys(existingRun?.requestKeyToInputFile || {}).length > 0
    ? existingRun.requestKeyToInputFile
    : buildRequestKeyToInputFile(stableRequestItems);

  const runRecord = upsertRunRecord(ROOT_DIR, {
    runId: nextRunId,
    jobId,
    sourceJobId: jobId,
    sourceJobFile: existingRun?.sourceJobFile || sourceJobFile,
    inputSource: existingRun?.inputSource || inputSnapshot.inputSource,
    inputFiles: stableInputFiles,
    requestItems: stableRequestItems,
    requestKeyToInputFile,
    originalInputFiles: stableOriginalInputFiles,
    latestAttemptId: attemptId,
    status: 'pending',
    attemptCount: existingAttempts.length + 1,
  });

  return {
    runId: nextRunId,
    attemptId,
    requestKeyToInputFile,
    runRecord,
  };
}

function resolveRootRelativePath(relativePath, label = 'path') {
  const normalized = String(relativePath || '').trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  const resolvedRoot = path.resolve(ROOT_DIR);
  const candidate = path.resolve(ROOT_DIR, normalized);
  if (!(candidate === resolvedRoot || candidate.startsWith(`${resolvedRoot}${path.sep}`))) {
    throw new Error(`Invalid ${label}.`);
  }
  return candidate;
}

function loadCanonicalJobFromSourceFile(sourceJobFile) {
  const filePath = resolveRootRelativePath(sourceJobFile, 'sourceJobFile');
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Canonical job file not found: ${sourceJobFile}`);
  }
  return mergeDefaultJob(readJson(filePath));
}

function syncRunRecordStatus(runId, status, batchRecord = null) {
  const normalizedRunId = String(runId || batchRecord?.runId || '').trim();
  if (!normalizedRunId) {
    return null;
  }

  const existingRun = getRunRecord(ROOT_DIR, normalizedRunId);
  if (!existingRun) {
    return null;
  }

  return upsertRunRecord(ROOT_DIR, {
    ...existingRun,
    latestAttemptId: batchRecord?.attemptId || existingRun.latestAttemptId,
    latestBatchName: batchRecord?.batchName || existingRun.latestBatchName,
    status: status || batchRecord?.lastKnownState || existingRun.status,
    attemptCount: Math.max(existingRun.attemptCount || 0, listRunAttempts(ROOT_DIR, normalizedRunId).length),
  });
}

function ensureRunRecordFromBatchRecord(batchRecord) {
  if (!batchRecord) {
    return null;
  }

  const manifest = readBatchManifest(batchRecord.batchName);
  const runId = String(batchRecord.runId || manifest?.runId || '').trim();
  if (!runId) {
    return null;
  }

  const existing = getRunRecord(ROOT_DIR, runId);
  if (existing) {
    return existing;
  }

  return upsertRunRecord(ROOT_DIR, {
    runId,
    jobId: batchRecord.jobId || manifest?.jobId || manifest?.sourceJobId || null,
    sourceJobId: batchRecord.sourceJobId || manifest?.sourceJobId || manifest?.jobId || null,
    sourceJobFile: batchRecord.sourceJobFile || manifest?.sourceJobFile || null,
    inputSource: batchRecord.inputSource || manifest?.inputSource || null,
    inputFiles: Array.isArray(manifest?.inputFiles) ? manifest.inputFiles : [],
    requestItems: Array.isArray(manifest?.requestItems) ? manifest.requestItems : [],
    requestKeyToInputFile: manifest?.requestKeyToInputFile || {},
    originalInputFiles: Array.isArray(manifest?.originalInputFiles) ? manifest.originalInputFiles : [],
    latestAttemptId: batchRecord.attemptId || manifest?.attemptId || null,
    latestBatchName: batchRecord.batchName || null,
    status: batchRecord.lastKnownState || 'pending',
    attemptCount: Math.max(1, listRunAttempts(ROOT_DIR, runId).length),
  });
}

function resolveRetryContext({ runId, batchName }) {
  let batchRecord = null;
  const normalizedBatchName = String(batchName || '').trim();
  if (normalizedBatchName) {
    batchRecord = getBatchRecord(ROOT_DIR, normalizedBatchName);
    if (!batchRecord) {
      throw new Error(`Batch not found: ${normalizedBatchName}`);
    }
  }

  const requestedRunId = String(runId || batchRecord?.runId || '').trim();
  let runRecord = requestedRunId ? getRunRecord(ROOT_DIR, requestedRunId) : null;
  if (!runRecord && batchRecord) {
    runRecord = ensureRunRecordFromBatchRecord(batchRecord);
  }
  if (!runRecord && requestedRunId) {
    const attempts = listRunAttempts(ROOT_DIR, requestedRunId);
    const fallbackBatch = attempts[attempts.length - 1] || null;
    if (fallbackBatch) {
      batchRecord = batchRecord || fallbackBatch;
      runRecord = ensureRunRecordFromBatchRecord(fallbackBatch);
    }
  }

  if (!runRecord) {
    const lookupLabel = requestedRunId || normalizedBatchName || 'retry target';
    throw new Error(`Run not found for ${lookupLabel}.`);
  }

  if (!batchRecord && runRecord.latestBatchName) {
    batchRecord = getBatchRecord(ROOT_DIR, runRecord.latestBatchName) || null;
  }

  return {
    runRecord,
    batchRecord,
  };
}

function buildRetryInputSnapshot(runRecord, requestKey = null) {
  const resolved = resolveInputSourceDir(ROOT_DIR, runRecord?.inputSource || 'batch_input');
  const requestedKey = String(requestKey || '').trim();
  const requestKeyMap = runRecord?.requestKeyToInputFile && typeof runRecord.requestKeyToInputFile === 'object'
    ? { ...runRecord.requestKeyToInputFile }
    : {};

  let inputFiles = [];
  if (requestedKey) {
    const mappedFile = String(
      requestKeyMap[requestedKey]
      || runRecord?.originalInputFiles?.find((item) => String(item?.requestKey || '').trim() === requestedKey)?.fileName
      || ''
    ).trim();
    if (!mappedFile) {
      throw new Error(`requestKey not found for retry: ${requestedKey}`);
    }
    inputFiles = [mappedFile];
  } else if (Array.isArray(runRecord?.inputFiles) && runRecord.inputFiles.length > 0) {
    inputFiles = runRecord.inputFiles.slice();
  } else if (Array.isArray(runRecord?.requestItems) && runRecord.requestItems.length > 0) {
    inputFiles = runRecord.requestItems.map((item) => item?.inputFile).filter(Boolean);
  } else {
    inputFiles = Object.values(requestKeyMap).filter(Boolean);
  }

  inputFiles = uniqueStrings(inputFiles);
  if (inputFiles.length === 0) {
    throw new Error('No retryable input files were found for this run.');
  }

  const originalByFile = new Map();
  const originalByKey = new Map();
  for (const entry of Array.isArray(runRecord?.originalInputFiles) ? runRecord.originalInputFiles : []) {
    const fileName = String(entry?.fileName || '').trim();
    const key = String(entry?.requestKey || '').trim();
    if (fileName && !originalByFile.has(fileName)) {
      originalByFile.set(fileName, entry);
    }
    if (key && !originalByKey.has(key)) {
      originalByKey.set(key, entry);
    }
  }

  const originalInputFiles = inputFiles.map((fileName, index) => {
    const absolutePath = path.join(resolved.dirPath, fileName);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      throw new Error(`Retry input file is missing from source library: ${fileName}`);
    }
    const matched = originalByFile.get(fileName) || originalByKey.get(path.parse(fileName).name) || null;
    return {
      index,
      fileName,
      requestKey: matched?.requestKey || path.parse(fileName).name || null,
      inputSource: resolved.inputSource,
      relativePath: matched?.relativePath || toPortableRelative(ROOT_DIR, absolutePath),
    };
  });

  return {
    inputSource: resolved.inputSource,
    inputDir: resolved.dirPath,
    inputFiles,
    originalInputFiles,
    capturedAt: new Date().toISOString(),
  };
}

function writeRuntimeJobForStagedRun(canonicalJob, sourceJobRelativePath, inputSnapshot, stagedRun, identifiers = {}) {
  const runtimeJob = JSON.parse(JSON.stringify(canonicalJob || {}));
  runtimeJob.inputSource = stagedRun.stagedInputSource;
  runtimeJob.runtime = {
    ...(runtimeJob.runtime && typeof runtimeJob.runtime === 'object' ? runtimeJob.runtime : {}),
    mode: 'staged',
    runId: identifiers.runId || stagedRun.runId,
    attemptId: identifiers.attemptId || null,
    stageRunId: stagedRun.runId,
    sourceInputSource: inputSnapshot.inputSource,
    stagedInputSource: stagedRun.stagedInputSource,
    stageDir: stagedRun.runDirRelative,
    batchJsonlPath: stagedRun.batchJsonlRelativePath,
    sourceJobFile: sourceJobRelativePath,
    originalInputFiles: stagedRun.originalInputFiles,
    stagedInputFiles: stagedRun.stagedInputFiles,
    stagedAt: new Date().toISOString(),
  };

  fs.writeFileSync(stagedRun.runtimeJobPath, JSON.stringify(runtimeJob, null, 2));

  return {
    filePath: stagedRun.runtimeJobPath,
    relativePath: stagedRun.runtimeJobRelativePath,
  };
}

function writeBatchManifest(manifest) {
  const safeBatchName = safeBatchDirName(manifest?.batchName || manifest?.safeBatchName || '');
  if (!safeBatchName) {
    throw new Error('Cannot write manifest without batchName.');
  }
  const filePath = getBatchManifestPath(ROOT_DIR, safeBatchName);
  const payload = {
    version: 3,
    createdAt: new Date().toISOString(),
    ...manifest,
    safeBatchName,
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return {
    filePath,
    safeBatchName,
  };
}

async function launchBatchAttempt({ canonicalJob, sourceJobFile, inputSnapshot, runId = null }) {
  const baseRequestItems = buildRequestItemsFromInputFiles(inputSnapshot.inputFiles);
  const runPlan = buildRunAttemptPlan({
    job: canonicalJob,
    sourceJobFile,
    inputSnapshot,
    requestItems: baseRequestItems,
    originalInputFiles: inputSnapshot.originalInputFiles,
    runId,
  });
  const stagedRun = stageRunInputs({
    rootDir: ROOT_DIR,
    inputSource: inputSnapshot.inputSource,
    inputDir: inputSnapshot.inputDir,
    inputFiles: inputSnapshot.inputFiles,
    runId: buildAttemptStageRunId(runPlan.runId, runPlan.attemptId),
  });
  const runtimeJob = writeRuntimeJobForStagedRun(
    canonicalJob,
    sourceJobFile,
    inputSnapshot,
    stagedRun,
    {
      runId: runPlan.runId,
      attemptId: runPlan.attemptId,
    }
  );
  const requestItems = buildRequestItemsFromStageMappings(stagedRun.mappings);
  const runResult = await runBatchWithEdit(runtimeJob.filePath);

  let batchRecord = null;
  if (runResult.batchJobName) {
    const now = new Date().toISOString();
    batchRecord = upsertBatchRecord(ROOT_DIR, {
      batchId: runResult.batchJobName,
      batchName: runResult.batchJobName,
      sourceJobFile,
      sourceJobId: resolveJobId(canonicalJob),
      jobId: resolveJobId(canonicalJob),
      runId: runPlan.runId,
      attemptId: runPlan.attemptId,
      inputSource: inputSnapshot.inputSource,
      stagedInputSource: stagedRun.stagedInputSource,
      stageDir: stagedRun.runDirRelative,
      runtimeJobFile: runtimeJob.relativePath,
      inputFileCount: inputSnapshot.inputFiles.length,
      requestCount: requestItems.length,
      createdAt: now,
      lastKnownState: runResult.batchState || 'UNKNOWN',
      downloaded: false,
      cancelled: false,
      completedAt: isTerminalBatchState(runResult.batchState) ? now : null,
      lastCheckedAt: now,
      lastError: runResult.success ? null : (runResult.logsSnippet || 'Batch run failed'),
    });

    syncRunRecordStatus(runPlan.runId, runResult.batchState || 'pending', batchRecord);

    try {
      writeBatchManifest({
        batchId: runResult.batchJobName,
        batchName: runResult.batchJobName,
        safeBatchName: safeBatchDirName(runResult.batchJobName),
        sourceJobFile,
        sourceJobId: resolveJobId(canonicalJob),
        jobId: resolveJobId(canonicalJob),
        inputSource: inputSnapshot.inputSource,
        inputFiles: inputSnapshot.inputFiles,
        stagedInputSource: stagedRun.stagedInputSource,
        stageDir: stagedRun.runDirRelative,
        runId: runPlan.runId,
        attemptId: runPlan.attemptId,
        runtimeJobFile: runtimeJob.relativePath,
        requestItems,
        requestKeyToInputFile: buildRequestKeyToInputFile(requestItems),
        originalInputFiles: stagedRun.originalInputFiles,
        stagedInputFiles: stagedRun.stagedInputFiles,
      });
    } catch (manifestError) {
      logStep('job_builder.run_batch.manifest_error', manifestError.message || 'unknown');
    }
  } else {
    syncRunRecordStatus(runPlan.runId, 'failed');
  }

  return {
    runPlan,
    stagedRun,
    runtimeJob,
    requestItems,
    runResult,
    batchRecord,
  };
}

function readBatchManifest(batchName) {
  const safeBatchName = safeBatchDirName(batchName);
  const manifestPath = getBatchManifestPath(ROOT_DIR, safeBatchName);
  const manifest = safeReadJson(manifestPath, null);
  if (!manifest || typeof manifest !== 'object') {
    return null;
  }
  return manifest;
}

function buildInputPreviewUrl(inputSource, file) {
  const safeFile = path.basename(String(file || '').trim());
  if (!safeFile) {
    return null;
  }
  const normalizedSource = String(inputSource || '').trim();
  if (!normalizedSource) {
    return null;
  }
  return buildPreviewUrlFromRelativePath(`${normalizedSource.replace(/^\/+/, '')}/${safeFile}`);
}

function buildPreviewUrlFromRelativePath(relativePath) {
  const normalized = String(relativePath || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) {
    return null;
  }
  if (
    normalized.startsWith('batch_input/')
    || normalized.startsWith('inputs/')
    || normalized.startsWith('staging/')
  ) {
    return `/${normalized}`;
  }
  return null;
}

function parseBatchResultMetadata(outputDirPath) {
  const jsonlPath = path.join(outputDirPath, 'batch_result.jsonl');
  if (!fs.existsSync(jsonlPath) || !fs.statSync(jsonlPath).isFile()) {
    return {
      keys: [],
      source: null,
    };
  }

  const keys = [];
  const lines = fs.readFileSync(jsonlPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      const key = String(row?.key || '').trim();
      if (key) {
        keys.push(key);
      }
    } catch (_error) {
      // Ignore malformed lines.
    }
  }

  return {
    keys,
    source: keys.length > 0 ? 'batch_result_jsonl' : null,
  };
}

function buildAttemptOutputList(rootDir, batchName) {
  const normalizedBatchName = String(batchName || '').trim();
  if (!normalizedBatchName) {
    throw new Error('batchName is required.');
  }

  const batchRecord = getBatchRecord(rootDir, normalizedBatchName);
  const outputReadTarget = resolveBatchOutputReadDir(rootDir, normalizedBatchName);
  const safeBatchName = outputReadTarget.safeBatchName;
  const resolvedOutputDir = outputReadTarget.outputDir;
  const outputSource = outputReadTarget.outputSource;
  const relativeOutputDir = path.relative(rootDir, resolvedOutputDir).replaceAll(path.sep, '/');
  const outputFiles = (fs.existsSync(resolvedOutputDir) && fs.statSync(resolvedOutputDir).isDirectory())
    ? listImageFiles(resolvedOutputDir)
    : [];
  const outputEntries = outputFiles.map((file) => ({
    file,
    key: path.parse(file).name || null,
    used: false,
  }));

  const keyToOutputIndexes = new Map();
  for (let index = 0; index < outputEntries.length; index += 1) {
    const key = outputEntries[index].key;
    if (!key) {
      continue;
    }
    const list = keyToOutputIndexes.get(key) || [];
    list.push(index);
    keyToOutputIndexes.set(key, list);
  }

  function consumeOutputByKey(key) {
    if (!key || !keyToOutputIndexes.has(key)) {
      return null;
    }
    const indexes = keyToOutputIndexes.get(key);
    while (indexes.length > 0) {
      const index = indexes.shift();
      const entry = outputEntries[index];
      if (entry && !entry.used) {
        entry.used = true;
        return entry;
      }
    }
    return null;
  }

  function consumeNextOutput() {
    const entry = outputEntries.find((item) => !item.used);
    if (!entry) {
      return null;
    }
    entry.used = true;
    return entry;
  }

  const manifest = readBatchManifest(normalizedBatchName);
  const manifestInputSource = String(manifest?.inputSource || '').trim();
  const manifestInputFiles = Array.isArray(manifest?.inputFiles) ? manifest.inputFiles.slice() : [];
  const requestItems = Array.isArray(manifest?.requestItems) ? manifest.requestItems.slice() : [];
  const stagedInputFiles = Array.isArray(manifest?.stagedInputFiles) ? manifest.stagedInputFiles.slice() : [];
  const requestKeyToInputFile = manifest?.requestKeyToInputFile && typeof manifest.requestKeyToInputFile === 'object'
    ? { ...manifest.requestKeyToInputFile }
    : {};
  const stagedInputByKey = new Map();
  const stagedInputByOriginalFile = new Map();
  for (const entry of stagedInputFiles) {
    const key = String(entry?.requestKey || '').trim();
    const originalFile = String(entry?.originalInputFile || entry?.fileName || '').trim();
    if (key && !stagedInputByKey.has(key)) {
      stagedInputByKey.set(key, entry);
    }
    if (originalFile && !stagedInputByOriginalFile.has(originalFile)) {
      stagedInputByOriginalFile.set(originalFile, entry);
    }
  }

  const inputUsed = new Set();
  const keyUsed = new Set();
  const items = [];

  function buildInputContext(file, requestItem, key) {
    const safeFile = path.basename(String(file || requestItem?.inputFile || requestItem?.originalInputFile || '').trim());
    const stagedMeta = (key ? stagedInputByKey.get(key) : null) || (safeFile ? stagedInputByOriginalFile.get(safeFile) : null) || null;
    return {
      file: safeFile || null,
      originalInputPath: String(requestItem?.originalInputPath || stagedMeta?.originalInputPath || '').trim() || null,
      stagedInputPath: String(requestItem?.stagedInputPath || stagedMeta?.relativePath || stagedMeta?.stagedInputPath || '').trim() || null,
    };
  }

  function buildInputNode(file, inputContext = null) {
    const safeFile = path.basename(String(file || inputContext?.file || '').trim());
    if (!safeFile) {
      return null;
    }
    const originalInputPath = String(inputContext?.originalInputPath || '').trim()
      || `${String(manifestInputSource || '').trim().replace(/^\/+/, '')}/${safeFile}`;
    const stagedInputPath = String(inputContext?.stagedInputPath || '').trim() || null;
    return {
      file: safeFile,
      originalPath: originalInputPath,
      stagedPath: stagedInputPath,
      url: buildPreviewUrlFromRelativePath(stagedInputPath)
        || buildPreviewUrlFromRelativePath(originalInputPath)
        || buildInputPreviewUrl(manifestInputSource, safeFile),
      originalUrl: buildPreviewUrlFromRelativePath(originalInputPath),
      stagedUrl: buildPreviewUrlFromRelativePath(stagedInputPath),
    };
  }

  function buildOutputNode(file) {
    if (!file) {
      return null;
    }
    const safeFile = path.basename(String(file));
    if (!safeFile) {
      return null;
    }
    return {
      file: safeFile,
      path: path.posix.join(relativeOutputDir, safeFile),
      url: buildBatchOutputImageUrl(outputSource, safeBatchName, safeFile),
    };
  }

  function markInputUsed(file) {
    if (!file) {
      return;
    }
    inputUsed.add(String(file));
  }

  // Priority 1: explicit manifest request key mapping.
  for (const requestItem of requestItems) {
    const key = String(requestItem?.key || '').trim() || null;
    const inputFile = String(requestItem?.inputFile || '').trim() || null;
    if (!key && !inputFile) {
      continue;
    }
    const inputContext = buildInputContext(inputFile, requestItem, key);
    const outputEntry = key ? consumeOutputByKey(key) : null;
    if (inputFile) {
      markInputUsed(inputFile);
    }
    items.push({
      key,
      input: buildInputNode(inputFile, inputContext),
      output: outputEntry ? buildOutputNode(outputEntry.file) : null,
    });
    if (key) {
      keyUsed.add(key);
    }
  }

  // Priority 1 fallback: manifest object mapping when requestItems is missing.
  if (items.length === 0 && Object.keys(requestKeyToInputFile).length > 0) {
    for (const [keyRaw, inputFileRaw] of Object.entries(requestKeyToInputFile)) {
      const key = String(keyRaw || '').trim() || null;
      const inputFile = String(inputFileRaw || '').trim() || null;
      if (!key && !inputFile) {
        continue;
      }
      const inputContext = buildInputContext(inputFile, null, key);
      const outputEntry = key ? consumeOutputByKey(key) : null;
      if (inputFile) {
        markInputUsed(inputFile);
      }
      items.push({
        key,
        input: buildInputNode(inputFile, inputContext),
        output: outputEntry ? buildOutputNode(outputEntry.file) : null,
      });
      if (key) {
        keyUsed.add(key);
      }
    }
  }

  // Priority 2: manifest ordered input list aligned with remaining outputs.
  const remainingInputs = manifestInputFiles.filter((file) => !inputUsed.has(String(file)));
  for (const inputFile of remainingInputs) {
    const outputEntry = consumeNextOutput();
    const trackedKey = outputEntry?.key || path.parse(String(inputFile)).name || null;
    const inputContext = buildInputContext(inputFile, null, trackedKey);
    markInputUsed(inputFile);
    items.push({
      key: trackedKey,
      input: buildInputNode(inputFile, inputContext),
      output: outputEntry ? buildOutputNode(outputEntry.file) : null,
    });
    if (trackedKey) {
      keyUsed.add(trackedKey);
    }
  }

  // Priority 3: batch result metadata (if usable).
  const metadata = parseBatchResultMetadata(resolvedOutputDir);
  for (const key of metadata.keys) {
    if (keyUsed.has(key)) {
      continue;
    }
    const outputEntry = consumeOutputByKey(key) || null;
    let inputFile = null;
    if (requestKeyToInputFile[key]) {
      inputFile = requestKeyToInputFile[key];
    } else if (manifestInputFiles.length > 0) {
      const exactStemMatches = manifestInputFiles.filter((file) => path.parse(String(file)).name === key);
      if (exactStemMatches.length === 1) {
        inputFile = exactStemMatches[0];
      }
    }
    if (inputFile && inputUsed.has(String(inputFile))) {
      inputFile = null;
    }

    if (!outputEntry && !inputFile) {
      continue;
    }
    const inputContext = buildInputContext(inputFile, null, key);
    if (inputFile) {
      markInputUsed(inputFile);
    }
    items.push({
      key: key || null,
      input: buildInputNode(inputFile, inputContext),
      output: outputEntry ? buildOutputNode(outputEntry.file) : null,
    });
    if (key) {
      keyUsed.add(key);
    }
  }

  // Priority 4: controlled fallback with explicit unknown pairing.
  for (const outputEntry of outputEntries.filter((entry) => !entry.used)) {
    items.push({
      key: outputEntry.key || null,
      input: null,
      output: buildOutputNode(outputEntry.file),
    });
  }

  const fallbackInputs = manifestInputFiles.filter((file) => !inputUsed.has(String(file)));
  for (const inputFile of fallbackInputs) {
    const inputContext = buildInputContext(inputFile, null, path.parse(String(inputFile)).name || null);
    items.push({
      key: path.parse(String(inputFile)).name || null,
      input: buildInputNode(inputFile, inputContext),
      output: null,
    });
  }

  return {
    batchName: normalizedBatchName,
    batchId: batchRecord?.batchId || normalizedBatchName,
    runId: batchRecord?.runId || null,
    attemptId: batchRecord?.attemptId || null,
    jobId: batchRecord?.jobId || batchRecord?.sourceJobId || manifest?.sourceJobId || null,
    safeBatchName,
    outputDir: relativeOutputDir,
    outputSource,
    items,
    manifestFound: Boolean(manifest),
    pairingSource: {
      manifestRequestItems: requestItems.length,
      manifestInputCount: manifestInputFiles.length,
      batchResultKeys: metadata.keys.length,
    },
    batchRecord,
    manifest,
  };
}

function syncOutputRegistryForAttempt(attemptPayload) {
  const items = Array.isArray(attemptPayload?.items) ? attemptPayload.items : [];
  const outputRecords = items
    .filter((item) => item?.output?.path)
    .map((item) => ({
      jobId: attemptPayload.jobId,
      runId: attemptPayload.runId,
      attemptId: attemptPayload.attemptId,
      batchId: attemptPayload.batchId,
      batchName: attemptPayload.batchName,
      requestKey: item.key || null,
      inputPath: item?.input?.originalPath || null,
      stagedInputPath: item?.input?.stagedPath || null,
      outputPath: item.output.path,
      outputFile: item.output.file,
    }));

  const syncedRecords = upsertOutputRecords(ROOT_DIR, outputRecords);
  const recordsByPath = new Map(
    syncedRecords
      .filter((item) => item?.outputPath)
      .map((item) => [String(item.outputPath), item])
  );

  attemptPayload.items = items.map((item) => {
    const matched = item?.output?.path ? recordsByPath.get(String(item.output.path)) : null;
    return {
      ...item,
      outputId: matched?.outputId || null,
      review_state: matched?.review_state || 'in_review',
      is_final: Boolean(matched?.is_final),
    };
  });

  attemptPayload.outputSummary = getBatchOutputSummary(ROOT_DIR, attemptPayload.batchName);
  return attemptPayload;
}

function buildBatchOutputList(rootDir, batchName) {
  const normalizedBatchName = String(batchName || '').trim();
  if (!normalizedBatchName) {
    throw new Error('batchName is required.');
  }

  const currentRecord = getBatchRecord(rootDir, normalizedBatchName);
  if (currentRecord) {
    ensureRunRecordFromBatchRecord(currentRecord);
  }
  const runId = currentRecord?.runId || null;
  const attemptRecords = runId
    ? listRunAttempts(rootDir, runId).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    : (currentRecord ? [currentRecord] : []);
  attemptRecords.forEach((record) => ensureRunRecordFromBatchRecord(record));

  const attempts = attemptRecords.length > 0
    ? attemptRecords.map((record) => syncOutputRegistryForAttempt(buildAttemptOutputList(rootDir, record.batchName)))
    : [syncOutputRegistryForAttempt(buildAttemptOutputList(rootDir, normalizedBatchName))];

  const currentAttempt = attempts.find((item) => item.batchName === normalizedBatchName) || attempts[0];

  return {
    batchName: normalizedBatchName,
    runId: currentAttempt?.runId || runId || null,
    safeBatchName: currentAttempt?.safeBatchName || safeBatchDirName(normalizedBatchName),
    outputDir: currentAttempt?.outputDir || '',
    outputSource: currentAttempt?.outputSource || 'standard',
    items: Array.isArray(currentAttempt?.items) ? currentAttempt.items : [],
    attempts: attempts.map((attempt) => ({
      batchName: attempt.batchName,
      batchId: attempt.batchId,
      runId: attempt.runId,
      attemptId: attempt.attemptId,
      createdAt: attempt.batchRecord?.createdAt || attempt.manifest?.createdAt || null,
      status: currentRecord?.batchName === attempt.batchName
        ? currentRecord?.lastKnownState || 'UNKNOWN'
        : (attempt.batchRecord?.lastKnownState || 'UNKNOWN'),
      outputDir: attempt.outputDir,
      outputSource: attempt.outputSource,
      outputSummary: attempt.outputSummary || getBatchOutputSummary(rootDir, attempt.batchName),
      items: attempt.items,
    })),
    manifestFound: attempts.some((attempt) => Boolean(attempt.manifestFound)),
    pairingSource: currentAttempt?.pairingSource || {
      manifestRequestItems: 0,
      manifestInputCount: 0,
      batchResultKeys: 0,
    },
  };
}

function createServer() {
  ensureRegistryFile(ROOT_DIR);
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(302, { Location: '/job-builder' });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/job-builder') {
      sendFile(res, path.join(UI_DIR, 'index.html'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/asset-manager') {
      sendFile(res, path.join(ASSET_MANAGER_UI_DIR, 'index.html'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/input-manager') {
      sendFile(res, path.join(INPUT_MANAGER_UI_DIR, 'index.html'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/batch-jobs') {
      sendFile(res, path.join(BATCH_JOBS_UI_DIR, 'index.html'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/job-builder/app.js') {
      sendFile(res, path.join(UI_DIR, 'app.js'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/asset-manager/app.js') {
      sendFile(res, path.join(ASSET_MANAGER_UI_DIR, 'app.js'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/input-manager/app.js') {
      sendFile(res, path.join(INPUT_MANAGER_UI_DIR, 'app.js'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/batch-jobs/app.js') {
      sendFile(res, path.join(BATCH_JOBS_UI_DIR, 'app.js'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/job-builder/styles.css') {
      sendFile(res, path.join(UI_DIR, 'styles.css'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/asset-manager/styles.css') {
      sendFile(res, path.join(ASSET_MANAGER_UI_DIR, 'styles.css'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/input-manager/styles.css') {
      sendFile(res, path.join(INPUT_MANAGER_UI_DIR, 'styles.css'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/batch-jobs/styles.css') {
      sendFile(res, path.join(BATCH_JOBS_UI_DIR, 'styles.css'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/shared/shell.css') {
      sendFile(res, path.join(SHARED_UI_DIR, 'shell.css'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/shared/shell.js') {
      sendFile(res, path.join(SHARED_UI_DIR, 'shell.js'));
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/refs/')) {
      const refsRoot = path.resolve(ROOT_DIR, 'refs');
      const requestRelPath = decodeURIComponent(url.pathname).slice(1);
      const candidate = path.resolve(ROOT_DIR, requestRelPath);
      if (!(candidate === refsRoot || candidate.startsWith(`${refsRoot}${path.sep}`))) {
        sendJson(res, 403, { error: 'Invalid refs path.' });
        return;
      }
      sendFile(res, candidate);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/inputs/')) {
      const inputsRoot = path.resolve(ROOT_DIR, 'inputs');
      const requestRelPath = decodeURIComponent(url.pathname).slice(1);
      const candidate = path.resolve(ROOT_DIR, requestRelPath);
      if (!(candidate === inputsRoot || candidate.startsWith(`${inputsRoot}${path.sep}`))) {
        sendJson(res, 403, { error: 'Invalid inputs path.' });
        return;
      }
      sendFile(res, candidate);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/batch_output/')) {
      const outputRoot = path.resolve(ROOT_DIR, 'batch_output');
      const requestRelPath = decodeURIComponent(url.pathname).slice(1);
      const candidate = path.resolve(ROOT_DIR, requestRelPath);
      if (!(candidate === outputRoot || candidate.startsWith(`${outputRoot}${path.sep}`))) {
        sendJson(res, 403, { error: 'Invalid batch_output path.' });
        return;
      }
      sendFile(res, candidate);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/staging/')) {
      const stagingRoot = path.resolve(ROOT_DIR, 'staging');
      const requestRelPath = decodeURIComponent(url.pathname).slice(1);
      const candidate = path.resolve(ROOT_DIR, requestRelPath);
      if (!(candidate === stagingRoot || candidate.startsWith(`${stagingRoot}${path.sep}`))) {
        sendJson(res, 403, { error: 'Invalid staging path.' });
        return;
      }
      if (!IMAGE_EXTENSIONS.has(path.extname(candidate).toLowerCase())) {
        sendJson(res, 403, { error: 'Only staged image previews are supported.' });
        return;
      }
      sendFile(res, candidate);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/batch_input/')) {
      const inputRoot = path.resolve(ROOT_DIR, 'batch_input');
      const requestRelPath = decodeURIComponent(url.pathname).slice(1);
      const candidate = path.resolve(ROOT_DIR, requestRelPath);
      if (!(candidate === inputRoot || candidate.startsWith(`${inputRoot}${path.sep}`))) {
        sendJson(res, 403, { error: 'Invalid batch_input path.' });
        return;
      }
      sendFile(res, candidate);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/job-builder/bootstrap') {
      sendJson(res, 200, loadBootstrap());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/assets/list') {
      try {
        logStep('asset.list.start');
        const payload = buildAssetList(ROOT_DIR);
        sendJson(res, 200, payload);
      } catch (error) {
        logStep('asset.list.error', error.message || 'unknown');
        sendJson(res, 500, { error: error.message || 'Failed to list assets.' });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/batch/outputs') {
      try {
        const batchName = String(url.searchParams.get('batchName') || '').trim();
        if (!batchName) {
          sendJson(res, 400, { error: 'batchName query parameter is required.' });
          return;
        }
        const payload = buildBatchOutputList(ROOT_DIR, batchName);
        sendJson(res, 200, payload);
      } catch (error) {
        sendJson(res, 400, {
          error: error.message || 'Failed to list batch outputs.',
        });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/inputs/list') {
      try {
        logStep('inputs.list.start');
        const payload = buildInputSetList(ROOT_DIR);
        sendJson(res, 200, payload);
      } catch (error) {
        logStep('inputs.list.error', error.message || 'unknown');
        sendJson(res, 500, { error: error.message || 'Failed to list input sets.' });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/assets/upload') {
      try {
        logStep('asset.upload.start');
        const multipart = await parseMultipartFormData(req);
        const family = normalizeFamily(multipart.fields.family);
        const variant = normalizeVariant(multipart.fields.variant);
        const config = getFamilyConfig(family, variant);
        const files = multipart.files.filter((item) => item.fieldName === 'files' || item.fieldName === 'files[]');

        if (files.length === 0) {
          sendJson(res, 400, { error: 'No files uploaded. Use files[] field.' });
          return;
        }

        const assetId = nextAssetIdForFamily(ROOT_DIR, family, variant);
        const prefix = buildAssetPrefix(family, variant);
        if (!buildAssetIdPattern(prefix).test(assetId)) {
          throw new Error(`Generated asset id does not match required naming rule: ${assetId}`);
        }

        const baseDir = path.join(ROOT_DIR, ...config.dirParts);
        ensureDir(baseDir);
        const assetDir = path.join(baseDir, assetId);
        ensureDir(assetDir);

        let written = 0;
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          if (!file?.buffer || file.buffer.length === 0) {
            continue;
          }
          const ext = path.extname(file.originalName || '') || extensionFromMimeType(file.mimeType);
          const safeExt = ext.toLowerCase().slice(0, 6) || '.bin';
          const fileName = `ref_${String(index + 1).padStart(2, '0')}${safeExt}`;
          const targetPath = path.join(assetDir, fileName);
          fs.writeFileSync(targetPath, file.buffer);
          written += 1;
        }

        if (written === 0) {
          fs.rmSync(assetDir, { recursive: true, force: true });
          sendJson(res, 400, { error: 'Uploaded files are empty.' });
          return;
        }

        const relativeDir = path.relative(ROOT_DIR, assetDir).replaceAll(path.sep, '/');
        logStep('asset.upload.success', `${assetId} files=${written}`);
        sendJson(res, 200, {
          asset_id: assetId,
          family,
          variant,
          fileCount: written,
          path: relativeDir,
        });
      } catch (error) {
        logStep('asset.upload.error', error.message || 'unknown');
        sendJson(res, 400, {
          error: error.message || 'Asset upload failed.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/subjects/upload') {
      try {
        logStep('subject.upload.start');
        const multipart = await parseMultipartFormData(req);
        const files = multipart.files.filter((item) => item.fieldName === 'files' || item.fieldName === 'files[]');

        if (files.length === 0) {
          sendJson(res, 400, { error: 'No files uploaded. Use files[] field.' });
          return;
        }

        const referenceId = nextSubjectReferenceId(ROOT_DIR);
        const referenceDir = path.join(SUBJECT_REFS_ROOT, referenceId);
        ensureDir(referenceDir);

        let written = 0;
        let previewFileName = '';
        for (const file of files) {
          if (!file?.buffer || file.buffer.length === 0) {
            continue;
          }
          const ext = resolveImageExtension(file);
          if (!ext) {
            continue;
          }
          const fileName = `ref_${String(written + 1).padStart(2, '0')}${ext}`;
          fs.writeFileSync(path.join(referenceDir, fileName), file.buffer);
          written += 1;
          if (!previewFileName) {
            previewFileName = fileName;
          }
        }

        if (written === 0) {
          fs.rmSync(referenceDir, { recursive: true, force: true });
          sendJson(res, 400, { error: 'Uploaded files do not contain supported images.' });
          return;
        }

        const relativeDir = path.relative(ROOT_DIR, referenceDir).replaceAll(path.sep, '/');
        logStep('subject.upload.success', `${referenceId} files=${written}`);
        sendJson(res, 200, {
          reference_id: referenceId,
          fileCount: written,
          path: relativeDir,
          preview: previewFileName ? `/${relativeDir}/${previewFileName}` : null,
        });
      } catch (error) {
        logStep('subject.upload.error', error.message || 'unknown');
        sendJson(res, 400, {
          error: error.message || 'Subject reference upload failed.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/inputs/upload') {
      try {
        logStep('inputs.upload.start');
        const multipart = await parseMultipartFormData(req);
        const name = String(multipart.fields.name || '').trim();
        const files = multipart.files.filter((item) => item.fieldName === 'files' || item.fieldName === 'files[]');

        if (!name) {
          sendJson(res, 400, { error: 'name is required.' });
          return;
        }
        if (files.length === 0) {
          sendJson(res, 400, { error: 'No files uploaded. Use files[] field.' });
          return;
        }

        const inputSetId = createInputSetId(ROOT_DIR, name);
        const resolved = resolveInputSetDir(ROOT_DIR, inputSetId);
        ensureDir(resolved.setDir);
        writeInputSetMeta(resolved.setDir, {
          name,
          createdAt: new Date().toISOString(),
        });

        let written = 0;
        for (const file of files) {
          if (!file?.buffer || file.buffer.length === 0) {
            continue;
          }
          const ext = resolveImageExtension(file);
          if (!ext) {
            continue;
          }
          const fileName = `target_${String(written + 1).padStart(2, '0')}${ext}`;
          fs.writeFileSync(path.join(resolved.setDir, fileName), file.buffer);
          written += 1;
        }

        if (written === 0) {
          fs.rmSync(resolved.setDir, { recursive: true, force: true });
          sendJson(res, 400, { error: 'Uploaded files do not contain supported images.' });
          return;
        }

        logStep('inputs.upload.success', `${inputSetId} files=${written}`);
        sendJson(res, 200, {
          inputSetId,
          name,
          fileCount: written,
          path: `inputs/sets/${inputSetId}`,
        });
      } catch (error) {
        logStep('inputs.upload.error', error.message || 'unknown');
        sendJson(res, 400, {
          error: error.message || 'Input set upload failed.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/assets/delete-file') {
      try {
        logStep('asset.delete_file.start');
        const body = await parseRequestBody(req);
        const family = normalizeFamily(body.family);
        const assetId = assertSafeAssetId(body.asset_id || body.assetId);
        const fileName = sanitizeUploadedName(body.fileName || body.file || '');
        if (!fileName) {
          sendJson(res, 400, { error: 'fileName is required.' });
          return;
        }

        const resolved = resolveAssetDirectory(ROOT_DIR, family, assetId);
        if (!fs.existsSync(resolved.assetDir) || !fs.statSync(resolved.assetDir).isDirectory()) {
          sendJson(res, 404, { error: `Asset folder not found: ${assetId}` });
          return;
        }

        const existingImages = listImageFiles(resolved.assetDir);
        if (!existingImages.includes(fileName)) {
          sendJson(res, 404, { error: `File not found in asset: ${fileName}` });
          return;
        }

        const targetFile = path.join(resolved.assetDir, fileName);
        fs.rmSync(targetFile, { force: true });

        const remaining = listImageFiles(resolved.assetDir);
        let removedAsset = false;
        if (remaining.length === 0) {
          fs.rmSync(resolved.assetDir, { recursive: true, force: true });
          removedAsset = true;
        }

        logStep('asset.delete_file.success', `${family}/${assetId}/${fileName} remaining=${remaining.length}`);
        sendJson(res, 200, {
          success: true,
          family,
          asset_id: assetId,
          deletedFile: fileName,
          fileName,
          assetDeleted: removedAsset,
          removedAsset,
          remainingFiles: removedAsset ? 0 : remaining.length,
        });
      } catch (error) {
        logStep('asset.delete_file.error', error.message || 'unknown');
        sendJson(res, 400, {
          success: false,
          error: error.message || 'Failed to delete file.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/assets/delete-asset') {
      try {
        logStep('asset.delete_asset.start');
        const body = await parseRequestBody(req);
        const family = normalizeFamily(body.family);
        const assetId = assertSafeAssetId(body.asset_id || body.assetId);
        const resolved = resolveAssetDirectory(ROOT_DIR, family, assetId);

        if (!fs.existsSync(resolved.assetDir) || !fs.statSync(resolved.assetDir).isDirectory()) {
          sendJson(res, 404, { error: `Asset folder not found: ${assetId}` });
          return;
        }

        fs.rmSync(resolved.assetDir, { recursive: true, force: true });
        logStep('asset.delete_asset.success', `${family}/${assetId}`);
        sendJson(res, 200, {
          success: true,
          family,
          asset_id: assetId,
          deletedAsset: assetId,
          removed: true,
        });
      } catch (error) {
        logStep('asset.delete_asset.error', error.message || 'unknown');
        sendJson(res, 400, {
          success: false,
          error: error.message || 'Failed to delete asset.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/inputs/delete-file') {
      try {
        logStep('inputs.delete_file.start');
        const body = await parseRequestBody(req);
        const inputSetId = String(body.inputSetId || '').trim();
        const fileName = sanitizeUploadedName(body.file || body.fileName || '');
        if (!fileName) {
          sendJson(res, 400, { error: 'file is required.' });
          return;
        }

        const resolved = resolveInputSetDir(ROOT_DIR, inputSetId);
        if (!fs.existsSync(resolved.setDir) || !fs.statSync(resolved.setDir).isDirectory()) {
          sendJson(res, 404, { error: `Input set not found: ${inputSetId}` });
          return;
        }

        const currentFiles = listInputSetImageFiles(resolved.setDir);
        if (!currentFiles.includes(fileName)) {
          sendJson(res, 404, { error: `File not found in input set: ${fileName}` });
          return;
        }

        fs.rmSync(path.join(resolved.setDir, fileName), { force: true });
        const remaining = listInputSetImageFiles(resolved.setDir);
        let setDeleted = false;
        if (remaining.length === 0) {
          fs.rmSync(resolved.setDir, { recursive: true, force: true });
          setDeleted = true;
        }

        logStep('inputs.delete_file.success', `${inputSetId}/${fileName} remaining=${remaining.length}`);
        sendJson(res, 200, {
          success: true,
          inputSetId,
          deletedFile: fileName,
          setDeleted,
          remainingFiles: setDeleted ? 0 : remaining.length,
        });
      } catch (error) {
        logStep('inputs.delete_file.error', error.message || 'unknown');
        sendJson(res, 400, {
          success: false,
          error: error.message || 'Failed to delete input file.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/inputs/delete-set') {
      try {
        logStep('inputs.delete_set.start');
        const body = await parseRequestBody(req);
        const inputSetId = String(body.inputSetId || '').trim();
        const resolved = resolveInputSetDir(ROOT_DIR, inputSetId);
        if (!fs.existsSync(resolved.setDir) || !fs.statSync(resolved.setDir).isDirectory()) {
          sendJson(res, 404, { error: `Input set not found: ${inputSetId}` });
          return;
        }

        fs.rmSync(resolved.setDir, { recursive: true, force: true });
        logStep('inputs.delete_set.success', inputSetId);
        sendJson(res, 200, {
          success: true,
          deletedSet: inputSetId,
        });
      } catch (error) {
        logStep('inputs.delete_set.error', error.message || 'unknown');
        sendJson(res, 400, {
          success: false,
          error: error.message || 'Failed to delete input set.',
        });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/job-builder/jobs') {
      sendJson(res, 200, getJobsIndex());
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/job-builder/jobs/')) {
      try {
        const name = parseJobNameFromPath(url.pathname);
        const source = url.searchParams.get('source') || 'generated';
        const loaded = source === 'sample'
          ? loadSampleJobByName(ROOT_DIR, name)
          : loadGeneratedJob(ROOT_DIR, name);
        sendJson(res, 200, loaded);
      } catch (error) {
        sendJson(res, 404, { error: error.message });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/batch/list') {
      const batches = listBatchRecords(ROOT_DIR).map((item) => decorateBatchRecord(item));
      sendJson(res, 200, {
        batches,
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/batch/status') {
      const batchName = String(url.searchParams.get('batchName') || '').trim();
      if (!batchName) {
        sendJson(res, 400, { error: 'batchName query parameter is required.' });
        return;
      }

      logStep('batch.status.start', batchName);
      try {
        const status = await fetchBatchStatus(batchName);
        const now = new Date().toISOString();
        const existing = getBatchRecord(ROOT_DIR, status.batchName);
        const completedAt = isTerminalBatchState(status.stateRaw)
          ? (existing?.completedAt || status.job?.endTime || now)
          : null;
        const updated = upsertBatchRecord(ROOT_DIR, {
          batchName: status.batchName,
          lastKnownState: status.stateRaw,
          cancelled: status.state === 'CANCELLED' || existing?.cancelled,
          completedAt,
          lastCheckedAt: now,
          lastError: null,
        });
        syncRunRecordStatus(updated.runId, status.stateRaw, updated);
        logStep('batch.status.success', `${status.batchName} -> ${status.state}`);
        sendJson(res, 200, {
          success: true,
          batch: decorateBatchRecord(updated),
          remote: {
            state: status.state,
            stateRaw: status.stateRaw,
          },
        });
      } catch (error) {
        const now = new Date().toISOString();
        const updated = upsertBatchRecord(ROOT_DIR, {
          batchName,
          lastCheckedAt: now,
          lastError: error.message || 'Batch status check failed.',
        });
        syncRunRecordStatus(updated.runId, updated.lastKnownState, updated);
        logStep('batch.status.error', `${batchName} | ${error.message || 'unknown'}`);
        sendJson(res, 500, {
          success: false,
          error: error.message || 'Batch status check failed.',
          batch: decorateBatchRecord(updated),
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/batch/refresh-all') {
      logStep('batch.refresh_all.start');
      const records = listBatchRecords(ROOT_DIR);
      const refreshed = [];
      const errors = [];

      for (const record of records) {
        try {
          const status = await fetchBatchStatus(record.batchName);
          const now = new Date().toISOString();
          const completedAt = isTerminalBatchState(status.stateRaw)
            ? (record.completedAt || status.job?.endTime || now)
            : null;
          const updated = upsertBatchRecord(ROOT_DIR, {
            ...record,
            batchName: status.batchName,
            lastKnownState: status.stateRaw,
            cancelled: status.state === 'CANCELLED' || record.cancelled,
            completedAt,
            lastCheckedAt: now,
            lastError: null,
          });
          syncRunRecordStatus(updated.runId, status.stateRaw, updated);
          refreshed.push(decorateBatchRecord(updated));
        } catch (error) {
          const updated = upsertBatchRecord(ROOT_DIR, {
            ...record,
            batchName: record.batchName,
            lastCheckedAt: new Date().toISOString(),
            lastError: error.message || 'Batch refresh failed.',
          });
          syncRunRecordStatus(updated.runId, updated.lastKnownState, updated);
          refreshed.push(decorateBatchRecord(updated));
          errors.push({
            batchName: record.batchName,
            error: error.message || 'Batch refresh failed.',
          });
        }
      }

      logStep('batch.refresh_all.result', `count=${refreshed.length} errors=${errors.length}`);
      sendJson(res, 200, {
        success: errors.length === 0,
        refreshedCount: refreshed.length,
        errorCount: errors.length,
        errors,
        batches: refreshed.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/batch/cancel') {
      let batchName = '';
      try {
        const body = await parseRequestBody(req);
        batchName = String(body.batchName || '').trim();
        if (!batchName) {
          sendJson(res, 400, { error: 'batchName is required.' });
          return;
        }

        logStep('batch.cancel.start', batchName);
        const before = await fetchBatchStatus(batchName);
        if (!['PENDING', 'RUNNING'].includes(before.state)) {
          sendJson(res, 400, {
            success: false,
            error: `Cancel is only allowed for PENDING/RUNNING jobs. Current state: ${before.stateRaw}`,
            batch: decorateBatchRecord(
              upsertBatchRecord(ROOT_DIR, {
                batchName: before.batchName,
                lastKnownState: before.stateRaw,
                lastCheckedAt: new Date().toISOString(),
                cancelled: before.state === 'CANCELLED',
                lastError: null,
              })
            ),
          });
          return;
        }

        const client = ensureGeminiClient();
        await client.batches.cancel({ name: before.batchName });

        let after = before;
        try {
          after = await fetchBatchStatus(before.batchName);
        } catch (_error) {
          // keep fallback status
        }

        const now = new Date().toISOString();
        const updated = upsertBatchRecord(ROOT_DIR, {
          batchName: after.batchName,
          lastKnownState: after.stateRaw,
          cancelled: true,
          completedAt: isTerminalBatchState(after.stateRaw) ? (after.job?.endTime || now) : null,
          lastCheckedAt: now,
          lastError: null,
        });
        syncRunRecordStatus(updated.runId, after.stateRaw, updated);

        logStep('batch.cancel.success', `${after.batchName} -> ${after.state}`);
        sendJson(res, 200, {
          success: true,
          batch: decorateBatchRecord(updated),
          remote: {
            state: after.state,
            stateRaw: after.stateRaw,
          },
        });
      } catch (error) {
        if (batchName) {
          upsertBatchRecord(ROOT_DIR, {
            batchName,
            lastCheckedAt: new Date().toISOString(),
            lastError: error.message || 'Batch cancel failed.',
          });
        }
        logStep('batch.cancel.error', error.message || 'unknown');
        sendJson(res, 500, {
          success: false,
          error: error.message || 'Batch cancel failed.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/batch/download') {
      let batchName = '';
      try {
        const body = await parseRequestBody(req);
        batchName = String(body.batchName || '').trim();
        if (!batchName) {
          sendJson(res, 400, { error: 'batchName is required.' });
          return;
        }

        logStep('batch.download.start', batchName);
        const summary = await downloadBatchResult(batchName);
        const now = new Date().toISOString();
        const updated = upsertBatchRecord(ROOT_DIR, {
          batchName: summary.batchName,
          lastKnownState: summary.stateRaw,
          downloaded: true,
          cancelled: summary.state === 'CANCELLED',
          completedAt: now,
          lastCheckedAt: now,
          lastError: null,
        });
        syncRunRecordStatus(updated.runId, summary.stateRaw, updated);
        buildBatchOutputList(ROOT_DIR, summary.batchName);

        logStep('batch.download.success', `${summary.batchName} saved=${summary.savedCount}`);
        sendJson(res, 200, {
          success: true,
          batch: decorateBatchRecord(updated),
          download: summary,
        });
      } catch (error) {
        if (batchName) {
          upsertBatchRecord(ROOT_DIR, {
            batchName,
            lastCheckedAt: new Date().toISOString(),
            lastError: error.message || 'Batch download failed.',
          });
        }
        logStep('batch.download.error', error.message || 'unknown');
        sendJson(res, 500, {
          success: false,
          error: error.message || 'Batch download failed.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/batch/output/approve') {
      try {
        const body = await parseRequestBody(req);
        const outputId = String(body.outputId || '').trim();
        if (!outputId) {
          sendJson(res, 400, { error: 'outputId is required.' });
          return;
        }

        const output = approveOutputRecord(ROOT_DIR, outputId);
        const batch = output?.batchName ? getBatchRecord(ROOT_DIR, output.batchName) : null;
        const run = output?.runId ? getRunRecord(ROOT_DIR, output.runId) : null;
        sendJson(res, 200, {
          success: true,
          output,
          batch: batch ? decorateBatchRecord(batch) : null,
          run,
        });
      } catch (error) {
        sendJson(res, 400, {
          success: false,
          error: error.message || 'Approve failed.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/batch/output/reject') {
      try {
        const body = await parseRequestBody(req);
        const outputId = String(body.outputId || '').trim();
        if (!outputId) {
          sendJson(res, 400, { error: 'outputId is required.' });
          return;
        }

        const output = rejectOutputRecord(ROOT_DIR, outputId);
        const batch = output?.batchName ? getBatchRecord(ROOT_DIR, output.batchName) : null;
        const run = output?.runId ? getRunRecord(ROOT_DIR, output.runId) : null;
        sendJson(res, 200, {
          success: true,
          output,
          batch: batch ? decorateBatchRecord(batch) : null,
          run,
        });
      } catch (error) {
        sendJson(res, 400, {
          success: false,
          error: error.message || 'Reject failed.',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/batch/retry') {
      if (batchRunInProgress) {
        sendJson(res, 409, {
          error: 'A batch run is already in progress.',
        });
        return;
      }

      batchRunInProgress = true;
      try {
        const body = await parseRequestBody(req);
        const requestKey = String(body.requestKey || '').trim() || null;
        const { runRecord, batchRecord } = resolveRetryContext({
          runId: body.runId,
          batchName: body.batchName,
        });
        if (!runRecord?.sourceJobFile) {
          sendJson(res, 400, { error: 'Retry sourceJobFile is missing for this run.' });
          return;
        }

        const registry = buildOptionRegistry(ROOT_DIR);
        const canonicalJob = loadCanonicalJobFromSourceFile(runRecord.sourceJobFile);
        const dryCheck = runDryBatchCheck(canonicalJob, { rootDir: ROOT_DIR, registry });
        if (!dryCheck.ready) {
          sendJson(res, 400, {
            error: 'Retry dry batch readiness check failed.',
            readiness: dryCheck,
          });
          return;
        }

        const inputSnapshot = buildRetryInputSnapshot(runRecord, requestKey);
        const attempt = await launchBatchAttempt({
          canonicalJob: dryCheck.canonicalJob,
          sourceJobFile: runRecord.sourceJobFile,
          inputSnapshot,
          runId: runRecord.runId,
        });

        sendJson(res, attempt.runResult.success ? 200 : 500, {
          success: attempt.runResult.success,
          retried: {
            runId: runRecord.runId,
            requestKey,
            previousBatchName: batchRecord?.batchName || null,
            attemptId: attempt.runPlan.attemptId,
            batchName: attempt.runResult.batchJobName || null,
          },
          batchRecord: attempt.batchRecord ? decorateBatchRecord(attempt.batchRecord) : null,
          run: getRunRecord(ROOT_DIR, runRecord.runId),
          readiness: dryCheck,
          logs: attempt.runResult.logsSnippet || '',
          durationMs: attempt.runResult.durationMs,
          exitCode: attempt.runResult.exitCode,
          timeout: attempt.runResult.timeout,
          batches: listBatchRecords(ROOT_DIR).map((item) => decorateBatchRecord(item)),
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          error: error.message || 'Retry failed.',
        });
      } finally {
        batchRunInProgress = false;
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/job-builder/jobs/save') {
      try {
        logStep('job_builder.save.start');
        const body = await parseRequestBody(req);
        const inputJob = mergeDefaultJob(body.job || body);
        const registry = buildOptionRegistry(ROOT_DIR);
        const compiled = buildValidationAndCompile(inputJob, registry);
        if (!compiled.ok) {
          sendJson(res, 400, {
            error: compiled.error,
            validation: compiled.validation,
          });
          return;
        }

        const saved = saveGeneratedJob(ROOT_DIR, compiled.canonicalJob, {
          fileName: body.fileName,
          overwrite: Boolean(body.overwrite),
        });
        logStep('job_builder.save.success', saved.relativePath);

        sendJson(res, 200, {
          saved,
          validation: compiled.validation,
          jobs: getJobsIndex(),
        });
      } catch (error) {
        logStep('job_builder.save.error', error.message || 'unknown');
        sendJson(res, 400, {
          error: error.message || 'Save failed',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/job-builder/dry-check') {
      try {
        logStep('job_builder.dry_check.start');
        const body = await parseRequestBody(req);
        const inputJob = mergeDefaultJob(body.job || body);
        const registry = buildOptionRegistry(ROOT_DIR);
        const dryCheck = runDryBatchCheck(inputJob, { rootDir: ROOT_DIR, registry });
        logStep('job_builder.dry_check.result', `ready=${dryCheck.ready} errors=${dryCheck.errors.length} warnings=${dryCheck.warnings.length}`);
        sendJson(res, 200, dryCheck);
      } catch (error) {
        logStep('job_builder.dry_check.error', error.message || 'unknown');
        sendJson(res, 400, {
          error: error.message || 'Dry batch check failed',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/job-builder/run-batch') {
      if (batchRunInProgress) {
        sendJson(res, 409, {
          error: 'A batch run is already in progress.',
        });
        return;
      }

      batchRunInProgress = true;
      try {
        logStep('job_builder.run_batch.start');
        const body = await parseRequestBody(req);
        const inputJob = mergeDefaultJob(body.job || body);
        const registry = buildOptionRegistry(ROOT_DIR);
        const dryCheck = runDryBatchCheck(inputJob, { rootDir: ROOT_DIR, registry });
        if (!dryCheck.ready) {
          sendJson(res, 400, {
            error: 'Dry batch readiness check failed.',
            readiness: dryCheck,
          });
          return;
        }

        const inputSnapshot = snapshotBatchInput(dryCheck.canonicalJob);
        const saved = saveGeneratedJob(ROOT_DIR, dryCheck.canonicalJob, {
          fileName: body.fileName,
          overwrite: Boolean(body.overwrite),
        });
        const attempt = await launchBatchAttempt({
          canonicalJob: dryCheck.canonicalJob,
          sourceJobFile: saved.relativePath,
          inputSnapshot,
        });
        logStep(
          'job_builder.run_batch.result',
          `success=${attempt.runResult.success} exitCode=${attempt.runResult.exitCode} job=${saved.relativePath}`
        );

        sendJson(res, attempt.runResult.success ? 200 : 500, {
          success: attempt.runResult.success,
          jobName: attempt.runResult.batchJobName || null,
          state: attempt.runResult.batchState || null,
          logs: attempt.runResult.logsSnippet || '',
          command: attempt.runResult.command,
          durationMs: attempt.runResult.durationMs,
          exitCode: attempt.runResult.exitCode,
          timeout: attempt.runResult.timeout,
          jobFilePath: saved.filePath,
          jobFileRelativePath: saved.relativePath,
          batchRecord: attempt.batchRecord ? decorateBatchRecord(attempt.batchRecord) : null,
          readiness: dryCheck,
          jobs: getJobsIndex(),
          batches: listBatchRecords(ROOT_DIR).map((item) => decorateBatchRecord(item)),
        });
      } catch (error) {
        logStep('job_builder.run_batch.error', error.message || 'unknown');
        sendJson(res, 500, {
          error: error.message || 'Batch run failed',
        });
      } finally {
        batchRunInProgress = false;
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/job-builder/compile') {
      try {
        logStep('job_builder.compile.start');
        const body = await parseRequestBody(req);
        const inputJob = mergeDefaultJob(body.job || body);
        const registry = buildOptionRegistry(ROOT_DIR);
        const compiled = buildValidationAndCompile(inputJob, registry);
        if (!compiled.ok) {
          sendJson(res, 400, {
            error: compiled.error,
            validation: compiled.validation,
          });
          return;
        }

        sendJson(res, 200, {
          prompt: compiled.prompt,
          canonicalJob: compiled.canonicalJob,
          imageConfig: compiled.imageConfig,
          validation: compiled.validation,
          authority: compiled.authority,
        });
        logStep('job_builder.compile.success', `promptLength=${compiled.prompt.length}`);
      } catch (error) {
        logStep('job_builder.compile.error', error.message || 'unknown');
        sendJson(res, 400, {
          error: error.message || 'Compile failed',
        });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    sendText(res, 404, 'Not found');
  });
}

if (require.main === module) {
  const server = createServer();
  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the existing process or run with PORT=<new_port>.`);
      process.exit(1);
    }
    console.error(`Server failed to start: ${error?.message || error}`);
    process.exit(1);
  });
  server.listen(PORT, () => {
    console.log(`Job Builder UI running at http://localhost:${PORT}/job-builder`);
  });
}

module.exports = {
  createServer,
};
