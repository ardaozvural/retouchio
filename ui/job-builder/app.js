const ASSET_BINDING_STORAGE_KEY = 'retouchio.asset_binding.v1';
const INPUT_SET_BINDING_STORAGE_KEY = 'retouchio.input_set_binding.v1';

const state = {
  registry: null,
  systemInfo: null,
  workflowType: 'studio_cleanup',
  managedInputSets: [],
  assetLibrary: {
    assetsByFamily: {},
  },
  jobs: {
    generated: [],
    sample: [],
  },
  defaultJob: createWorkflowFriendlyDefaultJob(createFallbackJob()),
  sampleJob: createFallbackJob(),
  job: createWorkflowFriendlyDefaultJob(createFallbackJob()),
  compiledPrompt: '',
  compiledCanonicalJob: null,
  imageConfig: null,
  validation: {
    errors: [],
    warnings: [],
  },
  compileError: '',
  readiness: null,
  runStatus: {
    status: 'idle',
    batchJobName: null,
    batchState: null,
    durationMs: null,
    command: '-',
    logs: 'No run yet.',
  },
  outputsReview: {
    open: false,
    batchName: '',
    safeBatchName: '',
    outputDir: '',
    mode: 'output',
    items: [],
    loading: false,
    error: '',
  },
  outputImagePreview: {
    open: false,
    mode: 'output',
    key: '',
    input: null,
    output: null,
  },
  batchJobs: [],
  batchFilter: 'all',
  stylingDrafts: {
    accessoryItems: [],
  },
  busy: {
    compile: false,
    save: false,
    dryCheck: false,
    runBatch: false,
    loadSaved: false,
    refreshBatches: false,
    batchAction: false,
    outputs: false,
  },
  ui: createInitialUiState(),
  lastCompileSucceeded: false,
};

const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  bindStaticEvents();
  await loadBootstrap();
  renderPreviews();
  renderReadiness();
  renderRunStatus();
});

function cacheElements() {
  Object.assign(elements, {
    statusBanner: document.getElementById('statusBanner'),
    targetInputSummary: document.getElementById('targetInputSummary'),
    productIntentControl: document.getElementById('productIntentControl'),
    productIntentButtons: Array.from(document.querySelectorAll('[data-product-intent]')),
    productBeforeImage: document.getElementById('productBeforeImage'),
    productBeforeEmpty: document.getElementById('productBeforeEmpty'),
    productHelperText: document.getElementById('productHelperText'),
    identityModeControl: document.getElementById('identityModeControl'),
    identityModeButtons: Array.from(document.querySelectorAll('[data-identity-mode]')),
    identityHelperText: document.getElementById('identityHelperText'),
    identityReplaceDropzone: document.getElementById('identityReplaceDropzone'),
    identityReferenceInput: document.getElementById('identityReferenceInput'),
    identityReferenceButton: document.getElementById('identityReferenceButton'),
    identityReferencePreview: document.getElementById('identityReferencePreview'),
    identityReferencePreviewImage: document.getElementById('identityReferencePreviewImage'),
    identityReferenceName: document.getElementById('identityReferenceName'),
    physicalCorrectionsGroup: document.getElementById('physicalCorrectionsGroup'),
    aestheticEnhancementsGroup: document.getElementById('aestheticEnhancementsGroup'),
    constraintsGroup: document.getElementById('constraintsGroup'),
    stylingAccordion: document.getElementById('stylingAccordion'),
    reviewCards: document.getElementById('reviewCards'),
    reviewSentence: document.getElementById('reviewSentence'),
    variationStrip: document.getElementById('variationStrip'),
    heroPreviewLabel: document.getElementById('heroPreviewLabel'),
    heroPreviewCompare: document.getElementById('heroPreviewCompare'),
    heroBeforeImage: document.getElementById('heroBeforeImage'),
    heroBeforeEmpty: document.getElementById('heroBeforeEmpty'),
    heroAfterImage: document.getElementById('heroAfterImage'),
    heroAfterEmpty: document.getElementById('heroAfterEmpty'),
    downloadOutputButton: document.getElementById('downloadOutputButton'),
    approveOutputButton: document.getElementById('approveOutputButton'),
    regenerateOutputButton: document.getElementById('regenerateOutputButton'),
    compareOutputButton: document.getElementById('compareOutputButton'),
    outputMeta: document.getElementById('outputMeta'),
    compileButton: document.getElementById('compileButton'),
    resetDefaultButton: document.getElementById('resetDefaultButton'),
    loadSampleButton: document.getElementById('loadSampleButton'),
    saveJobButton: document.getElementById('saveJobButton'),
    savedJobSelect: document.getElementById('savedJobSelect'),
    loadSavedJobButton: document.getElementById('loadSavedJobButton'),
    runDryCheckButton: document.getElementById('runDryCheckButton'),
    runBatchButton: document.getElementById('runBatchButton'),
    cancelActiveBatchButton: document.getElementById('cancelActiveBatchButton'),
    copyJsonButton: document.getElementById('copyJsonButton'),
    downloadJsonButton: document.getElementById('downloadJsonButton'),
    copyPromptButton: document.getElementById('copyPromptButton'),
    addAccessoryButton: document.getElementById('addAccessoryButton'),
    jobId: document.getElementById('jobId'),
    displayName: document.getElementById('displayName'),
    inputSource: document.getElementById('inputSource'),
    inputSourceHint: document.getElementById('inputSourceHint'),
    inputSourceSummary: document.getElementById('inputSourceSummary'),
    subjectMode: document.getElementById('subjectMode'),
    subjectReferenceId: document.getElementById('subjectReferenceId'),
    garmentMode: document.getElementById('garmentMode'),
    garmentMaterialRefs: document.getElementById('garmentMaterialRefs'),
    garmentPatternRefs: document.getElementById('garmentPatternRefs'),
    eyewearCard: document.getElementById('eyewearCard'),
    eyewearAction: document.getElementById('eyewearAction'),
    eyewearActionHint: document.getElementById('eyewearActionHint'),
    eyewearSource: document.getElementById('eyewearSource'),
    eyewearPlacement: document.getElementById('eyewearPlacement'),
    eyewearAssetId: document.getElementById('eyewearAssetId'),
    eyewearDependentFields: document.getElementById('eyewearDependentFields'),
    eyewearSourceField: document.getElementById('eyewearSourceField'),
    eyewearPlacementField: document.getElementById('eyewearPlacementField'),
    eyewearAssetField: document.getElementById('eyewearAssetField'),
    eyewearAssetHint: document.getElementById('eyewearAssetHint'),
    bagCard: document.getElementById('bagCard'),
    bagAction: document.getElementById('bagAction'),
    bagActionHint: document.getElementById('bagActionHint'),
    bagSource: document.getElementById('bagSource'),
    bagPlacement: document.getElementById('bagPlacement'),
    bagAssetId: document.getElementById('bagAssetId'),
    bagDependentFields: document.getElementById('bagDependentFields'),
    bagSourceField: document.getElementById('bagSourceField'),
    bagPlacementField: document.getElementById('bagPlacementField'),
    bagAssetField: document.getElementById('bagAssetField'),
    bagAssetHint: document.getElementById('bagAssetHint'),
    footwearMode: document.getElementById('footwearMode'),
    footwearSource: document.getElementById('footwearSource'),
    footwearVariant: document.getElementById('footwearVariant'),
    footwearAssetId: document.getElementById('footwearAssetId'),
    footwearCard: document.getElementById('footwearCard'),
    footwearDependentFields: document.getElementById('footwearDependentFields'),
    footwearSourceField: document.getElementById('footwearSourceField'),
    footwearVariantField: document.getElementById('footwearVariantField'),
    footwearAssetField: document.getElementById('footwearAssetField'),
    footwearAssetHint: document.getElementById('footwearAssetHint'),
    footwearModeHint: document.getElementById('footwearModeHint'),
    headwearMode: document.getElementById('headwearMode'),
    headwearSource: document.getElementById('headwearSource'),
    headwearPlacement: document.getElementById('headwearPlacement'),
    headwearVariant: document.getElementById('headwearVariant'),
    headwearAssetId: document.getElementById('headwearAssetId'),
    headwearCard: document.getElementById('headwearCard'),
    headwearDependentFields: document.getElementById('headwearDependentFields'),
    headwearSourceField: document.getElementById('headwearSourceField'),
    headwearPlacementField: document.getElementById('headwearPlacementField'),
    headwearVariantField: document.getElementById('headwearVariantField'),
    headwearAssetField: document.getElementById('headwearAssetField'),
    headwearAssetHint: document.getElementById('headwearAssetHint'),
    headwearModeHint: document.getElementById('headwearModeHint'),
    accessoryMode: document.getElementById('accessoryMode'),
    accessoryCard: document.getElementById('accessoryCard'),
    accessoryItemsContainer: document.getElementById('accessoryItemsContainer'),
    accessoryItems: document.getElementById('accessoryItems'),
    sceneMode: document.getElementById('sceneMode'),
    sceneProfile: document.getElementById('sceneProfile'),
    outputProfileMode: document.getElementById('outputProfileMode'),
    outputProfileProfile: document.getElementById('outputProfileProfile'),
    outputTypeHint: document.getElementById('outputTypeHint'),
    globalNegativeMode: document.getElementById('globalNegativeMode'),
    globalNegativeItems: document.getElementById('globalNegativeItems'),
    promptPreview: document.getElementById('promptPreview'),
    jsonPreview: document.getElementById('jsonPreview'),
    imageAspectRatio: document.getElementById('imageAspectRatio'),
    imageSize: document.getElementById('imageSize'),
    compileStatus: document.getElementById('compileStatus'),
    actionBarCompileStatus: document.getElementById('actionBarCompileStatus'),
    validationSummary: document.getElementById('validationSummary'),
    validationState: document.getElementById('validationState'),
    validationWarnings: document.getElementById('validationWarnings'),
    validationErrors: document.getElementById('validationErrors'),
    runtimeBadge: document.getElementById('runtimeBadge'),
    registryBadge: document.getElementById('registryBadge'),
    assetStandardBadge: document.getElementById('assetStandardBadge'),
    missingDirsBadge: document.getElementById('missingDirsBadge'),
    workflowType: document.getElementById('workflowType'),
    workflowDescription: document.getElementById('workflowDescription'),
    workflowVisibleSummary: document.getElementById('workflowVisibleSummary'),
    configurationStepHint: document.getElementById('configurationStepHint'),
    workflowOptionButtons: Array.from(document.querySelectorAll('[data-workflow-option]')),
    workflowSections: Array.from(document.querySelectorAll('[data-workflow-visible]')),
    developerToolsCard: document.getElementById('developerToolsCard'),
    generatedJobsList: document.getElementById('generatedJobsList'),
    sampleJobsList: document.getElementById('sampleJobsList'),
    readinessBadge: document.getElementById('readinessBadge'),
    actionBarReadinessStatus: document.getElementById('actionBarReadinessStatus'),
    readinessInputExists: document.getElementById('readinessInputExists'),
    readinessInputCount: document.getElementById('readinessInputCount'),
    readinessRefsCount: document.getElementById('readinessRefsCount'),
    readinessState: document.getElementById('readinessState'),
    readinessWarnings: document.getElementById('readinessWarnings'),
    readinessErrors: document.getElementById('readinessErrors'),
    runStatusBadge: document.getElementById('runStatusBadge'),
    actionBarBatchStatus: document.getElementById('actionBarBatchStatus'),
    reviewSummary: document.getElementById('reviewSummary'),
    runBatchJobName: document.getElementById('runBatchJobName'),
    runBatchState: document.getElementById('runBatchState'),
    runDuration: document.getElementById('runDuration'),
    runCommand: document.getElementById('runCommand'),
    runLogs: document.getElementById('runLogs'),
    runSpinner: document.getElementById('runSpinner'),
    executionActionHint: document.getElementById('executionActionHint'),
    refreshAllBatchesButton: document.getElementById('refreshAllBatchesButton'),
    batchFilterSelect: document.getElementById('batchFilterSelect'),
    batchJobsEmpty: document.getElementById('batchJobsEmpty'),
    batchJobsList: document.getElementById('batchJobsList'),
    outputsModal: document.getElementById('outputsModal'),
    outputsModalBackdrop: document.getElementById('outputsModalBackdrop'),
    closeOutputsModalButton: document.getElementById('closeOutputsModalButton'),
    outputsModalTitle: document.getElementById('outputsModalTitle'),
    outputsModalMeta: document.getElementById('outputsModalMeta'),
    outputsModalBody: document.getElementById('outputsModalBody'),
    outputsModeOutputOnlyButton: document.getElementById('outputsModeOutputOnlyButton'),
    outputsModeCompareButton: document.getElementById('outputsModeCompareButton'),
    outputsImageModal: document.getElementById('outputsImageModal'),
    outputsImageModalBackdrop: document.getElementById('outputsImageModalBackdrop'),
    closeOutputsImageModalButton: document.getElementById('closeOutputsImageModalButton'),
    outputsImageModalTitle: document.getElementById('outputsImageModalTitle'),
    outputsImageModalMeta: document.getElementById('outputsImageModalMeta'),
    outputsCompareGrid: document.getElementById('outputsCompareGrid'),
    outputsLargeInputPane: document.getElementById('outputsLargeInputPane'),
    outputsLargeOutputPane: document.getElementById('outputsLargeOutputPane'),
    outputsLargeInputImage: document.getElementById('outputsLargeInputImage'),
    outputsLargeOutputImage: document.getElementById('outputsLargeOutputImage'),
    outputsLargeInputEmpty: document.getElementById('outputsLargeInputEmpty'),
    outputsLargeOutputEmpty: document.getElementById('outputsLargeOutputEmpty'),
  });
}

function bindStaticEvents() {
  elements.workflowType?.addEventListener('change', () => {
    state.workflowType = elements.workflowType.value || 'studio_cleanup';
    renderWorkflowUi();
  });

  elements.outputProfileProfile?.addEventListener('change', () => {
    if (elements.outputProfileProfile.value && elements.outputProfileMode) {
      elements.outputProfileMode.value = 'apply';
    }
  });

  for (const button of elements.workflowOptionButtons || []) {
    button.addEventListener('click', () => {
      const nextWorkflow = String(button.dataset.workflowOption || '').trim() || 'studio_cleanup';
      state.workflowType = nextWorkflow;
      if (elements.workflowType) {
        elements.workflowType.value = nextWorkflow;
      }
      renderWorkflowUi();
    });
  }

  bindVisibleShellEvents();

  elements.compileButton.addEventListener('click', () => {
    syncStateFromForm();
    compileCurrentJob();
  });

  elements.resetDefaultButton.addEventListener('click', () => {
    state.job = mergeDefaultJob(state.defaultJob || createFallbackJob());
    syncWorkflowTypeWithJob();
    clearDerivedStates();
    state.ui.initialized = false;
    hydrateForm();
    renderAccessoryItems();
    renderStylingUiState();
    renderAllSidePanels();
    showStatus('Reset to default example job.');
  });

  elements.loadSampleButton.addEventListener('click', () => {
    state.job = mergeDefaultJob(state.sampleJob || state.defaultJob || createFallbackJob());
    syncWorkflowTypeWithJob();
    clearDerivedStates();
    state.ui.initialized = false;
    hydrateForm();
    renderAccessoryItems();
    renderStylingUiState();
    renderAllSidePanels();
      showStatus('Loaded sample canonical job.');
  });

  elements.saveJobButton.addEventListener('click', () => {
    syncStateFromForm();
    saveCurrentJob();
  });

  elements.loadSavedJobButton.addEventListener('click', () => {
    loadSelectedSavedJob();
  });

  elements.runDryCheckButton.addEventListener('click', () => {
    syncStateFromForm();
    runDryBatchCheck();
  });

  elements.runBatchButton.addEventListener('click', () => {
    syncStateFromForm();
    runBatch();
  });

  elements.cancelActiveBatchButton.addEventListener('click', () => {
    const activeBatch = getCancellableBatch();
    if (!activeBatch?.batchName) {
      return;
    }
    cancelBatch(activeBatch.batchName);
  });

  if (elements.refreshAllBatchesButton) {
    elements.refreshAllBatchesButton.addEventListener('click', () => {
      refreshAllBatchStatuses();
    });
  }

  if (elements.batchFilterSelect) {
    elements.batchFilterSelect.addEventListener('change', () => {
      state.batchFilter = elements.batchFilterSelect.value || 'all';
      renderBatchJobs();
    });
  }

  if (elements.batchJobsList) {
    elements.batchJobsList.addEventListener('click', (event) => {
      handleBatchListClick(event);
    });
  }

  if (elements.closeOutputsModalButton) {
    elements.closeOutputsModalButton.addEventListener('click', closeOutputsModal);
  }
  if (elements.outputsModalBackdrop) {
    elements.outputsModalBackdrop.addEventListener('click', closeOutputsModal);
  }
  if (elements.closeOutputsImageModalButton) {
    elements.closeOutputsImageModalButton.addEventListener('click', closeOutputImageModal);
  }
  if (elements.outputsImageModalBackdrop) {
    elements.outputsImageModalBackdrop.addEventListener('click', closeOutputImageModal);
  }
  if (elements.outputsModeOutputOnlyButton) {
    elements.outputsModeOutputOnlyButton.addEventListener('click', () => {
      setOutputsReviewMode('output');
    });
  }
  if (elements.outputsModeCompareButton) {
    elements.outputsModeCompareButton.addEventListener('click', () => {
      setOutputsReviewMode('compare');
    });
  }

  if (elements.outputsModalBody) {
    elements.outputsModalBody.addEventListener('click', (event) => {
      const button = event.target.closest('[data-output-action]');
      if (!button) {
        return;
      }
      const action = button.dataset.outputAction;
      const index = Number(button.dataset.itemIndex);
      if (Number.isNaN(index)) {
        return;
      }
      const item = state.outputsReview.items?.[index];
      if (!item) {
        return;
      }
      if (action === 'preview-output') {
        openOutputImageModal(item, 'output');
        return;
      }
      if (action === 'preview-compare') {
        openOutputImageModal(item, 'compare');
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (state.outputImagePreview.open) {
      closeOutputImageModal();
      return;
    }
    if (state.outputsReview.open) {
      closeOutputsModal();
    }
  });

  elements.copyJsonButton.addEventListener('click', async () => {
    await copyText(JSON.stringify(getJsonExportPayload(), null, 2), 'Canonical JSON copied.');
  });

  elements.downloadJsonButton.addEventListener('click', () => {
    const fileName = `${(state.job.jobId || 'retouchio-job').trim() || 'retouchio-job'}.canonical.json`;
    downloadText(fileName, JSON.stringify(getJsonExportPayload(), null, 2), 'application/json');
    showStatus('Canonical JSON downloaded.');
  });

  elements.copyPromptButton.addEventListener('click', async () => {
    if (!state.compiledPrompt) {
      showStatus('Compile prompt first.', true);
      return;
    }
    await copyText(state.compiledPrompt, 'Compiled prompt copied.');
  });

  elements.addAccessoryButton.addEventListener('click', () => {
    syncStateFromForm();
    state.job.entities.accessory.items.push(createAccessoryItem());
    renderAccessoryItems();
    renderStylingUiState();
  });

  elements.accessoryItems.addEventListener('input', handleAccessoryInput);
  elements.accessoryItems.addEventListener('change', handleAccessoryInput);
  elements.accessoryItems.addEventListener('click', handleAccessoryButtonClick);

  [
    elements.jobId,
    elements.displayName,
    elements.inputSource,
    elements.subjectMode,
    elements.subjectReferenceId,
    elements.garmentMode,
    elements.garmentMaterialRefs,
    elements.garmentPatternRefs,
    elements.eyewearAction,
    elements.eyewearSource,
    elements.eyewearPlacement,
    elements.eyewearAssetId,
    elements.bagAction,
    elements.bagSource,
    elements.bagPlacement,
    elements.bagAssetId,
    elements.footwearMode,
    elements.footwearSource,
    elements.footwearVariant,
    elements.footwearAssetId,
    elements.headwearMode,
    elements.headwearSource,
    elements.headwearPlacement,
    elements.headwearVariant,
    elements.headwearAssetId,
    elements.accessoryMode,
    elements.sceneMode,
    elements.sceneProfile,
    elements.outputProfileMode,
    elements.outputProfileProfile,
    elements.globalNegativeMode,
    elements.globalNegativeItems,
  ].forEach((element) => {
    element.addEventListener('input', syncStateFromForm);
    element.addEventListener('change', syncStateFromForm);
  });
}

function bindVisibleShellEvents() {
  elements.productIntentControl?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-intent]');
    if (!button) {
      return;
    }
    state.ui.productIntent = String(button.dataset.productIntent || 'clean');
    if (elements.garmentMode) {
      elements.garmentMode.value = state.ui.productIntent === 'restyle' ? 'restyle' : 'preserve';
    }
    syncStateFromForm();
    renderVisibleProductShell();
    renderConnectedResultSystem();
  });

  elements.identityModeControl?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-identity-mode]');
    if (!button) {
      return;
    }
    state.ui.model.identityMode = String(button.dataset.identityMode || 'preserve');
    if (elements.subjectMode) {
      elements.subjectMode.value = state.ui.model.identityMode === 'ignore' ? 'ignore' : 'preserve';
    }
    syncStateFromForm();
    renderVisibleModelShell();
    renderConnectedResultSystem();
  });

  [elements.physicalCorrectionsGroup, elements.aestheticEnhancementsGroup, elements.constraintsGroup]
    .filter(Boolean)
    .forEach((groupElement) => {
      groupElement.addEventListener('click', handleVisiblePillGroupClick);
    });

  elements.identityReferenceButton?.addEventListener('click', () => {
    elements.identityReferenceInput?.click();
  });

  elements.identityReferenceInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0] || null;
    setIdentityReferencePreview(file);
  });

  elements.identityReplaceDropzone?.addEventListener('dragover', (event) => {
    event.preventDefault();
    elements.identityReplaceDropzone?.classList.add('is-dragover');
  });

  elements.identityReplaceDropzone?.addEventListener('dragleave', () => {
    elements.identityReplaceDropzone?.classList.remove('is-dragover');
  });

  elements.identityReplaceDropzone?.addEventListener('drop', (event) => {
    event.preventDefault();
    elements.identityReplaceDropzone?.classList.remove('is-dragover');
    const file = event.dataTransfer?.files?.[0] || null;
    if (!file) {
      return;
    }
    setIdentityReferencePreview(file);
  });

  elements.stylingAccordion?.addEventListener('click', handleStylingAccordionClick);
  elements.variationStrip?.addEventListener('click', handleVariationStripClick);

  elements.compareOutputButton?.addEventListener('click', () => {
    state.ui.results.previewMode = state.ui.results.previewMode === 'compare' ? 'output' : 'compare';
    renderHeroPreview();
  });

  elements.approveOutputButton?.addEventListener('click', () => {
    const active = getActiveVariation();
    if (!active) {
      showStatus('Select a variation first.', true);
      return;
    }
    state.ui.results.approvedVariationKey = active.key;
    renderConnectedResultSystem();
    showStatus(`${active.title} marked as approved in the UI shell.`);
  });

  elements.regenerateOutputButton?.addEventListener('click', () => {
    const candidates = buildVariationCandidates();
    if (candidates.length === 0) {
      showStatus('No variation candidates available yet.', true);
      return;
    }
    const currentIndex = candidates.findIndex((item) => item.key === state.ui.results.activeVariationKey);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % candidates.length : 0;
    state.ui.results.activeVariationKey = candidates[nextIndex].key;
    renderConnectedResultSystem();
    showStatus(`Showing ${candidates[nextIndex].title}.`);
  });

  elements.downloadOutputButton?.addEventListener('click', () => {
    const active = getActiveVariation();
    if (!active?.outputUrl) {
      showStatus('No output preview available to download.', true);
      return;
    }
    const link = document.createElement('a');
    link.href = active.outputUrl;
    link.download = `${active.key}.jpg`;
    link.click();
  });
}

