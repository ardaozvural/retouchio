const { normalizeJob } = require('./resolveEntity');

function clone(value) {
  if (value === undefined || value === null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

function ensureArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
}

function primaryString(value, fallbackArray = []) {
  const direct = String(value || '').trim();
  if (direct) {
    return direct;
  }
  const arrayValue = ensureArray(fallbackArray)
    .map((item) => String(item || '').trim())
    .find(Boolean);
  return arrayValue || '';
}

function hasValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function pushWarning(target, warning) {
  target.authority_warnings.push(warning);
}

function pushStripped(target, path, value, reason) {
  if (!hasValue(value)) {
    return;
  }
  target.stripped_reference_fields.push({
    path,
    value,
    reason,
  });
}

function stripSubjectAuthority(entity, target, reason) {
  if (!entity) {
    return;
  }
  pushStripped(target, 'entities.subject.reference_id', entity.reference_id, reason);
  pushStripped(target, 'entities.subject.reference_ids', ensureArray(entity.reference_ids), reason);
  entity.reference_id = null;
  entity.reference_ids = [];
}

function stripAssetAuthority(entity, target, basePath, reason) {
  if (!entity) {
    return;
  }
  pushStripped(target, `${basePath}.asset_id`, entity.asset_id, reason);
  pushStripped(target, `${basePath}.asset_ids`, ensureArray(entity.asset_ids), reason);
  entity.asset_id = null;
  entity.asset_ids = [];
}

function stripGarmentDetailRefs(detailRefs, target, path, reason) {
  const nextRefs = Array.isArray(detailRefs) ? detailRefs : [];
  pushStripped(target, path, nextRefs, reason);
  return [];
}

function createReferenceAuthorityState(jobInput) {
  const canonicalJob = normalizeJob(jobInput || {}, {
    defaultOutputProfile: 'catalog_4x5_2k',
  });
  const compilerJob = clone(canonicalJob) || {};
  compilerJob.entities = compilerJob.entities || {};

  const sourceEntities = canonicalJob?.entities || {};
  const report = {
    active_entities: {
      subject: {
        active: true,
        mode: String(sourceEntities.subject?.mode || 'preserve'),
      },
      garment: {
        active: String(sourceEntities.garment?.mode || 'preserve') !== 'ignore',
        mode: String(sourceEntities.garment?.mode || 'preserve'),
      },
      footwear: {
        active: String(sourceEntities.footwear?.mode || 'ignore') !== 'ignore',
        mode: String(sourceEntities.footwear?.mode || 'ignore'),
      },
      headwear: {
        active: String(sourceEntities.headwear?.mode || 'ignore') !== 'ignore',
        mode: String(sourceEntities.headwear?.mode || 'ignore'),
      },
      accessory: {
        active: String(sourceEntities.accessory?.mode || 'apply') !== 'ignore',
        mode: String(sourceEntities.accessory?.mode || 'apply'),
      },
      accessory_items: [],
    },
    active_reference_authorities: {
      subject: null,
      garment: {
        material: [],
        pattern: [],
      },
      footwear: null,
      headwear: null,
      accessory_items: [],
    },
    stripped_reference_fields: [],
    runtime_expected_uploads: {
      subject: [],
      garment: {
        material: [],
        pattern: [],
      },
      footwear: [],
      headwear: [],
      accessory: [],
    },
    authority_warnings: [],
  };

  const decisions = {
    subject: null,
    garment: null,
    footwear: null,
    headwear: null,
    accessoryItems: [],
  };

  const compilerSubject = compilerJob.entities.subject || (compilerJob.entities.subject = {});
  const sourceSubject = sourceEntities.subject || {};
  const subjectMode = String(sourceSubject.mode || compilerSubject.mode || 'preserve').trim() || 'preserve';
  const subjectSource = String(sourceSubject.source || compilerSubject.source || 'system').trim() || 'system';
  const subjectReferenceId = primaryString(
    sourceSubject.reference_id ?? compilerSubject.reference_id,
    sourceSubject.reference_ids ?? compilerSubject.reference_ids
  );
  const subjectReferenceActive = subjectSource === 'reference' && Boolean(subjectReferenceId);
  const subjectAuthorityRole = subjectReferenceActive
    ? (subjectMode === 'transfer_identity' ? 'facial_identity' : 'supporting_consistency')
    : null;

  compilerSubject.reference_authority_active = subjectReferenceActive;
  compilerSubject.reference_authority_role = subjectAuthorityRole;
  compilerSubject.reference_id = subjectReferenceId || null;
  compilerSubject.reference_ids = uniqueStrings([subjectReferenceId, ...ensureArray(compilerSubject.reference_ids)]);

  if (subjectMode === 'transfer_identity' && !subjectReferenceActive) {
    pushWarning(report, {
      code: 'subject_reference_inactive',
      path: 'entities.subject',
      message: 'subject.mode is transfer_identity but no active subject reference authority exists; compiler falls back to preserve behavior and runtime upload is skipped.',
    });
    compilerSubject.mode = 'preserve';
    compilerSubject.source = 'system';
    stripSubjectAuthority(compilerSubject, report, 'inactive_subject_reference_authority');
  } else if (!subjectReferenceActive) {
    compilerSubject.source = 'system';
    stripSubjectAuthority(compilerSubject, report, 'inactive_subject_reference_authority');
    if (subjectReferenceId) {
      pushWarning(report, {
        code: 'subject_reference_stripped',
        path: 'entities.subject.reference_id',
        message: 'subject reference fields are present without active reference authority; compiler and runtime will ignore them.',
      });
    }
  } else {
    compilerSubject.mode = subjectMode;
    compilerSubject.source = 'reference';
    report.active_reference_authorities.subject = {
      reference_id: subjectReferenceId,
      authority_role: subjectAuthorityRole,
    };
    report.runtime_expected_uploads.subject = [subjectReferenceId];
  }

  decisions.subject = {
    entityActive: true,
    referenceActive: subjectReferenceActive,
    authorityRole: subjectAuthorityRole,
    referenceId: subjectReferenceId || null,
  };

  const compilerGarment = compilerJob.entities.garment || (compilerJob.entities.garment = {});
  const sourceGarment = sourceEntities.garment || {};
  const garmentEntityActive = report.active_entities.garment.active;
  const garmentMaterialRefs = uniqueStrings(sourceGarment.detail_refs?.material ?? compilerGarment.detail_refs?.material ?? []);
  const garmentPatternRefs = uniqueStrings(sourceGarment.detail_refs?.pattern ?? compilerGarment.detail_refs?.pattern ?? []);

  compilerGarment.detail_refs = compilerGarment.detail_refs || {};
  compilerGarment.detail_refs.material = garmentEntityActive
    ? garmentMaterialRefs.slice()
    : stripGarmentDetailRefs(garmentMaterialRefs, report, 'entities.garment.detail_refs.material', 'garment_entity_inactive');
  compilerGarment.detail_refs.pattern = garmentEntityActive
    ? garmentPatternRefs.slice()
    : stripGarmentDetailRefs(garmentPatternRefs, report, 'entities.garment.detail_refs.pattern', 'garment_entity_inactive');

  if (!garmentEntityActive) {
    if (garmentMaterialRefs.length > 0) {
      pushWarning(report, {
        code: 'garment_material_refs_skipped',
        path: 'entities.garment.detail_refs.material',
        message: 'garment.mode is ignore, so garment material references are skipped by the compiler and runtime.',
      });
    }
    if (garmentPatternRefs.length > 0) {
      pushWarning(report, {
        code: 'garment_pattern_refs_skipped',
        path: 'entities.garment.detail_refs.pattern',
        message: 'garment.mode is ignore, so garment pattern references are skipped by the compiler and runtime.',
      });
    }
  } else {
    report.active_reference_authorities.garment.material = garmentMaterialRefs.map((reference_id) => ({
      reference_id,
      authority_role: 'material_fidelity',
    }));
    report.active_reference_authorities.garment.pattern = garmentPatternRefs.map((reference_id) => ({
      reference_id,
      authority_role: 'pattern_fidelity',
    }));
    report.runtime_expected_uploads.garment.material = garmentMaterialRefs.slice();
    report.runtime_expected_uploads.garment.pattern = garmentPatternRefs.slice();
  }

  decisions.garment = {
    entityActive: garmentEntityActive,
    materialRefs: compilerGarment.detail_refs.material.slice(),
    patternRefs: compilerGarment.detail_refs.pattern.slice(),
  };

  const compilerFootwear = compilerJob.entities.footwear || (compilerJob.entities.footwear = {});
  const sourceFootwear = sourceEntities.footwear || {};
  const footwearAssetId = primaryString(
    sourceFootwear.asset_id ?? compilerFootwear.asset_id,
    sourceFootwear.asset_ids ?? compilerFootwear.asset_ids
  );
  const footwearReferenceActive = String(sourceFootwear.mode || compilerFootwear.mode || 'ignore') === 'replace'
    && String(sourceFootwear.source || compilerFootwear.source || 'system') === 'reference'
    && Boolean(footwearAssetId);
  compilerFootwear.reference_authority_active = footwearReferenceActive;
  compilerFootwear.reference_authority_role = footwearReferenceActive ? 'replacement_product' : null;
  compilerFootwear.asset_id = footwearAssetId || null;
  compilerFootwear.asset_ids = uniqueStrings([footwearAssetId, ...ensureArray(compilerFootwear.asset_ids)]);

  if (!footwearReferenceActive) {
    stripAssetAuthority(compilerFootwear, report, 'entities.footwear', 'inactive_footwear_reference_authority');
    if (footwearAssetId) {
      pushWarning(report, {
        code: 'footwear_reference_stripped',
        path: 'entities.footwear.asset_id',
        message: 'footwear reference fields are present without active reference authority; compiler and runtime will ignore them.',
      });
    } else if (String(sourceFootwear.source || compilerFootwear.source || 'system') === 'reference'
      && String(sourceFootwear.mode || compilerFootwear.mode || 'ignore') === 'replace') {
      pushWarning(report, {
        code: 'footwear_reference_missing_asset',
        path: 'entities.footwear.asset_id',
        message: 'footwear.source is reference but no footwear asset_id is available; no reference authority will be used.',
      });
    }
  } else {
    report.active_reference_authorities.footwear = {
      asset_id: footwearAssetId,
      authority_role: 'replacement_product',
    };
    report.runtime_expected_uploads.footwear = [footwearAssetId];
  }

  decisions.footwear = {
    entityActive: report.active_entities.footwear.active,
    referenceActive: footwearReferenceActive,
    assetId: footwearReferenceActive ? footwearAssetId : null,
  };

  const compilerHeadwear = compilerJob.entities.headwear || (compilerJob.entities.headwear = {});
  const sourceHeadwear = sourceEntities.headwear || {};
  const headwearAssetId = primaryString(
    sourceHeadwear.asset_id ?? compilerHeadwear.asset_id,
    sourceHeadwear.asset_ids ?? compilerHeadwear.asset_ids
  );
  const headwearMode = String(sourceHeadwear.mode || compilerHeadwear.mode || 'ignore');
  const headwearReferenceActive = (headwearMode === 'add' || headwearMode === 'replace')
    && String(sourceHeadwear.source || compilerHeadwear.source || 'system') === 'reference'
    && Boolean(headwearAssetId);
  compilerHeadwear.reference_authority_active = headwearReferenceActive;
  compilerHeadwear.reference_authority_role = headwearReferenceActive ? 'local_design' : null;
  compilerHeadwear.asset_id = headwearAssetId || null;
  compilerHeadwear.asset_ids = uniqueStrings([headwearAssetId, ...ensureArray(compilerHeadwear.asset_ids)]);

  if (!headwearReferenceActive) {
    stripAssetAuthority(compilerHeadwear, report, 'entities.headwear', 'inactive_headwear_reference_authority');
    if (headwearAssetId) {
      pushWarning(report, {
        code: 'headwear_reference_stripped',
        path: 'entities.headwear.asset_id',
        message: 'headwear reference fields are present without active reference authority; compiler and runtime will ignore them.',
      });
    } else if (String(sourceHeadwear.source || compilerHeadwear.source || 'system') === 'reference'
      && (headwearMode === 'add' || headwearMode === 'replace')) {
      pushWarning(report, {
        code: 'headwear_reference_missing_asset',
        path: 'entities.headwear.asset_id',
        message: 'headwear.source is reference but no headwear asset_id is available; no reference authority will be used.',
      });
    }
  } else {
    report.active_reference_authorities.headwear = {
      asset_id: headwearAssetId,
      authority_role: 'local_design',
    };
    report.runtime_expected_uploads.headwear = [headwearAssetId];
  }

  decisions.headwear = {
    entityActive: report.active_entities.headwear.active,
    referenceActive: headwearReferenceActive,
    assetId: headwearReferenceActive ? headwearAssetId : null,
  };

  const compilerAccessory = compilerJob.entities.accessory || (compilerJob.entities.accessory = {});
  const sourceAccessory = sourceEntities.accessory || {};
  const accessoryEntityActive = report.active_entities.accessory.active;
  const sourceItems = Array.isArray(sourceAccessory.items) ? sourceAccessory.items : [];
  const compilerItems = Array.isArray(compilerAccessory.items) ? compilerAccessory.items : [];
  const maxLength = Math.max(sourceItems.length, compilerItems.length);
  const nextCompilerItems = [];

  for (let index = 0; index < maxLength; index += 1) {
    const sourceItem = sourceItems[index] || {};
    const compilerItem = clone(compilerItems[index] || sourceItem || {});
    const itemMode = String(sourceItem.mode || compilerItem.mode || 'ignore');
    const itemFamily = String(sourceItem.family || compilerItem.family || '').trim() || null;
    const itemVariant = String(sourceItem.variant || compilerItem.variant || '').trim() || null;
    const itemAssetId = primaryString(
      sourceItem.asset_id ?? compilerItem.asset_id,
      sourceItem.asset_ids ?? compilerItem.asset_ids
    );
    const itemReferenceActive = accessoryEntityActive
      && (itemMode === 'add' || itemMode === 'replace')
      && String(sourceItem.source || compilerItem.source || 'system') === 'reference'
      && Boolean(itemAssetId);
    const itemEntityActive = accessoryEntityActive && itemMode !== 'ignore';

    compilerItem.reference_authority_active = itemReferenceActive;
    compilerItem.reference_authority_role = itemReferenceActive ? 'local_design' : null;
    compilerItem.asset_id = itemAssetId || null;
    compilerItem.asset_ids = uniqueStrings([itemAssetId, ...ensureArray(compilerItem.asset_ids)]);

    if (!itemReferenceActive) {
      stripAssetAuthority(
        compilerItem,
        report,
        `entities.accessory.items[${index}]`,
        accessoryEntityActive ? 'inactive_accessory_reference_authority' : 'accessory_entity_inactive'
      );
      if (itemAssetId) {
        pushWarning(report, {
          code: 'accessory_reference_stripped',
          path: `entities.accessory.items[${index}].asset_id`,
          message: `accessory item ${index} retains an asset_id without active reference authority; compiler and runtime will ignore it.`,
        });
      } else if (String(sourceItem.source || compilerItem.source || 'system') === 'reference'
        && (itemMode === 'add' || itemMode === 'replace')) {
        pushWarning(report, {
          code: 'accessory_reference_missing_asset',
          path: `entities.accessory.items[${index}].asset_id`,
          message: `accessory item ${index} requests reference authority without an asset_id; no reference authority will be used.`,
        });
      }
    } else {
      report.active_reference_authorities.accessory_items.push({
        index,
        family: itemFamily,
        variant: itemVariant,
        asset_id: itemAssetId,
        authority_role: 'local_design',
      });
      report.runtime_expected_uploads.accessory.push({
        index,
        family: itemFamily,
        variant: itemVariant,
        asset_id: itemAssetId,
      });
    }

    report.active_entities.accessory_items.push({
      index,
      family: itemFamily,
      variant: itemVariant,
      mode: itemMode,
      active: itemEntityActive,
    });

    decisions.accessoryItems.push({
      index,
      family: itemFamily,
      variant: itemVariant,
      entityActive: itemEntityActive,
      referenceActive: itemReferenceActive,
      assetId: itemReferenceActive ? itemAssetId : null,
    });

    nextCompilerItems.push(compilerItem);
  }

  compilerAccessory.items = nextCompilerItems;

  return {
    canonicalJob,
    compilerJob,
    report,
    decisions,
  };
}

module.exports = {
  createReferenceAuthorityState,
};
