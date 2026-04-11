const fs = require('fs');
const path = require('path');

const BATCH_REGISTRY_REL_PATH = path.join('data', 'batches', 'registry.json');

function nowIso() {
  return new Date().toISOString();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toCount(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function makeLocalId(prefix = 'record') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugifyId(value, fallback = 'item') {
  return String(value || '')
    .trim()
    .replace(/^batches\//i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 96) || fallback;
}

function normalizeReviewState(value) {
  if (value === 'approved' || value === 'rejected') {
    return value;
  }
  return 'in_review';
}

function normalizeRunState(value) {
  const text = String(value || '').toUpperCase();
  if (text.includes('FAILED')) return 'failed';
  if (text.includes('CANCELLED') || text.includes('CANCELED')) return 'failed';
  if (text.includes('SUCCEEDED')) return 'succeeded';
  if (text.includes('RUNNING') || text.includes('PROCESSING')) return 'running';
  if (text.includes('PENDING') || text.includes('QUEUED')) return 'pending';
  return 'pending';
}

function ensureRegistryFile(rootDir) {
  const registryPath = path.join(rootDir, BATCH_REGISTRY_REL_PATH);
  const registryDir = path.dirname(registryPath);
  if (!fs.existsSync(registryDir)) {
    fs.mkdirSync(registryDir, { recursive: true });
  }
  if (!fs.existsSync(registryPath)) {
    const initial = {
      version: '2',
      updatedAt: nowIso(),
      jobs: [],
      runs: [],
      outputs: [],
    };
    fs.writeFileSync(registryPath, `${JSON.stringify(initial, null, 2)}\n`, 'utf8');
  }
  return registryPath;
}

function fallbackRegistry() {
  return {
    version: '2',
    updatedAt: nowIso(),
    jobs: [],
    runs: [],
    outputs: [],
  };
}

function readRegistry(rootDir) {
  const registryPath = ensureRegistryFile(rootDir);
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    return {
      version: parsed?.version || '2',
      updatedAt: parsed?.updatedAt || nowIso(),
      jobs: toArray(parsed?.jobs),
      runs: toArray(parsed?.runs),
      outputs: toArray(parsed?.outputs),
    };
  } catch (_error) {
    const backupPath = `${registryPath}.broken-${Date.now()}`;
    try {
      fs.copyFileSync(registryPath, backupPath);
    } catch (_copyError) {
      // no-op
    }
    const clean = fallbackRegistry();
    fs.writeFileSync(registryPath, `${JSON.stringify(clean, null, 2)}\n`, 'utf8');
    return clean;
  }
}

function writeRegistry(rootDir, registry) {
  const registryPath = ensureRegistryFile(rootDir);
  const payload = {
    version: '2',
    updatedAt: nowIso(),
    jobs: toArray(registry?.jobs),
    runs: toArray(registry?.runs),
    outputs: toArray(registry?.outputs),
  };
  fs.writeFileSync(registryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

function normalizeBatchRecord(input) {
  const batchName = String(input?.batchName || '').trim();
  const createdAt = input?.createdAt || nowIso();
  const runId = String(input?.runId || '').trim() || `legacy_run_${slugifyId(batchName, 'unknown')}`;
  const attemptId = String(input?.attemptId || '').trim() || `attempt_${slugifyId(batchName, 'unknown')}`;
  const batchId = String(input?.batchId || batchName || input?.id || '').trim() || batchName || makeLocalId('batch');
  const jobId = String(input?.jobId || input?.sourceJobId || '').trim() || null;

  return {
    id: input?.id || makeLocalId('batch'),
    batchId,
    batchName,
    sourceJobFile: input?.sourceJobFile || null,
    sourceJobId: input?.sourceJobId || jobId,
    jobId,
    runId,
    attemptId,
    inputSource: input?.inputSource || null,
    stagedInputSource: input?.stagedInputSource || null,
    stageDir: input?.stageDir || null,
    runtimeJobFile: input?.runtimeJobFile || null,
    inputFileCount: Number.isFinite(Number(input?.inputFileCount)) ? Number(input.inputFileCount) : null,
    requestCount: Number.isFinite(Number(input?.requestCount)) ? Number(input.requestCount) : null,
    createdAt,
    lastKnownState: input?.lastKnownState || 'UNKNOWN',
    runState: normalizeRunState(input?.runState || input?.lastKnownState),
    downloaded: Boolean(input?.downloaded),
    cancelled: Boolean(input?.cancelled),
    completedAt: input?.completedAt || null,
    lastCheckedAt: input?.lastCheckedAt || null,
    lastError: input?.lastError || null,
  };
}

function normalizeRunRecord(input) {
  const runId = String(input?.runId || '').trim();
  if (!runId) {
    throw new Error('runId is required for run records.');
  }

  return {
    runId,
    jobId: String(input?.jobId || input?.sourceJobId || '').trim() || null,
    sourceJobId: String(input?.sourceJobId || input?.jobId || '').trim() || null,
    sourceJobFile: input?.sourceJobFile || null,
    inputSource: input?.inputSource || null,
    inputFiles: toArray(input?.inputFiles),
    requestItems: toArray(input?.requestItems),
    requestKeyToInputFile: input?.requestKeyToInputFile && typeof input.requestKeyToInputFile === 'object'
      ? { ...input.requestKeyToInputFile }
      : {},
    originalInputFiles: toArray(input?.originalInputFiles),
    createdAt: input?.createdAt || nowIso(),
    latestAttemptId: String(input?.latestAttemptId || '').trim() || null,
    latestBatchName: String(input?.latestBatchName || '').trim() || null,
    status: normalizeRunState(input?.status || input?.lastKnownState),
    attemptCount: toCount(input?.attemptCount, 0),
  };
}

function buildOutputId(input) {
  const attemptId = slugifyId(input?.attemptId || input?.batchName || 'attempt', 'attempt');
  const requestKey = slugifyId(input?.requestKey || input?.outputFile || input?.outputPath || 'output', 'output');
  const outputName = slugifyId(path.basename(String(input?.outputPath || input?.outputFile || 'output')), 'output');
  return `output_${attemptId}_${requestKey}_${outputName}`;
}

function normalizeOutputRecord(input) {
  const outputPath = input?.outputPath || null;
  const outputFile = String(input?.outputFile || path.basename(String(outputPath || '')) || '').trim() || null;
  const createdAt = input?.created_at || input?.createdAt || nowIso();

  return {
    outputId: String(input?.outputId || '').trim() || buildOutputId({ ...input, outputFile }),
    jobId: String(input?.jobId || input?.sourceJobId || '').trim() || null,
    runId: String(input?.runId || '').trim() || null,
    attemptId: String(input?.attemptId || '').trim() || null,
    batchId: String(input?.batchId || input?.batchName || '').trim() || null,
    batchName: String(input?.batchName || input?.batchId || '').trim() || '',
    requestKey: String(input?.requestKey || '').trim() || null,
    inputPath: input?.inputPath || null,
    stagedInputPath: input?.stagedInputPath || null,
    outputPath,
    outputFile,
    review_state: normalizeReviewState(input?.review_state),
    is_final: Boolean(input?.is_final),
    created_at: createdAt,
    updated_at: input?.updated_at || createdAt,
  };
}

function mergeBatchRecord(existing, patch) {
  const next = normalizeBatchRecord({
    ...existing,
    ...patch,
    id: existing?.id || patch?.id,
    createdAt: existing?.createdAt || patch?.createdAt,
  });
  return next;
}

function mergeRunRecord(existing, patch) {
  return normalizeRunRecord({
    ...existing,
    ...patch,
    createdAt: existing?.createdAt || patch?.createdAt,
  });
}

function mergeOutputRecord(existing, patch) {
  return normalizeOutputRecord({
    ...existing,
    ...patch,
    outputId: existing?.outputId || patch?.outputId,
    created_at: existing?.created_at || patch?.created_at,
  });
}

function listBatchRecords(rootDir) {
  const registry = readRegistry(rootDir);
  return toArray(registry.jobs)
    .map((item) => normalizeBatchRecord(item))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function getBatchRecord(rootDir, batchName) {
  return listBatchRecords(rootDir).find((item) => item.batchName === batchName) || null;
}

function upsertBatchRecord(rootDir, patch) {
  const batchName = String(patch?.batchName || '').trim();
  if (!batchName) {
    throw new Error('batchName is required for registry upsert.');
  }

  const registry = readRegistry(rootDir);
  const jobs = toArray(registry.jobs);
  const index = jobs.findIndex((item) => normalizeBatchRecord(item).batchName === batchName);
  const existing = index >= 0 ? normalizeBatchRecord(jobs[index]) : null;
  const nextRecord = mergeBatchRecord(existing, {
    ...patch,
    batchName,
  });

  if (index >= 0) {
    jobs[index] = nextRecord;
  } else {
    jobs.push(nextRecord);
  }

  writeRegistry(rootDir, {
    ...registry,
    jobs,
  });

  return nextRecord;
}

function listRunRecords(rootDir) {
  const registry = readRegistry(rootDir);
  return toArray(registry.runs)
    .map((item) => normalizeRunRecord(item))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function getRunRecord(rootDir, runId) {
  return listRunRecords(rootDir).find((item) => item.runId === runId) || null;
}

function upsertRunRecord(rootDir, patch) {
  const runId = String(patch?.runId || '').trim();
  if (!runId) {
    throw new Error('runId is required for run registry upsert.');
  }

  const registry = readRegistry(rootDir);
  const runs = toArray(registry.runs);
  const index = runs.findIndex((item) => normalizeRunRecord(item).runId === runId);
  const existing = index >= 0 ? normalizeRunRecord(runs[index]) : null;
  const nextRecord = mergeRunRecord(existing, {
    ...patch,
    runId,
  });

  if (index >= 0) {
    runs[index] = nextRecord;
  } else {
    runs.push(nextRecord);
  }

  writeRegistry(rootDir, {
    ...registry,
    runs,
  });

  return nextRecord;
}

function listRunAttempts(rootDir, runId) {
  return listBatchRecords(rootDir)
    .filter((item) => item.runId === runId)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function listOutputRecords(rootDir, filters = {}) {
  const registry = readRegistry(rootDir);
  return toArray(registry.outputs)
    .map((item) => normalizeOutputRecord(item))
    .filter((item) => {
      if (filters.runId && item.runId !== filters.runId) return false;
      if (filters.attemptId && item.attemptId !== filters.attemptId) return false;
      if (filters.batchName && item.batchName !== filters.batchName) return false;
      if (filters.requestKey && item.requestKey !== filters.requestKey) return false;
      if (filters.outputId && item.outputId !== filters.outputId) return false;
      return true;
    })
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

function getOutputRecord(rootDir, outputId) {
  return listOutputRecords(rootDir, { outputId })[0] || null;
}

function upsertOutputRecords(rootDir, records) {
  const rawRecords = toArray(records).map((item) => ({ ...(item || {}) }));
  const normalizedRecords = rawRecords.map((item) => normalizeOutputRecord(item));
  if (normalizedRecords.length === 0) {
    return [];
  }

  const registry = readRegistry(rootDir);
  const outputs = toArray(registry.outputs).map((item) => normalizeOutputRecord(item));

  for (let recordIndex = 0; recordIndex < normalizedRecords.length; recordIndex += 1) {
    const normalizedPatch = normalizedRecords[recordIndex];
    const rawPatch = rawRecords[recordIndex];
    const mergePatch = {
      ...rawPatch,
      outputId: normalizedPatch.outputId,
      outputPath: normalizedPatch.outputPath,
      outputFile: normalizedPatch.outputFile,
      created_at: rawPatch?.created_at || rawPatch?.createdAt || normalizedPatch.created_at,
      updated_at: rawPatch?.updated_at || rawPatch?.updatedAt,
    };
    const index = outputs.findIndex((item) => item.outputId === normalizedPatch.outputId);
    const existing = index >= 0 ? outputs[index] : null;
    const merged = mergeOutputRecord(existing, mergePatch);
    if (index >= 0) {
      outputs[index] = merged;
    } else {
      outputs.push(merged);
    }
  }

  writeRegistry(rootDir, {
    ...registry,
    outputs,
  });

  return normalizedRecords.map((item) => outputs.find((entry) => entry.outputId === item.outputId)).filter(Boolean);
}

function updateOutputRecord(rootDir, outputId, updater) {
  if (typeof updater !== 'function') {
    throw new Error('updater must be a function.');
  }

  const registry = readRegistry(rootDir);
  const outputs = toArray(registry.outputs).map((item) => normalizeOutputRecord(item));
  const index = outputs.findIndex((item) => item.outputId === outputId);
  if (index < 0) {
    throw new Error(`Output not found: ${outputId}`);
  }

  const current = outputs[index];
  const nextPatch = updater(current, outputs.slice()) || current;
  outputs[index] = mergeOutputRecord(current, nextPatch);

  writeRegistry(rootDir, {
    ...registry,
    outputs,
  });

  return outputs[index];
}

function approveOutputRecord(rootDir, outputId) {
  const registry = readRegistry(rootDir);
  const outputs = toArray(registry.outputs).map((item) => normalizeOutputRecord(item));
  const index = outputs.findIndex((item) => item.outputId === outputId);
  if (index < 0) {
    throw new Error(`Output not found: ${outputId}`);
  }

  const target = outputs[index];
  const updatedAt = nowIso();
  for (let i = 0; i < outputs.length; i += 1) {
    const item = outputs[i];
    if (item.runId === target.runId && item.requestKey === target.requestKey && item.outputId !== target.outputId && item.is_final) {
      outputs[i] = {
        ...item,
        is_final: false,
        updated_at: updatedAt,
      };
    }
  }

  outputs[index] = {
    ...target,
    review_state: 'approved',
    is_final: true,
    updated_at: updatedAt,
  };

  writeRegistry(rootDir, {
    ...registry,
    outputs,
  });

  return outputs[index];
}

function rejectOutputRecord(rootDir, outputId) {
  return updateOutputRecord(rootDir, outputId, (current) => ({
    ...current,
    review_state: 'rejected',
    is_final: false,
    updated_at: nowIso(),
  }));
}

function summarizeOutputs(records) {
  const summary = {
    total: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
    final: 0,
  };

  for (const item of toArray(records)) {
    const normalized = normalizeOutputRecord(item);
    summary.total += 1;
    summary[normalized.review_state] = toCount(summary[normalized.review_state], 0) + 1;
    if (normalized.is_final) {
      summary.final += 1;
    }
  }

  return summary;
}

function getBatchOutputSummary(rootDir, batchName) {
  return summarizeOutputs(listOutputRecords(rootDir, { batchName }));
}

function getRunOutputSummary(rootDir, runId) {
  return summarizeOutputs(listOutputRecords(rootDir, { runId }));
}

module.exports = {
  BATCH_REGISTRY_REL_PATH,
  ensureRegistryFile,
  readRegistry,
  writeRegistry,
  normalizeReviewState,
  normalizeRunState,
  normalizeBatchRecord,
  normalizeRunRecord,
  normalizeOutputRecord,
  buildOutputId,
  upsertBatchRecord,
  listBatchRecords,
  getBatchRecord,
  upsertRunRecord,
  listRunRecords,
  getRunRecord,
  listRunAttempts,
  upsertOutputRecords,
  listOutputRecords,
  getOutputRecord,
  approveOutputRecord,
  rejectOutputRecord,
  getBatchOutputSummary,
  getRunOutputSummary,
};