function handleVisiblePillGroupClick(event) {
  const button = event.target.closest('[data-pill-group][data-pill-value]');
  if (!button) {
    return;
  }
  const group = String(button.dataset.pillGroup || '').trim();
  const value = String(button.dataset.pillValue || '').trim();
  if (!group || !value || !state.ui.model[group]) {
    return;
  }
  const current = new Set(state.ui.model[group]);
  if (current.has(value)) {
    current.delete(value);
  } else {
    current.add(value);
  }
  state.ui.model[group] = Array.from(current);
  renderVisibleModelShell();
  renderConnectedResultSystem();
}

function handleStylingAccordionClick(event) {
  const toggle = event.target.closest('[data-styling-toggle]');
  if (toggle) {
    state.ui.styling.openPanel = String(toggle.dataset.stylingToggle || 'eyewear');
    renderStylingAccordion();
    return;
  }

  const upload = event.target.closest('[data-styling-upload]');
  if (upload) {
    window.location.assign('/asset-manager');
    return;
  }

  const option = event.target.closest('[data-styling-field][data-styling-family]');
  if (!option) {
    return;
  }

  const family = String(option.dataset.stylingFamily || '').trim();
  const field = String(option.dataset.stylingField || '').trim();
  const value = String(option.dataset.value || '').trim();
  if (!family || !field) {
    return;
  }

  applyVisibleStylingSelection(family, field, value);
}

function handleVariationStripClick(event) {
  const button = event.target.closest('[data-variation-key]');
  if (!button) {
    return;
  }
  state.ui.results.activeVariationKey = String(button.dataset.variationKey || '');
  renderConnectedResultSystem();
}

function setIdentityReferencePreview(file) {
  if (!file) {
    if (state.ui.model.identityPreviewUrl) {
      URL.revokeObjectURL(state.ui.model.identityPreviewUrl);
    }
    state.ui.model.identityReferenceName = '';
    state.ui.model.identityPreviewUrl = '';
    renderVisibleModelShell();
    renderConnectedResultSystem();
    return;
  }

  if (state.ui.model.identityPreviewUrl) {
    URL.revokeObjectURL(state.ui.model.identityPreviewUrl);
  }
  state.ui.model.identityReferenceName = file.name || 'reference_face';
  state.ui.model.identityPreviewUrl = URL.createObjectURL(file);
  renderVisibleModelShell();
  renderConnectedResultSystem();
}

function applyVisibleStylingSelection(family, field, value) {
  state.ui.styling.openPanel = family;

  if (field === 'action') {
    if (family === 'eyewear') {
      elements.eyewearAction.value = value;
    } else if (family === 'bag') {
      elements.bagAction.value = value;
    } else if (family === 'headwear') {
      elements.headwearMode.value = value;
    } else if (family === 'footwear') {
      elements.footwearMode.value = value;
    }
    syncStateFromForm();
    renderStylingAccordion();
    return;
  }

  if (field === 'source') {
    if (family === 'eyewear') {
      elements.eyewearSource.value = value;
    } else if (family === 'bag') {
      elements.bagSource.value = value;
    } else if (family === 'headwear') {
      elements.headwearSource.value = value;
    } else if (family === 'footwear') {
      elements.footwearSource.value = value;
    }
    syncStateFromForm();
    renderStylingAccordion();
    return;
  }

  if (field === 'placement') {
    if (family === 'eyewear') {
      elements.eyewearPlacement.value = value;
    } else if (family === 'bag') {
      elements.bagPlacement.value = value;
    } else if (family === 'headwear') {
      elements.headwearPlacement.value = value;
    }
    syncStateFromForm();
    renderStylingAccordion();
    return;
  }

  if (field === 'variant') {
    if (family === 'headwear') {
      elements.headwearVariant.value = value;
    } else if (family === 'footwear') {
      elements.footwearVariant.value = value;
    }
    syncStateFromForm();
    renderStylingAccordion();
    return;
  }

  if (field === 'asset') {
    ensureStylingActionIsActive(family);
    if (family === 'eyewear') {
      elements.eyewearSource.value = 'reference';
      elements.eyewearAssetId.value = value;
    } else if (family === 'bag') {
      elements.bagSource.value = 'reference';
      elements.bagAssetId.value = value;
    } else if (family === 'headwear') {
      elements.headwearSource.value = 'reference';
      elements.headwearAssetId.value = value;
    } else if (family === 'footwear') {
      elements.footwearSource.value = 'reference';
      elements.footwearAssetId.value = value;
    }
    syncStateFromForm();
    renderStylingAccordion();
  }
}

function ensureStylingActionIsActive(family) {
  if (family === 'eyewear' && !['add', 'replace'].includes(elements.eyewearAction.value)) {
    elements.eyewearAction.value = 'replace';
  }
  if (family === 'bag' && !['add', 'replace'].includes(elements.bagAction.value)) {
    elements.bagAction.value = 'replace';
  }
  if (family === 'headwear' && !['add', 'replace'].includes(elements.headwearMode.value)) {
    elements.headwearMode.value = 'replace';
  }
  if (family === 'footwear' && elements.footwearMode.value !== 'replace') {
    elements.footwearMode.value = 'replace';
  }
}

async function loadBootstrap() {
  try {
    const response = await fetch('/api/job-builder/bootstrap');
    if (!response.ok) {
      throw new Error('Failed to load bootstrap data');
    }

    const payload = await response.json();
    state.assetLibrary = await loadAssetLibrary();
    state.registry = payload.registry || createFallbackRegistry();
    state.systemInfo = payload.systemInfo || null;
    state.managedInputSets = Array.isArray(payload.inputSets) ? payload.inputSets : [];
    state.jobs = payload.jobs || { generated: [], sample: [] };
    state.batchJobs = Array.isArray(payload.batches) ? payload.batches : [];
    state.defaultJob = createWorkflowFriendlyDefaultJob(mergeDefaultJob(payload.defaultJob || createFallbackJob()));
    state.sampleJob = mergeDefaultJob(payload.sampleJob || payload.defaultJob || createFallbackJob());
    state.job = createWorkflowFriendlyDefaultJob(mergeDefaultJob(payload.defaultJob || createFallbackJob()));
    state.ui.initialized = false;
    syncWorkflowTypeWithJob();

    populateSystemSignals();
    populateStaticOptions();
    hydrateForm();
    renderAccessoryItems();
    renderStylingUiState();
    renderWorkflowUi();
    renderJobsPanel();
    renderBatchJobs();
    const bindingResults = applyPendingBindings();
    if (bindingResults.length > 0) {
      const hasError = bindingResults.some((item) => item.isError);
      showStatus(bindingResults.map((item) => item.message).join(' | '), hasError);
    } else {
      showStatus('Production flow ready.');
    }
  } catch (error) {
    state.assetLibrary = {
      assetsByFamily: {},
    };
    state.registry = createFallbackRegistry();
    state.systemInfo = null;
    state.managedInputSets = [];
    state.jobs = { generated: [], sample: [] };
    state.batchJobs = [];
    state.defaultJob = createWorkflowFriendlyDefaultJob(createFallbackJob());
    state.sampleJob = createFallbackJob();
    state.job = createWorkflowFriendlyDefaultJob(createFallbackJob());
    state.ui.initialized = false;
    syncWorkflowTypeWithJob();
    populateSystemSignals();
    populateStaticOptions();
    hydrateForm();
    renderAccessoryItems();
    renderStylingUiState();
    renderWorkflowUi();
    renderJobsPanel();
    renderBatchJobs();
    const bindingResults = applyPendingBindings();
    if (bindingResults.length > 0) {
      const hasError = bindingResults.some((item) => item.isError);
      showStatus(bindingResults.map((item) => item.message).join(' | '), hasError);
    } else {
      showStatus(`Bootstrap fallback active: ${error.message}`, true);
    }
  }
}

async function loadAssetLibrary() {
  try {
    const response = await fetch('/api/assets/list');
    if (!response.ok) {
      throw new Error('Failed to load assets');
    }
    const payload = await response.json();
    return {
      assetsByFamily: payload.assetsByFamily || {},
    };
  } catch (_error) {
    return {
      assetsByFamily: {},
    };
  }
}

async function refreshJobsIndex(selectedName = null) {
  try {
    const response = await fetch('/api/job-builder/jobs');
    if (!response.ok) {
      throw new Error('Failed to refresh jobs index');
    }
    state.jobs = await response.json();
    renderJobsPanel(selectedName);
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function refreshBatchJobs() {
  setActionBusy('refreshBatches', true);
  try {
    const response = await fetch('/api/batch/list');
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load batch jobs.');
    }
    state.batchJobs = Array.isArray(payload.batches) ? payload.batches : [];
    renderBatchJobs();
  } catch (error) {
    showStatus(error.message || 'Failed to load batch jobs.', true);
  } finally {
    setActionBusy('refreshBatches', false);
  }
}

async function refreshAllBatchStatuses() {
  setActionBusy('batchAction', true);
  try {
    const response = await fetch('/api/batch/refresh-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Batch refresh failed.');
    }
    state.batchJobs = Array.isArray(payload.batches) ? payload.batches : [];
    renderBatchJobs();
    showStatus(payload.success ? 'Batch statuses refreshed.' : 'Batch statuses refreshed with errors.', !payload.success);
  } catch (error) {
    showStatus(error.message || 'Batch refresh failed.', true);
  } finally {
    setActionBusy('batchAction', false);
  }
}

async function refreshSingleBatchStatus(batchName) {
  if (!batchName) {
    return;
  }
  setActionBusy('batchAction', true);
  try {
    const response = await fetch(`/api/batch/status?batchName=${encodeURIComponent(batchName)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Batch status refresh failed.');
    }
    upsertBatchState(payload.batch);
    renderBatchJobs();
    showStatus(`Batch status refreshed: ${batchName}`);
  } catch (error) {
    showStatus(error.message || 'Batch status refresh failed.', true);
  } finally {
    setActionBusy('batchAction', false);
  }
}

async function cancelBatch(batchName) {
  if (!batchName) {
    return;
  }
  const approved = window.confirm(`Cancel batch "${batchName}"?`);
  if (!approved) {
    return;
  }

  setActionBusy('batchAction', true);
  try {
    const response = await fetch('/api/batch/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchName }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Batch cancel failed.');
    }
    upsertBatchState(payload.batch);
    renderBatchJobs();
    showStatus(`Batch cancel request sent: ${batchName}`);
  } catch (error) {
    showStatus(error.message || 'Batch cancel failed.', true);
  } finally {
    setActionBusy('batchAction', false);
  }
}

async function downloadBatch(batchName) {
  if (!batchName) {
    return;
  }
  setActionBusy('batchAction', true);
  try {
    const response = await fetch('/api/batch/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchName }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Batch download failed.');
    }
    upsertBatchState(payload.batch);
    renderBatchJobs();
    const saved = payload.download?.savedCount ?? 0;
    showStatus(`Batch downloaded: ${batchName} (${saved} image${saved === 1 ? '' : 's'})`);
  } catch (error) {
    showStatus(error.message || 'Batch download failed.', true);
  } finally {
    setActionBusy('batchAction', false);
  }
}

async function viewBatchOutputs(batchName) {
  if (!batchName) {
    return;
  }

  state.outputsReview = {
    open: true,
    batchName,
    safeBatchName: '',
    outputDir: '',
    mode: 'output',
    items: [],
    loading: true,
    error: '',
  };
  closeOutputImageModal();
  renderOutputsModal();

  try {
    const response = await fetch(`/api/batch/outputs?batchName=${encodeURIComponent(batchName)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load batch outputs.');
    }

    state.outputsReview.batchName = payload.batchName || batchName;
    state.outputsReview.safeBatchName = payload.safeBatchName || '';
    state.outputsReview.outputDir = payload.outputDir || '';
    state.outputsReview.items = Array.isArray(payload.items) ? payload.items : [];
    state.outputsReview.error = '';
    state.outputsReview.loading = false;
    renderOutputsModal();
  } catch (error) {
    state.outputsReview.loading = false;
    state.outputsReview.error = error.message || 'Failed to load batch outputs.';
    renderOutputsModal();
  }
}

function renderOutputsModal() {
  if (!elements.outputsModal) {
    return;
  }
  if (!state.outputsReview.open) {
    elements.outputsModal.hidden = true;
    elements.outputsModal.setAttribute('aria-hidden', 'true');
    elements.outputsModalTitle.textContent = 'Batch Outputs';
    elements.outputsModalMeta.textContent = '-';
    elements.outputsModalBody.innerHTML = '';
    renderOutputsModeToggle();
    return;
  }

  elements.outputsModal.hidden = false;
  elements.outputsModal.setAttribute('aria-hidden', 'false');
  elements.outputsModalTitle.textContent = 'Batch Outputs';
  const metaParts = [state.outputsReview.batchName || '-'];
  if (state.outputsReview.outputDir) {
    metaParts.push(state.outputsReview.outputDir);
  }
  elements.outputsModalMeta.textContent = metaParts.join(' | ');
  renderOutputsModeToggle();

  if (state.outputsReview.loading) {
    elements.outputsModalBody.innerHTML = '<div class="output-empty">Loading outputs...</div>';
    return;
  }

  if (state.outputsReview.error) {
    elements.outputsModalBody.innerHTML = `<div class="output-empty">${escapeHtml(state.outputsReview.error)}</div>`;
    return;
  }

  if (!Array.isArray(state.outputsReview.items) || state.outputsReview.items.length === 0) {
    elements.outputsModalBody.innerHTML = '<div class="output-empty">No outputs found for this batch yet.</div>';
    return;
  }

  const mode = state.outputsReview.mode === 'compare' ? 'compare' : 'output';

  if (mode === 'output') {
    const outputItems = state.outputsReview.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => Boolean(item?.output?.url));
    if (outputItems.length === 0) {
      elements.outputsModalBody.innerHTML = '<div class="output-empty">No outputs found for this batch yet.</div>';
      return;
    }

    elements.outputsModalBody.innerHTML = `
      <div class="output-grid">
        ${outputItems.map(({ item, index }) => `
          <article class="output-thumb-card">
            <button
              class="output-thumb-wrap output-thumb-single"
              type="button"
              data-output-action="preview-output"
              data-item-index="${index}"
            >
              <img
                src="${escapeAttribute(item.output.url)}"
                alt="${escapeAttribute(item.output.file || item.key || 'output image')}"
                loading="lazy"
              />
            </button>
            <p class="output-thumb-name" title="${escapeAttribute(item.output.file || item.key || '')}">
              ${escapeHtml(item.output.file || item.key || 'Unnamed output')}
            </p>
          </article>
        `).join('')}
      </div>
    `;
    return;
  }

  const renderThumb = (node, emptyText) => {
    if (!node || !node.url) {
      return `<div class="output-thumb-empty">${escapeHtml(emptyText)}</div>`;
    }
    const alt = node.file || emptyText;
    return `<img src="${escapeAttribute(node.url)}" alt="${escapeAttribute(alt)}" loading="lazy" />`;
  };

  elements.outputsModalBody.innerHTML = `
    <div class="output-grid">
      ${state.outputsReview.items.map((item, index) => `
        <article class="output-thumb-card">
          <button
            class="output-thumb-wrap output-thumb-pair"
            type="button"
            data-output-action="preview-compare"
            data-item-index="${index}"
          >
            <div class="output-thumb-pair-grid">
              <div class="output-thumb-slot">
                <span class="output-thumb-label">Input</span>
                ${renderThumb(item.input, 'No input found')}
              </div>
              <div class="output-thumb-slot">
                <span class="output-thumb-label">Output</span>
                ${renderThumb(item.output, 'No output')}
              </div>
            </div>
          </button>
          <p class="output-thumb-name" title="${escapeAttribute(item.key || '')}">
            ${escapeHtml(item.key || 'No key')}
          </p>
        </article>
      `).join('')}
    </div>
  `;
}

