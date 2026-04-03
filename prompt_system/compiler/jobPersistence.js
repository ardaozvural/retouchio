const fs = require('fs');
const path = require('path');

const GENERATED_JOBS_DIR = path.join('jobs', 'generated');

function ensureGeneratedJobsDir(rootDir) {
  const dirPath = path.join(rootDir, GENERATED_JOBS_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  return dirPath;
}

function sanitizeFileName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.json$/i, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 80);
}

function buildCandidateBaseName(job, preferredName = null) {
  return sanitizeFileName(preferredName)
    || sanitizeFileName(job?.jobId)
    || sanitizeFileName(job?.displayName)
    || 'generated-job';
}

function resolveUniqueFilePath(dirPath, baseName, overwrite) {
  const firstPath = path.join(dirPath, `${baseName}.canonical.json`);
  if (overwrite || !fs.existsSync(firstPath)) {
    return firstPath;
  }

  let index = 1;
  while (index < 10000) {
    const candidate = path.join(dirPath, `${baseName}-${index}.canonical.json`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
    index += 1;
  }

  throw new Error('Unable to allocate a unique generated job filename.');
}

function saveGeneratedJob(rootDir, canonicalJob, options = {}) {
  const dirPath = ensureGeneratedJobsDir(rootDir);
  const baseName = buildCandidateBaseName(canonicalJob, options.fileName);
  const filePath = resolveUniqueFilePath(dirPath, baseName, Boolean(options.overwrite));
  fs.writeFileSync(filePath, `${JSON.stringify(canonicalJob, null, 2)}\n`, 'utf8');

  return {
    name: path.basename(filePath),
    filePath,
    relativePath: path.relative(rootDir, filePath),
  };
}

function listGeneratedJobs(rootDir) {
  const dirPath = ensureGeneratedJobsDir(rootDir);
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const filePath = path.join(dirPath, entry.name);
      const stats = fs.statSync(filePath);
      return {
        name: entry.name,
        relativePath: path.relative(rootDir, filePath),
        updatedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function safeJobFileName(inputName) {
  const fileName = path.basename(String(inputName || ''));
  if (!fileName || !fileName.endsWith('.json')) {
    throw new Error('Job file name must be a valid .json file in jobs/generated.');
  }
  return fileName;
}

function loadGeneratedJob(rootDir, inputName) {
  const fileName = safeJobFileName(inputName);
  const filePath = path.join(ensureGeneratedJobsDir(rootDir), fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Generated job not found: ${fileName}`);
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    name: fileName,
    filePath,
    relativePath: path.relative(rootDir, filePath),
    job: parsed,
  };
}

function listSampleJobs(rootDir) {
  const jobsDir = path.join(rootDir, 'jobs');
  if (!fs.existsSync(jobsDir)) {
    return [];
  }

  return fs
    .readdirSync(jobsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.canonical.json'))
    .map((entry) => {
      const filePath = path.join(jobsDir, entry.name);
      const stats = fs.statSync(filePath);
      return {
        name: entry.name,
        relativePath: path.relative(rootDir, filePath),
        updatedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function loadSampleJobByName(rootDir, inputName) {
  const fileName = safeJobFileName(inputName);
  const filePath = path.join(rootDir, 'jobs', fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Sample job not found: ${fileName}`);
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    name: fileName,
    filePath,
    relativePath: path.relative(rootDir, filePath),
    job: parsed,
  };
}

module.exports = {
  GENERATED_JOBS_DIR,
  ensureGeneratedJobsDir,
  saveGeneratedJob,
  listGeneratedJobs,
  loadGeneratedJob,
  listSampleJobs,
  loadSampleJobByName,
};
