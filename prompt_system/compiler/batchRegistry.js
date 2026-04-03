const fs = require('fs');
const path = require('path');

const BATCH_REGISTRY_REL_PATH = path.join('data', 'batches', 'registry.json');

function nowIso() {
  return new Date().toISOString();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureRegistryFile(rootDir) {
  const registryPath = path.join(rootDir, BATCH_REGISTRY_REL_PATH);
  const registryDir = path.dirname(registryPath);
  if (!fs.existsSync(registryDir)) {
    fs.mkdirSync(registryDir, { recursive: true });
  }
  if (!fs.existsSync(registryPath)) {
    const initial = {
      version: '1',
      updatedAt: nowIso(),
      jobs: [],
    };
    fs.writeFileSync(registryPath, `${JSON.stringify(initial, null, 2)}\n`, 'utf8');
  }
  return registryPath;
}

function fallbackRegistry() {
  return {
    version: '1',
    updatedAt: nowIso(),
    jobs: [],
  };
}

function readRegistry(rootDir) {
  const registryPath = ensureRegistryFile(rootDir);
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    return {
      version: parsed?.version || '1',
      updatedAt: parsed?.updatedAt || nowIso(),
      jobs: toArray(parsed?.jobs),
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
    version: '1',
    updatedAt: nowIso(),
    jobs: toArray(registry?.jobs),
  };
  fs.writeFileSync(registryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

function makeLocalId() {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRecord(input) {
  const createdAt = input?.createdAt || nowIso();
  return {
    id: input?.id || makeLocalId(),
    batchName: input?.batchName || '',
    sourceJobFile: input?.sourceJobFile || null,
    sourceJobId: input?.sourceJobId || null,
    createdAt,
    lastKnownState: input?.lastKnownState || 'UNKNOWN',
    downloaded: Boolean(input?.downloaded),
    cancelled: Boolean(input?.cancelled),
    completedAt: input?.completedAt || null,
    lastCheckedAt: input?.lastCheckedAt || null,
    lastError: input?.lastError || null,
  };
}

function mergeRecord(existing, patch) {
  const next = normalizeRecord({
    ...existing,
    ...patch,
    id: existing?.id || patch?.id,
    createdAt: existing?.createdAt || patch?.createdAt,
  });
  return next;
}

function upsertBatchRecord(rootDir, patch) {
  const batchName = String(patch?.batchName || '').trim();
  if (!batchName) {
    throw new Error('batchName is required for registry upsert.');
  }

  const registry = readRegistry(rootDir);
  const jobs = toArray(registry.jobs);
  const index = jobs.findIndex((item) => item?.batchName === batchName);
  const existing = index >= 0 ? normalizeRecord(jobs[index]) : null;

  const nextRecord = mergeRecord(existing, {
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

function listBatchRecords(rootDir) {
  const registry = readRegistry(rootDir);
  return toArray(registry.jobs)
    .map((item) => normalizeRecord(item))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function getBatchRecord(rootDir, batchName) {
  return listBatchRecords(rootDir).find((item) => item.batchName === batchName) || null;
}

module.exports = {
  BATCH_REGISTRY_REL_PATH,
  ensureRegistryFile,
  readRegistry,
  writeRegistry,
  upsertBatchRecord,
  listBatchRecords,
  getBatchRecord,
};