function closeOutputsModal() {
  if (!elements.outputsModal) {
    return;
  }
  state.outputsReview = {
    open: false,
    batchName: '',
    safeBatchName: '',
    outputDir: '',
    mode: 'output',
    items: [],
    loading: false,
    error: '',
  };
  closeOutputImageModal();
  renderOutputsModal();
}

function setOutputsReviewMode(mode) {
  if (!elements.outputsModal) {
    return;
  }
  if (!state.outputsReview.open) {
    return;
  }
  const nextMode = mode === 'compare' ? 'compare' : 'output';
  if (state.outputsReview.mode === nextMode) {
    return;
  }
  state.outputsReview.mode = nextMode;
  renderOutputsModal();
}

function renderOutputsModeToggle() {
  if (!elements.outputsModeOutputOnlyButton || !elements.outputsModeCompareButton) {
    return;
  }
  const activeMode = state.outputsReview.mode === 'compare' ? 'compare' : 'output';
  const loading = Boolean(state.outputsReview.loading);
  const outputActive = activeMode === 'output';
  const compareActive = activeMode === 'compare';

  elements.outputsModeOutputOnlyButton.classList.toggle('is-active', outputActive);
  elements.outputsModeCompareButton.classList.toggle('is-active', compareActive);
  elements.outputsModeOutputOnlyButton.setAttribute('aria-pressed', outputActive ? 'true' : 'false');
  elements.outputsModeCompareButton.setAttribute('aria-pressed', compareActive ? 'true' : 'false');
  elements.outputsModeOutputOnlyButton.disabled = loading;
  elements.outputsModeCompareButton.disabled = loading;
}

function openOutputImageModal(item, previewMode = 'compare') {
  if (!elements.outputsImageModal) {
    return;
  }
  const mode = previewMode === 'output' ? 'output' : 'compare';
  const key = String(item?.key || '').trim() || '-';
  const input = item?.input && typeof item.input === 'object'
    ? { file: item.input.file || null, url: item.input.url || null }
    : null;
  const output = item?.output && typeof item.output === 'object'
    ? { file: item.output.file || null, url: item.output.url || null }
    : null;

  state.outputImagePreview = {
    open: true,
    mode,
    key,
    input,
    output,
  };
  elements.outputsImageModal.hidden = false;
  elements.outputsImageModal.setAttribute('aria-hidden', 'false');
  elements.outputsCompareGrid.classList.toggle('output-single-mode', mode === 'output');
  elements.outputsLargeInputPane.hidden = mode === 'output';
  elements.outputsLargeOutputPane.classList.toggle('output-compare-pane-full', mode === 'output');

  if (mode === 'output') {
    elements.outputsImageModalTitle.textContent = 'Output Preview';
    elements.outputsImageModalMeta.textContent = output?.file || key;
    elements.outputsLargeInputImage.hidden = true;
    elements.outputsLargeInputImage.src = '';
    elements.outputsLargeInputImage.alt = 'Batch input preview';
    elements.outputsLargeInputEmpty.hidden = true;
    elements.outputsLargeInputEmpty.textContent = 'No input found';
  } else {
    elements.outputsImageModalTitle.textContent = 'Input / Output Compare';
    elements.outputsImageModalMeta.textContent = key;
    if (input?.url) {
      elements.outputsLargeInputImage.hidden = false;
      elements.outputsLargeInputImage.src = input.url;
      elements.outputsLargeInputImage.alt = input.file || 'batch input image';
      elements.outputsLargeInputEmpty.hidden = true;
    } else {
      elements.outputsLargeInputImage.hidden = true;
      elements.outputsLargeInputImage.src = '';
      elements.outputsLargeInputImage.alt = 'Batch input preview';
      elements.outputsLargeInputEmpty.hidden = false;
      elements.outputsLargeInputEmpty.textContent = 'No input found';
    }
  }

  if (output?.url) {
    elements.outputsLargeOutputImage.hidden = false;
    elements.outputsLargeOutputImage.src = output.url;
    elements.outputsLargeOutputImage.alt = output.file || 'batch output image';
    elements.outputsLargeOutputEmpty.hidden = true;
  } else {
    elements.outputsLargeOutputImage.hidden = true;
    elements.outputsLargeOutputImage.src = '';
    elements.outputsLargeOutputImage.alt = 'Batch output preview';
    elements.outputsLargeOutputEmpty.hidden = false;
    elements.outputsLargeOutputEmpty.textContent = 'No output';
  }
}

function closeOutputImageModal() {
  if (!elements.outputsImageModal) {
    return;
  }
  state.outputImagePreview = {
    open: false,
    mode: 'output',
    key: '',
    input: null,
    output: null,
  };
  elements.outputsImageModal.hidden = true;
  elements.outputsImageModal.setAttribute('aria-hidden', 'true');
  elements.outputsImageModalMeta.textContent = '-';
  elements.outputsCompareGrid.classList.remove('output-single-mode');
  elements.outputsLargeInputPane.hidden = false;
  elements.outputsLargeOutputPane.classList.remove('output-compare-pane-full');
  elements.outputsLargeInputImage.hidden = true;
  elements.outputsLargeInputImage.src = '';
  elements.outputsLargeInputImage.alt = 'Batch input preview';
  elements.outputsLargeInputEmpty.hidden = true;
  elements.outputsLargeInputEmpty.textContent = 'No input found';
  elements.outputsLargeOutputImage.hidden = true;
  elements.outputsLargeOutputImage.src = '';
  elements.outputsLargeOutputImage.alt = 'Batch output preview';
  elements.outputsLargeOutputEmpty.hidden = true;
  elements.outputsLargeOutputEmpty.textContent = 'No output';
}

function populateSystemSignals() {
  if (!elements.runtimeBadge) {
    return;
  }
  elements.runtimeBadge.textContent = state.systemInfo?.runtimeRunner || 'edit.js';
  const registryMeta = state.registry?.meta || {};
  const registryVersion = registryMeta.version || 'v1';
  const frozenLabel = registryMeta.frozenBehaviorOptions ? 'Frozen' : 'Mutable';
  elements.registryBadge.textContent = `${registryVersion} (${frozenLabel})`;
  elements.assetStandardBadge.textContent = registryMeta.assetBankStandard?.version || 'unknown';
  elements.missingDirsBadge.textContent = String(state.registry?.assetBankHealth?.missingDirCount ?? '-');
}

function populateStaticOptions() {
  const registry = state.registry || createFallbackRegistry();
  const entities = registry.entities || {};

  populateSelect(elements.inputSource, getInputSourceOptions(state.job?.inputSource));
  renderInputSourceHint();
  populateSelect(elements.subjectMode, entities.subject?.modes || ['preserve', 'ignore']);
  populateSelect(elements.garmentMode, entities.garment?.modes || ['preserve', 'restyle', 'ignore']);
  populateLabeledSelect(elements.eyewearAction, ['ignore', 'add', 'replace', 'remove'], getAccessoryActionLabel);
  populateLabeledSelect(elements.bagAction, ['ignore', 'add', 'replace', 'remove'], getAccessoryActionLabel);
  populateLabeledSelect(elements.footwearMode, entities.footwear?.modes || ['preserve', 'replace', 'remove', 'ignore'], getFootwearActionLabel);
  populateLabeledSelect(elements.footwearSource, ['reference', 'system'], getSourceLabel);
  populateSelect(elements.footwearVariant, entities.footwear?.variants || ['sandal']);
  populateLabeledSelect(elements.headwearMode, entities.headwear?.modes || ['add', 'replace', 'remove', 'ignore'], getAccessoryActionLabel);
  populateLabeledSelect(elements.headwearSource, ['reference', 'system'], getSourceLabel);
  populateLabeledSelect(elements.headwearPlacement, getPlacementOptions('headwear'), getPlacementLabel);
  populateSelect(elements.headwearVariant, entities.headwear?.variants || ['bandana']);
  populateSelect(elements.accessoryMode, entities.accessory?.modes || ['apply', 'ignore']);
  populateSelect(elements.sceneMode, entities.scene?.modes || ['apply', 'preserve', 'ignore']);
  populateSelect(elements.sceneProfile, entities.scene?.profiles || ['studio_catalog']);
  populateSelect(elements.outputProfileMode, entities.output_profile?.modes || ['apply', 'ignore']);
  populateSelect(elements.outputProfileProfile, entities.output_profile?.profiles || ['catalog_4x5_2k']);
  populateSelect(elements.globalNegativeMode, entities.global_negative_rules?.modes || ['apply', 'ignore']);

  populateSelectWithEmptyState(elements.subjectReferenceId, entities.subject?.referenceIds || [], 'No subject refs found');
  populateLabeledSelect(elements.eyewearSource, ['reference', 'system'], getSourceLabel);
  populateLabeledSelect(elements.eyewearPlacement, getPlacementOptions('eyewear'), getPlacementLabel);
  populateLabeledSelect(elements.bagSource, ['reference', 'system'], getSourceLabel);
  populateLabeledSelect(elements.bagPlacement, getPlacementOptions('bag'), getPlacementLabel);
  elements.eyewearAssetId.innerHTML = renderAssetOptionList(getAccessoryAssets('eyewear'), '', 'No compatible references found');
  elements.bagAssetId.innerHTML = renderAssetOptionList(getAccessoryAssets('bag'), '', 'No compatible references found');
  elements.footwearAssetId.innerHTML = renderAssetOptionList(entities.footwear?.assetIds || [], '', 'No compatible references found');
  elements.headwearAssetId.innerHTML = renderAssetOptionList(entities.headwear?.assetIds || [], '', 'No compatible references found');
}

function hydrateForm() {
  const job = normalizeStylingUiJob(mergeDefaultJob(state.job));
  state.job = job;
  hydrateAccessoryDraftsFromJob(job);
  if (elements.workflowType) {
    elements.workflowType.value = state.workflowType || 'studio_cleanup';
  }
  renderWorkflowUi();

  elements.jobId.value = job.jobId || '';
  elements.displayName.value = job.displayName || '';
  elements.inputSource.value = selectOrFirst(job.inputSource, getInputSourceOptions(job.inputSource), 'batch_input');
  renderInputSourceHint();

  elements.subjectMode.value = selectOrFirst(job.entities.subject.mode, state.registry?.entities?.subject?.modes || ['preserve']);
  elements.subjectReferenceId.value = selectOrFirst(job.entities.subject.reference_id, getSubjectReferences(), '');

  elements.garmentMode.value = selectOrFirst(job.entities.garment.mode, state.registry?.entities?.garment?.modes || ['preserve']);
  elements.garmentMaterialRefs.value = stringifyList(job.entities.garment.detail_refs.material);
  elements.garmentPatternRefs.value = stringifyList(job.entities.garment.detail_refs.pattern);

  elements.footwearMode.value = selectOrFirst(job.entities.footwear.mode, state.registry?.entities?.footwear?.modes || ['preserve']);
  elements.footwearSource.value = job.entities.footwear.asset_id ? 'reference' : 'system';
  elements.footwearVariant.value = selectOrFirst(job.entities.footwear.variant, state.registry?.entities?.footwear?.variants || ['sandal']);
  elements.footwearAssetId.value = selectOrValueOrEmpty(job.entities.footwear.asset_id, getFootwearAssets());

  elements.headwearMode.value = selectOrFirst(job.entities.headwear.mode, state.registry?.entities?.headwear?.modes || ['add']);
  elements.headwearSource.value = job.entities.headwear.asset_id ? 'reference' : 'system';
  elements.headwearPlacement.value = selectOrFirst(elements.headwearPlacement?.value, getPlacementOptions('headwear'), 'auto');
  elements.headwearVariant.value = selectOrFirst(job.entities.headwear.variant, state.registry?.entities?.headwear?.variants || ['bandana']);
  elements.headwearAssetId.value = selectOrValueOrEmpty(job.entities.headwear.asset_id, getHeadwearAssets());

  const eyewearItem = getPrimaryAccessoryItem(job, 'eyewear');
  const bagItem = getPrimaryAccessoryItem(job, 'bag');
  elements.eyewearAction.value = selectOrFirst(eyewearItem.mode, ['ignore', 'add', 'replace', 'remove'], 'ignore');
  elements.eyewearSource.value = eyewearItem.asset_id ? 'reference' : 'system';
  elements.eyewearPlacement.value = selectOrFirst(elements.eyewearPlacement?.value, getPlacementOptions('eyewear'), 'auto');
  elements.eyewearAssetId.value = selectOrValueOrEmpty(eyewearItem.asset_id, getAccessoryAssets('eyewear'));
  elements.bagAction.value = selectOrFirst(bagItem.mode, ['ignore', 'add', 'replace', 'remove'], 'ignore');
  elements.bagSource.value = bagItem.asset_id ? 'reference' : 'system';
  elements.bagPlacement.value = selectOrFirst(elements.bagPlacement?.value, getPlacementOptions('bag'), 'auto');
  elements.bagAssetId.value = selectOrValueOrEmpty(bagItem.asset_id, getAccessoryAssets('bag'));

  elements.accessoryMode.value = selectOrFirst(job.entities.accessory.mode, state.registry?.entities?.accessory?.modes || ['apply']);

  elements.sceneMode.value = selectOrFirst(job.entities.scene.mode, state.registry?.entities?.scene?.modes || ['apply']);
  elements.sceneProfile.value = selectOrFirst(job.entities.scene.profile, state.registry?.entities?.scene?.profiles || ['studio_catalog']);

  elements.outputProfileMode.value = selectOrFirst(job.entities.output_profile.mode, state.registry?.entities?.output_profile?.modes || ['apply']);
  elements.outputProfileProfile.value = selectOrFirst(
    job.entities.output_profile.profile,
    state.registry?.entities?.output_profile?.profiles || ['catalog_4x5_2k']
  );

  elements.globalNegativeMode.value = selectOrFirst(
    job.entities.global_negative_rules.mode,
    state.registry?.entities?.global_negative_rules?.modes || ['apply']
  );
  elements.globalNegativeItems.value = stringifyList(job.entities.global_negative_rules.items);
  renderInputSourceSummary();
  renderOutputTypeUi();
  syncVisibleShellFromCanonical();
  renderVisibleModelShell();
  renderVisibleProductShell();
  renderReviewSummary();
  renderStylingUiState();
}

function syncStateFromForm() {
  const accessoryItems = state.job.entities.accessory.items || [];
  const footwearMode = elements.footwearMode.value;
  const footwearSource = elements.footwearSource?.value || 'reference';
  const headwearMode = elements.headwearMode.value;
  const headwearSource = elements.headwearSource?.value || 'reference';
  const primaryAccessoryItems = [
    buildPrimaryAccessoryItem('eyewear'),
    buildPrimaryAccessoryItem('bag'),
  ];
  const extraAccessoryItems = getAdditionalAccessoryItems(accessoryItems).map(({ item }) => item);
  const nextAccessoryItems = primaryAccessoryItems.concat(normalizeAccessoryItemsForUi(extraAccessoryItems));
  const nextAccessoryMode = nextAccessoryItems.some((item) => ['add', 'replace', 'remove'].includes(item?.mode))
    ? 'apply'
    : (elements.accessoryMode.value || state.job.entities.accessory.mode || 'apply');

  state.job = mergeDefaultJob({
    ...state.job,
    version: '2',
    jobId: elements.jobId.value.trim(),
    displayName: elements.displayName.value.trim(),
    inputSource: elements.inputSource.value.trim() || 'batch_input',
    entities: {
      ...state.job.entities,
      subject: {
        ...state.job.entities.subject,
        mode: elements.subjectMode.value,
        reference_id: elements.subjectReferenceId.value,
      },
      garment: {
        ...state.job.entities.garment,
        mode: elements.garmentMode.value,
        detail_refs: {
          material: parseList(elements.garmentMaterialRefs.value),
          pattern: parseList(elements.garmentPatternRefs.value),
        },
      },
      footwear: {
        ...state.job.entities.footwear,
        mode: footwearMode,
        variant: elements.footwearVariant.value,
        asset_id: footwearMode === 'replace' && footwearSource === 'reference' ? elements.footwearAssetId.value : '',
      },
      headwear: {
        ...state.job.entities.headwear,
        mode: headwearMode,
        variant: elements.headwearVariant.value,
        asset_id: (headwearMode === 'add' || headwearMode === 'replace') && headwearSource === 'reference'
          ? elements.headwearAssetId.value
          : '',
      },
      accessory: {
        ...state.job.entities.accessory,
        mode: nextAccessoryMode,
        items: nextAccessoryItems,
      },
      scene: {
        ...state.job.entities.scene,
        mode: elements.sceneMode.value,
        profile: elements.sceneProfile.value,
      },
      output_profile: {
        ...state.job.entities.output_profile,
        mode: elements.outputProfileMode.value,
        profile: elements.outputProfileProfile.value,
      },
      global_negative_rules: {
        ...state.job.entities.global_negative_rules,
        mode: elements.globalNegativeMode.value,
        items: parseList(elements.globalNegativeItems.value),
      },
    },
  });
  elements.accessoryMode.value = nextAccessoryMode;
  renderInputSourceSummary();
  renderOutputTypeUi();
  renderReviewSummary();
  renderStylingUiState();
}

