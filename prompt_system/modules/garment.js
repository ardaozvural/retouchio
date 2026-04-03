module.exports = {
  id: 'garment',
  label: 'Garment',
  supportedModes: ['preserve', 'restyle', 'ignore'],
  variants: ['source_garment'],
  ruleGroups: ['garment_lock', 'material_fidelity', 'pattern_fidelity'],
  compile({ entity }) {
    if (!entity || entity.mode === 'ignore') {
      return [];
    }

    const lines = [];

    if (entity.mode === 'preserve') {
      lines.push('Treat the target image as the garment authority and preserve garment identity exactly.');
      lines.push('Do not redesign garment structure, hemline, silhouette family, print logic, seam map, or lower drape.');
      lines.push('Lock garment color family, fit read, wrinkle logic, and construction detail to the target image.');
    }

    if (entity.mode === 'restyle') {
      lines.push('Allow only tightly controlled catalog cleanup while preserving garment identity.');
      lines.push('Do not alter garment structure, silhouette family, print logic, neckline structure, or hemline position.');
    }

    const materialDetails = entity.detail_refs?.material || [];
    const patternDetails = entity.detail_refs?.pattern || [];

    if (materialDetails.length > 0) {
      lines.push('Preserve fabric and material fidelity using the supplied garment material detail references.');
      lines.push('Match texture read, weave or knit character, sheen level, thickness impression, and surface response to light.');
    } else {
      lines.push('Maintain garment material read without smoothing away texture, stitching, or fabric structure.');
    }

    if (patternDetails.length > 0) {
      lines.push('Preserve exact pattern scale, density, and geometry using the supplied garment pattern detail references.');
      lines.push('Do not enlarge, simplify, blur, or reposition the pattern logic.');
    } else {
      lines.push('Keep any existing pattern crisp, aligned, and unchanged in scale and placement.');
    }

    if (Array.isArray(entity.rule_groups)) {
      lines.push(...entity.rule_groups);
    }

    if (Array.isArray(entity.sections?.rules)) {
      lines.push(...entity.sections.rules);
    }

    return [
      {
        id: 'garment_rules',
        label: 'Garment Rules',
        lines,
      },
    ];
  },
};
