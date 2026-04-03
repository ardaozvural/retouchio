const fs = require('fs');
const path = require('path');

const order = require('../order');
const { normalizeJob, resolveEntity } = require('./resolveEntity');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clone(value) {
  if (value === undefined || value === null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
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

function footwearUsesReference(mode) {
  return mode === 'replace';
}

function headwearUsesReference(mode) {
  return mode === 'add' || mode === 'replace';
}

function accessoryUsesReference(mode) {
  return mode === 'add' || mode === 'replace';
}

function usesReferenceAuthority(entity, predicate) {
  return Boolean(entity && predicate(entity.mode) && entity.source === 'reference' && entity.asset_id);
}

function stripReferenceAuthority(entity) {
  if (!entity) {
    return entity;
  }
  return {
    ...entity,
    asset_id: null,
    asset_ids: [],
  };
}

function buildCompilerIntentJob(canonicalJob) {
  const compilerJob = clone(canonicalJob);
  if (!compilerJob?.entities) {
    return compilerJob;
  }

  if (!usesReferenceAuthority(compilerJob.entities.footwear, footwearUsesReference)) {
    compilerJob.entities.footwear = stripReferenceAuthority(compilerJob.entities.footwear);
  }

  if (!usesReferenceAuthority(compilerJob.entities.headwear, headwearUsesReference)) {
    compilerJob.entities.headwear = stripReferenceAuthority(compilerJob.entities.headwear);
  }

  compilerJob.entities.accessory.items = Array.isArray(compilerJob.entities.accessory?.items)
    ? compilerJob.entities.accessory.items.map((item) => (
      usesReferenceAuthority(item, accessoryUsesReference) ? item : stripReferenceAuthority(item)
    ))
    : [];

  return compilerJob;
}

function formatAccessoryLabel(item) {
  if (item?.family === 'eyewear') {
    return 'eyewear';
  }
  if (item?.family === 'bag') {
    return 'bag';
  }
  if (item?.family === 'neckwear') {
    return 'neckwear';
  }
  return item?.variant || item?.family || 'accessory';
}

function getPlacementIntentLine(family, placement) {
  if (family === 'footwear' && placement === 'on_feet') {
    return 'Keep footwear worn naturally on the feet with clean grounding and believable foot contact.';
  }
  if (family === 'headwear' && placement === 'on_head') {
    return 'Place headwear naturally on the head with believable attachment and stable coverage.';
  }
  if (family === 'eyewear' && placement === 'on_eyes') {
    return 'Wear eyewear naturally on the eyes with believable bridge fit and temple alignment.';
  }
  if (family === 'eyewear' && placement === 'on_head') {
    return 'Rest eyewear naturally on the head without distorting hairline or face shape.';
  }
  if (family === 'eyewear' && placement === 'in_hand') {
    return 'Place eyewear naturally in hand with believable grip, scale, and pose continuity.';
  }
  if (family === 'bag' && placement === 'in_hand') {
    return 'Carry the bag naturally in hand with believable grip, strap tension, and gravity.';
  }
  if (family === 'bag' && placement === 'on_forearm') {
    return 'Carry the bag naturally on the forearm with believable hang, scale, and weight.';
  }
  if (family === 'bag' && placement === 'on_shoulder') {
    return 'Carry the bag naturally on the shoulder with believable strap path, weight, and body contact.';
  }
  if (family === 'bag' && placement === 'crossbody') {
    return 'Wear the bag as a natural crossbody carry with believable strap routing and body contact.';
  }
  return '';
}

function buildIntentBindingSection(canonicalJob) {
  const lines = [];
  const footwear = canonicalJob.entities?.footwear || {};
  const headwear = canonicalJob.entities?.headwear || {};
  const accessoryItems = Array.isArray(canonicalJob.entities?.accessory?.items) ? canonicalJob.entities.accessory.items : [];

  if (footwear.mode === 'replace') {
    if (usesReferenceAuthority(footwear, footwearUsesReference)) {
      lines.push('Use referenced footwear as visual authority for the active footwear result.');
    }
    const placementLine = getPlacementIntentLine('footwear', footwear.placement || 'on_feet');
    if (placementLine) {
      lines.push(placementLine);
    }
  }

  if (headwear.mode === 'add' || headwear.mode === 'replace') {
    if (usesReferenceAuthority(headwear, headwearUsesReference)) {
      lines.push('Use referenced headwear as visual authority for the active headwear result.');
    }
    const placementLine = getPlacementIntentLine('headwear', headwear.placement || 'auto');
    if (placementLine) {
      lines.push(placementLine);
    }
  }

  for (const item of accessoryItems) {
    if (!item || (item.mode !== 'add' && item.mode !== 'replace')) {
      continue;
    }
    if (usesReferenceAuthority(item, accessoryUsesReference)) {
      lines.push(`Use referenced ${formatAccessoryLabel(item)} as visual authority for that accessory item.`);
    }
    const placementLine = getPlacementIntentLine(item.family, item.placement || 'auto');
    if (placementLine) {
      lines.push(placementLine);
    }
  }

  if (lines.length === 0) {
    return null;
  }

  return {
    id: 'intent_binding',
    label: 'Intent Binding',
    lines,
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

  if (usesReferenceAuthority(canonicalJob.entities.footwear, footwearUsesReference)) {
    lines.push('Footwear refs = locked design authority for footwear only.');
  }

  if (usesReferenceAuthority(canonicalJob.entities.headwear, headwearUsesReference)) {
    lines.push('Headwear refs = locked design authority for headwear only.');
  }

  const accessoryItems = canonicalJob.entities.accessory.items || [];
  if (accessoryItems.some((item) => usesReferenceAuthority(item, accessoryUsesReference))) {
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
  const compilerJob = buildCompilerIntentJob(canonicalJob);

  const sections = [];

  for (const entityId of order) {
    const entityConfig = entityId === 'core'
      ? { mode: 'apply' }
      : compilerJob.entities[entityId];

    const resolved = resolveEntity(entityId, entityConfig);
    const compiledSections = resolved.module.compile({
      entity: resolved.entity,
      job: compilerJob,
      context,
    });

    sections.push(...compiledSections);
  }

  const intentBindingSection = buildIntentBindingSection(canonicalJob);
  if (intentBindingSection) {
    sections.push(intentBindingSection);
  }

  sections.push(buildReferenceBindingSection(compilerJob));

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
