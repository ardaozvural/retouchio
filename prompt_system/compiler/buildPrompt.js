const fs = require('fs');
const path = require('path');

const order = require('../order');
const { normalizeJob, resolveEntity } = require('./resolveEntity');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadCompilerContext(rootDir) {
  const configDir = path.join(rootDir, 'config');

  return {
    rootDir,
    coreRules: readJson(path.join(configDir, 'core_rules.json')),
    slotRules: readJson(path.join(configDir, 'slot_rules.json')),
    outputProfiles: readJson(path.join(configDir, 'output_profiles.json')),
    defaults: {
      outputProfile: 'catalog_4x5_2k',
    },
  };
}

function buildReferenceBindingSection(canonicalJob) {
  const lines = [
    'Target image = garment, pose class, and framing authority.',
  ];

  if (canonicalJob.entities.subject.reference_ids.length > 0) {
    lines.push('Subject refs = identity authority for face, proportions, and hair.');
  }

  if ((canonicalJob.entities.garment.detail_refs?.material || []).length > 0) {
    lines.push('Garment material refs = material and fabric fidelity authority.');
  }

  if ((canonicalJob.entities.garment.detail_refs?.pattern || []).length > 0) {
    lines.push('Garment pattern refs = pattern geometry, scale, and density authority.');
  }

  if (canonicalJob.entities.footwear.mode === 'replace' && canonicalJob.entities.footwear.asset_id) {
    lines.push('Footwear refs = locked design authority for footwear only.');
  }

  if ((canonicalJob.entities.headwear.mode === 'add' || canonicalJob.entities.headwear.mode === 'replace') && canonicalJob.entities.headwear.asset_id) {
    lines.push('Headwear refs = locked design authority for headwear only.');
  }

  const accessoryItems = canonicalJob.entities.accessory.items || [];
  if (accessoryItems.some((item) => (item.mode === 'add' || item.mode === 'replace') && item.asset_id)) {
    lines.push('Accessory refs = locked design authority for that accessory item only.');
  }

  lines.push('Do not transfer identity from accessory reference images.');

  return {
    id: 'reference_binding',
    label: 'Reference Binding',
    lines,
  };
}

function formatSection(section) {
  if (!section || !Array.isArray(section.lines) || section.lines.length === 0) {
    return '';
  }

  return `${section.label.toUpperCase()}\n${section.lines.map((line) => `- ${line}`).join('\n')}`;
}

function loadJob(jobInput) {
  if (typeof jobInput === 'string') {
    return readJson(jobInput);
  }

  return jobInput;
}

function buildPrompt(jobInput, options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..', '..');
  const rawJob = loadJob(jobInput);
  const context = loadCompilerContext(rootDir);
  const canonicalJob = normalizeJob(rawJob, {
    defaultOutputProfile: context.defaults.outputProfile,
  });

  const sections = [];

  for (const entityId of order) {
    const entityConfig = entityId === 'core'
      ? { mode: 'apply' }
      : canonicalJob.entities[entityId];

    const resolved = resolveEntity(entityId, entityConfig);
    const compiledSections = resolved.module.compile({
      entity: resolved.entity,
      job: canonicalJob,
      context,
    });

    sections.push(...compiledSections);
  }

  sections.push(buildReferenceBindingSection(canonicalJob));

  const prompt = sections
    .map(formatSection)
    .filter(Boolean)
    .join('\n\n')
    .trim();

  const outputProfileId = canonicalJob.entities.output_profile.profile || context.defaults.outputProfile;
  const imageConfig = context.outputProfiles?.profiles?.[outputProfileId]?.imageConfig || null;

  return {
    prompt,
    canonicalJob,
    sections,
    imageConfig,
  };
}

if (require.main === module) {
  const jobPath = process.argv[2];

  if (!jobPath) {
    console.error('Usage: node prompt_system/compiler/buildPrompt.js <job-config.json>');
    process.exit(1);
  }

  const result = buildPrompt(path.resolve(process.cwd(), jobPath));
  console.log(result.prompt);
}

module.exports = {
  buildPrompt,
  loadCompilerContext,
};