function renderAccessoryItems() {
  const items = getAdditionalAccessoryItems(state.job.entities.accessory.items || []);
  if (items.length === 0) {
    elements.accessoryItems.innerHTML = '<div class="empty-state">No extra styling rows. Add one only when you need neckwear or another accessory beyond the main cards.</div>';
    return;
  }

  elements.accessoryItems.innerHTML = items.map(({ item, index }) => renderAccessoryItem(item, index)).join('');
}

function renderAccessoryItem(item, index) {
  const family = selectOrFirst(item.family, getAccessoryFamilies());
  const variants = getAccessoryVariants(family);
  const modes = getAccessoryItemModes();
  const assetOptions = getAccessoryAssets(family);
  const mode = selectOrFirst(item.mode, modes);
  const draft = getAccessoryItemDraft(item, index, family);
  const selectedVariant = selectOrFirst(draft.variant || item.variant, variants, variants[0] || family);
  const source = draft.source || inferSourceFromItem(item);
  const placementOptions = getPlacementOptions(family);
  const placement = selectOrFirst(draft.placement, placementOptions, 'auto');
  const usesPlacement = placementOptions.length > 1;
  const usesReference = accessoryModeUsesReference(mode) && source === 'reference';
  const assetValue = selectOrValueOrEmpty(draft.asset_id || item.asset_id, assetOptions);
  const supportsVariantControl = variants.length > 1;

  return `
    <section class="accessory-item styling-row-card">
      <div class="accessory-item-header">
        <div>
          <p class="accessory-item-title">${escapeHtml(getAccessoryFamilyLabel(family))}</p>
          <p class="accessory-item-subtitle">Use this extra row when the main styling cards are not enough.</p>
        </div>
        <button class="button" type="button" data-action="remove-accessory" data-index="${index}">Remove</button>
      </div>
      <div class="field-grid accessory-row-grid">
        <label class="field">
          <span>item</span>
          <select data-accessory-field="family" data-index="${index}">
            ${renderLabeledOptionList(getAccessoryFamilies(), family, getAccessoryFamilyLabel)}
          </select>
        </label>
        <label class="field field-primary">
          <span>action</span>
          <select data-accessory-field="mode" data-index="${index}">
            ${renderLabeledOptionList(modes, mode, getAccessoryActionLabel)}
          </select>
        </label>
      </div>
      <p class="styling-helper">${escapeHtml(getAccessoryActionHint(family, mode))}</p>
      <div class="styling-dependent-fields${accessoryModeUsesReference(mode) ? '' : ' is-hidden'}">
        <div class="field-grid styling-dependent-grid">
          <label class="field">
            <span>source</span>
            <select data-accessory-field="source" data-index="${index}">
              ${renderLabeledOptionList(['reference', 'system'], source, getSourceLabel)}
            </select>
            <p class="field-hint">Use reference for a specific asset. Let system choose keeps it automatic.</p>
          </label>
          ${usesPlacement ? `
            <label class="field">
              <span>placement preference</span>
              <select data-accessory-field="placement" data-index="${index}">
                ${renderLabeledOptionList(placementOptions, placement, getPlacementLabel)}
              </select>
              <p class="field-hint">UI planning only for now.</p>
            </label>
          ` : ''}
          ${supportsVariantControl ? `
            <label class="field">
              <span>style type</span>
              <select data-accessory-field="variant" data-index="${index}">
                ${renderOptionList(variants, selectedVariant)}
              </select>
            </label>
          ` : ''}
          <label class="field field-block${usesReference ? '' : ' is-hidden'}${usesReference ? '' : ' is-disabled'}">
            <span>reference asset</span>
            <select data-accessory-field="asset_id" data-index="${index}"${usesReference ? '' : ' disabled'}>
              ${renderAssetOptionList(assetOptions, assetValue, 'No compatible references found')}
            </select>
            <p class="field-hint">${usesReference && assetOptions.length === 0 ? 'No compatible references found.' : ''}</p>
          </label>
        </div>
      </div>
    </section>
  `;
}

function handleAccessoryInput(event) {
  const target = event.target;
  const field = target.dataset.accessoryField;
  const index = Number(target.dataset.index);
  if (!field || Number.isNaN(index)) {
    return;
  }

  const items = state.job.entities.accessory.items || [];
  const item = items[index];
  if (!item) {
    return;
  }

  if (field === 'family') {
    item.family = target.value;
    const variants = getAccessoryVariants(item.family);
    const assets = getAccessoryAssets(item.family);
    const placementOptions = getPlacementOptions(item.family);
    const draft = getAccessoryItemDraft(item, index, item.family);
    draft.family = item.family;
    draft.variant = selectOrFirst(draft.variant || item.variant, variants);
    draft.asset_id = selectOrValueOrEmpty(draft.asset_id || item.asset_id, assets);
    draft.source = draft.asset_id ? 'reference' : 'system';
    draft.placement = selectOrFirst(draft.placement, placementOptions, 'auto');
    item.variant = draft.variant;
    item.asset_id = accessoryModeUsesReference(item.mode) && draft.source === 'reference' ? draft.asset_id : '';
    renderAccessoryItems();
    renderStylingUiState();
    return;
  }

  if (field === 'variant' || field === 'asset_id' || field === 'source' || field === 'placement') {
    const draft = getAccessoryItemDraft(item, index, item.family);
    draft[field] = target.value;
    if (field === 'source') {
      item.asset_id = target.value === 'reference'
        ? selectOrValueOrEmpty(draft.asset_id || item.asset_id, getAccessoryAssets(item.family))
        : '';
      renderAccessoryItems();
      renderStylingUiState();
      return;
    }
    if (field === 'placement') {
      renderReviewSummary();
      return;
    }
    if (field === 'asset_id') {
      item.asset_id = accessoryModeUsesReference(item.mode) && (draft.source || 'reference') === 'reference'
        ? selectOrValueOrEmpty(target.value, getAccessoryAssets(item.family))
        : '';
    }
  }

  item[field] = target.value;
  if (field === 'mode') {
    const draft = getAccessoryItemDraft(item, index, item.family);
    item.variant = selectOrFirst(draft.variant || item.variant, getAccessoryVariants(item.family));
    item.asset_id = accessoryModeUsesReference(item.mode) && (draft.source || inferSourceFromItem(item)) === 'reference'
      ? selectOrValueOrEmpty(draft.asset_id || item.asset_id, getAccessoryAssets(item.family))
      : '';
    renderAccessoryItems();
    renderStylingUiState();
    return;
  }

  renderReviewSummary();
}

function handleAccessoryButtonClick(event) {
  const button = event.target.closest('[data-action="remove-accessory"]');
  if (!button) {
    return;
  }
  const index = Number(button.dataset.index);
  if (Number.isNaN(index)) {
    return;
  }

  state.job.entities.accessory.items.splice(index, 1);
  state.stylingDrafts.accessoryItems.splice(index, 1);
  renderAccessoryItems();
  renderStylingUiState();
}

async function compileCurrentJob() {
  setActionBusy('compile', true);
  try {
    const response = await fetch('/api/job-builder/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job: state.job }),
    });
    const payload = await response.json();
    if (!response.ok) {
      state.validation = payload.validation || { errors: [], warnings: [] };
      state.lastCompileSucceeded = false;
      throw new Error(payload.error || 'Compile failed');
    }

    state.compiledPrompt = payload.prompt;
    state.compiledCanonicalJob = payload.canonicalJob;
    state.imageConfig = payload.imageConfig || null;
    state.validation = payload.validation || { errors: [], warnings: [] };
    state.compileError = '';
    state.lastCompileSucceeded = true;
    showStatus('Compile successful.');
  } catch (error) {
    state.compiledPrompt = '';
    state.compiledCanonicalJob = null;
    state.imageConfig = null;
    state.compileError = error.message || 'Compile failed';
    state.lastCompileSucceeded = false;
    showStatus(state.compileError, true);
  } finally {
    renderPreviews();
    setActionBusy('compile', false);
  }
}

async function saveCurrentJob() {
  setActionBusy('save', true);
  try {
    const response = await fetch('/api/job-builder/jobs/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job: state.job,
        fileName: `${state.job.jobId || state.job.displayName || 'generated-job'}`,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Save failed');
    }

    const savedName = payload.saved?.name || null;
    await refreshJobsIndex(savedName);
      showStatus(`Draft saved: ${payload.saved?.name || 'generated draft'}`);
  } catch (error) {
    showStatus(error.message || 'Save failed', true);
  } finally {
    setActionBusy('save', false);
  }
}

async function loadSelectedSavedJob() {
  const selected = elements.savedJobSelect.value;
  if (!selected) {
    showStatus('No saved job selected.', true);
    return;
  }

  setActionBusy('loadSaved', true);
  try {
    const response = await fetch(`/api/job-builder/jobs/${encodeURIComponent(selected)}?source=generated`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load saved job');
    }

    state.job = mergeDefaultJob(payload.job || createFallbackJob());
    syncWorkflowTypeWithJob();
    clearDerivedStates();
    renderJobsPanel(selected);
    state.ui.initialized = false;
    hydrateForm();
    renderAccessoryItems();
    renderStylingUiState();
    renderAllSidePanels();
    showStatus(`Loaded draft: ${selected}`);
  } catch (error) {
    showStatus(error.message || 'Failed to load saved job', true);
  } finally {
    setActionBusy('loadSaved', false);
  }
}

async function runDryBatchCheck() {
  setActionBusy('dryCheck', true);
  try {
    const response = await fetch('/api/job-builder/dry-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job: state.job }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Dry batch check failed');
    }
    state.readiness = payload;
    renderReadiness();
    showStatus(payload.ready ? 'Dry batch check: ready.' : 'Dry batch check: not ready.', !payload.ready);
  } catch (error) {
    state.readiness = {
      ready: false,
      errors: [error.message || 'Dry batch check failed'],
      warnings: [],
    };
    renderReadiness();
    showStatus(error.message || 'Dry batch check failed', true);
  } finally {
    setActionBusy('dryCheck', false);
  }
}

async function runBatch() {
  setActionBusy('runBatch', true);
  state.runStatus = {
    status: 'running',
    batchJobName: null,
    batchState: null,
    durationMs: null,
    command: 'node edit.js <generated-job>',
    logs: 'Batch run in progress...',
  };
  renderRunStatus();

  try {
    const response = await fetch('/api/job-builder/run-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job: state.job,
        fileName: `${state.job.jobId || state.job.displayName || 'generated-job'}`,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      if (payload.readiness) {
        state.readiness = payload.readiness;
        renderReadiness();
      }
      throw new Error(payload.error || 'Run batch failed');
    }

    state.readiness = payload.readiness || state.readiness;
    await refreshJobsIndex(pathFromResponse(payload));
    if (Array.isArray(payload.batches)) {
      state.batchJobs = payload.batches;
    } else if (payload.batchRecord) {
      upsertBatchState(payload.batchRecord);
    }
    renderReadiness();
    renderBatchJobs();
    state.runStatus = {
      status: payload.success ? 'success' : 'error',
      batchJobName: payload.jobName || null,
      batchState: payload.state || null,
      durationMs: payload.durationMs || null,
      command: payload.command || '-',
      logs: payload.logs || 'No logs.',
    };
    renderRunStatus();
    const completionMessage = payload.success
      ? `Batch run completed. Open /batch-jobs to monitor status, download outputs, and review results.`
      : 'Batch run failed.';
    showStatus(completionMessage, !payload.success);
  } catch (error) {
    state.runStatus = {
      status: 'error',
      batchJobName: null,
      batchState: null,
      durationMs: null,
      command: state.runStatus.command,
      logs: error.message || 'Run batch failed',
    };
    renderRunStatus();
    showStatus(error.message || 'Run batch failed', true);
  } finally {
    setActionBusy('runBatch', false);
  }
}

function renderPreviews() {
  if (elements.promptPreview) {
    elements.promptPreview.textContent = state.compileError
      ? `Compile failed:\n${state.compileError}`
      : (state.compiledPrompt || 'Compile the current job to preview the generated prompt.');
  }

  if (elements.jsonPreview) {
    elements.jsonPreview.textContent = state.compiledCanonicalJob
      ? JSON.stringify(state.compiledCanonicalJob, null, 2)
      : 'Canonical JSON preview appears here.';
  }

  if (elements.imageAspectRatio) {
    elements.imageAspectRatio.textContent = state.imageConfig?.aspectRatio || '-';
  }
  if (elements.imageSize) {
    elements.imageSize.textContent = state.imageConfig?.imageSize || '-';
  }
  if (elements.compileStatus) {
    elements.compileStatus.textContent = state.lastCompileSucceeded ? 'Success' : (state.compileError ? 'Failed' : 'Idle');
  }
  if (elements.actionBarCompileStatus) {
    elements.actionBarCompileStatus.textContent = state.lastCompileSucceeded ? 'Success' : (state.compileError ? 'Failed' : 'Idle');
  }
  renderValidation();
  renderConnectedResultSystem();
}

function renderValidation() {
  if (!elements.validationWarnings || !elements.validationErrors || !elements.validationState || !elements.validationSummary) {
    return;
  }
  const warnings = state.validation?.warnings || [];
  const errors = state.validation?.errors || [];
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  elements.validationWarnings.innerHTML = hasWarnings
    ? warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>None</li>';
  elements.validationErrors.innerHTML = hasErrors
    ? errors.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>None</li>';

  if (hasErrors) {
    elements.validationState.textContent = 'Validation state: errors detected.';
    elements.validationState.className = 'validation-state error';
    elements.validationSummary.textContent = `${errors.length} error(s)`;
  } else if (hasWarnings) {
    elements.validationState.textContent = 'Validation state: warnings detected.';
    elements.validationState.className = 'validation-state warning';
    elements.validationSummary.textContent = `${warnings.length} warning(s)`;
  } else {
    elements.validationState.textContent = state.lastCompileSucceeded
      ? 'Validation state: OK.'
      : (state.compileError ? 'Validation state: compile failed before validation summary.' : 'Validation state: no compile run yet.');
    elements.validationState.className = state.compileError ? 'validation-state error' : 'validation-state ok';
    elements.validationSummary.textContent = state.compileError ? 'Failed' : 'OK';
  }
}

function renderReadiness() {
  if (!elements.readinessBadge || !elements.readinessInputExists || !elements.readinessInputCount || !elements.readinessRefsCount
    || !elements.readinessState || !elements.readinessWarnings || !elements.readinessErrors) {
    return;
  }
  const readiness = state.readiness;
  if (!readiness) {
    elements.readinessBadge.textContent = 'Unknown';
    if (elements.actionBarReadinessStatus) {
      elements.actionBarReadinessStatus.textContent = 'Unknown';
    }
    elements.readinessInputExists.textContent = '-';
    elements.readinessInputCount.textContent = '-';
    elements.readinessRefsCount.textContent = '-';
    elements.readinessState.textContent = 'No dry check run yet.';
    elements.readinessState.className = 'validation-state';
    elements.readinessWarnings.innerHTML = '<li>None</li>';
    elements.readinessErrors.innerHTML = '<li>None</li>';
    renderConnectedResultSystem();
    return;
  }

  const errors = readiness.errors || [];
  const warnings = readiness.warnings || [];
  const refs = readiness.resolvedRefSummary || {};
  const refsCount = (refs.subject || 0)
    + (refs.garmentMaterial || 0)
    + (refs.garmentPattern || 0)
    + (refs.footwear || 0)
    + (refs.headwear || 0)
    + (refs.accessoryFiles || 0);

  elements.readinessBadge.textContent = readiness.ready ? 'READY' : 'NOT READY';
  if (elements.actionBarReadinessStatus) {
    elements.actionBarReadinessStatus.textContent = readiness.ready ? 'Ready' : 'Not Ready';
  }
  elements.readinessInputExists.textContent = readiness.inputSource?.exists ? 'Yes' : 'No';
  elements.readinessInputCount.textContent = String(readiness.inputSource?.fileCount ?? 0);
  elements.readinessRefsCount.textContent = String(refsCount);
  elements.readinessWarnings.innerHTML = warnings.length
    ? warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>None</li>';
  elements.readinessErrors.innerHTML = errors.length
    ? errors.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>None</li>';

  if (readiness.ready) {
    elements.readinessState.textContent = 'Dry check passed. Job is ready for batch run.';
    elements.readinessState.className = 'validation-state ok';
  } else if (errors.length > 0) {
    elements.readinessState.textContent = 'Dry check failed with blocking errors.';
    elements.readinessState.className = 'validation-state error';
  } else {
    elements.readinessState.textContent = 'Dry check has warnings.';
    elements.readinessState.className = 'validation-state warning';
  }
  renderConnectedResultSystem();
}

function renderRunStatus() {
  if (elements.runStatusBadge) {
    elements.runStatusBadge.textContent = state.runStatus.status || 'idle';
  }
  if (elements.actionBarBatchStatus) {
    elements.actionBarBatchStatus.textContent = state.runStatus.status || 'idle';
  }
  if (elements.runBatchJobName) {
    elements.runBatchJobName.textContent = state.runStatus.batchJobName || '-';
  }
  if (elements.runBatchState) {
    elements.runBatchState.textContent = state.runStatus.batchState || '-';
  }
  if (elements.runDuration) {
    elements.runDuration.textContent = state.runStatus.durationMs != null ? String(state.runStatus.durationMs) : '-';
  }
  if (elements.runCommand) {
    elements.runCommand.textContent = state.runStatus.command || '-';
  }
  if (elements.runLogs) {
    elements.runLogs.textContent = state.runStatus.logs || 'No run yet.';
  }
}

function getCancellableBatch() {
  const items = Array.isArray(state.batchJobs) ? state.batchJobs : [];
  return items.find((batch) => {
    const status = normalizeUiBatchState(batch.status || batch.lastKnownState);
    return !batch?.cancelled && (status === 'PENDING' || status === 'RUNNING');
  }) || null;
}

function renderExecutionActions() {
  const activeBatch = getCancellableBatch();
  const batchBusy = state.busy.refreshBatches || state.busy.batchAction;
  const hasActiveBatch = Boolean(activeBatch?.batchName);

  if (elements.cancelActiveBatchButton) {
    elements.cancelActiveBatchButton.disabled = batchBusy || !hasActiveBatch;
    elements.cancelActiveBatchButton.hidden = false;
  }
  if (elements.executionActionHint) {
    elements.executionActionHint.textContent = hasActiveBatch
      ? `Active batch: ${activeBatch.batchName}`
      : 'No active pending or running batch to cancel.';
  }
}

