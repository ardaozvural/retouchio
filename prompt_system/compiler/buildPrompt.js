const fs = require('fs');
const path = require('path');

const order = require('../order');
const { resolveEntity } = require('./resolveEntity');
const { createReferenceAuthorityState } = require('./referenceAuthority');

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

function formatAccessoryLabel(item) {
  if (item?.variant === 'sunglasses') {
    return 'sunglasses';
  }
  if (item?.variant === 'hand_bag') {
    return 'handbag';
  }
  if (item?.variant === 'shoulder_bag') {
    return 'shoulder bag';
  }
  if (item?.variant === 'neck_scarf') {
    return 'neck scarf';
  }
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

function pushIntentSummary(lines, authorityLine, placementLine) {
  if (authorityLine && placementLine) {
    lines.push(`${authorityLine} ${placementLine}`);
    return;
  }
  if (authorityLine) {
    lines.push(authorityLine);
    return;
  }
  if (placementLine) {
    lines.push(placementLine);
  }
}

function buildIntentBindingSection(compilerJob) {
  const lines = [];
  const garment = compilerJob.entities?.garment || {};
  const footwear = compilerJob.entities?.footwear || {};
  const headwear = compilerJob.entities?.headwear || {};
  const accessoryItems = Array.isArray(compilerJob.entities?.accessory?.items) ? compilerJob.entities.accessory.items : [];
  const garmentRefinement = garment.refinement_level === 'repair'
    ? 'repair'
    : (garment.refinement_level === 'minimal' ? 'minimal' : (garment.mode === 'restyle' ? 'repair' : 'preserve'));

  if (garment.mode !== 'ignore' && garmentRefinement === 'minimal') {
    lines.push('Keep the garment as the product authority while allowing only minimal product-safe cleanup and polish.');
  } else if (garment.mode !== 'ignore' && garmentRefinement === 'repair') {
    lines.push('Keep the garment as the product authority while allowing stronger product-faithful correction without redesign.');
  }

  if (footwear.mode === 'replace') {
    pushIntentSummary(
      lines,
      footwear.reference_authority_active
        ? 'Footwear: use the referenced product as active authority.'
        : '',
      getPlacementIntentLine('footwear', footwear.placement || 'on_feet')
    );
  }

  if (headwear.mode === 'add' || headwear.mode === 'replace') {
    pushIntentSummary(
      lines,
      headwear.reference_authority_active
        ? 'Headwear: use the referenced design as active authority.'
        : '',
      getPlacementIntentLine('headwear', headwear.placement || 'auto')
    );
  }

  for (const item of accessoryItems) {
    if (!item || (item.mode !== 'add' && item.mode !== 'replace')) {
      continue;
    }
    pushIntentSummary(
      lines,
      item.reference_authority_active
        ? `${formatAccessoryLabel(item)}: use the referenced design as active authority.`
        : '',
      getPlacementIntentLine(item.family, item.placement || 'auto')
    );
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

function buildReferenceBindingSection(compilerJob) {
  const subject = compilerJob.entities?.subject || {};
  const lines = [];

  if (subject.mode === 'transfer_identity' && subject.reference_authority_active) {
    lines.push(
      'Subject reference = facial identity authority.',
      'Target image = body authority.',
      'Target image = pose class authority.',
      'Target image = framing authority.',
      'Target image = garment authority.',
      'Target image = scene continuity authority.'
    );
  } else {
    lines.push(
      'Target image = subject identity authority.',
      'Target image = body authority.',
      'Target image = pose class authority.',
      'Target image = framing authority.',
      'Target image = garment authority.',
      'Target image = scene continuity authority.'
    );
    if (subject.reference_authority_active) {
      lines.push('Subject references, if present, are supporting-only and not replacement identity authority.');
    }
  }

  if ((compilerJob.entities?.garment?.detail_refs?.material || []).length > 0) {
    lines.push('Garment material refs = texture, surface, stitching, and close-up detail fidelity authority.');
  }

  if ((compilerJob.entities?.garment?.detail_refs?.pattern || []).length > 0) {
    lines.push('Garment pattern refs = pattern, print, writing, geometry, scale, and placement authority.');
  }

  if (compilerJob.entities?.footwear?.reference_authority_active) {
    lines.push('Footwear refs = locked design authority for footwear only.');
  }

  if (compilerJob.entities?.headwear?.reference_authority_active) {
    lines.push('Headwear refs = locked design authority for headwear only.');
  }

  const accessoryItems = compilerJob.entities?.accessory?.items || [];
  if (accessoryItems.some((item) => item?.reference_authority_active)) {
    lines.push('Accessory refs = locked design authority for their own item only; never identity authority.');
  }

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
  const authorityState = createReferenceAuthorityState(rawJob);
  const canonicalJob = authorityState.canonicalJob;
  const compilerJob = authorityState.compilerJob;

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

  const intentBindingSection = buildIntentBindingSection(compilerJob);
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
    authority: authorityState.report,
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
