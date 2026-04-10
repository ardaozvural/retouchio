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

    const refinementLevel = entity.refinement_level === 'repair'
      ? 'repair'
      : (entity.refinement_level === 'minimal' ? 'minimal' : (entity.mode === 'restyle' ? 'repair' : 'preserve'));
    const lines = [];

    lines.push('Treat the target image as the garment authority and preserve garment identity exactly.');
    lines.push('Do not redesign garment structure, hemline, silhouette family, print logic, seam map, neckline logic, or lower drape.');
    lines.push('Lock garment color family, fit read, wrinkle logic, and construction detail to the target image.');

    if (refinementLevel === 'minimal') {
      lines.push('Allow only minimal product-safe cleanup: gentle lint cleanup, minor edge tidy-up, subtle fold cleanup, and restrained catalog polish.');
      lines.push('Do not reinterpret the garment, rewrite the print, simplify the pattern, or alter trim placement.');
    } else if (refinementLevel === 'repair') {
      lines.push('Allow stronger professional correction for localized issues such as fold clutter, small print breakup, mild warping, or uneven surface cleanup while preserving garment authority.');
      lines.push('Do not redesign the garment, restyle the silhouette, move graphics, rewrite text, or invent new construction details.');
    }

    const materialDetails = entity.detail_refs?.material || [];
    const patternDetails = entity.detail_refs?.pattern || [];

    if (materialDetails.length > 0) {
      lines.push('Use the supplied garment detail references as authority for fabric, surface texture, stitching, trim, and close-up material detail fidelity.');
      lines.push('Match texture read, weave or knit character, sheen level, thickness impression, edge finish, and surface response to light.');
    } else {
      lines.push('Maintain garment material read without smoothing away texture, stitching, or fabric structure.');
    }

    if (patternDetails.length > 0) {
      lines.push('Use the supplied garment pattern/detail references as authority for pattern, print, logo, writing, and surface graphic fidelity.');
      lines.push('Preserve exact pattern scale, density, placement, lettering shape, and print geometry without blur or reinterpretation.');
    } else {
      lines.push('Keep any existing pattern, print, writing, or logo crisp, aligned, and unchanged in scale and placement.');
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