function syncWorkflowTypeWithJob() {
  state.workflowType = deriveWorkflowType(state.job);
  if (elements.workflowType) {
    elements.workflowType.value = state.workflowType;
  }
}

function deriveWorkflowType(job) {
  const nextJob = mergeDefaultJob(job);
  const footwearMode = nextJob.entities?.footwear?.mode || 'ignore';
  const headwearMode = nextJob.entities?.headwear?.mode || 'ignore';
  const accessoryItems = Array.isArray(nextJob.entities?.accessory?.items) ? nextJob.entities.accessory.items : [];
  const hasStyling = footwearMode === 'replace'
    || footwearMode === 'remove'
    || headwearMode === 'add'
    || headwearMode === 'replace'
    || headwearMode === 'remove'
    || accessoryItems.some((item) => ['add', 'replace', 'remove'].includes(item?.mode));

  return hasStyling ? 'styling' : 'studio_cleanup';
}

function renderWorkflowUi() {
  const workflow = state.workflowType || 'studio_cleanup';
  const descriptions = {
    studio_cleanup: 'Clean and convert the selected inputs into a studio-ready catalog result.',
    face_identity: 'Focus on model/person identity controls and related reference handling.',
    styling: 'Focus on worn items and visible styling changes without exposing unrelated controls.',
    advanced: 'Use the full authoring surface, including advanced overrides and internal tooling.',
  };
  const visibleSummaries = {
    studio_cleanup: 'Visible now: core setup, model/person basics, garment basics, output type, readiness, and execution.',
    face_identity: 'Visible now: core setup, model/person identity controls, output type, readiness, and execution.',
    styling: 'Visible now: core setup, styling / worn items, output type, readiness, and execution.',
    advanced: 'Visible now: the full authoring surface, advanced garment controls, developer tools, readiness, and execution.',
  };
  const configurationHints = {
    studio_cleanup: 'Adjust only the essentials for cleanup: model/person basics and product / garment basics.',
    face_identity: 'Keep configuration focused on model/person behavior and identity reference handling.',
    styling: 'Focus configuration on footwear, headwear, and accessory changes.',
    advanced: 'All configuration sections are available, including advanced garment and internal controls.',
  };

  if (elements.workflowDescription) {
    elements.workflowDescription.textContent = descriptions[workflow] || descriptions.studio_cleanup;
  }
  if (elements.workflowVisibleSummary) {
    elements.workflowVisibleSummary.textContent = visibleSummaries[workflow] || visibleSummaries.studio_cleanup;
  }
  if (elements.configurationStepHint) {
    elements.configurationStepHint.textContent = configurationHints[workflow] || configurationHints.studio_cleanup;
  }
  if (elements.workflowType) {
    elements.workflowType.value = workflow;
  }
  document.body.dataset.workflowMode = workflow;

  for (const button of elements.workflowOptionButtons || []) {
    const isActive = button.dataset.workflowOption === workflow;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }

  for (const section of elements.workflowSections || []) {
    const visibleSet = String(section.dataset.workflowVisible || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const isVisible = visibleSet.length === 0 || visibleSet.includes(workflow);
    section.hidden = !isVisible;
  }
}

function renderStylingUiState() {
  const footwearMode = elements.footwearMode?.value || 'ignore';
  const footwearSource = elements.footwearSource?.value || 'reference';
  const footwearIsActive = footwearMode === 'replace';
  const footwearUsesReference = footwearIsActive && footwearSource === 'reference';
  elements.footwearSource.disabled = !footwearIsActive;
  elements.footwearVariant.disabled = !footwearIsActive;
  elements.footwearAssetId.disabled = !footwearUsesReference;
  elements.footwearDependentFields?.classList.toggle('is-hidden', !footwearIsActive);
  elements.footwearSourceField?.classList.toggle('is-disabled', !footwearIsActive);
  elements.footwearVariantField.classList.toggle('is-disabled', !footwearIsActive);
  elements.footwearAssetField.classList.toggle('is-disabled', !footwearUsesReference);
  elements.footwearAssetField.classList.toggle('is-hidden', !footwearUsesReference);
  elements.footwearCard?.classList.toggle('is-passive', footwearMode === 'ignore');
  elements.footwearModeHint.textContent = getFootwearModeHint(footwearMode);
  if (elements.footwearAssetHint) {
    elements.footwearAssetHint.textContent = footwearUsesReference && getFootwearAssets().length === 0
      ? 'No compatible references found.'
      : '';
  }

  const headwearMode = elements.headwearMode?.value || 'ignore';
  const headwearSource = elements.headwearSource?.value || 'reference';
  const headwearIsActive = headwearMode === 'add' || headwearMode === 'replace';
  const headwearUsesReference = headwearIsActive && headwearSource === 'reference';
  elements.headwearSource.disabled = !headwearIsActive;
  elements.headwearPlacement.disabled = !headwearIsActive;
  elements.headwearVariant.disabled = !headwearIsActive;
  elements.headwearAssetId.disabled = !headwearUsesReference;
  elements.headwearDependentFields?.classList.toggle('is-hidden', !headwearIsActive);
  elements.headwearSourceField?.classList.toggle('is-disabled', !headwearIsActive);
  elements.headwearPlacementField?.classList.toggle('is-disabled', !headwearIsActive);
  elements.headwearVariantField.classList.toggle('is-disabled', !headwearIsActive);
  elements.headwearAssetField.classList.toggle('is-disabled', !headwearUsesReference);
  elements.headwearAssetField.classList.toggle('is-hidden', !headwearUsesReference);
  elements.headwearCard?.classList.toggle('is-passive', headwearMode === 'ignore');
  elements.headwearModeHint.textContent = getHeadwearModeHint(headwearMode);
  if (elements.headwearAssetHint) {
    elements.headwearAssetHint.textContent = headwearUsesReference && getHeadwearAssets().length === 0
      ? 'No compatible references found.'
      : '';
  }

  renderPrimaryAccessoryUi('eyewear');
  renderPrimaryAccessoryUi('bag');

  const accessoryMode = elements.accessoryMode?.value || 'apply';
  const extraRows = getAdditionalAccessoryItems(state.job.entities.accessory.items || []);
  elements.accessoryCard?.classList.toggle('is-passive', accessoryMode === 'ignore' && extraRows.length === 0);
  elements.addAccessoryButton.disabled = false;
  elements.addAccessoryButton.hidden = false;
  elements.accessoryItemsContainer?.classList.toggle('is-hidden', false);
  renderStylingAccordion();
  renderReviewSummary();
}

function renderBatchJobs() {
  if (!elements.batchJobsList || !elements.batchJobsEmpty) {
    renderExecutionActions();
    return;
  }
  const all = Array.isArray(state.batchJobs) ? state.batchJobs.slice() : [];
  const filtered = all.filter((item) => batchMatchesFilter(item, state.batchFilter));

  if (filtered.length === 0) {
    elements.batchJobsEmpty.hidden = false;
    elements.batchJobsList.innerHTML = '';
    renderExecutionActions();
    return;
  }

  elements.batchJobsEmpty.hidden = true;
  const isBusy = state.busy.batchAction || state.busy.refreshBatches;
  elements.batchJobsList.innerHTML = filtered
    .map((batch) => {
      const status = normalizeUiBatchState(batch.status || batch.lastKnownState);
      const statusClass = status.toLowerCase();
      const batchName = batch.batchName || '-';
      const source = [batch.sourceJobId || '-', batch.sourceJobFile || '-'].join(' / ');
      const lastChecked = batch.lastCheckedAt || '-';
      const createdAt = batch.createdAt || '-';
      const downloadNeeded = Boolean(batch.downloadNeeded || (status === 'SUCCEEDED' && !batch.downloaded));
      const cancelled = Boolean(batch.cancelled);
      const canDownload = !isBusy && status === 'SUCCEEDED';
      const canViewOutputs = !isBusy && status === 'SUCCEEDED';
      const refreshDisabled = isBusy ? ' disabled' : '';
      const downloadDisabled = canDownload ? '' : ' disabled';
      const outputsDisabled = canViewOutputs ? '' : ' disabled';
      const indicatorClass = downloadNeeded ? 'warn' : 'ok';
      const indicatorText = downloadNeeded ? '[DL] Download needed' : (batch.downloaded ? '[OK] Downloaded' : '[--] Not downloaded');
      const errorText = batch.lastError ? `<p class="batch-job-meta">Error: ${escapeHtml(batch.lastError)}</p>` : '';

      return `
        <article class="batch-job-card">
          <div class="batch-job-header">
            <p class="batch-job-name" title="${escapeAttribute(batchName)}">${escapeHtml(batchName)}</p>
            <span class="status-badge ${statusClass}">${escapeHtml(status)}</span>
          </div>
          <p class="batch-job-meta">Source: ${escapeHtml(source)}</p>
          <p class="batch-job-meta">Created: ${escapeHtml(createdAt)}</p>
          <p class="batch-job-meta">Last checked: ${escapeHtml(lastChecked)}</p>
          <div class="batch-indicators">
            <span class="indicator-pill ${indicatorClass}">${escapeHtml(indicatorText)}</span>
            <span class="indicator-pill">${cancelled ? 'Cancelled flag: yes' : 'Cancelled flag: no'}</span>
          </div>
          ${errorText}
          <div class="batch-actions">
            <button class="button button-small button-secondary" data-batch-action="refresh" data-batch-name="${escapeAttribute(batchName)}"${refreshDisabled}>Refresh Status</button>
            <button class="button button-small" data-batch-action="download" data-batch-name="${escapeAttribute(batchName)}"${downloadDisabled}>Download</button>
            <button class="button button-small button-secondary" data-batch-action="view-outputs" data-batch-name="${escapeAttribute(batchName)}"${outputsDisabled}>View Outputs</button>
          </div>
        </article>
      `;
    })
    .join('');
  renderExecutionActions();
}

function normalizeUiBatchState(value) {
  const text = String(value || '').toUpperCase();
  if (text.includes('SUCCEEDED')) return 'SUCCEEDED';
  if (text.includes('FAILED')) return 'FAILED';
  if (text.includes('CANCELLED') || text.includes('CANCELED')) return 'CANCELLED';
  if (text.includes('RUNNING') || text.includes('PROCESSING')) return 'RUNNING';
  if (text.includes('PENDING') || text.includes('QUEUED')) return 'PENDING';
  return 'UNKNOWN';
}

function batchMatchesFilter(batch, filterValue) {
  const status = normalizeUiBatchState(batch.status || batch.lastKnownState);
  if (filterValue === 'active') {
    return status === 'PENDING' || status === 'RUNNING';
  }
  if (filterValue === 'completed') {
    return status === 'SUCCEEDED';
  }
  if (filterValue === 'failed') {
    return status === 'FAILED';
  }
  if (filterValue === 'cancelled') {
    return status === 'CANCELLED';
  }
  return true;
}

function renderJobsPanel(selectedName = null) {
  if (!elements.generatedJobsList || !elements.sampleJobsList || !elements.savedJobSelect) {
    return;
  }
  const generated = state.jobs?.generated || [];
  const sample = state.jobs?.sample || [];

  elements.generatedJobsList.innerHTML = generated.length
    ? generated.map((item) => `<li>${escapeHtml(item.name)}</li>`).join('')
    : '<li>None</li>';
  elements.sampleJobsList.innerHTML = sample.length
    ? sample.map((item) => `<li>${escapeHtml(item.name)}</li>`).join('')
    : '<li>None</li>';

  if (generated.length === 0) {
    elements.savedJobSelect.innerHTML = '<option value="">No saved jobs</option>';
    elements.savedJobSelect.disabled = true;
    return;
  }

  elements.savedJobSelect.disabled = false;
  const selected = selectedName && generated.some((item) => item.name === selectedName)
    ? selectedName
    : generated[0].name;
  elements.savedJobSelect.innerHTML = generated
    .map((item) => {
      const isSelected = item.name === selected ? ' selected' : '';
      return `<option value="${escapeAttribute(item.name)}"${isSelected}>${escapeHtml(item.name)}</option>`;
    })
    .join('');
}

function renderAllSidePanels() {
  renderWorkflowUi();
  renderInputSourceSummary();
  renderOutputTypeUi();
  renderVisibleModelShell();
  renderVisibleProductShell();
  renderReviewSummary();
  renderStylingUiState();
  renderPreviews();
  renderReadiness();
  renderExecutionActions();
  renderRunStatus();
  renderBatchJobs();
}

function handleBatchListClick(event) {
  const button = event.target.closest('[data-batch-action]');
  if (!button) {
    return;
  }

  const action = button.dataset.batchAction;
  const batchName = button.dataset.batchName;
  if (!action || !batchName) {
    return;
  }

  if (action === 'refresh') {
    refreshSingleBatchStatus(batchName);
    return;
  }
  if (action === 'download') {
    downloadBatch(batchName);
    return;
  }
  if (action === 'view-outputs') {
    viewBatchOutputs(batchName);
  }
}

function upsertBatchState(batch) {
  if (!batch || !batch.batchName) {
    return;
  }
  const items = Array.isArray(state.batchJobs) ? state.batchJobs.slice() : [];
  const index = items.findIndex((item) => item.batchName === batch.batchName);
  if (index >= 0) {
    items[index] = {
      ...items[index],
      ...batch,
    };
  } else {
    items.push(batch);
  }
  state.batchJobs = items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function showStatus(message, isError = false) {
  elements.statusBanner.hidden = false;
  elements.statusBanner.textContent = message;
  elements.statusBanner.classList.toggle('error', Boolean(isError));
}

function setActionBusy(action, isBusy) {
  state.busy[action] = isBusy;

  elements.compileButton.disabled = state.busy.compile;
  elements.compileButton.textContent = state.busy.compile ? 'Compiling...' : 'Compile Prompt';

  elements.saveJobButton.disabled = state.busy.save;
  elements.saveJobButton.textContent = state.busy.save ? 'Saving Draft...' : 'Save Draft';

  elements.loadSavedJobButton.disabled = state.busy.loadSaved;
  elements.loadSavedJobButton.textContent = state.busy.loadSaved ? 'Loading Draft...' : 'Load Draft';
  elements.savedJobSelect.disabled = state.busy.loadSaved || !((state.jobs?.generated || []).length);

  elements.runDryCheckButton.disabled = state.busy.dryCheck;
  elements.runDryCheckButton.textContent = state.busy.dryCheck ? 'Checking...' : 'Run Dry Check';

  elements.runBatchButton.disabled = state.busy.runBatch;
  elements.runBatchButton.textContent = state.busy.runBatch ? 'Running...' : 'Run Batch';
  if (elements.runSpinner) {
    elements.runSpinner.hidden = !state.busy.runBatch;
  }

  const batchBusy = state.busy.refreshBatches || state.busy.batchAction;
  if (elements.refreshAllBatchesButton) {
    elements.refreshAllBatchesButton.disabled = batchBusy;
    elements.refreshAllBatchesButton.textContent = state.busy.batchAction ? 'Refreshing...' : 'Refresh All';
  }
  if (elements.batchFilterSelect) {
    elements.batchFilterSelect.disabled = batchBusy;
  }
  renderBatchJobs();
  renderExecutionActions();
}

function applyPendingBindings() {
  const results = [];
  const inputBinding = applyPendingInputSetBinding();
  if (inputBinding) {
    results.push(inputBinding);
  }
  const assetBinding = applyPendingAssetBinding();
  if (assetBinding) {
    results.push(assetBinding);
  }
  return results;
}

function applyPendingInputSetBinding() {
  const payload = consumeInputSetBindingPayload();
  if (!payload) {
    return null;
  }

  syncStateFromForm();
  const result = injectInputSetBinding(payload);
  if (!result || result.isError) {
    return result || {
      isError: true,
      message: 'Failed to apply pending input set binding.',
    };
  }

  if (result.changed) {
    syncWorkflowTypeWithJob();
    clearDerivedStates();
    state.ui.initialized = false;
    hydrateForm();
    renderAccessoryItems();
    renderAllSidePanels();
  }

  return result;
}

function applyPendingAssetBinding() {
  const payload = consumeAssetBindingPayload();
  if (!payload) {
    return null;
  }

  syncStateFromForm();
  const result = injectAssetBinding(payload);
  if (!result || result.isError) {
    return result || {
      isError: true,
      message: 'Failed to apply pending asset binding.',
    };
  }

  if (result.changed) {
    syncWorkflowTypeWithJob();
    clearDerivedStates();
    state.ui.initialized = false;
    hydrateForm();
    renderAccessoryItems();
    renderAllSidePanels();
  }

  return result;
}

function consumeInputSetBindingPayload() {
  let raw = null;
  try {
    raw = localStorage.getItem(INPUT_SET_BINDING_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    localStorage.removeItem(INPUT_SET_BINDING_STORAGE_KEY);
  } catch (_error) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.type !== 'input_set_binding') {
      return null;
    }
    return {
      inputSetId: String(parsed.inputSetId || '').trim(),
      inputSource: String(parsed.inputSource || '').trim(),
    };
  } catch (_error) {
    return null;
  }
}

function injectInputSetBinding(binding) {
  const inputSetId = String(binding.inputSetId || '').trim();
  const inputSource = String(binding.inputSource || '').trim();
  if (!inputSetId || !inputSource) {
    return {
      changed: false,
      isError: true,
      message: 'Input set binding payload is invalid.',
    };
  }

  const managed = state.managedInputSets || [];
  const setItem = managed.find((item) => item.inputSetId === inputSetId || item.path === inputSource);
  if (!setItem) {
    return {
      changed: false,
      isError: true,
      message: `Input set not found for binding: ${inputSetId}`,
    };
  }

  const nextInputSource = setItem.path || inputSource;
  const changed = state.job.inputSource !== nextInputSource;
  if (changed) {
    const job = mergeDefaultJob(state.job);
    job.inputSource = nextInputSource;
    state.job = job;
  }

  return {
    changed,
    isError: false,
    message: changed
      ? `${setItem.inputSetId} applied to inputSource.`
      : `${setItem.inputSetId} is already selected as inputSource.`,
  };
}

function consumeAssetBindingPayload() {
  let raw = null;
  try {
    raw = localStorage.getItem(ASSET_BINDING_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    localStorage.removeItem(ASSET_BINDING_STORAGE_KEY);
  } catch (_error) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.type !== 'asset_binding') {
      return null;
    }
    return {
      family: String(parsed.family || '').trim(),
      variant: String(parsed.variant || '').trim(),
      asset_id: String(parsed.asset_id || '').trim(),
    };
  } catch (_error) {
    return null;
  }
}

function injectAssetBinding(binding) {
  const family = binding.family;
  const variant = binding.variant;
  const assetId = binding.asset_id;

  if (!family || !assetId) {
    return {
      changed: false,
      isError: true,
      message: 'Asset binding payload is invalid.',
    };
  }

  const job = mergeDefaultJob(state.job);
  let changed = false;

  if (family === 'footwear') {
    const entity = job.entities.footwear;
    if (!entity.mode || entity.mode === 'ignore') {
      entity.mode = 'replace';
      changed = true;
    }
    if (entity.asset_id !== assetId) {
      entity.asset_id = assetId;
      changed = true;
    }
    const supportedVariants = state.registry?.entities?.footwear?.variants || [];
    if (variant && supportedVariants.includes(variant) && entity.variant !== variant) {
      entity.variant = variant;
      changed = true;
    }
    state.job = job;
    return {
      changed,
      isError: false,
      message: changed
        ? `${assetId} applied to Footwear.`
        : `${assetId} is already applied to Footwear.`,
    };
  }

  if (family === 'headwear') {
    const entity = job.entities.headwear;
    if (!entity.mode || entity.mode === 'ignore') {
      entity.mode = 'add';
      changed = true;
    }
    if (entity.asset_id !== assetId) {
      entity.asset_id = assetId;
      changed = true;
    }
    const supportedVariants = state.registry?.entities?.headwear?.variants || [];
    if (variant && supportedVariants.includes(variant) && entity.variant !== variant) {
      entity.variant = variant;
      changed = true;
    }
    state.job = job;
    return {
      changed,
      isError: false,
      message: changed
        ? `${assetId} applied to Headwear.`
        : `${assetId} is already applied to Headwear.`,
    };
  }

  if (family === 'eyewear' || family === 'bag' || family === 'neckwear') {
    const accessory = job.entities.accessory;
    if (accessory.mode !== 'apply') {
      accessory.mode = 'apply';
      changed = true;
    }

    const items = Array.isArray(accessory.items) ? accessory.items : [];
    const identical = items.find((item) => item?.family === family && item?.asset_id === assetId);
    if (identical) {
      state.job = job;
      return {
        changed,
        isError: false,
        message: `${assetId} is already applied to Accessory > ${family}.`,
      };
    }

    const sameFamilyIndex = items.findIndex((item) => item?.family === family);
    const supportedVariants = state.registry?.entities?.accessory?.variantsByFamily?.[family] || [];
    const resolvedVariant = (variant && supportedVariants.includes(variant))
      ? variant
      : (supportedVariants[0] || variant || (sameFamilyIndex >= 0 ? items[sameFamilyIndex].variant : ''));

    if (sameFamilyIndex >= 0) {
      const current = items[sameFamilyIndex];
      if (current.asset_id !== assetId) {
        current.asset_id = assetId;
        changed = true;
      }
      if (resolvedVariant && current.variant !== resolvedVariant) {
        current.variant = resolvedVariant;
        changed = true;
      }
      if (!current.mode || current.mode === 'ignore') {
        current.mode = 'add';
        changed = true;
      }
    } else {
      items.push({
        family,
        variant: resolvedVariant || variant || family,
        mode: 'add',
        asset_id: assetId,
      });
      changed = true;
    }

    accessory.items = items;
    state.job = job;
    return {
      changed,
      isError: false,
      message: changed
        ? `${assetId} applied to Accessory > ${family}.`
        : `${assetId} is already applied to Accessory > ${family}.`,
    };
  }

  if (family === 'garment_material') {
    const materialRefs = Array.isArray(job.entities.garment?.detail_refs?.material)
      ? job.entities.garment.detail_refs.material
      : [];
    if (!materialRefs.includes(assetId)) {
      materialRefs.push(assetId);
      changed = true;
    }
    job.entities.garment.detail_refs.material = materialRefs;
    state.job = job;
    return {
      changed,
      isError: false,
      message: changed
        ? `${assetId} applied to Garment > Material details.`
        : `${assetId} is already in Garment > Material details.`,
    };
  }

  if (family === 'garment_pattern') {
    const patternRefs = Array.isArray(job.entities.garment?.detail_refs?.pattern)
      ? job.entities.garment.detail_refs.pattern
      : [];
    if (!patternRefs.includes(assetId)) {
      patternRefs.push(assetId);
      changed = true;
    }
    job.entities.garment.detail_refs.pattern = patternRefs;
    state.job = job;
    return {
      changed,
      isError: false,
      message: changed
        ? `${assetId} applied to Garment > Pattern details.`
        : `${assetId} is already in Garment > Pattern details.`,
    };
  }

  return {
    changed: false,
    isError: true,
    message: `Unsupported asset family for binding: ${family}`,
  };
}

function clearDerivedStates() {
  state.compiledPrompt = '';
  state.compiledCanonicalJob = null;
  state.imageConfig = null;
  state.validation = { errors: [], warnings: [] };
  state.compileError = '';
  state.lastCompileSucceeded = false;
  state.readiness = null;
  state.runStatus = {
    status: 'idle',
    batchJobName: null,
    batchState: null,
    durationMs: null,
    command: '-',
    logs: 'No run yet.',
  };
}

function pathFromResponse(payload) {
  const relativePath = payload?.jobFileRelativePath || '';
  if (!relativePath) {
    return null;
  }
  return String(relativePath).split('/').pop() || null;
}

function getJsonExportPayload() {
  return state.compiledCanonicalJob || state.job;
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showStatus(successMessage);
  } catch (error) {
    showStatus(`Copy failed: ${error.message}`, true);
  }
}

function downloadText(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function populateSelect(element, values) {
  const options = Array.isArray(values) && values.length > 0 ? values : [''];
  element.innerHTML = renderOptionList(options, options[0] || '');
}

function populateLabeledSelect(element, values, getLabel) {
  const options = Array.isArray(values) && values.length > 0 ? values : [''];
  element.innerHTML = renderLabeledOptionList(options, options[0] || '', getLabel);
}

function populateSelectWithEmptyState(element, values, emptyLabel) {
  if (!Array.isArray(values) || values.length === 0) {
    element.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>`;
    return;
  }
  element.innerHTML = renderOptionList(values, values[0]);
}

function renderOptionList(values, selectedValue) {
  return (values || [])
    .map((value) => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${escapeAttribute(value)}"${selected}>${escapeHtml(value)}</option>`;
    })
    .join('');
}

function renderLabeledOptionList(values, selectedValue, getLabel) {
  return (values || [])
    .map((value) => {
      const selected = value === selectedValue ? ' selected' : '';
      const label = typeof getLabel === 'function' ? getLabel(value) : value;
      return `<option value="${escapeAttribute(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function renderAssetOptionList(values, selectedValue, emptyLabel) {
  if (!Array.isArray(values) || values.length === 0) {
    return `<option value="">${escapeHtml(emptyLabel)}</option>`;
  }
  const options = [''].concat(values);
  return options
    .map((value) => {
      const label = value || 'Unassigned';
      const selected = value === (selectedValue || '') ? ' selected' : '';
      return `<option value="${escapeAttribute(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function parseList(value) {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function stringifyList(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

function selectOrFirst(value, options, fallback = null) {
  if (value && Array.isArray(options) && options.includes(value)) {
    return value;
  }
  if (Array.isArray(options) && options.length > 0) {
    return options[0];
  }
  return fallback;
}

function selectOrValueOrEmpty(value, options) {
  if (!value) {
    return '';
  }
  if (Array.isArray(options) && options.includes(value)) {
    return value;
  }
  return '';
}

function accessoryModeUsesReference(mode) {
  return mode === 'add' || mode === 'replace';
}

function normalizeAccessoryItemsForUi(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    asset_id: accessoryModeUsesReference(item?.mode) ? String(item?.asset_id || '') : '',
  }));
}

function hydrateAccessoryDraftsFromJob(job) {
  const items = getAdditionalAccessoryItems(Array.isArray(job?.entities?.accessory?.items) ? job.entities.accessory.items : []);
  state.stylingDrafts.accessoryItems = [];
  items.forEach(({ item, index }) => {
    const family = selectOrFirst(item?.family, getAccessoryFamilies());
    state.stylingDrafts.accessoryItems[index] = {
      family,
      variant: selectOrFirst(item?.variant, getAccessoryVariants(family)),
      asset_id: selectOrValueOrEmpty(item?.asset_id, getAccessoryAssets(family)),
      source: inferSourceFromItem(item),
      placement: 'auto',
    };
  });
}

function getAccessoryItemDraft(item, index, familyOverride = null) {
  const family = selectOrFirst(familyOverride || item?.family, getAccessoryFamilies());
  const existing = state.stylingDrafts.accessoryItems[index];
  if (existing && existing.family === family) {
    return existing;
  }
  const nextDraft = {
    family,
    variant: selectOrFirst(item?.variant, getAccessoryVariants(family)),
    asset_id: selectOrValueOrEmpty(item?.asset_id, getAccessoryAssets(family)),
    source: inferSourceFromItem(item),
    placement: 'auto',
  };
  state.stylingDrafts.accessoryItems[index] = nextDraft;
  return nextDraft;
}

function normalizeStylingUiJob(job) {
  const nextJob = mergeDefaultJob(job);
  if (nextJob.entities.footwear.mode !== 'replace') {
    nextJob.entities.footwear.asset_id = '';
  }
  if (nextJob.entities.headwear.mode !== 'add' && nextJob.entities.headwear.mode !== 'replace') {
    nextJob.entities.headwear.asset_id = '';
  }
  nextJob.entities.accessory.items = normalizeAccessoryItemsForUi(nextJob.entities.accessory.items);
  return nextJob;
}

function getFootwearModeHint(mode) {
  if (mode === 'replace') {
    return 'Replace = swap the original footwear with a new styling choice.';
  }
  if (mode === 'preserve') {
    return 'Keep Original = keep the original footwear from the source image.';
  }
  if (mode === 'remove') {
    return 'Remove = footwear will be removed from the result.';
  }
  return 'Ignore = system does not control footwear.';
}

function getHeadwearModeHint(mode) {
  if (mode === 'add') {
    return 'Add = introduce headwear into the result.';
  }
  if (mode === 'replace') {
    return 'Replace = swap the current headwear with a new styling choice.';
  }
  if (mode === 'remove') {
    return 'Remove = headwear will be removed from the result.';
  }
  return 'Ignore = system does not control headwear.';
}

function getSubjectReferences() {
  return state.registry?.entities?.subject?.referenceIds || [];
}

function getFootwearAssets() {
  return state.registry?.entities?.footwear?.assetIds || [];
}

function getHeadwearAssets() {
  return state.registry?.entities?.headwear?.assetIds || [];
}

function getInputSourceOptions(extraValue = null) {
  const managed = (state.managedInputSets || [])
    .map((setItem) => String(setItem.path || '').trim())
    .filter(Boolean);
  const registrySources = (state.registry?.inputSources || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  const combined = uniqueStrings(['batch_input', ...registrySources, ...managed, extraValue || '']);
  return combined.length > 0 ? combined : ['batch_input'];
}

function renderInputSourceHint() {
  if (!elements.inputSourceHint) {
    return;
  }
  if ((state.managedInputSets || []).length > 0) {
    elements.inputSourceHint.textContent = `Managed input sets available: ${state.managedInputSets.length}.`;
  } else {
    elements.inputSourceHint.textContent = 'No managed input sets found. Create one in Target Inputs (/input-manager).';
  }
}

function renderInputSourceSummary() {
  if (!elements.inputSourceSummary) {
    return;
  }
  const selectedPath = String(elements.inputSource?.value || state.job?.inputSource || '').trim();
  if (!selectedPath) {
    elements.inputSourceSummary.textContent = 'No input source selected yet.';
  } else {
    const managedSet = (state.managedInputSets || []).find((setItem) => String(setItem.path || '').trim() === selectedPath);
    if (managedSet) {
      const fileCount = Number(managedSet.fileCount || 0);
      elements.inputSourceSummary.textContent = `${managedSet.name || managedSet.inputSetId || selectedPath} • ${fileCount} image${fileCount === 1 ? '' : 's'}`;
    } else if (selectedPath === 'batch_input') {
      elements.inputSourceSummary.textContent = 'Using the default batch_input directory for this run.';
    } else {
      elements.inputSourceSummary.textContent = selectedPath;
    }
  }
  renderTargetInputManager();
  renderVisibleProductShell();
  renderConnectedResultSystem();
}

function renderOutputTypeUi() {
  if (!elements.outputTypeHint) {
    return;
  }
  const mode = String(elements.outputProfileMode?.value || state.job?.entities?.output_profile?.mode || 'apply');
  const profile = String(elements.outputProfileProfile?.value || state.job?.entities?.output_profile?.profile || '').trim();
  elements.outputTypeHint.textContent = mode === 'ignore'
    ? 'This draft is currently using default output behavior.'
    : `Active output type: ${profile || 'default'}.`;
}

function renderReviewSummary() {
  if (!elements.reviewSummary) {
    return;
  }
  const job = mergeDefaultJob(state.job);
  const extraAccessoryRows = getAdditionalAccessoryItems(job.entities?.accessory?.items || [])
    .filter(({ item }) => ['add', 'replace', 'remove'].includes(item?.mode));
  const stylingParts = [
    `Eyewear: ${getPrimaryAccessorySummary('eyewear')}`,
    `Bag: ${getPrimaryAccessorySummary('bag')}`,
    `Headwear: ${getHeadwearSummary()}`,
    `Footwear: ${getFootwearSummary()}`,
  ];
  if (extraAccessoryRows.length > 0) {
    stylingParts.push(`Extra rows: ${extraAccessoryRows.length} active`);
  }

  const summaryItems = [
    ['Target inputs', getInputSourceSummaryValue()],
    ['Workflow', getWorkflowLabel(state.workflowType)],
    ['Model / Person', `${job.entities.subject.mode}${job.entities.subject.reference_id ? ` • ${job.entities.subject.reference_id}` : ''}`],
    ['Product / Garment', job.entities.garment.mode || 'preserve'],
    ['Styling', stylingParts.length > 0 ? stylingParts.join(' • ') : 'No styling controls active'],
    ['Output type', job.entities.output_profile.mode === 'ignore'
      ? 'Default output behavior'
      : (job.entities.output_profile.profile || 'Default output behavior')],
  ];

  elements.reviewSummary.innerHTML = summaryItems
    .map(([label, value]) => `
      <div class="review-summary-item">
        <span class="review-summary-label">${escapeHtml(label)}</span>
        <strong class="review-summary-value">${escapeHtml(String(value || '-'))}</strong>
      </div>
    `)
    .join('');
  renderConnectedResultSystem();
}

function syncVisibleShellFromCanonical() {
  if (!state.ui.initialized) {
    if (state.ui?.model?.identityPreviewUrl) {
      URL.revokeObjectURL(state.ui.model.identityPreviewUrl);
    }
    state.ui = createInitialUiState();
    state.ui.initialized = true;
    state.ui.productIntent = elements.garmentMode?.value === 'restyle' ? 'restyle' : 'clean';
    state.ui.model.identityMode = elements.subjectMode?.value === 'ignore' ? 'ignore' : 'preserve';
  } else {
    if (elements.garmentMode?.value === 'restyle') {
      state.ui.productIntent = 'restyle';
    } else if (!['preserve', 'clean'].includes(state.ui.productIntent)) {
      state.ui.productIntent = 'clean';
    }
    if (elements.subjectMode?.value === 'ignore') {
      state.ui.model.identityMode = 'ignore';
    }
  }

  if (!state.ui.styling.openPanel) {
    state.ui.styling.openPanel = 'eyewear';
  }
}

function renderVisibleModelShell() {
  if (!elements.identityModeControl) {
    return;
  }

  applySegmentedState(elements.identityModeButtons, state.ui.model.identityMode, 'identityMode');
  if (elements.identityHelperText) {
    elements.identityHelperText.textContent = getIdentityModeHelperText(state.ui.model.identityMode);
  }
  if (elements.identityReplaceDropzone) {
    elements.identityReplaceDropzone.hidden = state.ui.model.identityMode !== 'replace';
  }
  if (elements.identityReferencePreview) {
    const hasPreview = Boolean(state.ui.model.identityPreviewUrl);
    elements.identityReferencePreview.hidden = !hasPreview;
    if (hasPreview && elements.identityReferencePreviewImage && elements.identityReferenceName) {
      elements.identityReferencePreviewImage.src = state.ui.model.identityPreviewUrl;
      elements.identityReferenceName.textContent = state.ui.model.identityReferenceName || 'reference_face';
    } else if (elements.identityReferencePreviewImage && elements.identityReferenceName) {
      elements.identityReferencePreviewImage.src = '';
      elements.identityReferenceName.textContent = 'No file selected';
    }
  }

  renderPillGroup(elements.physicalCorrectionsGroup, 'physicalCorrections', getModelPillDefinitions().physicalCorrections);
  renderPillGroup(elements.aestheticEnhancementsGroup, 'aestheticEnhancements', getModelPillDefinitions().aestheticEnhancements);
  renderPillGroup(elements.constraintsGroup, 'constraints', getModelPillDefinitions().constraints);
}

function renderVisibleProductShell() {
  if (!elements.productIntentControl) {
    return;
  }

  applySegmentedState(elements.productIntentButtons, state.ui.productIntent, 'productIntent');
  if (elements.productHelperText) {
    elements.productHelperText.textContent = getProductIntentHelperText(state.ui.productIntent);
  }

  const preview = getPrimaryInputPreview();
  if (preview?.url && elements.productBeforeImage && elements.productBeforeEmpty) {
    elements.productBeforeImage.src = preview.url;
    elements.productBeforeImage.alt = preview.fileName || 'Selected input preview';
    elements.productBeforeImage.hidden = false;
    elements.productBeforeEmpty.hidden = true;
  } else if (elements.productBeforeImage && elements.productBeforeEmpty) {
    elements.productBeforeImage.hidden = true;
    elements.productBeforeImage.src = '';
    elements.productBeforeEmpty.hidden = false;
  }
}

function renderTargetInputManager() {
  if (!elements.targetInputSummary) {
    return;
  }

  const setItem = getSelectedManagedInputSet();
  const preview = getPrimaryInputPreview();
  const images = resolveManagedSetImages(setItem);
  const thumbImages = images.slice(1, 5);

  if (!setItem) {
    const selectedPath = String(elements.inputSource?.value || state.job?.inputSource || '').trim() || 'batch_input';
    elements.targetInputSummary.innerHTML = `
      <div class="input-set-selected-card">
        <div class="input-set-meta-grid">
          <div class="input-set-meta-item">
            <span class="review-card-label">Set Name</span>
            <strong>${escapeHtml(selectedPath)}</strong>
          </div>
          <div class="input-set-meta-item">
            <span class="review-card-label">Image Count</span>
            <strong>-</strong>
          </div>
          <div class="input-set-meta-item">
            <span class="review-card-label">Upload Date</span>
            <strong>-</strong>
          </div>
        </div>
        <div class="preview-frame input-set-primary-frame">
          <div class="preview-empty">No managed input set preview is available for this source.</div>
        </div>
      </div>
    `;
    return;
  }

  const previewMarkup = preview?.url
    ? `<img src="${escapeAttribute(preview.url)}" alt="${escapeAttribute(preview.fileName || setItem.name || setItem.inputSetId)}" loading="lazy" />`
    : '<div class="preview-empty">No previewable images found for this set.</div>';

  const thumbsMarkup = thumbImages.length > 0
    ? thumbImages
      .map((image) => `
        <div class="input-set-thumb">
          <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.fileName)}" loading="lazy" />
        </div>
      `)
      .join('')
    : '<div class="styling-panel-note">Supporting thumbnails appear here when the input set contains more than one image.</div>';

  elements.targetInputSummary.innerHTML = `
    <div class="input-set-selected-card">
      <div class="input-set-meta-grid">
        <div class="input-set-meta-item">
          <span class="review-card-label">Set Name</span>
          <strong>${escapeHtml(setItem.name || setItem.inputSetId)}</strong>
        </div>
        <div class="input-set-meta-item">
          <span class="review-card-label">Image Count</span>
          <strong>${escapeHtml(String(setItem.fileCount || images.length || 0))}</strong>
        </div>
        <div class="input-set-meta-item">
          <span class="review-card-label">Upload Date</span>
          <strong>${escapeHtml(formatDateLabel(setItem.createdAt || '-'))}</strong>
        </div>
      </div>
      <div class="input-set-visuals">
        <div class="preview-frame input-set-primary-frame">
          ${previewMarkup}
        </div>
        <div class="input-set-thumbs">
          ${thumbsMarkup}
        </div>
      </div>
    </div>
  `;
}

function renderStylingAccordion() {
  if (!elements.stylingAccordion) {
    return;
  }

  const families = ['eyewear', 'bag', 'headwear', 'footwear'];
  if (!families.includes(state.ui.styling.openPanel)) {
    state.ui.styling.openPanel = 'eyewear';
  }

  elements.stylingAccordion.innerHTML = families
    .map((family) => renderStylingAccordionItem(family, state.ui.styling.openPanel === family))
    .join('');
}

function renderStylingAccordionItem(family, isOpen) {
  const config = getStylingPanelConfig(family);
  const assetChoices = getAssetChoicesForFamily(family);
  const showSource = config.isActionActive;
  const showPlacement = config.isActionActive && config.placementOptions.length > 1;
  const showVariant = config.variantOptions.length > 1;
  const showAssets = config.usesReference;
  const sourceMarkup = showSource
    ? `
      <div class="styling-control-group">
        <span class="styling-control-group-label">Source</span>
        <div class="segmented-control segmented-control-wide">
          ${renderStylingOptionButtons(family, 'source', ['reference', 'system'], config.source, getShortSourceLabel)}
        </div>
      </div>
    `
    : '';
  const placementMarkup = showPlacement
    ? `
      <div class="styling-control-group">
        <span class="styling-control-group-label">Placement</span>
        <div class="pill-group">
          ${renderStylingOptionButtons(family, 'placement', config.placementOptions, config.placement, getPlacementLabel, 'pill')}
        </div>
      </div>
    `
    : '';
  const variantMarkup = showVariant
    ? `
      <div class="styling-control-group">
        <span class="styling-control-group-label">Style Type</span>
        <div class="pill-group">
          ${renderStylingOptionButtons(family, 'variant', config.variantOptions, config.variant, formatEnumLabel, 'pill')}
        </div>
      </div>
    `
    : '';

  const assetsMarkup = showAssets
    ? (assetChoices.length > 0
      ? `
        <div class="styling-control-group">
          <span class="styling-control-group-label">Reference Selection</span>
          <div class="styling-thumb-strip">
            ${assetChoices.map((asset) => renderStylingAssetChoice(family, asset, config.assetId)).join('')}
          </div>
        </div>
      `
      : '<div class="styling-empty-strip">No compatible reference assets are available yet for this family.</div>')
    : '';
  const uploadMarkup = config.isActionActive
    ? `
      <div class="styling-upload-row">
        <p class="styling-panel-note">${escapeHtml(config.note)}</p>
        <button class="button button-secondary" type="button" data-styling-upload="${escapeAttribute(family)}">Upload Reference</button>
      </div>
    `
    : `<p class="styling-panel-note">${escapeHtml(config.note)}</p>`;

  return `
    <article class="styling-accordion-item${isOpen ? ' is-open' : ''}">
      <button class="styling-accordion-trigger" type="button" data-styling-toggle="${escapeAttribute(family)}" aria-expanded="${isOpen ? 'true' : 'false'}">
        <div>
          <h3>${escapeHtml(config.title)}</h3>
          <p class="styling-accordion-summary">${escapeHtml(config.summary)}</p>
        </div>
        <span class="accordion-caret">${isOpen ? '\u2212' : '+'}</span>
      </button>
      <div class="styling-accordion-panel">
        <div class="styling-control-stack">
          <div class="styling-control-group">
            <span class="styling-control-group-label">Action</span>
            <div class="segmented-control segmented-control-wide">
              ${renderStylingOptionButtons(family, 'action', config.actionOptions, config.action, config.actionLabel)}
            </div>
          </div>
          ${sourceMarkup}
          ${placementMarkup}
          ${variantMarkup}
          ${assetsMarkup}
          ${uploadMarkup}
        </div>
      </div>
    </article>
  `;
}

function renderConnectedResultSystem() {
  if (!elements.reviewCards || !elements.reviewSentence) {
    return;
  }

  const reviewCards = [
    {
      label: 'Inputs',
      value: getInputSourceSummaryValue(),
      summary: getSelectedManagedInputSet()
        ? `${formatDateLabel(getSelectedManagedInputSet().createdAt || '-')} • ${getSelectedManagedInputSet().fileCount || 0} image${Number(getSelectedManagedInputSet().fileCount || 0) === 1 ? '' : 's'}`
        : 'Select a managed input set to populate previews.',
    },
    {
      label: 'Model',
      value: getIdentityModeLabel(state.ui.model.identityMode),
      summary: summarizeSelectedPills([
        ...state.ui.model.physicalCorrections,
        ...state.ui.model.aestheticEnhancements,
        ...state.ui.model.constraints,
      ]),
    },
    {
      label: 'Product',
      value: getProductIntentLabel(state.ui.productIntent),
      summary: getProductIntentHelperText(state.ui.productIntent),
    },
    {
      label: 'Styling',
      value: getOverallStylingValue(),
      summary: getOverallStylingSummary(),
    },
  ];

  elements.reviewCards.innerHTML = reviewCards
    .map((item) => `
      <article class="review-card">
        <span class="review-card-label">${escapeHtml(item.label)}</span>
        <p class="review-card-value">${escapeHtml(item.value)}</p>
        <p class="review-summary-text">${escapeHtml(item.summary)}</p>
      </article>
    `)
    .join('');

  elements.reviewSentence.textContent = buildReviewSentence();
  renderVariationStrip();
  renderHeroPreview();
  renderOutputMeta();
}

function renderVariationStrip() {
  if (!elements.variationStrip) {
    return;
  }
  const candidates = buildVariationCandidates();
  if (candidates.length === 0) {
    elements.variationStrip.innerHTML = '<div class="styling-empty-strip">Variation candidates will appear after you select an input set.</div>';
    return;
  }

  const active = getActiveVariation(candidates);
  elements.variationStrip.innerHTML = candidates
    .map((candidate) => `
      <button
        type="button"
        class="variation-card${candidate.key === active.key ? ' is-active' : ''}${candidate.key === state.ui.results.approvedVariationKey ? ' is-approved' : ''}"
        data-variation-key="${escapeAttribute(candidate.key)}"
      >
        <div class="variation-thumb">
          ${candidate.outputUrl
            ? `<img src="${escapeAttribute(candidate.outputUrl)}" alt="${escapeAttribute(candidate.title)}" loading="lazy" />`
            : '<div class="hero-preview-empty">No preview</div>'}
        </div>
        <div>
          <p class="variation-card-title">${escapeHtml(candidate.title)}</p>
          <p class="variation-card-meta">${escapeHtml(candidate.meta)}</p>
        </div>
        ${candidate.key === state.ui.results.approvedVariationKey ? '<span class="variation-card-badge">Approved</span>' : ''}
      </button>
    `)
    .join('');
}

function renderHeroPreview() {
  if (!elements.heroPreviewCompare || !elements.heroBeforeImage || !elements.heroAfterImage || !elements.heroBeforeEmpty || !elements.heroAfterEmpty) {
    return;
  }

  const active = getActiveVariation();
  const previewMode = state.ui.results.previewMode === 'output' ? 'output' : 'compare';
  elements.heroPreviewCompare.classList.toggle('is-output-only', previewMode === 'output');
  if (elements.compareOutputButton) {
    elements.compareOutputButton.setAttribute('aria-pressed', previewMode === 'compare' ? 'true' : 'false');
    elements.compareOutputButton.classList.toggle('is-active', previewMode === 'compare');
  }

  if (!active) {
    if (elements.heroPreviewLabel) {
      elements.heroPreviewLabel.textContent = 'Variation 01';
    }
    elements.heroBeforeImage.hidden = true;
    elements.heroBeforeImage.src = '';
    elements.heroAfterImage.hidden = true;
    elements.heroAfterImage.src = '';
    elements.heroBeforeEmpty.hidden = false;
    elements.heroAfterEmpty.hidden = false;
    return;
  }

  if (elements.heroPreviewLabel) {
    elements.heroPreviewLabel.textContent = active.title;
  }

  if (active.inputUrl) {
    elements.heroBeforeImage.src = active.inputUrl;
    elements.heroBeforeImage.alt = active.inputName || 'Before preview';
    elements.heroBeforeImage.hidden = false;
    elements.heroBeforeEmpty.hidden = true;
  } else {
    elements.heroBeforeImage.hidden = true;
    elements.heroBeforeImage.src = '';
    elements.heroBeforeEmpty.hidden = false;
  }

  if (active.outputUrl) {
    elements.heroAfterImage.src = active.outputUrl;
    elements.heroAfterImage.alt = active.outputName || active.title;
    elements.heroAfterImage.hidden = false;
    elements.heroAfterEmpty.hidden = true;
  } else {
    elements.heroAfterImage.hidden = true;
    elements.heroAfterImage.src = '';
    elements.heroAfterEmpty.hidden = false;
  }
}

function renderOutputMeta() {
  if (!elements.outputMeta) {
    return;
  }

  const meta = getOutputMeta();
  elements.outputMeta.innerHTML = [
    ['Style', meta.style],
    ['Resolution', meta.resolution],
    ['Aspect', meta.aspect],
  ]
    .map(([label, value]) => `
      <div class="output-meta-item">
        <span class="output-meta-label">${escapeHtml(label)}</span>
        <strong class="output-meta-value">${escapeHtml(value)}</strong>
      </div>
    `)
    .join('');
}

function renderPillGroup(container, groupKey, options) {
  if (!container) {
    return;
  }

  const activeValues = new Set(state.ui.model[groupKey] || []);
  container.innerHTML = options
    .map((value) => `
      <button
        type="button"
        class="pill-button${activeValues.has(value) ? ' is-active' : ''}"
        data-pill-group="${escapeAttribute(groupKey)}"
        data-pill-value="${escapeAttribute(value)}"
        aria-pressed="${activeValues.has(value) ? 'true' : 'false'}"
      >
        ${escapeHtml(value)}
      </button>
    `)
    .join('');
}

function applySegmentedState(buttons, selectedValue, dataKey) {
  for (const button of buttons || []) {
    const value = String(button.dataset[dataKey] || '').trim();
    const isActive = value === selectedValue;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }
}

function renderStylingOptionButtons(family, field, options, selectedValue, getLabel, buttonClass = 'segmented') {
  const className = buttonClass === 'pill' ? 'pill-button' : 'segmented-button';
  return options
    .map((value) => {
      const isActive = value === selectedValue;
      const label = typeof getLabel === 'function' ? getLabel(value) : value;
      return `
        <button
          type="button"
          class="${className}${isActive ? ' is-active' : ''}"
          data-styling-field="${escapeAttribute(field)}"
          data-styling-family="${escapeAttribute(family)}"
          data-value="${escapeAttribute(value)}"
          aria-pressed="${isActive ? 'true' : 'false'}"
        >
          ${escapeHtml(label)}
        </button>
      `;
    })
    .join('');
}

function renderStylingAssetChoice(family, asset, selectedValue) {
  const isActive = asset.asset_id === selectedValue;
  const previewMarkup = asset.preview
    ? `<img src="${escapeAttribute(asset.preview)}" alt="${escapeAttribute(asset.asset_id)}" loading="lazy" />`
    : `<div class="styling-thumb-placeholder">${escapeHtml(formatAssetBadge(asset.asset_id))}</div>`;
  return `
    <button
      type="button"
      class="styling-thumb-button${isActive ? ' is-active' : ''}"
      data-styling-field="asset"
      data-styling-family="${escapeAttribute(family)}"
      data-value="${escapeAttribute(asset.asset_id)}"
      aria-pressed="${isActive ? 'true' : 'false'}"
    >
      <div class="styling-thumb-media">${previewMarkup}</div>
      <div>
        <p class="styling-thumb-title">${escapeHtml(asset.asset_id)}</p>
        <p class="styling-thumb-subtitle">${escapeHtml(asset.variant || formatEnumLabel(family))}</p>
      </div>
    </button>
  `;
}

function getSelectedManagedInputSet() {
  const selectedPath = String(elements.inputSource?.value || state.job?.inputSource || '').trim();
  return (state.managedInputSets || []).find((setItem) => String(setItem.path || '').trim() === selectedPath) || null;
}

function resolveManagedSetImages(setItem) {
  if (!setItem) {
    return [];
  }
  if (Array.isArray(setItem.images) && setItem.images.length > 0) {
    return setItem.images
      .map((image) => ({
        fileName: String(image.fileName || '').trim(),
        url: String(image.url || '').trim(),
      }))
      .filter((image) => image.url);
  }
  if (setItem.preview) {
    return [{
      fileName: String(setItem.preview.split('/').pop() || 'preview').trim(),
      url: String(setItem.preview).trim(),
    }];
  }
  return [];
}

function getPrimaryInputPreview() {
  const setItem = getSelectedManagedInputSet();
  const images = resolveManagedSetImages(setItem);
  return images[0] || (setItem?.preview
    ? {
      fileName: String(setItem.preview.split('/').pop() || 'preview').trim(),
      url: setItem.preview,
    }
    : null);
}

function buildVariationCandidates() {
  const images = resolveManagedSetImages(getSelectedManagedInputSet());
  const primary = getPrimaryInputPreview();
  const seedImages = images.length > 0 ? images : (primary ? [primary] : []);
  if (seedImages.length === 0) {
    return [];
  }

  const descriptors = [
    ['Catalog Balance', 'Neutral cleanup'],
    ['Studio Precision', 'Sharper detail'],
    ['Soft Polish', 'Gentle finish'],
    ['Editorial Lean', 'Mood-led framing'],
    ['Detail Safe', 'Texture protected'],
  ];
  const count = Math.min(5, Math.max(3, seedImages.length));

  return Array.from({ length: count }, (_item, index) => {
    const input = seedImages[index % seedImages.length];
    const output = seedImages[(index + 1) % seedImages.length] || input;
    const [title, meta] = descriptors[index];
    return {
      key: `variation-${index + 1}`,
      title,
      meta,
      inputUrl: input.url,
      inputName: input.fileName || `input_${index + 1}`,
      outputUrl: output.url || input.url,
      outputName: output.fileName || input.fileName || `output_${index + 1}`,
    };
  });
}

function getActiveVariation(candidates = null) {
  const items = candidates || buildVariationCandidates();
  if (items.length === 0) {
    return null;
  }
  const existing = items.find((item) => item.key === state.ui.results.activeVariationKey);
  if (existing) {
    return existing;
  }
  state.ui.results.activeVariationKey = items[0].key;
  return items[0];
}

function getOutputMeta() {
  const profile = String(elements.outputProfileProfile?.value || state.job?.entities?.output_profile?.profile || '').trim();
  return {
    style: humanizeOutputProfile(profile),
    resolution: state.imageConfig?.imageSize || inferResolutionFromProfile(profile),
    aspect: state.imageConfig?.aspectRatio || inferAspectFromProfile(profile),
  };
}

function getModelPillDefinitions() {
  return {
    physicalCorrections: ['Face Balance', 'Light Cleanup', 'Posture Settle'],
    aestheticEnhancements: ['Catalog Polish', 'Natural Contrast', 'Texture Lift'],
    constraints: ['Keep Pose', 'Respect Garment', 'Preserve Hands'],
  };
}

function getIdentityModeLabel(mode) {
  if (mode === 'replace') {
    return 'Replace';
  }
  if (mode === 'ignore') {
    return 'Ignore';
  }
  return 'Preserve';
}

function getIdentityModeHelperText(mode) {
  if (mode === 'replace') {
    return 'Stage a reference face in the UI shell and keep the rest of the model controls stable.';
  }
  if (mode === 'ignore') {
    return 'Leave identity unmanaged so the rest of the flow can stay focused on cleanup and styling.';
  }
  return 'Keep the current face identity anchored to the selected input set.';
}

function getProductIntentLabel(intent) {
  if (intent === 'restyle') {
    return 'Restyle';
  }
  if (intent === 'preserve') {
    return 'Preserve';
  }
  return 'Clean';
}

function getProductIntentHelperText(intent) {
  if (intent === 'restyle') {
    return 'Restyle the garment presentation while still using the current input set as the base.';
  }
  if (intent === 'preserve') {
    return 'Preserve the garment as captured and keep the edit focused on truth-to-source output.';
  }
  return 'Clean the garment presentation into a studio-ready base without visually restyling it.';
}

function getShortSourceLabel(value) {
  return value === 'reference' ? 'Reference' : 'System';
}

function getOverallStylingValue() {
  const activeFamilies = getVisibleStylingStateList().filter((item) => item.isActionActive);
  if (activeFamilies.length === 0) {
    return 'No active changes';
  }
  return `${activeFamilies.length} active decision${activeFamilies.length === 1 ? '' : 's'}`;
}

function getOverallStylingSummary() {
  const activeFamilies = getVisibleStylingStateList().filter((item) => item.isActionActive);
  if (activeFamilies.length === 0) {
    return 'Keep original styling.';
  }
  return activeFamilies.map((item) => `${item.title}: ${item.summary}`).join(' • ');
}

function buildReviewSentence() {
  const inputLabel = getInputSourceSummaryValue();
  const styleMeta = getOutputMeta();
  const identityText = getIdentityModeLabel(state.ui.model.identityMode).toLowerCase();
  const productText = getProductIntentLabel(state.ui.productIntent).toLowerCase();
  const modelPills = summarizeSelectedPills([
    ...state.ui.model.physicalCorrections,
    ...state.ui.model.aestheticEnhancements,
    ...state.ui.model.constraints,
  ]).toLowerCase();
  const stylingText = getVisibleStylingStateList()
    .filter((item) => item.isActionActive)
    .map((item) => `${item.title.toLowerCase()} ${item.summary.toLowerCase()}`)
    .join(', ');

  const base = `${inputLabel} as a ${productText} ${styleMeta.style.toLowerCase()} output with ${identityText} identity handling`;
  const modelClause = modelPills !== 'none selected' ? `, ${modelPills}` : '';
  const stylingClause = stylingText ? `, and styling changes across ${stylingText}` : '';
  return `${base}${modelClause}${stylingClause}.`;
}

function summarizeSelectedPills(values) {
  return values.length > 0 ? values.join(' • ') : 'None selected';
}

function getVisibleStylingStateList() {
  return ['eyewear', 'bag', 'headwear', 'footwear'].map((family) => getStylingPanelConfig(family));
}

function getStylingPanelConfig(family) {
  if (family === 'eyewear' || family === 'bag') {
    const control = getPrimaryAccessoryElements(family);
    const action = control.action?.value || 'ignore';
    const source = control.source?.value || 'system';
    const placement = control.placement?.value || 'auto';
    const assetId = control.asset?.value || '';
    const isActionActive = action === 'add' || action === 'replace';
    return {
      family,
      title: getAccessoryFamilyLabel(family),
      action,
      actionOptions: ['ignore', 'add', 'replace', 'remove'],
      actionLabel: getAccessoryActionLabel,
      source,
      placement,
      placementOptions: getPlacementOptions(family),
      variant: getAccessoryVariants(family)[0] || family,
      variantOptions: getAccessoryVariants(family),
      assetId,
      usesReference: isActionActive && source === 'reference',
      isActionActive,
      summary: buildStylingAccordionSummary(getAccessoryActionLabel(action), isActionActive ? source : '', isActionActive ? placement : ''),
      note: getAccessoryActionHint(family, action),
    };
  }

  if (family === 'headwear') {
    const action = elements.headwearMode?.value || 'ignore';
    const source = elements.headwearSource?.value || 'system';
    const placement = elements.headwearPlacement?.value || 'auto';
    const variant = elements.headwearVariant?.value || '';
    const assetId = elements.headwearAssetId?.value || '';
    const isActionActive = action === 'add' || action === 'replace';
    return {
      family,
      title: 'Headwear',
      action,
      actionOptions: state.registry?.entities?.headwear?.modes || ['add', 'replace', 'remove', 'ignore'],
      actionLabel: getAccessoryActionLabel,
      source,
      placement,
      placementOptions: getPlacementOptions('headwear'),
      variant,
      variantOptions: state.registry?.entities?.headwear?.variants || [],
      assetId,
      usesReference: isActionActive && source === 'reference',
      isActionActive,
      summary: buildStylingAccordionSummary(getAccessoryActionLabel(action), isActionActive ? source : '', isActionActive ? placement : ''),
      note: getHeadwearModeHint(action),
    };
  }

  const action = elements.footwearMode?.value || 'ignore';
  const source = elements.footwearSource?.value || 'system';
  const variant = elements.footwearVariant?.value || '';
  const assetId = elements.footwearAssetId?.value || '';
  const isActionActive = action === 'replace';
  return {
    family: 'footwear',
    title: 'Footwear',
    action,
    actionOptions: state.registry?.entities?.footwear?.modes || ['preserve', 'replace', 'remove', 'ignore'],
    actionLabel: getFootwearActionLabel,
    source,
    placement: '',
    placementOptions: ['auto'],
    variant,
    variantOptions: state.registry?.entities?.footwear?.variants || [],
    assetId,
    usesReference: isActionActive && source === 'reference',
    isActionActive,
    summary: buildStylingAccordionSummary(getFootwearActionLabel(action), isActionActive ? source : '', ''),
    note: getFootwearModeHint(action),
  };
}

function buildStylingAccordionSummary(actionLabel, sourceValue, placementValue) {
  const parts = [actionLabel];
  if (sourceValue) {
    parts.push(getShortSourceLabel(sourceValue));
  }
  if (placementValue) {
    parts.push(getPlacementLabel(placementValue));
  }
  return parts.filter(Boolean).join(' • ');
}

function getAssetChoicesForFamily(family) {
  const available = Array.isArray(state.assetLibrary?.assetsByFamily?.[family]) ? state.assetLibrary.assetsByFamily[family] : [];
  if (available.length > 0) {
    return available;
  }

  let fallbackIds = [];
  if (family === 'footwear') {
    fallbackIds = getFootwearAssets();
  } else if (family === 'headwear') {
    fallbackIds = getHeadwearAssets();
  } else {
    fallbackIds = getAccessoryAssets(family);
  }

  return fallbackIds.map((assetId) => ({
    asset_id: assetId,
    family,
    variant: formatEnumLabel(family),
    preview: null,
  }));
}

function humanizeOutputProfile(profile) {
  if (!profile) {
    return 'Studio Catalog';
  }
  if (profile.includes('catalog')) {
    return 'Studio Catalog';
  }
  return formatEnumLabel(profile);
}

function inferResolutionFromProfile(profile) {
  if (profile.includes('4k')) {
    return '4K';
  }
  if (profile.includes('2k')) {
    return '2K';
  }
  return 'Default';
}

function inferAspectFromProfile(profile) {
  if (profile.includes('4x5')) {
    return '4:5';
  }
  if (profile.includes('1x1')) {
    return '1:1';
  }
  if (profile.includes('16x9')) {
    return '16:9';
  }
  return 'Default';
}

function formatEnumLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim() || '-';
}

function formatAssetBadge(value) {
  const parts = String(value || '')
    .split('_')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
  return parts || 'RF';
}

function formatDateLabel(value) {
  if (!value || value === '-') {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getInputSourceSummaryValue() {
  const selectedPath = String(elements.inputSource?.value || state.job?.inputSource || '').trim();
  if (!selectedPath) {
    return 'Not selected';
  }
  const managedSet = (state.managedInputSets || []).find((setItem) => String(setItem.path || '').trim() === selectedPath);
  if (managedSet) {
    const fileCount = Number(managedSet.fileCount || 0);
    return `${managedSet.name || managedSet.inputSetId || selectedPath} (${fileCount})`;
  }
  if (selectedPath === 'batch_input') {
    return 'batch_input';
  }
  return selectedPath;
}

function getWorkflowLabel(workflow) {
  if (workflow === 'face_identity') {
    return 'Face & Identity';
  }
  if (workflow === 'styling') {
    return 'Styling';
  }
  if (workflow === 'advanced') {
    return 'Advanced';
  }
  return 'Studio Cleanup';
}

function getPrimaryAccessoryElements(family) {
  if (family === 'eyewear') {
    return {
      card: elements.eyewearCard,
      action: elements.eyewearAction,
      actionHint: elements.eyewearActionHint,
      source: elements.eyewearSource,
      placement: elements.eyewearPlacement,
      asset: elements.eyewearAssetId,
      dependentFields: elements.eyewearDependentFields,
      sourceField: elements.eyewearSourceField,
      placementField: elements.eyewearPlacementField,
      assetField: elements.eyewearAssetField,
      assetHint: elements.eyewearAssetHint,
    };
  }

  return {
    card: elements.bagCard,
    action: elements.bagAction,
    actionHint: elements.bagActionHint,
    source: elements.bagSource,
    placement: elements.bagPlacement,
    asset: elements.bagAssetId,
    dependentFields: elements.bagDependentFields,
    sourceField: elements.bagSourceField,
    placementField: elements.bagPlacementField,
    assetField: elements.bagAssetField,
    assetHint: elements.bagAssetHint,
  };
}

function renderPrimaryAccessoryUi(family) {
  const control = getPrimaryAccessoryElements(family);
  const mode = control.action?.value || 'ignore';
  const source = control.source?.value || 'system';
  const isActive = mode === 'add' || mode === 'replace';
  const usesReference = isActive && source === 'reference';
  const assetOptions = getAccessoryAssets(family);

  control.card?.classList.toggle('is-passive', mode === 'ignore');
  control.dependentFields?.classList.toggle('is-hidden', !isActive);
  control.sourceField?.classList.toggle('is-disabled', !isActive);
  control.placementField?.classList.toggle('is-disabled', !isActive);
  control.assetField?.classList.toggle('is-disabled', !usesReference);
  control.assetField?.classList.toggle('is-hidden', !usesReference);

  if (control.source) {
    control.source.disabled = !isActive;
  }
  if (control.placement) {
    control.placement.disabled = !isActive;
  }
  if (control.asset) {
    control.asset.disabled = !usesReference;
  }
  if (control.actionHint) {
    control.actionHint.textContent = getAccessoryActionHint(family, mode);
  }
  if (control.assetHint) {
    control.assetHint.textContent = usesReference && assetOptions.length === 0
      ? 'No compatible references found.'
      : '';
  }
}

function getPrimaryAccessoryItem(job, family) {
  const items = Array.isArray(job?.entities?.accessory?.items) ? job.entities.accessory.items : [];
  return items.find((item) => item?.family === family) || {
    family,
    variant: getAccessoryVariants(family)[0] || family,
    mode: 'ignore',
    asset_id: '',
  };
}

function getAdditionalAccessoryItems(items) {
  const seenPrimaryFamilies = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const family = String(item?.family || '').trim();
      const isPrimaryFamily = family === 'eyewear' || family === 'bag';
      if (!isPrimaryFamily) {
        return true;
      }
      if (seenPrimaryFamilies.has(family)) {
        return true;
      }
      seenPrimaryFamilies.add(family);
      return false;
    });
}

function buildPrimaryAccessoryItem(family) {
  const control = getPrimaryAccessoryElements(family);
  const variants = getAccessoryVariants(family);
  const assets = getAccessoryAssets(family);
  const mode = control.action?.value || 'ignore';
  const source = control.source?.value || 'system';
  const variant = variants[0] || family;
  const assetId = accessoryModeUsesReference(mode) && source === 'reference'
    ? selectOrValueOrEmpty(control.asset?.value || '', assets)
    : '';

  return {
    family,
    variant,
    mode,
    asset_id: assetId,
  };
}

function inferSourceFromItem(item) {
  return item?.asset_id ? 'reference' : 'system';
}

function getPlacementOptions(kind) {
  if (kind === 'eyewear') {
    return ['auto', 'on_eyes', 'on_head', 'in_hand'];
  }
  if (kind === 'bag') {
    return ['auto', 'in_hand', 'on_forearm', 'on_shoulder', 'crossbody'];
  }
  if (kind === 'headwear') {
    return ['auto', 'on_head'];
  }
  if (kind === 'neckwear') {
    return ['auto'];
  }
  return ['auto'];
}

function getPlacementLabel(value) {
  if (value === 'on_eyes') {
    return 'On eyes';
  }
  if (value === 'on_head') {
    return 'On head';
  }
  if (value === 'in_hand') {
    return 'In hand';
  }
  if (value === 'on_forearm') {
    return 'On forearm';
  }
  if (value === 'on_shoulder') {
    return 'On shoulder';
  }
  if (value === 'crossbody') {
    return 'Crossbody';
  }
  return 'Auto';
}

function getSourceLabel(value) {
  return value === 'reference' ? 'Use reference' : 'Let system choose';
}

function getAccessoryActionLabel(mode) {
  if (mode === 'add') {
    return 'Add';
  }
  if (mode === 'replace') {
    return 'Replace';
  }
  if (mode === 'remove') {
    return 'Remove';
  }
  return 'None';
}

function getFootwearActionLabel(mode) {
  if (mode === 'preserve') {
    return 'Keep Original';
  }
  if (mode === 'replace') {
    return 'Replace';
  }
  if (mode === 'remove') {
    return 'Remove';
  }
  return 'Ignore';
}

function getAccessoryActionHint(family, mode) {
  const label = getAccessoryFamilyLabel(family);
  if (mode === 'add') {
    return `${label}: add this item to the result.`;
  }
  if (mode === 'replace') {
    return `${label}: swap the current item with a new styling choice.`;
  }
  if (mode === 'remove') {
    return `${label}: remove this item from the result.`;
  }
  return `${label}: the system will not control this item.`;
}

function summarizeActionSourcePlacement(actionLabel, sourceLabel, placementLabel) {
  const parts = [actionLabel];
  if (sourceLabel) {
    parts.push(sourceLabel);
  }
  if (placementLabel) {
    parts.push(placementLabel);
  }
  return parts.join(' / ');
}

function getPrimaryAccessorySummary(family) {
  const control = getPrimaryAccessoryElements(family);
  const mode = control.action?.value || 'ignore';
  const isActive = mode === 'add' || mode === 'replace';
  return summarizeActionSourcePlacement(
    getAccessoryActionLabel(mode),
    isActive ? getSourceLabel(control.source?.value || 'system') : '',
    isActive ? getPlacementLabel(control.placement?.value || 'auto') : ''
  );
}

function getHeadwearSummary() {
  const mode = elements.headwearMode?.value || 'ignore';
  const isActive = mode === 'add' || mode === 'replace';
  return summarizeActionSourcePlacement(
    getAccessoryActionLabel(mode),
    isActive ? getSourceLabel(elements.headwearSource?.value || 'system') : '',
    isActive ? getPlacementLabel(elements.headwearPlacement?.value || 'auto') : ''
  );
}

function getFootwearSummary() {
  const mode = elements.footwearMode?.value || 'ignore';
  return summarizeActionSourcePlacement(
    getFootwearActionLabel(mode),
    mode === 'replace' ? getSourceLabel(elements.footwearSource?.value || 'system') : '',
    ''
  );
}

function getAccessoryFamilies() {
  return state.registry?.entities?.accessory?.families || ['eyewear', 'bag', 'neckwear'];
}

function getAccessoryFamilyLabel(family) {
  if (family === 'eyewear') {
    return 'Eyewear';
  }
  if (family === 'bag') {
    return 'Bag';
  }
  if (family === 'neckwear') {
    return 'Neckwear';
  }
  return family || 'Accessory';
}

function getAccessoryItemModes() {
  return state.registry?.entities?.accessory?.itemModes || ['add', 'replace', 'remove', 'ignore'];
}

function getAccessoryVariants(family) {
  return state.registry?.entities?.accessory?.variantsByFamily?.[family] || ['default'];
}

function getAccessoryAssets(family) {
  return state.registry?.entities?.accessory?.assetIdsByFamily?.[family] || [];
}

function createAccessoryItem() {
  const availableFamilies = getAccessoryFamilies();
  const family = availableFamilies.includes('neckwear')
    ? 'neckwear'
    : (availableFamilies.find((item) => item !== 'eyewear' && item !== 'bag') || availableFamilies[0] || 'eyewear');
  const variants = getAccessoryVariants(family);
  return {
    family,
    variant: variants[0] || family,
    mode: 'add',
    asset_id: '',
  };
}

function createInitialUiState() {
  return {
    initialized: false,
    productIntent: 'clean',
    model: {
      identityMode: 'preserve',
      identityReferenceName: '',
      identityPreviewUrl: '',
      physicalCorrections: ['Face Balance', 'Light Cleanup'],
      aestheticEnhancements: ['Catalog Polish'],
      constraints: ['Keep Pose', 'Respect Garment'],
    },
    styling: {
      openPanel: 'eyewear',
    },
    results: {
      activeVariationKey: '',
      approvedVariationKey: '',
      previewMode: 'compare',
    },
  };
}

function createWorkflowFriendlyDefaultJob(job) {
  const nextJob = mergeDefaultJob(job);
  nextJob.entities.footwear = {
    ...nextJob.entities.footwear,
    mode: 'preserve',
    asset_id: '',
  };
  nextJob.entities.headwear = {
    ...nextJob.entities.headwear,
    mode: 'ignore',
    asset_id: '',
  };
  nextJob.entities.accessory = {
    ...nextJob.entities.accessory,
    mode: 'apply',
    items: [],
  };
  return nextJob;
}

function createFallbackJob() {
  return {
    version: '2',
    jobId: 'job_0001',
    displayName: 'retouchio-job-builder-default',
    inputSource: 'batch_input',
    entities: {
      subject: {
        mode: 'preserve',
        variant: 'identity_reference',
        reference_id: 'subject_0001',
      },
      garment: {
        mode: 'preserve',
        variant: 'source_garment',
        detail_refs: {
          material: [],
          pattern: [],
        },
      },
      footwear: {
        mode: 'replace',
        variant: 'sandal',
        asset_id: 'footwear_0001',
      },
      headwear: {
        mode: 'add',
        variant: 'bandana',
        asset_id: 'headwear_bandana_0001',
      },
      accessory: {
        mode: 'apply',
        items: [
          {
            family: 'eyewear',
            variant: 'sunglasses',
            mode: 'ignore',
            asset_id: '',
          },
        ],
      },
      scene: {
        mode: 'apply',
        profile: 'studio_catalog',
      },
      output_profile: {
        mode: 'apply',
        profile: 'catalog_4x5_2k',
      },
      global_negative_rules: {
        mode: 'apply',
        items: [],
      },
    },
  };
}

function mergeDefaultJob(job) {
  const base = createFallbackJob();
  return {
    ...base,
    ...(job || {}),
    version: '2',
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

function createFallbackRegistry() {
  return {
    inputSources: ['batch_input'],
    entities: {
      subject: {
        modes: ['preserve', 'ignore'],
        referenceIds: ['subject_0001'],
      },
      garment: {
        modes: ['preserve', 'restyle', 'ignore'],
        detailRefs: { material: [], pattern: [] },
      },
      footwear: {
        modes: ['preserve', 'replace', 'remove', 'ignore'],
        variants: ['sandal'],
        assetIds: ['footwear_0001'],
      },
      headwear: {
        modes: ['add', 'replace', 'remove', 'ignore'],
        variants: ['bandana', 'headband', 'hat'],
        assetIds: ['headwear_bandana_0001'],
      },
      accessory: {
        modes: ['apply', 'ignore'],
        itemModes: ['add', 'replace', 'remove', 'ignore'],
        families: ['eyewear', 'bag', 'neckwear'],
        variantsByFamily: {
          eyewear: ['sunglasses'],
          bag: ['hand_bag'],
          neckwear: ['neck_scarf'],
        },
        assetIdsByFamily: {
          eyewear: [],
          bag: [],
          neckwear: [],
        },
      },
      scene: {
        modes: ['apply', 'preserve', 'ignore'],
        profiles: ['studio_catalog'],
      },
      output_profile: {
        modes: ['apply', 'ignore'],
        profiles: ['catalog_4x5_2k'],
      },
      global_negative_rules: {
        modes: ['apply', 'ignore'],
      },
    },
    meta: {
      version: 'fallback',
      frozenBehaviorOptions: true,
      assetBankStandard: { version: 'fallback' },
    },
    assetBankHealth: {
      missingDirCount: 0,
    },
  };
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((item) => String(item)))];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
