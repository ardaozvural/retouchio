const ASSET_BINDING_STORAGE_KEY = 'retouchio.asset_binding.v1';
const INPUT_SET_BINDING_STORAGE_KEY = 'retouchio.input_set_binding.v1';
let runtimeState = null;

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
    logs: 'Henüz çalıştırma yok.',
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
    inlineAssetUpload: false,
    inlineInputUpload: false,
  },
  ui: createInitialUiState(),
  lastCompileSucceeded: false,
};
runtimeState = state;

const COMPILE_INSPECT_TABS = [
  { id: 'selections', label: 'Seçimler' },
  { id: 'canonical-job', label: 'Kanonik İş' },
  { id: 'compile-summary', label: 'Derleme Özeti' },
  { id: 'references', label: 'Referanslar' },
];

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
    productGroupContext: document.getElementById('productGroupContext'),
    productReferenceSummary: document.getElementById('productReferenceSummary'),
    createInputSetButton: document.getElementById('createInputSetButton'),
    identityModeControl: document.getElementById('identityModeControl'),
    identityModeButtons: Array.from(document.querySelectorAll('[data-identity-mode]')),
    identityHelperText: document.getElementById('identityHelperText'),
    subjectReferencePickerField: document.getElementById('subjectReferencePickerField'),
    subjectReferencePicker: document.getElementById('subjectReferencePicker'),
    subjectReferencePickerHint: document.getElementById('subjectReferencePickerHint'),
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
    compileInspectPanel: document.getElementById('compileInspectPanel'),
    compileInspectToggle: document.getElementById('compileInspectToggle'),
    compileInspectMeta: document.getElementById('compileInspectMeta'),
    compileInspectBody: document.getElementById('compileInspectBody'),
    compileInspectTabs: document.getElementById('compileInspectTabs'),
    compileInspectContent: document.getElementById('compileInspectContent'),
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
    productionAssetModal: document.getElementById('productionAssetModal'),
    productionAssetModalBackdrop: document.getElementById('productionAssetModalBackdrop'),
    productionAssetModalTitle: document.getElementById('productionAssetModalTitle'),
    productionAssetModalMeta: document.getElementById('productionAssetModalMeta'),
    productionAssetModalStatus: document.getElementById('productionAssetModalStatus'),
    productionAssetUploadForm: document.getElementById('productionAssetUploadForm'),
    productionAssetFamilyLabel: document.getElementById('productionAssetFamilyLabel'),
    productionAssetVariantLabel: document.getElementById('productionAssetVariantLabel'),
    productionAssetFilesInput: document.getElementById('productionAssetFilesInput'),
    productionAssetFilesHint: document.getElementById('productionAssetFilesHint'),
    productionAssetUploadButton: document.getElementById('productionAssetUploadButton'),
    closeProductionAssetModalButton: document.getElementById('closeProductionAssetModalButton'),
    productionInputSetModal: document.getElementById('productionInputSetModal'),
    productionInputSetModalBackdrop: document.getElementById('productionInputSetModalBackdrop'),
    productionInputSetModalStatus: document.getElementById('productionInputSetModalStatus'),
    productionInputSetUploadForm: document.getElementById('productionInputSetUploadForm'),
    productionInputSetNameInput: document.getElementById('productionInputSetNameInput'),
    productionInputSetFilesInput: document.getElementById('productionInputSetFilesInput'),
    productionInputSetFilesHint: document.getElementById('productionInputSetFilesHint'),
    productionInputSetUploadButton: document.getElementById('productionInputSetUploadButton'),
    closeProductionInputSetModalButton: document.getElementById('closeProductionInputSetModalButton'),
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
    showStatus('Varsayılan örnek işe dönüldü.');
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
      showStatus('Örnek kanonik iş yüklendi.');
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

  elements.createInputSetButton?.addEventListener('click', openInputSetUploadModal);
  elements.subjectReferencePicker?.addEventListener('change', () => {
    if (elements.subjectReferenceId) {
      elements.subjectReferenceId.value = elements.subjectReferencePicker.value || '';
    }
    syncStateFromForm();
    renderVisibleModelShell();
    renderConnectedResultSystem();
  });

  elements.productionAssetFilesInput?.addEventListener('change', () => {
    const count = Array.from(elements.productionAssetFilesInput.files || []).length;
    if (elements.productionAssetFilesHint) {
      elements.productionAssetFilesHint.textContent = count > 0
        ? `${count} dosya seçildi.`
        : 'Dosya seçilmedi.';
    }
  });
  elements.productionAssetUploadForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await uploadAssetFromProductionFlow();
  });
  elements.closeProductionAssetModalButton?.addEventListener('click', closeAssetUploadModal);
  elements.productionAssetModalBackdrop?.addEventListener('click', closeAssetUploadModal);

  elements.productionInputSetFilesInput?.addEventListener('change', () => {
    const count = Array.from(elements.productionInputSetFilesInput.files || []).length;
    if (elements.productionInputSetFilesHint) {
      elements.productionInputSetFilesHint.textContent = count > 0
        ? `${count} dosya seçildi.`
        : 'Dosya seçilmedi.';
    }
  });
  elements.productionInputSetUploadForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await uploadInputSetFromProductionFlow();
  });
  elements.closeProductionInputSetModalButton?.addEventListener('click', closeInputSetUploadModal);
  elements.productionInputSetModalBackdrop?.addEventListener('click', closeInputSetUploadModal);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (isAssetUploadModalOpen()) {
      closeAssetUploadModal();
      return;
    }
    if (isInputSetUploadModalOpen()) {
      closeInputSetUploadModal();
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
    await copyText(JSON.stringify(getJsonExportPayload(), null, 2), 'Kanonik JSON kopyalandı.');
  });

  elements.downloadJsonButton.addEventListener('click', () => {
    const fileName = `${(state.job.jobId || 'retouchio-job').trim() || 'retouchio-job'}.canonical.json`;
    downloadText(fileName, JSON.stringify(getJsonExportPayload(), null, 2), 'application/json');
    showStatus('Kanonik JSON indirildi.');
  });

  elements.copyPromptButton.addEventListener('click', async () => {
    if (!state.compiledPrompt) {
      showStatus('Önce derleme yapın.', true);
      return;
    }
    await copyText(state.compiledPrompt, 'Derlenmiş istem kopyalandı.');
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

  elements.compileInspectToggle?.addEventListener('click', () => {
    state.ui.inspect.open = !state.ui.inspect.open;
    renderCompileInspectPanel();
  });

  elements.compileInspectTabs?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-inspect-tab]');
    if (!button) {
      return;
    }
    const tabId = String(button.dataset.inspectTab || '').trim();
    if (!COMPILE_INSPECT_TABS.some((tab) => tab.id === tabId)) {
      return;
    }
    state.ui.inspect.activeTab = tabId;
    renderCompileInspectPanel();
  });

  elements.approveOutputButton?.addEventListener('click', () => {
    const active = getActiveVariation();
    if (!active) {
      showStatus('Önce bir varyasyon seçin.', true);
      return;
    }
    state.ui.results.approvedVariationKey = active.key;
    renderConnectedResultSystem();
    showStatus(`${active.title} arayüzde onaylandı.`);
  });

  elements.regenerateOutputButton?.addEventListener('click', () => {
    const candidates = buildVariationCandidates();
    if (candidates.length === 0) {
      showStatus('Henüz kullanılabilir varyasyon yok.', true);
      return;
    }
    const currentIndex = candidates.findIndex((item) => item.key === state.ui.results.activeVariationKey);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % candidates.length : 0;
    state.ui.results.activeVariationKey = candidates[nextIndex].key;
    renderConnectedResultSystem();
    showStatus(`${candidates[nextIndex].title} gösteriliyor.`);
  });

  elements.downloadOutputButton?.addEventListener('click', () => {
    const active = getActiveVariation();
    if (!active?.outputUrl) {
      showStatus('İndirilecek çıktı önizlemesi yok.', true);
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
    const family = String(toggle.dataset.stylingToggle || '').trim();
    state.ui.styling.openPanel = state.ui.styling.openPanel === family ? '' : family;
    renderStylingAccordion();
    return;
  }

  const upload = event.target.closest('[data-styling-upload]');
  if (upload) {
    const family = String(upload.dataset.stylingUpload || '').trim();
    if (family) {
      openAssetUploadModal(family);
    }
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

function openAssetUploadModal(family) {
  const config = getStylingPanelConfig(family);
  const variant = getUploadVariantForFamily(family, config.variant);
  state.ui.modals.assetUpload = {
    open: true,
    family,
    variant,
  };

  if (elements.productionAssetModalTitle) {
    elements.productionAssetModalTitle.textContent = `${config.title} Referansı Yükle`;
  }
  if (elements.productionAssetModalMeta) {
    elements.productionAssetModalMeta.textContent = `${config.title.toLowerCase()} referansını ekleyin ve doğrudan bu kartla eşleyin.`;
  }
  if (elements.productionAssetFamilyLabel) {
    elements.productionAssetFamilyLabel.value = config.title;
  }
  if (elements.productionAssetVariantLabel) {
    elements.productionAssetVariantLabel.value = formatEnumLabel(variant);
  }
  if (elements.productionAssetUploadForm) {
    elements.productionAssetUploadForm.reset();
  }
  if (elements.productionAssetFilesHint) {
    elements.productionAssetFilesHint.textContent = 'Dosya seçilmedi.';
  }
  setInlineModalStatus(elements.productionAssetModalStatus, '', false);
  updateProductionModalBusyStates();
  if (elements.productionAssetModal) {
    elements.productionAssetModal.hidden = false;
    elements.productionAssetModal.setAttribute('aria-hidden', 'false');
  }
}

function closeAssetUploadModal(force = false) {
  if (!force && state.busy.inlineAssetUpload) {
    return;
  }
  state.ui.modals.assetUpload = {
    open: false,
    family: '',
    variant: '',
  };
  if (elements.productionAssetUploadForm) {
    elements.productionAssetUploadForm.reset();
  }
  if (elements.productionAssetFilesHint) {
    elements.productionAssetFilesHint.textContent = 'Dosya seçilmedi.';
  }
  setInlineModalStatus(elements.productionAssetModalStatus, '', false);
  if (elements.productionAssetModal) {
    elements.productionAssetModal.hidden = true;
    elements.productionAssetModal.setAttribute('aria-hidden', 'true');
  }
}

function isAssetUploadModalOpen() {
  return Boolean(state.ui.modals?.assetUpload?.open);
}

async function uploadAssetFromProductionFlow() {
  const family = String(state.ui.modals?.assetUpload?.family || '').trim();
  const variant = String(state.ui.modals?.assetUpload?.variant || '').trim();
  const files = Array.from(elements.productionAssetFilesInput?.files || []);
  if (!family || !variant) {
    setInlineModalStatus(elements.productionAssetModalStatus, 'Önce bir stil ailesi seçin.', true);
    return;
  }
  if (files.length === 0) {
    setInlineModalStatus(elements.productionAssetModalStatus, 'En az bir referans görseli seçin.', true);
    return;
  }

  state.busy.inlineAssetUpload = true;
  updateProductionModalBusyStates();
  try {
    const formData = new FormData();
    formData.set('family', family);
    formData.set('variant', variant);
    for (const file of files) {
      formData.append('files[]', file, file.name);
    }

    const response = await fetch('/api/assets/upload', {
      method: 'POST',
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Referans yüklenemedi.');
    }

    await refreshProductionAssetLibrary();
    applyVisibleStylingSelection(family, 'asset', payload.asset_id);
    setInlineModalStatus(
      elements.productionAssetModalStatus,
      `${payload.asset_id} yüklendi ve ${getStylingPanelConfig(family).title} alanına bağlandı.`,
      false
    );
    closeAssetUploadModal(true);
    showStatus(`Referans yüklendi ve bağlandı: ${payload.asset_id}.`);
  } catch (error) {
    setInlineModalStatus(elements.productionAssetModalStatus, error.message || 'Referans yüklenemedi.', true);
  } finally {
    state.busy.inlineAssetUpload = false;
    updateProductionModalBusyStates();
  }
}

function openInputSetUploadModal() {
  state.ui.modals.inputSetUpload = {
    open: true,
  };
  if (elements.productionInputSetUploadForm) {
    elements.productionInputSetUploadForm.reset();
  }
  if (elements.productionInputSetFilesHint) {
    elements.productionInputSetFilesHint.textContent = 'Dosya seçilmedi.';
  }
  setInlineModalStatus(elements.productionInputSetModalStatus, '', false);
  updateProductionModalBusyStates();
  if (elements.productionInputSetModal) {
    elements.productionInputSetModal.hidden = false;
    elements.productionInputSetModal.setAttribute('aria-hidden', 'false');
  }
}

function closeInputSetUploadModal(force = false) {
  if (!force && state.busy.inlineInputUpload) {
    return;
  }
  state.ui.modals.inputSetUpload = {
    open: false,
  };
  if (elements.productionInputSetUploadForm) {
    elements.productionInputSetUploadForm.reset();
  }
  if (elements.productionInputSetFilesHint) {
    elements.productionInputSetFilesHint.textContent = 'Dosya seçilmedi.';
  }
  setInlineModalStatus(elements.productionInputSetModalStatus, '', false);
  if (elements.productionInputSetModal) {
    elements.productionInputSetModal.hidden = true;
    elements.productionInputSetModal.setAttribute('aria-hidden', 'true');
  }
}

function isInputSetUploadModalOpen() {
  return Boolean(state.ui.modals?.inputSetUpload?.open);
}

async function uploadInputSetFromProductionFlow() {
  const name = String(elements.productionInputSetNameInput?.value || '').trim();
  const files = Array.from(elements.productionInputSetFilesInput?.files || []);
  if (!name) {
    setInlineModalStatus(elements.productionInputSetModalStatus, 'Girdi kümesi adı zorunludur.', true);
    return;
  }
  if (files.length === 0) {
    setInlineModalStatus(elements.productionInputSetModalStatus, 'En az bir hedef görsel seçin.', true);
    return;
  }

  state.busy.inlineInputUpload = true;
  updateProductionModalBusyStates();
  try {
    const formData = new FormData();
    formData.set('name', name);
    for (const file of files) {
      formData.append('files[]', file, file.name);
    }

    const response = await fetch('/api/inputs/upload', {
      method: 'POST',
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Girdi kümesi yüklenemedi.');
    }

    await refreshManagedInputSets();
    populateSelect(elements.inputSource, getInputSourceOptions(payload.path));
    elements.inputSource.value = selectOrFirst(payload.path, getInputSourceOptions(payload.path), 'batch_input');
    syncStateFromForm();
    closeInputSetUploadModal(true);
    showStatus(`Girdi kümesi oluşturuldu ve seçildi: ${payload.name || payload.inputSetId}.`);
  } catch (error) {
    setInlineModalStatus(elements.productionInputSetModalStatus, error.message || 'Girdi kümesi yüklenemedi.', true);
  } finally {
    state.busy.inlineInputUpload = false;
    updateProductionModalBusyStates();
  }
}

function updateProductionModalBusyStates() {
  if (elements.productionAssetUploadButton) {
    elements.productionAssetUploadButton.disabled = state.busy.inlineAssetUpload;
    elements.productionAssetUploadButton.textContent = state.busy.inlineAssetUpload ? 'Yükleniyor...' : 'Yükle ve Bağla';
  }
  if (elements.closeProductionAssetModalButton) {
    elements.closeProductionAssetModalButton.disabled = state.busy.inlineAssetUpload;
  }
  if (elements.productionAssetFilesInput) {
    elements.productionAssetFilesInput.disabled = state.busy.inlineAssetUpload;
  }
  if (elements.productionInputSetUploadButton) {
    elements.productionInputSetUploadButton.disabled = state.busy.inlineInputUpload;
    elements.productionInputSetUploadButton.textContent = state.busy.inlineInputUpload ? 'Oluşturuluyor...' : 'Oluştur ve Seç';
  }
  if (elements.closeProductionInputSetModalButton) {
    elements.closeProductionInputSetModalButton.disabled = state.busy.inlineInputUpload;
  }
  if (elements.productionInputSetNameInput) {
    elements.productionInputSetNameInput.disabled = state.busy.inlineInputUpload;
  }
  if (elements.productionInputSetFilesInput) {
    elements.productionInputSetFilesInput.disabled = state.busy.inlineInputUpload;
  }
}

function setInlineModalStatus(element, message, isError) {
  if (!element) {
    return;
  }
  element.hidden = !message;
  element.textContent = message;
  element.classList.toggle('error', Boolean(isError));
}

async function refreshProductionAssetLibrary() {
  const response = await fetch('/api/assets/list');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Referans kütüphanesi yenilenemedi.');
  }
  state.assetLibrary = {
    assetsByFamily: payload.assetsByFamily || {},
  };
  refreshAssetSelectOptions();
  renderStylingUiState();
}

async function refreshManagedInputSets() {
  const response = await fetch('/api/inputs/list');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Girdi kümeleri yenilenemedi.');
  }
  state.managedInputSets = Array.isArray(payload.inputSets) ? payload.inputSets : [];
  const currentInputSource = String(elements.inputSource?.value || state.job?.inputSource || '').trim();
  populateSelect(elements.inputSource, getInputSourceOptions(currentInputSource));
  elements.inputSource.value = selectOrFirst(currentInputSource, getInputSourceOptions(currentInputSource), 'batch_input');
  renderInputSourceHint();
  renderInputSourceSummary();
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
  state.ui.model.identityReferenceName = file.name || 'konu_referansi';
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
      throw new Error('Başlangıç verileri yüklenemedi');
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
      showStatus('Üretim Akışı hazır.');
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
      showStatus(`Başlangıç yedeği devrede: ${error.message}`, true);
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
      throw new Error(payload.error || 'Toplu işler yüklenemedi.');
    }
    state.batchJobs = Array.isArray(payload.batches) ? payload.batches : [];
    renderBatchJobs();
  } catch (error) {
    showStatus(error.message || 'Toplu işler yüklenemedi.', true);
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
      throw new Error(payload.error || 'Toplu iş yenileme başarısız oldu.');
    }
    state.batchJobs = Array.isArray(payload.batches) ? payload.batches : [];
    renderBatchJobs();
    showStatus(payload.success ? 'Toplu iş durumları yenilendi.' : 'Toplu iş durumları uyarılarla yenilendi.', !payload.success);
  } catch (error) {
    showStatus(error.message || 'Toplu iş yenileme başarısız oldu.', true);
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
      throw new Error(payload.error || 'Toplu iş durumu yenilenemedi.');
    }
    upsertBatchState(payload.batch);
    renderBatchJobs();
    showStatus(`Toplu iş durumu yenilendi: ${batchName}`);
  } catch (error) {
    showStatus(error.message || 'Toplu iş durumu yenilenemedi.', true);
  } finally {
    setActionBusy('batchAction', false);
  }
}

async function cancelBatch(batchName) {
  if (!batchName) {
    return;
  }
  const approved = window.confirm(`"${batchName}" adlı toplu iş iptal edilsin mi?`);
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
      throw new Error(payload.error || 'Toplu iş iptal edilemedi.');
    }
    upsertBatchState(payload.batch);
    renderBatchJobs();
    showStatus(`Toplu iş iptal isteği gönderildi: ${batchName}`);
  } catch (error) {
    showStatus(error.message || 'Toplu iş iptal edilemedi.', true);
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
      throw new Error(payload.error || 'Toplu iş indirilemedi.');
    }
    upsertBatchState(payload.batch);
    renderBatchJobs();
    const saved = payload.download?.savedCount ?? 0;
    showStatus(`Toplu iş indirildi: ${batchName} (${saved} görsel)`);
  } catch (error) {
    showStatus(error.message || 'Toplu iş indirilemedi.', true);
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
      throw new Error(payload.error || 'Toplu iş çıktıları yüklenemedi.');
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
    state.outputsReview.error = error.message || 'Toplu iş çıktıları yüklenemedi.';
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
    elements.outputsModalTitle.textContent = 'Toplu İş Çıktıları';
    elements.outputsModalMeta.textContent = '-';
    elements.outputsModalBody.innerHTML = '';
    renderOutputsModeToggle();
    return;
  }

  elements.outputsModal.hidden = false;
  elements.outputsModal.setAttribute('aria-hidden', 'false');
  elements.outputsModalTitle.textContent = 'Toplu İş Çıktıları';
  const metaParts = [state.outputsReview.batchName || '-'];
  if (state.outputsReview.outputDir) {
    metaParts.push(state.outputsReview.outputDir);
  }
  elements.outputsModalMeta.textContent = metaParts.join(' | ');
  renderOutputsModeToggle();

  if (state.outputsReview.loading) {
    elements.outputsModalBody.innerHTML = '<div class="output-empty">Çıktılar yükleniyor...</div>';
    return;
  }

  if (state.outputsReview.error) {
    elements.outputsModalBody.innerHTML = `<div class="output-empty">${escapeHtml(state.outputsReview.error)}</div>`;
    return;
  }

  if (!Array.isArray(state.outputsReview.items) || state.outputsReview.items.length === 0) {
    elements.outputsModalBody.innerHTML = '<div class="output-empty">Bu toplu iş için henüz çıktı bulunamadı.</div>';
    return;
  }

  const mode = state.outputsReview.mode === 'compare' ? 'compare' : 'output';

  if (mode === 'output') {
    const outputItems = state.outputsReview.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => Boolean(item?.output?.url));
    if (outputItems.length === 0) {
      elements.outputsModalBody.innerHTML = '<div class="output-empty">Bu toplu iş için henüz çıktı bulunamadı.</div>';
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
                alt="${escapeAttribute(item.output.file || item.key || 'çıktı görseli')}"
                loading="lazy"
              />
            </button>
            <p class="output-thumb-name" title="${escapeAttribute(item.output.file || item.key || '')}">
              ${escapeHtml(item.output.file || item.key || 'Adsız çıktı')}
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
                <span class="output-thumb-label">Girdi</span>
                ${renderThumb(item.input, 'Girdi bulunamadı')}
              </div>
              <div class="output-thumb-slot">
                <span class="output-thumb-label">Çıktı</span>
                ${renderThumb(item.output, 'Çıktı yok')}
              </div>
            </div>
          </button>
          <p class="output-thumb-name" title="${escapeAttribute(item.key || '')}">
            ${escapeHtml(item.key || 'Anahtar yok')}
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
    elements.outputsImageModalTitle.textContent = 'Çıktı Önizlemesi';
    elements.outputsImageModalMeta.textContent = output?.file || key;
    elements.outputsLargeInputImage.hidden = true;
    elements.outputsLargeInputImage.src = '';
    elements.outputsLargeInputImage.alt = 'Toplu iş girdi önizlemesi';
    elements.outputsLargeInputEmpty.hidden = true;
    elements.outputsLargeInputEmpty.textContent = 'Girdi bulunamadı';
  } else {
    elements.outputsImageModalTitle.textContent = 'Girdi / Çıktı Karşılaştırması';
    elements.outputsImageModalMeta.textContent = key;
    if (input?.url) {
      elements.outputsLargeInputImage.hidden = false;
      elements.outputsLargeInputImage.src = input.url;
      elements.outputsLargeInputImage.alt = input.file || 'toplu iş girdi görseli';
      elements.outputsLargeInputEmpty.hidden = true;
    } else {
      elements.outputsLargeInputImage.hidden = true;
      elements.outputsLargeInputImage.src = '';
      elements.outputsLargeInputImage.alt = 'Toplu iş girdi önizlemesi';
      elements.outputsLargeInputEmpty.hidden = false;
      elements.outputsLargeInputEmpty.textContent = 'Girdi bulunamadı';
    }
  }

  if (output?.url) {
    elements.outputsLargeOutputImage.hidden = false;
    elements.outputsLargeOutputImage.src = output.url;
    elements.outputsLargeOutputImage.alt = output.file || 'toplu iş çıktı görseli';
    elements.outputsLargeOutputEmpty.hidden = true;
  } else {
    elements.outputsLargeOutputImage.hidden = true;
    elements.outputsLargeOutputImage.src = '';
    elements.outputsLargeOutputImage.alt = 'Toplu iş çıktı önizlemesi';
    elements.outputsLargeOutputEmpty.hidden = false;
    elements.outputsLargeOutputEmpty.textContent = 'Çıktı yok';
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
  elements.outputsLargeInputImage.alt = 'Toplu iş girdi önizlemesi';
  elements.outputsLargeInputEmpty.hidden = true;
  elements.outputsLargeInputEmpty.textContent = 'Girdi bulunamadı';
  elements.outputsLargeOutputImage.hidden = true;
  elements.outputsLargeOutputImage.src = '';
  elements.outputsLargeOutputImage.alt = 'Toplu iş çıktı önizlemesi';
  elements.outputsLargeOutputEmpty.hidden = true;
  elements.outputsLargeOutputEmpty.textContent = 'Çıktı yok';
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
  populateLabeledSelect(elements.eyewearAction, getAccessoryItemModes(), getAccessoryActionLabel);
  populateLabeledSelect(elements.bagAction, getAccessoryItemModes(), getAccessoryActionLabel);
  populateLabeledSelect(elements.footwearMode, getFootwearUiModes(), getFootwearActionLabel);
  populateLabeledSelect(elements.footwearSource, ['reference', 'system'], getSourceLabel);
  populateSelect(elements.footwearVariant, entities.footwear?.variants || ['sandal']);
  populateLabeledSelect(elements.headwearMode, getHeadwearUiModes(), getAccessoryActionLabel);
  populateLabeledSelect(elements.headwearSource, ['reference', 'system'], getSourceLabel);
  populateLabeledSelect(elements.headwearPlacement, getPlacementOptions('headwear'), getPlacementLabel);
  populateSelect(elements.headwearVariant, entities.headwear?.variants || ['bandana']);
  populateSelect(elements.accessoryMode, entities.accessory?.modes || ['apply', 'ignore']);
  populateSelect(elements.sceneMode, entities.scene?.modes || ['apply', 'preserve', 'ignore']);
  populateSelect(elements.sceneProfile, entities.scene?.profiles || ['studio_catalog']);
  populateSelect(elements.outputProfileMode, entities.output_profile?.modes || ['apply', 'ignore']);
  populateSelect(elements.outputProfileProfile, entities.output_profile?.profiles || ['catalog_4x5_2k']);
  populateSelect(elements.globalNegativeMode, entities.global_negative_rules?.modes || ['apply', 'ignore']);

  populateSelectWithEmptyState(elements.subjectReferenceId, entities.subject?.referenceIds || [], 'Konu referansı bulunamadı');
  populateSelectWithEmptyState(elements.subjectReferencePicker, entities.subject?.referenceIds || [], 'Konu referansı bulunamadı');
  populateLabeledSelect(elements.eyewearSource, ['reference', 'system'], getSourceLabel);
  populateLabeledSelect(elements.eyewearPlacement, getPlacementOptions('eyewear'), getPlacementLabel);
  populateLabeledSelect(elements.bagSource, ['reference', 'system'], getSourceLabel);
  populateLabeledSelect(elements.bagPlacement, getPlacementOptions('bag'), getPlacementLabel);
  refreshAssetSelectOptions();
}

function refreshAssetSelectOptions() {
  const currentEyewear = elements.eyewearAssetId?.value || '';
  const currentBag = elements.bagAssetId?.value || '';
  const currentFootwear = elements.footwearAssetId?.value || '';
  const currentHeadwear = elements.headwearAssetId?.value || '';
  elements.eyewearAssetId.innerHTML = renderAssetOptionList(getAccessoryAssets('eyewear'), currentEyewear, 'Uygun referans bulunamadı');
  elements.bagAssetId.innerHTML = renderAssetOptionList(getAccessoryAssets('bag'), currentBag, 'Uygun referans bulunamadı');
  elements.footwearAssetId.innerHTML = renderAssetOptionList(getFootwearAssets(), currentFootwear, 'Uygun referans bulunamadı');
  elements.headwearAssetId.innerHTML = renderAssetOptionList(getHeadwearAssets(), currentHeadwear, 'Uygun referans bulunamadı');
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
  if (elements.subjectReferencePicker) {
    elements.subjectReferencePicker.value = selectOrFirst(job.entities.subject.reference_id, getSubjectReferences(), '');
  }

  elements.garmentMode.value = selectOrFirst(job.entities.garment.mode, state.registry?.entities?.garment?.modes || ['preserve']);
  elements.garmentMaterialRefs.value = stringifyList(job.entities.garment.detail_refs.material);
  elements.garmentPatternRefs.value = stringifyList(job.entities.garment.detail_refs.pattern);

  elements.footwearMode.value = normalizeFootwearUiMode(job.entities.footwear.mode);
  elements.footwearSource.value = inferSourceFromEntity(job.entities.footwear, footwearModeUsesReference);
  elements.footwearVariant.value = selectOrFirst(job.entities.footwear.variant, state.registry?.entities?.footwear?.variants || ['sandal']);
  elements.footwearAssetId.value = selectOrValueOrEmpty(job.entities.footwear.asset_id, getFootwearAssets());

  elements.headwearMode.value = normalizeHeadwearUiMode(job.entities.headwear.mode);
  elements.headwearSource.value = inferSourceFromEntity(job.entities.headwear, headwearModeUsesReference);
  elements.headwearPlacement.value = normalizePlacementValue('headwear', job.entities.headwear.placement);
  elements.headwearVariant.value = selectOrFirst(job.entities.headwear.variant, state.registry?.entities?.headwear?.variants || ['bandana']);
  elements.headwearAssetId.value = selectOrValueOrEmpty(job.entities.headwear.asset_id, getHeadwearAssets());

  const eyewearItem = getPrimaryAccessoryItem(job, 'eyewear');
  const bagItem = getPrimaryAccessoryItem(job, 'bag');
  elements.eyewearAction.value = normalizeAccessoryItemUiMode(eyewearItem.mode);
  elements.eyewearSource.value = eyewearItem.source;
  elements.eyewearPlacement.value = normalizePlacementValue('eyewear', eyewearItem.placement);
  elements.eyewearAssetId.value = selectOrValueOrEmpty(eyewearItem.asset_id, getAccessoryAssets('eyewear'));
  elements.bagAction.value = normalizeAccessoryItemUiMode(bagItem.mode);
  elements.bagSource.value = bagItem.source;
  elements.bagPlacement.value = normalizePlacementValue('bag', bagItem.placement);
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
  const footwearSource = footwearModeUsesReference(footwearMode)
    ? normalizeSourceValue(elements.footwearSource?.value, Boolean(elements.footwearAssetId?.value))
    : 'system';
  const headwearMode = elements.headwearMode.value;
  const headwearSource = headwearModeUsesReference(headwearMode)
    ? normalizeSourceValue(elements.headwearSource?.value, Boolean(elements.headwearAssetId?.value))
    : 'system';
  const primaryAccessoryItems = [
    buildPrimaryAccessoryItem('eyewear'),
    buildPrimaryAccessoryItem('bag'),
  ];
  const extraAccessoryItems = getAdditionalAccessoryItems(accessoryItems).map(({ item }) => item);
  const nextAccessoryItems = primaryAccessoryItems.concat(normalizeAccessoryItemsForUi(extraAccessoryItems, { ensurePrimaryFamilies: false }));
  const nextAccessoryMode = 'apply';

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
        source: footwearSource,
        placement: 'on_feet',
        variant: elements.footwearVariant.value,
        asset_id: footwearModeUsesReference(footwearMode) && footwearSource === 'reference' ? elements.footwearAssetId.value : '',
      },
      headwear: {
        ...state.job.entities.headwear,
        mode: headwearMode,
        source: headwearSource,
        placement: normalizePlacementValue('headwear', elements.headwearPlacement?.value),
        variant: elements.headwearVariant.value,
        asset_id: headwearModeUsesReference(headwearMode) && headwearSource === 'reference'
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
    elements.accessoryItems.innerHTML = '<div class="empty-state">Ek stil satırı yok. Ana kartlar yetmediğinde boyun aksesuarı ya da başka bir aksesuar ekleyin.</div>';
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
  const source = draft.source;
  const placementOptions = getPlacementOptions(family);
  const placement = normalizePlacementValue(family, draft.placement);
  const usesPlacement = placementOptions.length > 1;
  const usesReference = accessoryModeUsesReference(mode) && source === 'reference';
  const assetValue = selectOrValueOrEmpty(draft.asset_id || item.asset_id, assetOptions);
  const supportsVariantControl = variants.length > 1;

  return `
    <section class="accessory-item styling-row-card">
      <div class="accessory-item-header">
        <div>
          <p class="accessory-item-title">${escapeHtml(getAccessoryFamilyLabel(family))}</p>
          <p class="accessory-item-subtitle">Ana stil kartları yetmediğinde bu ek satırı kullanın.</p>
        </div>
        <button class="button" type="button" data-action="remove-accessory" data-index="${index}">Kaldır</button>
      </div>
      <div class="field-grid accessory-row-grid">
        <label class="field">
          <span>Öğe</span>
          <select data-accessory-field="family" data-index="${index}">
            ${renderLabeledOptionList(getAccessoryFamilies(), family, getAccessoryFamilyLabel)}
          </select>
        </label>
        <label class="field field-primary">
          <span>Eylem</span>
          <select data-accessory-field="mode" data-index="${index}">
            ${renderLabeledOptionList(modes, mode, getAccessoryActionLabel)}
          </select>
        </label>
      </div>
      <p class="styling-helper">${escapeHtml(getAccessoryActionHint(family, mode))}</p>
      <div class="styling-dependent-fields${accessoryModeUsesReference(mode) ? '' : ' is-hidden'}">
        <div class="field-grid styling-dependent-grid">
          <label class="field">
            <span>Kaynak</span>
            <select data-accessory-field="source" data-index="${index}">
              ${renderLabeledOptionList(['reference', 'system'], source, getSourceLabel)}
            </select>
            <p class="field-hint">Belirli bir varlık için referansı kullanın. Sistem seçsin seçeneği davranışı otomatik tutar.</p>
          </label>
          ${usesPlacement ? `
            <label class="field">
              <span>Yerleşim</span>
              <select data-accessory-field="placement" data-index="${index}">
                ${renderLabeledOptionList(placementOptions, placement, getPlacementLabel)}
              </select>
              <p class="field-hint">Derleme sırasında kullanılmak üzere kanonik yerleşim niyeti olarak saklanır.</p>
            </label>
          ` : ''}
          ${supportsVariantControl ? `
            <label class="field">
              <span>Tür</span>
              <select data-accessory-field="variant" data-index="${index}">
                ${renderOptionList(variants, selectedVariant)}
              </select>
            </label>
          ` : ''}
          <label class="field field-block${usesReference ? '' : ' is-hidden'}${usesReference ? '' : ' is-disabled'}">
            <span>Referans Varlığı</span>
            <select data-accessory-field="asset_id" data-index="${index}"${usesReference ? '' : ' disabled'}>
              ${renderAssetOptionList(assetOptions, assetValue, 'Uygun referans bulunamadı')}
            </select>
            <p class="field-hint">${usesReference && assetOptions.length === 0 ? 'Uygun referans bulunamadı.' : ''}</p>
          </label>
        </div>
      </div>
    </section>
  `;
}

function applyAccessoryDraftToCanonicalItem(item, index, familyOverride = null) {
  const family = selectOrFirst(familyOverride || item?.family, getAccessoryFamilies());
  const draft = getAccessoryItemDraft(item, index, family);
  const assets = getAccessoryAssets(family);
  item.mode = normalizeAccessoryItemUiMode(item.mode);
  item.family = family;
  item.variant = selectOrFirst(draft.variant || item.variant, getAccessoryVariants(family), getAccessoryVariants(family)[0] || family);
  item.source = accessoryModeUsesReference(item.mode)
    ? normalizeSourceValue(draft.source, Boolean(draft.asset_id || item.asset_id))
    : 'system';
  item.placement = normalizePlacementValue(family, draft.placement || item.placement);
  item.asset_id = accessoryModeUsesReference(item.mode) && item.source === 'reference'
    ? selectOrValueOrEmpty(draft.asset_id || item.asset_id, assets)
    : '';
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
    draft.source = accessoryModeUsesReference(item.mode)
      ? normalizeSourceValue(draft.source, Boolean(draft.asset_id))
      : 'system';
    draft.placement = normalizePlacementValue(item.family, draft.placement || item.placement || placementOptions[0]);
    applyAccessoryDraftToCanonicalItem(item, index, item.family);
    renderAccessoryItems();
    renderStylingUiState();
    return;
  }

  if (field === 'variant' || field === 'asset_id' || field === 'source' || field === 'placement') {
    const draft = getAccessoryItemDraft(item, index, item.family);
    draft[field] = field === 'placement'
      ? normalizePlacementValue(item.family, target.value)
      : target.value;
    applyAccessoryDraftToCanonicalItem(item, index, item.family);
    if (field === 'source') {
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
    item.mode = normalizeAccessoryItemUiMode(item.mode);
    const draft = getAccessoryItemDraft(item, index, item.family);
    draft.source = accessoryModeUsesReference(item.mode)
      ? normalizeSourceValue(draft.source, Boolean(draft.asset_id || item.asset_id))
      : 'system';
    draft.placement = normalizePlacementValue(item.family, draft.placement || item.placement);
    applyAccessoryDraftToCanonicalItem(item, index, item.family);
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
      throw new Error(payload.error || 'Derleme başarısız oldu');
    }

    state.compiledPrompt = payload.prompt;
    state.compiledCanonicalJob = payload.canonicalJob;
    state.imageConfig = payload.imageConfig || null;
    state.validation = payload.validation || { errors: [], warnings: [] };
    state.compileError = '';
    state.lastCompileSucceeded = true;
    showStatus('Derleme başarılı.');
  } catch (error) {
    state.compiledPrompt = '';
    state.compiledCanonicalJob = null;
    state.imageConfig = null;
    state.compileError = error.message || 'Derleme başarısız oldu';
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
      throw new Error(payload.error || 'Kaydetme başarısız oldu');
    }

    const savedName = payload.saved?.name || null;
    await refreshJobsIndex(savedName);
      showStatus(`Taslak kaydedildi: ${payload.saved?.name || 'oluşturulan taslak'}`);
  } catch (error) {
    showStatus(error.message || 'Kaydetme başarısız oldu', true);
  } finally {
    setActionBusy('save', false);
  }
}

async function loadSelectedSavedJob() {
  const selected = elements.savedJobSelect.value;
  if (!selected) {
    showStatus('Kayıtlı bir iş seçilmedi.', true);
    return;
  }

  setActionBusy('loadSaved', true);
  try {
    const response = await fetch(`/api/job-builder/jobs/${encodeURIComponent(selected)}?source=generated`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Kayıtlı iş yüklenemedi');
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
    showStatus(`Taslak yüklendi: ${selected}`);
  } catch (error) {
    showStatus(error.message || 'Kayıtlı iş yüklenemedi', true);
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
      throw new Error(payload.error || 'Kuru kontrol başarısız oldu');
    }
    state.readiness = payload;
    renderReadiness();
    showStatus(payload.ready ? 'Kuru kontrol: hazır.' : 'Kuru kontrol: hazır değil.', !payload.ready);
  } catch (error) {
    state.readiness = {
      ready: false,
      errors: [error.message || 'Kuru kontrol başarısız oldu'],
      warnings: [],
    };
    renderReadiness();
    showStatus(error.message || 'Kuru kontrol başarısız oldu', true);
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
    command: 'node edit.js <oluşturulan-iş>',
    logs: 'Toplu çalışma sürüyor...',
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
      throw new Error(payload.error || 'Toplu çalışma başarısız oldu');
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
      logs: payload.logs || 'Kayıt yok.',
    };
    renderRunStatus();
    const completionMessage = payload.success
      ? 'Toplu çalışma tamamlandı. Durumu izlemek, çıktıları indirmek ve sonuçları gözden geçirmek için Toplu İşler alanını kullanın.'
      : 'Toplu çalışma başarısız oldu.';
    showStatus(completionMessage, !payload.success);
  } catch (error) {
    state.runStatus = {
      status: 'error',
      batchJobName: null,
      batchState: null,
      durationMs: null,
      command: state.runStatus.command,
      logs: error.message || 'Toplu çalışma başarısız oldu.',
    };
    renderRunStatus();
    showStatus(error.message || 'Toplu çalışma başarısız oldu.', true);
  } finally {
    setActionBusy('runBatch', false);
  }
}

function renderPreviews() {
  if (elements.promptPreview) {
    elements.promptPreview.textContent = state.compileError
      ? `Derleme başarısız:\n${state.compileError}`
      : (state.compiledPrompt || 'Üretilen istemi görmek için mevcut işi derleyin.');
  }

  if (elements.jsonPreview) {
    elements.jsonPreview.textContent = state.compiledCanonicalJob
      ? JSON.stringify(state.compiledCanonicalJob, null, 2)
      : 'Kanonik JSON önizlemesi burada görünür.';
  }

  if (elements.imageAspectRatio) {
    elements.imageAspectRatio.textContent = state.imageConfig?.aspectRatio || '-';
  }
  if (elements.imageSize) {
    elements.imageSize.textContent = state.imageConfig?.imageSize || '-';
  }
  if (elements.compileStatus) {
    elements.compileStatus.textContent = state.lastCompileSucceeded ? 'Hazır' : (state.compileError ? 'Başarısız' : 'Boşta');
  }
  if (elements.actionBarCompileStatus) {
    elements.actionBarCompileStatus.textContent = state.lastCompileSucceeded ? 'Hazır' : (state.compileError ? 'Başarısız' : 'Boşta');
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
    : '<li>Yok</li>';
  elements.validationErrors.innerHTML = hasErrors
    ? errors.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>Yok</li>';

  if (hasErrors) {
    elements.validationState.textContent = 'Doğrulama durumu: hata var.';
    elements.validationState.className = 'validation-state error';
    elements.validationSummary.textContent = `${errors.length} hata`;
  } else if (hasWarnings) {
    elements.validationState.textContent = 'Doğrulama durumu: uyarı var.';
    elements.validationState.className = 'validation-state warning';
    elements.validationSummary.textContent = `${warnings.length} uyarı`;
  } else {
    elements.validationState.textContent = state.lastCompileSucceeded
      ? 'Doğrulama durumu: temiz.'
      : (state.compileError ? 'Doğrulama durumu: özet üretilmeden önce derleme başarısız oldu.' : 'Doğrulama durumu: henüz derleme yapılmadı.');
    elements.validationState.className = state.compileError ? 'validation-state error' : 'validation-state ok';
    elements.validationSummary.textContent = state.compileError ? 'Başarısız' : 'Temiz';
  }
}

function renderReadiness() {
  if (!elements.readinessBadge || !elements.readinessInputExists || !elements.readinessInputCount || !elements.readinessRefsCount
    || !elements.readinessState || !elements.readinessWarnings || !elements.readinessErrors) {
    return;
  }
  const readiness = state.readiness;
  if (!readiness) {
    elements.readinessBadge.textContent = 'Bilinmiyor';
    if (elements.actionBarReadinessStatus) {
      elements.actionBarReadinessStatus.textContent = 'Bilinmiyor';
    }
    elements.readinessInputExists.textContent = '-';
    elements.readinessInputCount.textContent = '-';
    elements.readinessRefsCount.textContent = '-';
    elements.readinessState.textContent = 'Henüz kuru kontrol yapılmadı.';
    elements.readinessState.className = 'validation-state';
    elements.readinessWarnings.innerHTML = '<li>Yok</li>';
    elements.readinessErrors.innerHTML = '<li>Yok</li>';
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

  elements.readinessBadge.textContent = readiness.ready ? 'HAZIR' : 'HAZIR DEĞİL';
  if (elements.actionBarReadinessStatus) {
    elements.actionBarReadinessStatus.textContent = readiness.ready ? 'Hazır' : 'Hazır Değil';
  }
  elements.readinessInputExists.textContent = readiness.inputSource?.exists ? 'Evet' : 'Hayır';
  elements.readinessInputCount.textContent = String(readiness.inputSource?.fileCount ?? 0);
  elements.readinessRefsCount.textContent = String(refsCount);
  elements.readinessWarnings.innerHTML = warnings.length
    ? warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>Yok</li>';
  elements.readinessErrors.innerHTML = errors.length
    ? errors.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>Yok</li>';

  if (readiness.ready) {
    elements.readinessState.textContent = 'Kuru kontrol geçti. İş toplu çalıştırmaya hazır.';
    elements.readinessState.className = 'validation-state ok';
  } else if (errors.length > 0) {
    elements.readinessState.textContent = 'Kuru kontrol engelleyici hatalarla başarısız oldu.';
    elements.readinessState.className = 'validation-state error';
  } else {
    elements.readinessState.textContent = 'Kuru kontrolde uyarılar var.';
    elements.readinessState.className = 'validation-state warning';
  }
  renderConnectedResultSystem();
}

function renderRunStatus() {
  const statusLabel = getRunStatusLabel(state.runStatus.status);
  if (elements.runStatusBadge) {
    elements.runStatusBadge.textContent = statusLabel;
  }
  if (elements.actionBarBatchStatus) {
    elements.actionBarBatchStatus.textContent = statusLabel;
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
    elements.runLogs.textContent = state.runStatus.logs || 'Henüz çalıştırma yok.';
  }
}

function getRunStatusLabel(status) {
  if (status === 'running') {
    return 'Çalışıyor';
  }
  if (status === 'success') {
    return 'Tamamlandı';
  }
  if (status === 'error') {
    return 'Hata';
  }
  return 'Boşta';
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
      ? `Etkin toplu iş: ${activeBatch.batchName}`
      : 'İptal edilecek bekleyen ya da çalışan bir toplu iş yok.';
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
  const footwearMode = normalizeFootwearUiMode(nextJob.entities?.footwear?.mode);
  const headwearMode = normalizeHeadwearUiMode(nextJob.entities?.headwear?.mode);
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
    studio_cleanup: 'Seçili girdileri stüdyo hazır katalog çıktısına dönüştürün.',
    face_identity: 'Model / konu kimliği ayarlarına ve ilgili referans kullanımına odaklanın.',
    styling: 'İlgisiz kontrolleri açmadan giyilen öğe ve görünür stil değişikliklerine odaklanın.',
    advanced: 'Gelişmiş geçersiz kılmalar ve iç araçlar dahil tam düzenleme yüzeyini kullanın.',
  };
  const visibleSummaries = {
    studio_cleanup: 'Şu an görünenler: temel kurulum, model / konu temeli, ürün / giysi temeli, çıktı tipi, hazırlık ve çalıştırma.',
    face_identity: 'Şu an görünenler: temel kurulum, model / konu kimliği kontrolleri, çıktı tipi, hazırlık ve çalıştırma.',
    styling: 'Şu an görünenler: temel kurulum, stil / giyilen öğeler, çıktı tipi, hazırlık ve çalıştırma.',
    advanced: 'Şu an görünenler: tam düzenleme yüzeyi, gelişmiş giysi kontrolleri, iç araçlar, hazırlık ve çalıştırma.',
  };
  const configurationHints = {
    studio_cleanup: 'Temizlik akışı için yalnızca temel ayarları kullanın: model / konu ve ürün / giysi temeli.',
    face_identity: 'Yapılandırmayı model / konu davranışı ve kimlik referansı üzerinde tutun.',
    styling: 'Yapılandırmayı ayakkabı, başlık ve aksesuar kararlarına odaklayın.',
    advanced: 'Gelişmiş giysi ve iç kontrol alanları dahil tüm yapılandırma bölümleri açıktır.',
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
  const footwearMode = normalizeFootwearUiMode(elements.footwearMode?.value);
  const footwearSource = normalizeSourceValue(
    elements.footwearSource?.value,
    footwearModeUsesReference(footwearMode) && Boolean(elements.footwearAssetId?.value)
  );
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
  elements.footwearCard?.classList.toggle('is-passive', false);
  elements.footwearModeHint.textContent = getFootwearModeHint(footwearMode);
  if (elements.footwearAssetHint) {
    elements.footwearAssetHint.textContent = footwearUsesReference && getFootwearAssets().length === 0
      ? 'Uygun referans bulunamadı.'
      : '';
  }

  const headwearMode = normalizeHeadwearUiMode(elements.headwearMode?.value);
  const headwearSource = normalizeSourceValue(
    elements.headwearSource?.value,
    headwearModeUsesReference(headwearMode) && Boolean(elements.headwearAssetId?.value)
  );
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
  elements.headwearCard?.classList.toggle('is-passive', false);
  elements.headwearModeHint.textContent = getHeadwearModeHint(headwearMode);
  if (elements.headwearAssetHint) {
    elements.headwearAssetHint.textContent = headwearUsesReference && getHeadwearAssets().length === 0
      ? 'Uygun referans bulunamadı.'
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
      const indicatorText = downloadNeeded ? '[DL] İndirme gerekli' : (batch.downloaded ? '[OK] İndirildi' : '[--] İndirilmedi');
      const errorText = batch.lastError ? `<p class="batch-job-meta">Hata: ${escapeHtml(batch.lastError)}</p>` : '';

      return `
        <article class="batch-job-card">
          <div class="batch-job-header">
            <p class="batch-job-name" title="${escapeAttribute(batchName)}">${escapeHtml(batchName)}</p>
            <span class="status-badge ${statusClass}">${escapeHtml(status)}</span>
          </div>
          <p class="batch-job-meta">Kaynak: ${escapeHtml(source)}</p>
          <p class="batch-job-meta">Oluşturulma: ${escapeHtml(createdAt)}</p>
          <p class="batch-job-meta">Son kontrol: ${escapeHtml(lastChecked)}</p>
          <div class="batch-indicators">
            <span class="indicator-pill ${indicatorClass}">${escapeHtml(indicatorText)}</span>
            <span class="indicator-pill">${cancelled ? 'İptal işareti: evet' : 'İptal işareti: hayır'}</span>
          </div>
          ${errorText}
          <div class="batch-actions">
            <button class="button button-small button-secondary" data-batch-action="refresh" data-batch-name="${escapeAttribute(batchName)}"${refreshDisabled}>Durumu Yenile</button>
            <button class="button button-small" data-batch-action="download" data-batch-name="${escapeAttribute(batchName)}"${downloadDisabled}>İndir</button>
            <button class="button button-small button-secondary" data-batch-action="view-outputs" data-batch-name="${escapeAttribute(batchName)}"${outputsDisabled}>Çıktıları Gör</button>
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
    : '<li>Yok</li>';
  elements.sampleJobsList.innerHTML = sample.length
    ? sample.map((item) => `<li>${escapeHtml(item.name)}</li>`).join('')
    : '<li>Yok</li>';

  if (generated.length === 0) {
    elements.savedJobSelect.innerHTML = '<option value="">Kayıtlı iş yok</option>';
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
  elements.compileButton.textContent = state.busy.compile ? 'Derleniyor...' : 'Derle';

  elements.saveJobButton.disabled = state.busy.save;
  elements.saveJobButton.textContent = state.busy.save ? 'Taslak kaydediliyor...' : 'Taslağı Kaydet';

  elements.loadSavedJobButton.disabled = state.busy.loadSaved;
  elements.loadSavedJobButton.textContent = state.busy.loadSaved ? 'Taslak yükleniyor...' : 'Taslağı Yükle';
  elements.savedJobSelect.disabled = state.busy.loadSaved || !((state.jobs?.generated || []).length);

  elements.runDryCheckButton.disabled = state.busy.dryCheck;
  elements.runDryCheckButton.textContent = state.busy.dryCheck ? 'Kontrol ediliyor...' : 'Kuru Kontrol';

  elements.runBatchButton.disabled = state.busy.runBatch;
  elements.runBatchButton.textContent = state.busy.runBatch ? 'Çalışıyor...' : 'Toplu Çalıştır';
  if (elements.runSpinner) {
    elements.runSpinner.hidden = !state.busy.runBatch;
  }

  const batchBusy = state.busy.refreshBatches || state.busy.batchAction;
  if (elements.refreshAllBatchesButton) {
    elements.refreshAllBatchesButton.disabled = batchBusy;
    elements.refreshAllBatchesButton.textContent = state.busy.batchAction ? 'Yenileniyor...' : 'Tümünü Yenile';
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
      message: 'Bekleyen girdi kümesi bağı uygulanamadı.',
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
      message: 'Bekleyen varlık bağı uygulanamadı.',
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
      message: 'Girdi kümesi bağlama verisi geçersiz.',
    };
  }

  const managed = state.managedInputSets || [];
  const setItem = managed.find((item) => item.inputSetId === inputSetId || item.path === inputSource);
  if (!setItem) {
    return {
      changed: false,
      isError: true,
      message: `Bağlanacak girdi kümesi bulunamadı: ${inputSetId}`,
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
      ? `${setItem.inputSetId} girdi kaynağına uygulandı.`
      : `${setItem.inputSetId} zaten seçili girdi kaynağı.`,
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
      message: 'Varlık bağlama verisi geçersiz.',
    };
  }

  const job = mergeDefaultJob(state.job);
  let changed = false;

  if (family === 'footwear') {
    const entity = job.entities.footwear;
    if (!footwearModeUsesReference(entity.mode)) {
      entity.mode = 'replace';
      changed = true;
    }
    if (entity.source !== 'reference') {
      entity.source = 'reference';
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
        ? `${assetId} Ayakkabı alanına bağlandı.`
        : `${assetId} zaten Ayakkabı alanına bağlı.`,
    };
  }

  if (family === 'headwear') {
    const entity = job.entities.headwear;
    if (!headwearModeUsesReference(entity.mode)) {
      entity.mode = 'add';
      changed = true;
    }
    if (entity.source !== 'reference') {
      entity.source = 'reference';
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
        ? `${assetId} Başlık alanına bağlandı.`
        : `${assetId} zaten Başlık alanına bağlı.`,
    };
  }

  if (family === 'eyewear' || family === 'bag' || family === 'neckwear') {
    const accessory = job.entities.accessory;
    if (accessory.mode !== 'apply') {
      accessory.mode = 'apply';
      changed = true;
    }

    const items = Array.isArray(accessory.items) ? accessory.items : [];
    const identical = items.find((item) => (
      item?.family === family
      && item?.asset_id === assetId
      && accessoryModeUsesReference(item?.mode)
      && item?.source === 'reference'
    ));
    if (identical) {
      state.job = job;
        return {
        changed,
        isError: false,
        message: `${assetId} zaten Aksesuar > ${family} alanına bağlı.`,
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
      if (!accessoryModeUsesReference(current.mode)) {
        current.mode = 'add';
        changed = true;
      }
      if (current.source !== 'reference') {
        current.source = 'reference';
        changed = true;
      }
    } else {
      items.push({
        family,
        variant: resolvedVariant || variant || family,
        mode: 'add',
        source: 'reference',
        placement: normalizePlacementValue(family, undefined),
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
        ? `${assetId} Aksesuar > ${family} alanına bağlandı.`
        : `${assetId} zaten Aksesuar > ${family} alanına bağlı.`,
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
        ? `${assetId} Giysi > Kumaş detayları alanına bağlandı.`
        : `${assetId} zaten Giysi > Kumaş detayları alanında.`,
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
        ? `${assetId} Giysi > Desen detayları alanına bağlandı.`
        : `${assetId} zaten Giysi > Desen detayları alanında.`,
    };
  }

  return {
    changed: false,
    isError: true,
    message: `Bu varlık ailesi için bağlama desteklenmiyor: ${family}`,
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
    logs: 'Henüz çalıştırma yok.',
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
    showStatus(`Kopyalama başarısız: ${error.message}`, true);
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

function footwearModeUsesReference(mode) {
  return mode === 'replace';
}

function headwearModeUsesReference(mode) {
  return mode === 'add' || mode === 'replace';
}

function getFootwearUiModes() {
  return ['preserve', 'replace', 'remove'];
}

function getHeadwearUiModes() {
  return ['preserve', 'add', 'replace', 'remove'];
}

function normalizeFootwearUiMode(mode) {
  return mode === 'ignore'
    ? 'preserve'
    : selectOrFirst(mode, getFootwearUiModes(), 'preserve');
}

function normalizeHeadwearUiMode(mode) {
  return mode === 'ignore'
    ? 'preserve'
    : selectOrFirst(mode, getHeadwearUiModes(), 'preserve');
}

function normalizeAccessoryItemUiMode(mode) {
  return mode === 'ignore'
    ? 'preserve'
    : selectOrFirst(mode, getAccessoryItemModes(), 'preserve');
}

function normalizeSourceValue(source, fallbackReference) {
  return source === 'reference' || source === 'system'
    ? source
    : (fallbackReference ? 'reference' : 'system');
}

function getDefaultPlacement(kind) {
  return kind === 'footwear' ? 'on_feet' : 'auto';
}

function normalizePlacementValue(kind, placement) {
  return selectOrFirst(placement, getPlacementOptions(kind), getDefaultPlacement(kind));
}

function normalizeAccessoryItemsForUi(items, options = {}) {
  const ensurePrimaryFamilies = options.ensurePrimaryFamilies !== false;
  const normalizedItems = (Array.isArray(items) ? items : []).map((item) => {
    const family = selectOrFirst(item?.family, getAccessoryFamilies());
    const mode = normalizeAccessoryItemUiMode(item?.mode);
    const normalizedItem = {
      ...item,
      family,
      mode,
    };
    return {
      ...normalizedItem,
      asset_id: accessoryModeUsesReference(mode) ? String(item?.asset_id || '') : '',
      source: inferSourceFromItem(normalizedItem),
      placement: inferPlacementFromItem(normalizedItem, family),
    };
  });

  if (!ensurePrimaryFamilies) {
    return normalizedItems;
  }

  const primaryItems = ['eyewear', 'bag'].map((family) => (
    normalizedItems.find((item) => item?.family === family) || createPrimaryAccessoryItem(family)
  ));
  const extraItems = getAdditionalAccessoryItems(normalizedItems).map(({ item }) => item);
  return primaryItems.concat(extraItems);
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
      placement: inferPlacementFromItem(item, family),
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
    placement: inferPlacementFromItem(item, family),
  };
  state.stylingDrafts.accessoryItems[index] = nextDraft;
  return nextDraft;
}

function normalizeStylingUiJob(job) {
  const nextJob = mergeDefaultJob(job);
  nextJob.entities.footwear.mode = normalizeFootwearUiMode(nextJob.entities.footwear.mode);
  nextJob.entities.headwear.mode = normalizeHeadwearUiMode(nextJob.entities.headwear.mode);
  const footwearSource = inferSourceFromEntity(nextJob.entities.footwear, footwearModeUsesReference);
  if (!footwearModeUsesReference(nextJob.entities.footwear.mode) || footwearSource !== 'reference') {
    nextJob.entities.footwear.asset_id = '';
  }
  nextJob.entities.footwear.source = footwearSource;
  nextJob.entities.footwear.placement = 'on_feet';

  const headwearSource = inferSourceFromEntity(nextJob.entities.headwear, headwearModeUsesReference);
  if (!headwearModeUsesReference(nextJob.entities.headwear.mode) || headwearSource !== 'reference') {
    nextJob.entities.headwear.asset_id = '';
  }
  nextJob.entities.headwear.source = headwearSource;
  nextJob.entities.headwear.placement = normalizePlacementValue('headwear', nextJob.entities.headwear.placement);
  nextJob.entities.accessory.mode = 'apply';
  nextJob.entities.accessory.items = normalizeAccessoryItemsForUi(nextJob.entities.accessory.items);
  return nextJob;
}

function getFootwearModeHint(mode) {
  if (mode === 'replace') {
    return 'Değiştir: yüklenen ayakkabı referansını yetkili geçersiz kılma kaynağı olarak uygula.';
  }
  if (mode === 'preserve') {
    return 'Koru: hedef görseldeki mevcut ayakkabı durumuna sadık kal.';
  }
  if (mode === 'remove') {
    return 'Kaldır: ayakkabı sonuçtan çıkarılır.';
  }
  return 'Eski Yok Say yalnızca uyumluluk için tutulur; yeni işlerde Koru kullanılmalıdır.';
}

function getHeadwearModeHint(mode) {
  if (mode === 'preserve') {
    return 'Koru: hedef görseldeki mevcut başlık durumunu koru; yüklenen varlık yetki kazanmaz.';
  }
  if (mode === 'add') {
    return 'Ekle: referans kaynağı açıkken yüklenen başlık referansını yeni ekleme olarak uygula.';
  }
  if (mode === 'replace') {
    return 'Değiştir: yüklenen başlık referansını yetkili geçersiz kılma kaynağı olarak uygula.';
  }
  if (mode === 'remove') {
    return 'Kaldır: başlık sonuçtan çıkarılır.';
  }
  return 'Eski Yok Say yalnızca uyumluluk için tutulur; yeni işlerde Koru kullanılmalıdır.';
}

function getSubjectReferences() {
  return state.registry?.entities?.subject?.referenceIds || [];
}

function getFootwearAssets() {
  return uniqueStrings([
    ...(state.registry?.entities?.footwear?.assetIds || []),
    ...getLibraryAssetIds('footwear'),
  ]);
}

function getHeadwearAssets() {
  return uniqueStrings([
    ...(state.registry?.entities?.headwear?.assetIds || []),
    ...getLibraryAssetIds('headwear'),
  ]);
}

function getLibraryAssetIds(family) {
  const items = Array.isArray(runtimeState?.assetLibrary?.assetsByFamily?.[family]) ? runtimeState.assetLibrary.assetsByFamily[family] : [];
  return items
    .map((item) => String(item?.asset_id || '').trim())
    .filter(Boolean);
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
    elements.inputSourceHint.textContent = `${state.managedInputSets.length} yönetilen girdi kümesi hazır. Buradan yeni küme oluşturabilir ya da Girdi Kümelerini Yönet alanına geçebilirsiniz.`;
  } else {
    elements.inputSourceHint.textContent = 'Henüz yönetilen girdi kümesi yok. Buradan oluşturabilir ya da Girdi Kümelerini Yönet alanını kullanabilirsiniz.';
  }
}

function renderInputSourceSummary() {
  if (!elements.inputSourceSummary) {
    return;
  }
  const selectedPath = String(elements.inputSource?.value || state.job?.inputSource || '').trim();
  if (!selectedPath) {
    elements.inputSourceSummary.textContent = 'Henüz bir girdi kaynağı seçilmedi.';
  } else {
    const managedSet = (state.managedInputSets || []).find((setItem) => String(setItem.path || '').trim() === selectedPath);
    if (managedSet) {
      const fileCount = Number(managedSet.fileCount || 0);
      elements.inputSourceSummary.textContent = `${managedSet.name || managedSet.inputSetId || selectedPath} • ${fileCount} görsel`;
    } else if (selectedPath === 'batch_input') {
      elements.inputSourceSummary.textContent = 'Bu çalışma için varsayılan batch_input klasörü kullanılıyor.';
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
    ? 'Bu taslak şu anda varsayılan çıktı davranışını kullanıyor.'
    : `Etkin çıktı profili: ${profile || 'varsayılan'}.`;
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
    ['Hedef girdiler', getInputSourceSummaryValue()],
    ['Akış', getWorkflowLabel(state.workflowType)],
    ['Model / Konu', `${getIdentityModeLabel(state.ui.model.identityMode)}${job.entities.subject.reference_id ? ` • ${job.entities.subject.reference_id}` : ''}`],
    ['Ürün / Giysi', getProductLayerSummary()],
    ['Stil / Aksesuar', stylingParts.length > 0 ? stylingParts.join(' • ') : 'Aktif stil kararı yok'],
    ['Çıktı', job.entities.output_profile.mode === 'ignore'
      ? 'Varsayılan çıktı davranışı'
      : (job.entities.output_profile.profile || 'Varsayılan çıktı davranışı')],
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

}

function renderVisibleModelShell() {
  if (!elements.identityModeControl) {
    return;
  }

  applySegmentedState(elements.identityModeButtons, state.ui.model.identityMode, 'identityMode');
  if (elements.identityHelperText) {
    elements.identityHelperText.textContent = getIdentityModeHelperText(state.ui.model.identityMode);
  }
  if (elements.subjectReferencePickerField) {
    elements.subjectReferencePickerField.hidden = state.ui.model.identityMode === 'ignore';
  }
  if (elements.subjectReferencePicker) {
    elements.subjectReferencePicker.value = selectOrFirst(elements.subjectReferenceId?.value || '', getSubjectReferences(), '');
  }
  if (elements.subjectReferencePickerHint) {
    elements.subjectReferencePickerHint.textContent = getSubjectReferences().length > 0
      ? 'Üretim Akışı içinden mevcut bir konu referansı seçin.'
      : 'Bu çalışma alanında yönetilen konu referansı bulunamadı.';
  }
  if (elements.identityReplaceDropzone) {
    elements.identityReplaceDropzone.hidden = state.ui.model.identityMode !== 'replace';
  }
  if (elements.identityReferencePreview) {
    const hasPreview = Boolean(state.ui.model.identityPreviewUrl);
    elements.identityReferencePreview.hidden = !hasPreview;
    if (hasPreview && elements.identityReferencePreviewImage && elements.identityReferenceName) {
      elements.identityReferencePreviewImage.src = state.ui.model.identityPreviewUrl;
      elements.identityReferenceName.textContent = state.ui.model.identityReferenceName || 'konu_referansi';
    } else if (elements.identityReferencePreviewImage && elements.identityReferenceName) {
      elements.identityReferencePreviewImage.src = '';
      elements.identityReferenceName.textContent = 'Dosya seçilmedi';
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
    elements.productHelperText.textContent = getProductLayerHelperText();
  }

  const preview = getPrimaryInputPreview();
  if (preview?.url && elements.productBeforeImage && elements.productBeforeEmpty) {
    elements.productBeforeImage.src = preview.url;
    elements.productBeforeImage.alt = preview.fileName || 'Seçili girdi önizlemesi';
    elements.productBeforeImage.hidden = false;
    elements.productBeforeEmpty.hidden = true;
  } else if (elements.productBeforeImage && elements.productBeforeEmpty) {
    elements.productBeforeImage.hidden = true;
    elements.productBeforeImage.src = '';
    elements.productBeforeEmpty.hidden = false;
  }

  renderProductGroupContext();
  renderProductReferenceSummary();
}

function getGarmentDetailRefs() {
  const job = mergeDefaultJob(state.job);
  return {
    material: Array.isArray(job.entities?.garment?.detail_refs?.material)
      ? job.entities.garment.detail_refs.material.filter(Boolean)
      : [],
    pattern: Array.isArray(job.entities?.garment?.detail_refs?.pattern)
      ? job.entities.garment.detail_refs.pattern.filter(Boolean)
      : [],
  };
}

function getProductGroupContextSummary() {
  const selectedSet = getSelectedManagedInputSet();
  const images = resolveManagedSetImages(selectedSet);
  const inputSource = getInputSourceSummaryValue();
  const imageCount = Number(selectedSet?.fileCount || images.length || 0);
  const groupName = selectedSet?.name || selectedSet?.inputSetId || inputSource;
  const rangeNote = selectedSet
    ? (imageCount > 1
      ? 'Kümedeki tüm açılar tek ürün grubu olarak ele alınır.'
      : 'Bu giriş tek ürün grubu olarak ele alınır.')
    : 'Referanslar görsel tek tek değil, ürün grubu düzeyinde bağlanır.';

  return {
    groupName,
    imageCount,
    createdAt: formatDateLabel(selectedSet?.createdAt || '-'),
    scopeLabel: 'Ürün bazlı uygulama',
    selectionLabel: 'Ürün grubu',
    rangeNote,
  };
}

function renderProductGroupContext() {
  if (!elements.productGroupContext) {
    return;
  }

  const context = getProductGroupContextSummary();
  elements.productGroupContext.innerHTML = `
    <div class="product-group-card">
      <div class="product-group-header">
        <strong>${escapeHtml(context.groupName)}</strong>
        <span class="product-group-badge">${escapeHtml(context.scopeLabel)}</span>
      </div>
      <div class="product-group-meta">
        <div class="product-group-meta-item">
          <span class="review-card-label">${escapeHtml(context.selectionLabel)}</span>
          <strong>${escapeHtml(context.groupName)}</strong>
        </div>
        <div class="product-group-meta-item">
          <span class="review-card-label">Görünüm Sayısı</span>
          <strong>${escapeHtml(String(context.imageCount || '-'))}</strong>
        </div>
        <div class="product-group-meta-item">
          <span class="review-card-label">Bağlantı Mantığı</span>
          <strong>Bu ürün grubuna bağla</strong>
        </div>
      </div>
      <p class="product-group-note">${escapeHtml(context.rangeNote)}</p>
    </div>
  `;
}

function renderProductReferenceSummary() {
  if (!elements.productReferenceSummary) {
    return;
  }

  const refs = getGarmentDetailRefs();
  const totalRefs = refs.material.length + refs.pattern.length;
  const cards = [
    {
      title: 'Kumaş Referansı',
      count: refs.material.length,
      tone: refs.material.length > 0 ? 'is-linked' : '',
      note: refs.material.length > 0
        ? 'Malzeme ve yüzey karakterini güçlendirir.'
        : 'Henüz referans bağlı değil.',
      values: refs.material,
    },
    {
      title: 'Desen / Doku Referansı',
      count: refs.pattern.length,
      tone: refs.pattern.length > 0 ? 'is-linked' : '',
      note: refs.pattern.length > 0
        ? 'Desen ve doku yönünü korur.'
        : 'Henüz referans bağlı değil.',
      values: refs.pattern,
    },
    {
      title: 'Detay Referansları',
      count: totalRefs,
      tone: totalRefs > 0 ? 'is-linked' : '',
      note: totalRefs > 0
        ? 'Bağlı referanslar uygun görünümlere ürün bazlı uygulanır.'
        : 'Referanslar ürün grubu bağlamında kullanılacaktır.',
      values: totalRefs > 0 ? [`${totalRefs} referans bağlı`] : [],
    },
  ];

  elements.productReferenceSummary.innerHTML = cards
    .map((card) => `
      <article class="product-reference-card ${escapeAttribute(card.tone)}">
        <div class="product-reference-top">
          <div>
            <p class="product-reference-title">${escapeHtml(card.title)}</p>
            <p class="product-reference-note">${escapeHtml(card.note)}</p>
          </div>
          <span class="product-reference-count">${escapeHtml(String(card.count))}</span>
        </div>
        <div class="product-reference-pills">
          ${card.values.length > 0
            ? card.values.map((value) => `<span class="product-reference-pill">${escapeHtml(value)}</span>`).join('')
            : '<span class="product-reference-empty">Referans yok</span>'}
        </div>
      </article>
    `)
    .join('');
}

function getProductLayerSummary() {
  const refs = getGarmentDetailRefs();
  const parts = [getProductIntentLabel(state.ui.productIntent), 'Ürün bazlı uygulama'];
  if (refs.material.length > 0) {
    parts.push(`${refs.material.length} kumaş referansı`);
  }
  if (refs.pattern.length > 0) {
    parts.push(`${refs.pattern.length} desen / doku referansı`);
  }
  return parts.join(' • ');
}

function getProductLayerHelperText() {
  const refs = getGarmentDetailRefs();
  if (refs.material.length === 0 && refs.pattern.length === 0) {
    return `${getProductIntentHelperText(state.ui.productIntent)} Ürün grubu düzeyinde uygulanır.`;
  }
  return `Ürün bazlı uygulama • ${refs.material.length} kumaş • ${refs.pattern.length} desen / doku`;
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
            <span class="review-card-label">Küme Adı</span>
            <strong>${escapeHtml(selectedPath)}</strong>
          </div>
          <div class="input-set-meta-item">
            <span class="review-card-label">Görsel Sayısı</span>
            <strong>-</strong>
          </div>
          <div class="input-set-meta-item">
            <span class="review-card-label">Yükleme Tarihi</span>
            <strong>-</strong>
          </div>
        </div>
        <div class="preview-frame input-set-primary-frame">
          <div class="preview-empty">Bu kaynak için yönetilen girdi kümesi önizlemesi yok.</div>
        </div>
      </div>
    `;
    return;
  }

  const previewMarkup = preview?.url
    ? `<img src="${escapeAttribute(preview.url)}" alt="${escapeAttribute(preview.fileName || setItem.name || setItem.inputSetId)}" loading="lazy" />`
    : '<div class="preview-empty">Bu küme için önizlenebilir görsel bulunamadı.</div>';

  const thumbsMarkup = thumbImages.length > 0
    ? thumbImages
      .map((image) => `
        <div class="input-set-thumb">
          <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.fileName)}" loading="lazy" />
        </div>
      `)
      .join('')
    : '<div class="styling-panel-note">Girdi kümesinde birden fazla görsel varsa destekleyici küçük önizlemeler burada görünür.</div>';

  elements.targetInputSummary.innerHTML = `
    <div class="input-set-selected-card">
      <div class="input-set-meta-grid">
        <div class="input-set-meta-item">
          <span class="review-card-label">Küme Adı</span>
          <strong>${escapeHtml(setItem.name || setItem.inputSetId)}</strong>
        </div>
        <div class="input-set-meta-item">
          <span class="review-card-label">Görsel Sayısı</span>
          <strong>${escapeHtml(String(setItem.fileCount || images.length || 0))}</strong>
        </div>
        <div class="input-set-meta-item">
          <span class="review-card-label">Yükleme Tarihi</span>
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
  if (state.ui.styling.openPanel && !families.includes(state.ui.styling.openPanel)) {
    state.ui.styling.openPanel = '';
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
        <span class="styling-control-group-label">Kaynak</span>
        <div class="segmented-control segmented-control-wide">
          ${renderStylingOptionButtons(family, 'source', ['reference', 'system'], config.source, getShortSourceLabel)}
        </div>
      </div>
    `
    : '';
  const placementMarkup = showPlacement
    ? `
      <div class="styling-control-group">
        <span class="styling-control-group-label">Yerleşim</span>
        <div class="pill-group">
          ${renderStylingOptionButtons(family, 'placement', config.placementOptions, config.placement, getPlacementLabel, 'pill')}
        </div>
      </div>
    `
    : '';
  const variantMarkup = showVariant
    ? `
      <div class="styling-control-group">
        <span class="styling-control-group-label">Tür</span>
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
          <span class="styling-control-group-label">Referans Seçimi</span>
          <div class="styling-thumb-strip">
            ${assetChoices.map((asset) => renderStylingAssetChoice(family, asset, config.assetId)).join('')}
          </div>
        </div>
      `
      : '<div class="styling-empty-strip">Bu aile için henüz uygun referans varlığı yok.</div>')
    : '';
  const uploadMarkup = config.isActionActive
    ? `
      <div class="styling-upload-row">
        <p class="styling-panel-note">${escapeHtml(config.note)}</p>
        <div class="action-strip production-flow-secondary-actions">
          <button class="button button-secondary" type="button" data-styling-upload="${escapeAttribute(family)}">Referans Yükle</button>
          <a class="button button-outline" href="/asset-manager">Tüm Referansları Yönet</a>
        </div>
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
            <span class="styling-control-group-label">Eylem</span>
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
      label: 'Hedef Girdiler',
      value: getSelectedManagedInputSet()?.name || getInputSourceSummaryValue(),
      summary: getSelectedManagedInputSet()
        ? `${getSelectedManagedInputSet().fileCount || 0} görsel`
        : 'Girdi kümesi bekleniyor',
    },
    {
      label: 'Model / Konu',
      value: getIdentityModeLabel(state.ui.model.identityMode),
      summary: getCompactModelReviewSummary([
        ...state.ui.model.physicalCorrections,
        ...state.ui.model.aestheticEnhancements,
        ...state.ui.model.constraints,
      ]),
    },
    {
      label: 'Ürün / Giysi',
      value: getProductLayerSummary(),
      summary: getCompactProductReviewSummary(),
    },
    {
      label: 'Stil / Aksesuar',
      value: getOverallStylingValue(),
      summary: getCompactStylingReviewSummary(),
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
  renderCompileInspectPanel();
  renderVariationStrip();
  renderHeroPreview();
  renderOutputMeta();
}

function renderCompileInspectPanel() {
  if (!elements.compileInspectPanel || !elements.compileInspectToggle || !elements.compileInspectBody
    || !elements.compileInspectTabs || !elements.compileInspectContent) {
    return;
  }

  const isOpen = state.ui.inspect?.open !== false;
  const activeTab = state.ui.inspect?.activeTab || 'compile-summary';

  elements.compileInspectPanel.classList.toggle('is-collapsed', !isOpen);
  elements.compileInspectToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  elements.compileInspectBody.hidden = !isOpen;
  elements.compileInspectMeta.innerHTML = renderCompileInspectMeta();
  elements.compileInspectTabs.innerHTML = COMPILE_INSPECT_TABS
    .map((tab) => {
      const isActive = tab.id === activeTab;
      return `
        <button
          type="button"
          class="inspect-tab-button${isActive ? ' is-active' : ''}"
          data-inspect-tab="${escapeAttribute(tab.id)}"
          role="tab"
          aria-selected="${isActive ? 'true' : 'false'}"
        >
          ${escapeHtml(tab.label)}
        </button>
      `;
    })
    .join('');

  elements.compileInspectContent.innerHTML = renderCompileInspectTab(activeTab);
}

function renderCompileInspectMeta() {
  const warnings = state.validation?.warnings || [];
  const errors = state.validation?.errors || [];
  const compileValue = state.lastCompileSucceeded ? 'Derlendi' : (state.compileError ? 'Derleme Başarısız' : 'Taslak Önizleme');
  const compileTone = state.lastCompileSucceeded ? 'ok' : (state.compileError ? 'danger' : 'neutral');
  const validationValue = errors.length > 0
    ? `${errors.length} hata`
    : warnings.length > 0
      ? `${warnings.length} uyarı`
      : 'Temiz';
  const validationTone = errors.length > 0 ? 'danger' : (warnings.length > 0 ? 'warning' : 'ok');
  const readinessValue = !state.readiness
    ? 'Kuru Kontrol Bekliyor'
    : (state.readiness.ready ? 'Kuru Kontrol Hazır' : 'Kuru Kontrol İncelenmeli');
  const readinessTone = !state.readiness ? 'neutral' : (state.readiness.ready ? 'ok' : 'warning');

  return [
    renderCompileInspectMetaChip('Durum', compileValue, compileTone),
    renderCompileInspectMetaChip('Doğrulama', validationValue, validationTone),
    renderCompileInspectMetaChip('Kuru Kontrol', readinessValue, readinessTone),
  ].join('');
}

function renderCompileInspectMetaChip(label, value, tone = 'neutral') {
  return `
    <span class="inspect-meta-chip is-${escapeAttribute(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </span>
  `;
}

function renderCompileInspectTab(tabId) {
  const context = buildCompileInspectContext();
  if (tabId === 'selections') {
    return renderCompileInspectSelectionsTab(context);
  }
  if (tabId === 'canonical-job') {
    return renderCompileInspectCanonicalTab(context);
  }
  if (tabId === 'references') {
    return renderCompileInspectReferencesTab(context);
  }
  return renderCompileInspectSummaryTab(context);
}

function buildCompileInspectContext() {
  const job = state.compiledCanonicalJob || mergeDefaultJob(state.job);
  const stylingConfigs = getVisibleStylingStateList();
  const materialRefs = Array.isArray(job.entities?.garment?.detail_refs?.material)
    ? job.entities.garment.detail_refs.material
    : [];
  const patternRefs = Array.isArray(job.entities?.garment?.detail_refs?.pattern)
    ? job.entities.garment.detail_refs.pattern
    : [];
  const boundAssets = getCompileInspectBoundAssets(job, stylingConfigs, materialRefs, patternRefs);
  const authorityEntries = getCompileInspectAuthorityEntries(job, stylingConfigs, materialRefs, patternRefs);
  const overrideCount = (state.ui.model.identityMode === 'replace' ? 1 : 0)
    + (state.ui.productIntent === 'restyle' ? 1 : 0)
    + stylingConfigs.filter((item) => ['add', 'replace', 'remove'].includes(item.action)).length;

  return {
    job,
    stylingConfigs,
    materialRefs,
    patternRefs,
    boundAssets,
    authorityEntries,
    warnings: collectCompileInspectWarnings({
      job,
      stylingConfigs,
      materialRefs,
      patternRefs,
      boundAssets,
    }),
    resolvedRefCount: getCompileInspectResolvedReferenceCount(job, stylingConfigs, materialRefs, patternRefs),
    overrideCount,
  };
}

function getCompileInspectResolvedReferenceCount(job, stylingConfigs, materialRefs, patternRefs) {
  const refs = state.readiness?.resolvedRefSummary;
  if (refs) {
    return (refs.subject || 0)
      + (refs.garmentMaterial || 0)
      + (refs.garmentPattern || 0)
      + (refs.footwear || 0)
      + (refs.headwear || 0)
      + (refs.accessoryFiles || 0);
  }

  return (job.entities?.subject?.reference_id ? 1 : 0)
    + materialRefs.length
    + patternRefs.length
    + stylingConfigs.filter((config) => config.usesReference && config.assetId).length;
}

function getCompileInspectBoundAssets(job, stylingConfigs, materialRefs, patternRefs) {
  const entries = [];
  const seen = new Set();
  const pushEntry = (assetId, family, role, note) => {
    if (!assetId) {
      return;
    }
    const key = `${family}:${assetId}:${role}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    const assetEntry = lookupAssetLibraryEntry(family, assetId);
    entries.push({
      assetId,
      family,
      role,
      note,
      preview: assetEntry?.preview || '',
      variant: assetEntry?.variant || '',
    });
  };

  if (job.entities?.subject?.reference_id) {
    pushEntry(job.entities.subject.reference_id, 'subject', 'Model / Konu', 'Kimlik yetkisi');
  }

  materialRefs.forEach((assetId) => {
    pushEntry(assetId, 'garment_material', 'Kumaş Detayı', 'Giysi sadakati');
  });
  patternRefs.forEach((assetId) => {
    pushEntry(assetId, 'garment_pattern', 'Desen Detayı', 'Desen sadakati');
  });

  stylingConfigs.forEach((config) => {
    if (!config.usesReference || !config.assetId) {
      return;
    }
    pushEntry(
      config.assetId,
      config.family,
      config.title,
      `${getSourceLabel(config.source)}${config.placement && config.placement !== 'auto' ? ` • ${getPlacementLabel(config.placement)}` : ''}`
    );
  });

  return entries;
}

function lookupAssetLibraryEntry(family, assetId) {
  const items = Array.isArray(state.assetLibrary?.assetsByFamily?.[family]) ? state.assetLibrary.assetsByFamily[family] : [];
  return items.find((item) => item?.asset_id === assetId) || null;
}

function getCompileInspectAuthorityEntries(job, stylingConfigs, materialRefs, patternRefs) {
  const entries = [
    {
      label: 'Model / Konu',
      value: job.entities?.subject?.reference_id || 'Yalnızca hedef girdi',
      note: job.entities?.subject?.reference_id ? 'Ayrı kimlik referansı etkin' : 'Ayrı konu referansı yok',
    },
    {
      label: 'Ürün / Giysi',
      value: materialRefs.length > 0 || patternRefs.length > 0
        ? `${materialRefs.length} kumaş • ${patternRefs.length} desen`
        : 'Yalnızca hedef giysi',
      note: materialRefs.length > 0 || patternRefs.length > 0
        ? 'Detay referansları giysi sadakatini güçlendirir'
        : 'Ek giysi detay referansı yok',
    },
  ];

  stylingConfigs.forEach((config) => {
    if (config.action === 'preserve') {
      entries.push({
        label: config.title,
        value: 'Hedef görsel',
        note: 'Özgün slot durumu korunuyor',
      });
      return;
    }
    if (config.action === 'remove') {
      entries.push({
        label: config.title,
        value: 'Kaldırıldı',
        note: 'Etkin yetkili varlık yok',
      });
      return;
    }
    if (config.usesReference && config.assetId) {
      entries.push({
        label: config.title,
        value: config.assetId,
        note: `${typeof config.actionLabel === 'function' ? config.actionLabel(config.action) : formatEnumLabel(config.action)} için referans yetkisi etkin`,
      });
      return;
    }
    if (config.isActionActive) {
      entries.push({
        label: config.title,
        value: 'Sistem seçimi',
        note: getCompileInspectDecisionMeta(config),
      });
    }
  });

  return entries;
}

function renderCompileInspectSelectionsTab(context) {
  const selectedSet = getSelectedManagedInputSet();
  const outputMeta = getOutputMeta();
  const authoredRows = [
    {
      label: 'Girdi kümesi',
      value: getInputSourceSummaryValue(),
      meta: selectedSet
        ? `${selectedSet.fileCount || 0} görsel • ${formatDateLabel(selectedSet.createdAt || '-')}`
        : 'Seçili küme kullanılacak.',
    },
    {
      label: 'Akış',
      value: getWorkflowLabel(state.workflowType),
      meta: 'Üretim ekranındaki etkin yüzeyleri belirler.',
    },
    {
      label: 'Model / Konu',
      value: getIdentityModeLabel(state.ui.model.identityMode),
      meta: context.job.entities?.subject?.reference_id || summarizeSelectedPills([
        ...state.ui.model.physicalCorrections,
        ...state.ui.model.aestheticEnhancements,
        ...state.ui.model.constraints,
      ]),
    },
    {
      label: 'Ürün / Giysi',
      value: getProductLayerSummary(),
      meta: getProductLayerHelperText(),
    },
    {
      label: 'Çıktı',
      value: outputMeta.style,
      meta: `${outputMeta.resolution} • ${outputMeta.aspect}`,
    },
  ];
  const stylingRows = context.stylingConfigs.map((config) => ({
    label: config.title,
    value: getAuthoredStylingSummary(config),
    meta: getAuthoredStylingMeta(config),
    badge: typeof config.actionLabel === 'function' ? config.actionLabel(config.action) : formatEnumLabel(config.action),
    tone: getInspectToneForAction(config.action),
  }));

  return `
    <div class="inspect-card-grid">
      ${renderInspectDataCard('Ana seçimler', authoredRows, 'Ekranda seçilen ana kararlar.')}
      ${renderInspectDataCard('Stil slotları', stylingRows, 'Aksesuar tarafındaki görünür seçimler.')}
    </div>
  `;
}

function renderCompileInspectCanonicalTab(context) {
  const sourceLabel = state.compiledCanonicalJob ? 'Derlenmiş Kanonik İş' : 'Canlı Taslak Önizleme';
  const sourceTone = state.compiledCanonicalJob ? 'ok' : 'neutral';
  const sourceCopy = state.compiledCanonicalJob
    ? 'Sunucudan dönen son kanonik durum.'
    : 'Derleme yapılana kadar yaşayan taslak kanonik görünüm.';
  const entityRows = [
    {
      label: 'Konu',
      value: context.job.entities?.subject?.mode || 'preserve',
      meta: context.job.entities?.subject?.reference_id || 'Ek konu referansı yok',
    },
    {
      label: 'Giysi',
      value: context.job.entities?.garment?.mode || 'preserve',
      meta: `${context.materialRefs.length} kumaş • ${context.patternRefs.length} desen`,
    },
    {
      label: 'Ayakkabı',
      value: summarizeCanonicalSourcePlacement(
        context.job.entities?.footwear?.source,
        context.job.entities?.footwear?.placement,
        context.job.entities?.footwear?.asset_id
      ),
      meta: context.job.entities?.footwear?.mode || 'preserve',
    },
    {
      label: 'Başlık',
      value: summarizeCanonicalSourcePlacement(
        context.job.entities?.headwear?.source,
        context.job.entities?.headwear?.placement,
        context.job.entities?.headwear?.asset_id
      ),
      meta: context.job.entities?.headwear?.mode || 'preserve',
    },
  ];
  const accessoryItems = Array.isArray(context.job.entities?.accessory?.items)
    ? context.job.entities.accessory.items
    : [];
  const accessoryRows = accessoryItems.map((item) => ({
    label: getAccessoryFamilyLabel(item?.family || 'accessory'),
    value: summarizeCanonicalSourcePlacement(item?.source, item?.placement, item?.asset_id),
    meta: item?.mode || 'preserve',
  }));
  const envelopeRows = [
    {
      label: 'Akış tipi',
      value: context.job.workflow || state.workflowType,
      meta: state.compiledCanonicalJob ? 'Sunucu derlemesi' : 'Yerel taslak',
      badge: sourceLabel,
      tone: sourceTone,
    },
    {
      label: 'Girdi kümesi',
      value: context.job.input?.source || 'batch_input',
      meta: getInputSourceSummaryValue(),
    },
    {
      label: 'Konu referansı',
      value: context.job.entities?.subject?.reference_id || 'Yok',
      meta: Array.isArray(context.job.entities?.subject?.reference_ids) && context.job.entities.subject.reference_ids.length > 0
        ? `${context.job.entities.subject.reference_ids.length} ek kayıt`
        : 'Tekil konu kaydı',
    },
  ];

  return `
    <div class="inspect-section-stack">
      <div class="inspect-card-grid">
        ${renderInspectDataCard('Kanonik zarf', envelopeRows, sourceCopy)}
        ${renderInspectDataCard('Varlık durumu', entityRows, 'Kanonik işteki etkin varlık alanları.')}
        ${renderInspectDataCard('Aksesuar öğeleri', accessoryRows, 'Öğe bazlı aksesuar yapısı.', 'Kanonik işte ek aksesuar öğesi yok.')}
      </div>
      <article class="inspect-json-shell">
        <div class="inspect-json-meta">
          ${renderInspectBadge(sourceLabel, sourceTone)}
          <p class="inspect-json-copy">${escapeHtml(sourceCopy)}</p>
        </div>
        <details class="inspect-json-details">
          <summary class="inspect-raw-toggle">Ham JSON</summary>
          <pre class="inspect-json-block"><code>${escapeHtml(JSON.stringify(context.job, null, 2))}</code></pre>
        </details>
      </article>
    </div>
  `;
}

function renderCompileInspectSummaryTab(context) {
  const entityEntries = getCompileInspectEntityEntries(context);
  const statusEntries = getCompileInspectStatusEntries(context);

  return `
    <div class="inspect-summary-grid">
      ${renderInspectSummaryCard('Etkin yorum', entityEntries, 'Derlemenin gerçekten etkin saydığı katmanlar.')}

      <article class="inspect-summary-card inspect-summary-card-authority">
        <div class="inspect-card-heading">
          <h4>Yetki ve bağlar</h4>
          <p>Yetkili yol, bağlı varlık ve koru durumu birlikte okunur.</p>
        </div>
        <div class="inspect-authority-grid">
          <section class="inspect-subsection">
            <p class="inspect-subsection-label">Yetkili referans</p>
            <div class="inspect-kv-list">
              ${context.authorityEntries.map((entry) => renderInspectKeyValueRow({
                label: entry.label,
                value: entry.value,
                meta: entry.note,
              })).join('')}
            </div>
          </section>
          <section class="inspect-subsection">
            <p class="inspect-subsection-label">Bağlı varlıklar</p>
            ${context.boundAssets.length > 0 ? `
              <div class="inspect-asset-list">
                ${context.boundAssets.slice(0, 5).map((asset) => renderCompileInspectAssetRow(asset)).join('')}
              </div>
            ` : '<div class="inspect-empty-state">Etkin bağlı varlık yok.</div>'}
          </section>
        </div>
      </article>

      <article class="inspect-summary-card inspect-summary-card-status">
        <div class="inspect-card-heading">
          <h4>Durum ve uyarılar</h4>
          <p>Önemli sinyaller ve gerçekten etkili uyarılar.</p>
        </div>
        <div class="inspect-status-list">
          ${statusEntries.map((entry) => `
            <div class="inspect-status-item">
              <span class="inspect-status-dot is-${escapeAttribute(entry.tone)}"></span>
              <div class="inspect-status-copy">
                <strong>${escapeHtml(entry.label)}</strong>
                <p>${escapeHtml(entry.copy)}</p>
              </div>
            </div>
          `).join('')}
        </div>
        ${renderCompileInspectWarnings(context.warnings)}
      </article>
    </div>
  `;
}

function renderCompileInspectReferencesTab(context) {
  const refs = state.readiness?.resolvedRefSummary || null;
  const resolvedCards = [
    ['Çözülen referans', String(context.resolvedRefCount)],
    ['Yetkili kayıt', String(context.authorityEntries.length)],
    ['Bağlı varlık', String(context.boundAssets.length)],
  ];

  if (refs) {
    resolvedCards.push(['Konu referansı', String(refs.subject || 0)]);
    resolvedCards.push(['Aksesuar referansı', String(refs.accessoryFiles || 0)]);
  }
  const referenceRows = [
    {
      label: 'Hedef görüntü',
      value: 'Ana kaynak',
      meta: getInputSourceSummaryValue(),
    },
    {
      label: 'Model / Konu',
      value: context.job.entities?.subject?.reference_id ? 'Yetkili referans' : 'Ek referans yok',
      meta: context.job.entities?.subject?.reference_id || 'Hedef konu kullanılıyor',
    },
    {
      label: 'Ürün / Giysi',
      value: context.materialRefs.length > 0 || context.patternRefs.length > 0 ? 'Sadakat referansı' : 'Ek referans yok',
      meta: `${context.materialRefs.length} kumaş • ${context.patternRefs.length} desen`,
    },
    ...context.stylingConfigs.map((config) => ({
      label: config.title,
      value: getCompileInspectReferenceRole(config),
      meta: config.assetId || getCompileInspectDecisionMeta(config),
    })),
  ];

  return `
    <div class="inspect-reference-grid">
      ${renderInspectDataCard('Referans rolleri', referenceRows, 'Bağlı, yetkili ve eksik referans ayrımı.')}
      <article class="inspect-card">
        <div class="inspect-card-heading">
          <h4>Referans sayıları</h4>
          <p>Kompakt çözüm ve bağ sayıları.</p>
        </div>
        <div class="inspect-mini-stats">
          ${resolvedCards.map(([label, value]) => `
            <div class="inspect-mini-stat">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `).join('')}
        </div>
      </article>
      <article class="inspect-card">
        <div class="inspect-card-heading">
          <h4>Bağlı dosyalar</h4>
          <p>Çalışmayı etkileyen harici görseller.</p>
        </div>
        ${context.boundAssets.length > 0 ? `
          <div class="inspect-asset-list">
            ${context.boundAssets.map((asset) => renderCompileInspectAssetRow(asset)).join('')}
          </div>
        ` : '<div class="inspect-empty-state">Etkin harici referans yok.</div>'}
      </article>
    </div>
  `;
}

function renderInspectDataCard(title, rows, copy, emptyText = 'Gösterilecek bilgi yok.') {
  return `
    <article class="inspect-card">
      <div class="inspect-card-heading">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(copy)}</p>
      </div>
      ${rows.length > 0
        ? `<div class="inspect-kv-list">${rows.map((row) => renderInspectKeyValueRow(row)).join('')}</div>`
        : `<div class="inspect-empty-state">${escapeHtml(emptyText)}</div>`}
    </article>
  `;
}

function renderInspectKeyValueRow(row) {
  return `
    <div class="inspect-kv-row">
      <div class="inspect-row-copy">
        <span class="inspect-row-label">${escapeHtml(row.label)}</span>
        ${row.meta ? `<p class="inspect-row-meta">${escapeHtml(row.meta)}</p>` : ''}
      </div>
      <div class="inspect-kv-value${row.badge && row.value ? ' is-stacked' : ''}">
        ${row.badge ? renderInspectBadge(row.badge, row.tone || 'neutral') : ''}
        ${row.value ? `<span class="inspect-inline-value">${escapeHtml(row.value)}</span>` : (row.badge ? '' : '<span class="inspect-inline-value">-</span>')}
      </div>
    </div>
  `;
}

function renderInspectSummaryCard(title, rows, copy) {
  return `
    <article class="inspect-summary-card">
      <div class="inspect-card-heading">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(copy)}</p>
      </div>
      <div class="inspect-list">
        ${rows.map((entry) => `
          <div class="inspect-row">
            <div class="inspect-row-copy">
              <span class="inspect-row-label">${escapeHtml(entry.label)}</span>
              <p class="inspect-row-meta">${escapeHtml(entry.note)}</p>
            </div>
            ${renderInspectBadge(entry.state, entry.tone)}
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function renderCompileInspectWarnings(warnings) {
  if (!warnings.length) {
    return `
      <div class="inspect-warning-list">
        <div class="inspect-warning-item is-ok">
          <span class="inspect-warning-dot is-ok"></span>
          <span>Öne çıkan ek uyarı yok.</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="inspect-warning-list">
      ${warnings.map((warning) => `
        <div class="inspect-warning-item is-${escapeAttribute(warning.tone)}">
          <span class="inspect-warning-dot is-${escapeAttribute(warning.tone)}"></span>
          <span>${escapeHtml(warning.text)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function getAuthoredStylingSummary(config) {
  const parts = [typeof config.actionLabel === 'function' ? config.actionLabel(config.action) : formatEnumLabel(config.action)];
  if (config.isActionActive && config.source) {
    parts.push(getShortSourceLabel(config.source));
  }
  if (config.isActionActive && config.placement) {
    parts.push(getPlacementLabel(config.placement));
  }
  return parts.join(' • ');
}

function getAuthoredStylingMeta(config) {
  if (config.assetId) {
    return config.assetId;
  }
  if (config.action === 'preserve') {
    return 'Hedef görsel kullanılır';
  }
  return getCompileInspectDecisionMeta(config);
}

function summarizeCanonicalSourcePlacement(source, placement, assetId) {
  const parts = [];
  if (source) {
    parts.push(getSourceLabel(source));
  }
  if (placement) {
    parts.push(getPlacementLabel(placement));
  }
  if (assetId) {
    parts.push(assetId);
  }
  return parts.length > 0 ? parts.join(' • ') : 'Yok';
}

function getCompileInspectReferenceRole(config) {
  if (config.action === 'remove') {
    return 'Kaldırılıyor';
  }
  if (config.action === 'preserve') {
    return config.assetId ? 'Bağlı ama pasif' : 'Hedef görsel';
  }
  if (config.usesReference && config.assetId) {
    return 'Yetkili referans';
  }
  if (config.isActionActive && config.source === 'reference' && !config.assetId) {
    return 'Referans eksik';
  }
  if (config.assetId) {
    return 'Bağlı ama pasif';
  }
  return config.source === 'system' ? 'Sistem yolu' : 'Beklemede';
}

function getCompileInspectEntityEntries(context) {
  return [
    {
      label: 'Model / Konu',
      state: 'Etkin',
      tone: state.ui.model.identityMode === 'replace' ? 'accent' : 'neutral',
      note: `${getIdentityModeLabel(state.ui.model.identityMode)}${context.job.entities?.subject?.reference_id ? ` • ${context.job.entities.subject.reference_id}` : ''}`,
    },
    {
      label: 'Ürün / Giysi',
      state: 'Etkin',
      tone: state.ui.productIntent === 'restyle' ? 'warning' : 'neutral',
      note: `${getProductIntentLabel(state.ui.productIntent)} • ${getGarmentModeLabel(context.job.entities?.garment?.mode)}`,
    },
    ...context.stylingConfigs.map((config) => ({
      label: config.title,
      state: config.action === 'remove' ? 'Kaldırıldı' : (config.action === 'preserve' ? 'Korunuyor' : 'Etkin'),
      tone: config.action === 'remove' ? 'danger' : (config.action === 'preserve' ? 'neutral' : 'accent'),
      note: typeof config.actionLabel === 'function' ? config.actionLabel(config.action) : formatEnumLabel(config.action),
    })),
  ];
}

function getGarmentModeLabel(mode) {
  if (mode === 'restyle') {
    return 'Yeniden Yorumla';
  }
  if (mode === 'ignore') {
    return 'Yok Say';
  }
  return 'Koru';
}

function getCompileInspectDecisionMeta(config) {
  if (config.action === 'preserve') {
    return 'Hedef görsel sadakati';
  }
  if (config.action === 'remove') {
    return 'Slot sonuçtan kaldırılır';
  }

  const parts = [
    config.source === 'reference' ? 'Referans yetkisi' : 'Sistem seçimi',
  ];
  if (config.placement && config.placement !== 'auto') {
    parts.push(getPlacementLabel(config.placement));
  } else if (config.placementOptions.length > 1) {
    parts.push('Otomatik yerleşim');
  }
  return parts.join(' • ');
}

function getCompileInspectStatusEntries(context) {
  const validationErrors = state.validation?.errors || [];
  const validationWarnings = state.validation?.warnings || [];
  const readinessErrors = state.readiness?.errors || [];
  const readinessWarnings = state.readiness?.warnings || [];
  const conflictErrors = validationErrors.length + readinessErrors.length;
  const conflictWarnings = validationWarnings.length + readinessWarnings.length;

  return [
    {
      label: 'Derleme',
      copy: state.lastCompileSucceeded
        ? 'Son derleme tamamlandı.'
        : state.compileError
          ? 'Son derleme başarısız.'
          : 'Henüz derlenmedi.',
      tone: state.lastCompileSucceeded ? 'ok' : (state.compileError ? 'danger' : 'neutral'),
    },
    {
      label: 'Kuru kontrol',
      copy: !state.readiness
        ? 'Henüz çalıştırılmadı.'
        : state.readiness.ready
          ? 'Çalıştırmaya hazır.'
          : 'İnceleme gerekiyor.',
      tone: !state.readiness ? 'neutral' : (state.readiness.ready ? 'ok' : 'warning'),
    },
    {
      label: 'Referans çözümü',
      copy: context.resolvedRefCount > 0
        ? `${context.resolvedRefCount} referans çözüldü.`
        : 'Etkin referans çözümü yok.',
      tone: context.resolvedRefCount > 0 ? 'ok' : 'neutral',
    },
    {
      label: 'Çakışma durumu',
      copy: conflictErrors > 0
        ? `${conflictErrors} engelleyici sorun var.`
        : conflictWarnings > 0
          ? `${conflictWarnings} uyarı izlenmeli.`
          : context.overrideCount > 0
            ? `${context.overrideCount} aktif geçersiz kılma yolu var.`
            : 'Koru / sistem yolu baskın.',
      tone: conflictErrors > 0 ? 'danger' : (conflictWarnings > 0 ? 'warning' : 'ok'),
    },
  ];
}

function collectCompileInspectWarnings(context) {
  const warnings = [];
  const pushWarning = (text, tone = 'warning') => {
    if (!text || warnings.some((item) => item.text === text)) {
      return;
    }
    warnings.push({ text, tone });
  };

  if (state.ui.model.identityMode === 'replace' && !context.job.entities?.subject?.reference_id) {
    pushWarning('Model / Konu için değiştirme açık ama bağlı referans yok.', 'danger');
  }

  if (context.job.entities?.subject?.mode === 'ignore') {
    pushWarning('Eski "ignore" değeri konu tarafında koru olarak ele alınıyor.', 'neutral');
  }

  context.stylingConfigs.forEach((config) => {
    const rawEntity = getCompileInspectStylingEntity(context.job, config.family);
    const rawMode = rawEntity?.mode || '';
    const rawSource = rawEntity?.source || '';
    const rawPlacement = rawEntity?.placement;
    const normalizedPlacement = normalizePlacementValue(config.family, rawPlacement);

    if (rawMode === 'ignore') {
      pushWarning(`${config.title}: eski "ignore" değeri koru olarak ele alınıyor.`, 'neutral');
    }
    if (config.action === 'preserve' && config.assetId) {
      pushWarning(`${config.title}: referans var ama koru kipinde yetkili değil.`);
    }
    if (['add', 'replace'].includes(config.action) && config.source === 'reference' && !config.assetId) {
      pushWarning(`${config.title}: referans kaynağı seçili ama bağlı varlık yok.`, 'danger');
    }
    if (config.isActionActive && config.source === 'system' && config.assetId) {
      pushWarning(`${config.title}: bağlı varlık seçili ancak kaynak sistemde kaldı.`);
    }
    if (rawSource === 'reference' && config.source === 'system') {
      pushWarning(`${config.title}: geçersiz kılma koşulu oluşmadığı için kaynak sisteme çekildi.`);
    }
    if (rawPlacement && rawPlacement !== normalizedPlacement) {
      pushWarning(`${config.title}: yerleşim ${getPlacementLabel(normalizedPlacement)} olarak kullanıldı.`, 'neutral');
    }
  });

  return warnings.slice(0, 5);
}

function getCompileInspectStylingEntity(job, family) {
  if (family === 'footwear') {
    return job.entities?.footwear || null;
  }
  if (family === 'headwear') {
    return job.entities?.headwear || null;
  }
  const accessoryItems = Array.isArray(job.entities?.accessory?.items)
    ? job.entities.accessory.items
    : [];
  return accessoryItems.find((item) => item?.family === family) || null;
}

function renderCompileInspectAssetRow(asset) {
  const thumbMarkup = asset.preview
    ? `<img src="${escapeAttribute(asset.preview)}" alt="${escapeAttribute(asset.assetId)}" loading="lazy" />`
    : `<div class="inspect-asset-placeholder">${escapeHtml(formatAssetBadge(asset.assetId || asset.role))}</div>`;

  return `
    <div class="inspect-asset-row">
      <div class="inspect-asset-thumb">${thumbMarkup}</div>
      <div class="inspect-asset-copy">
        <p class="inspect-asset-title">${escapeHtml(asset.assetId || asset.role)}</p>
        <p class="inspect-asset-meta">${escapeHtml(asset.role)}${asset.note ? ` • ${escapeHtml(asset.note)}` : ''}</p>
      </div>
    </div>
  `;
}

function renderInspectBadge(label, tone = 'neutral') {
  return `<span class="inspect-badge is-${escapeAttribute(tone)}">${escapeHtml(label)}</span>`;
}

function getInspectToneForAction(action) {
  if (action === 'replace' || action === 'add') {
    return 'accent';
  }
  if (action === 'remove') {
    return 'danger';
  }
  return 'neutral';
}

function renderVariationStrip() {
  if (!elements.variationStrip) {
    return;
  }
  const candidates = buildVariationCandidates();
  if (candidates.length === 0) {
    elements.variationStrip.innerHTML = '<div class="styling-empty-strip">Bir girdi kümesi seçtiğinizde varyasyonlar burada görünür.</div>';
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
            : '<div class="hero-preview-empty">Önizleme yok</div>'}
        </div>
        <div>
          <p class="variation-card-title">${escapeHtml(candidate.title)}</p>
          <p class="variation-card-meta">${escapeHtml(candidate.meta)}</p>
        </div>
        ${candidate.key === state.ui.results.approvedVariationKey ? '<span class="variation-card-badge">Onaylandı</span>' : ''}
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
      elements.heroPreviewLabel.textContent = 'Varyasyon 01';
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
    elements.heroBeforeImage.alt = active.inputName || 'Önce önizlemesi';
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
    ['Stil', meta.style],
    ['Çözünürlük', meta.resolution],
    ['Oran', meta.aspect],
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
    ['Katalog Dengesi', 'Nötr temizlik'],
    ['Stüdyo Netliği', 'Daha keskin detay'],
    ['Yumuşak Rötuş', 'Nazik bitiriş'],
    ['Editoryal Yön', 'Atmosfere yakın kadraj'],
    ['Detay Koruma', 'Doku korunur'],
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
    physicalCorrections: ['Yüz Dengesi', 'Hafif Temizlik', 'Duruş Dengeleme'],
    aestheticEnhancements: ['Katalog Cilası', 'Doğal Kontrast', 'Doku Koruma'],
    constraints: ['Pozu Koru', 'Ürünü Koru', 'Elleri Koru'],
  };
}

function getIdentityModeLabel(mode) {
  if (mode === 'replace') {
    return 'Değiştir';
  }
  if (mode === 'ignore') {
    return 'Yok Say';
  }
  return 'Koru';
}

function getIdentityModeHelperText(mode) {
  if (mode === 'replace') {
    return 'Konu referansını yükleyin; sistem kimliği bu görsele göre ele alsın.';
  }
  if (mode === 'ignore') {
    return 'Konu kimliğini devre dışı bırakın; akış ürün ve stil kararlarına odaklansın.';
  }
  return 'Konu kimliğini seçili hedef girdiye bağlı tutun.';
}

function getProductIntentLabel(intent) {
  if (intent === 'restyle') {
    return 'Yeniden Yorumla';
  }
  if (intent === 'preserve') {
    return 'Koru';
  }
  return 'Temizle';
}

function getProductIntentHelperText(intent) {
  if (intent === 'restyle') {
    return 'Giysiyi kaynak görüntüyü temel alarak kontrollü biçimde yeniden yorumla.';
  }
  if (intent === 'preserve') {
    return 'Ürünü kaynak görsele sadık tut; düzenleme ürün doğruluğunu korusun.';
  }
  return 'Ürün sunumunu temizle; görünümü yeniden tasarlamadan daha düzenli bir taban üret.';
}

function getShortSourceLabel(value) {
  return value === 'reference' ? 'Referans' : 'Sistem';
}

function getOverallStylingValue() {
  const activeFamilies = getVisibleStylingStateList().filter((item) => item.isActionActive);
  if (activeFamilies.length === 0) {
    return 'Aktif değişiklik yok';
  }
  return `${activeFamilies.length} aktif karar`;
}

function getOverallStylingSummary() {
  const activeFamilies = getVisibleStylingStateList().filter((item) => item.isActionActive);
  if (activeFamilies.length === 0) {
    return 'Mevcut stil korunsun.';
  }
  return activeFamilies.map((item) => `${item.title}: ${item.summary}`).join(' • ');
}

function buildReviewSentence() {
  const inputLabel = getInputSourceSummaryValue();
  const styleMeta = getOutputMeta();
  const productText = getProductIntentLabel(state.ui.productIntent).toLowerCase();
  return `${inputLabel} için ${productText} yaklaşımıyla ${styleMeta.style.toLowerCase()} çıktı hazırlanıyor.`;
}

function getCompactModelReviewSummary(values) {
  const subjectRef = state.job?.entities?.subject?.reference_id;
  if (state.ui.model.identityMode === 'replace') {
    return subjectRef ? `Referans bağlı • ${subjectRef}` : 'Referans bekleniyor';
  }
  return values.length > 0 ? `${values.length} seçim` : 'Ek seçim yok';
}

function getCompactProductReviewSummary() {
  const refs = getGarmentDetailRefs();
  const parts = ['Ürün bazlı uygulama'];
  if (refs.material.length > 0) {
    parts.push(`${refs.material.length} kumaş`);
  }
  if (refs.pattern.length > 0) {
    parts.push(`${refs.pattern.length} desen`);
  }
  return parts.join(' • ');
}

function getCompactStylingReviewSummary() {
  const activeFamilies = getVisibleStylingStateList().filter((item) => item.isActionActive);
  if (activeFamilies.length === 0) {
    return 'Mevcut görünüm korunuyor';
  }
  return activeFamilies.map((item) => item.title).join(' • ');
}

function summarizeSelectedPills(values) {
  return values.length > 0 ? values.join(' • ') : 'Seçim yok';
}

function getVisibleStylingStateList() {
  return ['eyewear', 'bag', 'headwear', 'footwear'].map((family) => getStylingPanelConfig(family));
}

function getStylingPanelConfig(family) {
  if (family === 'eyewear' || family === 'bag') {
    const control = getPrimaryAccessoryElements(family);
    const action = normalizeAccessoryItemUiMode(control.action?.value);
    const source = accessoryModeUsesReference(action)
      ? normalizeSourceValue(control.source?.value, Boolean(control.asset?.value))
      : 'system';
    const placement = normalizePlacementValue(family, control.placement?.value);
    const assetId = control.asset?.value || '';
    const isActionActive = action === 'add' || action === 'replace';
    return {
      family,
      title: getAccessoryFamilyLabel(family),
      action,
      actionOptions: getAccessoryItemModes(),
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
    const action = normalizeHeadwearUiMode(elements.headwearMode?.value);
    const source = headwearModeUsesReference(action)
      ? normalizeSourceValue(elements.headwearSource?.value, Boolean(elements.headwearAssetId?.value))
      : 'system';
    const placement = normalizePlacementValue('headwear', elements.headwearPlacement?.value);
    const variant = elements.headwearVariant?.value || '';
    const assetId = elements.headwearAssetId?.value || '';
    const isActionActive = action === 'add' || action === 'replace';
    return {
      family,
      title: 'Başlık',
      action,
      actionOptions: getHeadwearUiModes(),
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

  const action = normalizeFootwearUiMode(elements.footwearMode?.value);
  const source = footwearModeUsesReference(action)
    ? normalizeSourceValue(elements.footwearSource?.value, Boolean(elements.footwearAssetId?.value))
    : 'system';
  const variant = elements.footwearVariant?.value || '';
  const assetId = elements.footwearAssetId?.value || '';
  const placement = state.job?.entities?.footwear?.placement || 'on_feet';
  const isActionActive = action === 'replace';
  return {
    family: 'footwear',
    title: 'Ayakkabı',
    action,
    actionOptions: getFootwearUiModes(),
    actionLabel: getFootwearActionLabel,
    source,
    placement,
    placementOptions: getPlacementOptions('footwear'),
    variant,
    variantOptions: state.registry?.entities?.footwear?.variants || [],
    assetId,
    usesReference: isActionActive && source === 'reference',
    isActionActive,
    summary: buildStylingAccordionSummary(getFootwearActionLabel(action), footwearModeUsesReference(action) ? source : '', footwearModeUsesReference(action) ? placement : ''),
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

function getUploadVariantForFamily(family, currentVariant) {
  if (family === 'eyewear') {
    return 'sunglasses';
  }
  if (family === 'bag') {
    return 'hand_bag';
  }
  return String(currentVariant || '').trim() || family;
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
    return 'Stüdyo Katalog';
  }
  if (profile.includes('catalog')) {
    return 'Stüdyo Katalog';
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
  return 'Varsayılan';
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
  return 'Varsayılan';
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
    return 'Seçilmedi';
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
    return 'Yüz ve Kimlik';
  }
  if (workflow === 'styling') {
    return 'Stil';
  }
  if (workflow === 'advanced') {
    return 'Gelişmiş';
  }
  return 'Stüdyo Temizliği';
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
  const mode = normalizeAccessoryItemUiMode(control.action?.value);
  const source = control.source?.value || 'system';
  const isActive = mode === 'add' || mode === 'replace';
  const usesReference = isActive && source === 'reference';
  const assetOptions = getAccessoryAssets(family);

  control.card?.classList.toggle('is-passive', false);
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
      ? 'Uygun referans bulunamadı.'
      : '';
  }
}

function getPrimaryAccessoryItem(job, family) {
  const items = Array.isArray(job?.entities?.accessory?.items) ? job.entities.accessory.items : [];
  const item = items.find((entry) => entry?.family === family) || {
    family,
    variant: getAccessoryVariants(family)[0] || family,
    mode: 'preserve',
    asset_id: '',
  };
  return {
    ...item,
    mode: normalizeAccessoryItemUiMode(item?.mode),
    source: inferSourceFromItem(item),
    placement: inferPlacementFromItem(item, family),
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
  const mode = normalizeAccessoryItemUiMode(control.action?.value);
  const source = accessoryModeUsesReference(mode)
    ? normalizeSourceValue(control.source?.value, Boolean(control.asset?.value))
    : 'system';
  const variant = variants[0] || family;
  const placement = normalizePlacementValue(family, control.placement?.value);
  const assetId = accessoryModeUsesReference(mode) && source === 'reference'
    ? selectOrValueOrEmpty(control.asset?.value || '', assets)
    : '';

  return {
    family,
    variant,
    mode,
    source,
    placement,
    asset_id: assetId,
  };
}

function inferSourceFromEntity(entity, modeUsesReference) {
  if (!modeUsesReference(entity?.mode)) {
    return 'system';
  }
  const fallbackReference = Boolean(entity?.asset_id);
  return normalizeSourceValue(entity?.source, fallbackReference);
}

function inferSourceFromItem(item) {
  return inferSourceFromEntity(item, accessoryModeUsesReference);
}

function inferPlacementFromItem(item, familyOverride = null) {
  const family = selectOrFirst(familyOverride || item?.family, getAccessoryFamilies());
  return normalizePlacementValue(family, item?.placement);
}

function getPlacementOptions(kind) {
  if (kind === 'footwear') {
    return ['on_feet'];
  }
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
  if (value === 'on_feet') {
    return 'Ayakta';
  }
  if (value === 'on_eyes') {
    return 'Gözde';
  }
  if (value === 'on_head') {
    return 'Başta';
  }
  if (value === 'in_hand') {
    return 'Elde';
  }
  if (value === 'on_forearm') {
    return 'Kolda';
  }
  if (value === 'on_shoulder') {
    return 'Omuzda';
  }
  if (value === 'crossbody') {
    return 'Çapraz';
  }
  return 'Otomatik';
}

function getSourceLabel(value) {
  return value === 'reference' ? 'Referansı Kullan' : 'Sistem Seçsin';
}

function getAccessoryActionLabel(mode) {
  if (mode === 'preserve') {
    return 'Koru';
  }
  if (mode === 'add') {
    return 'Ekle';
  }
  if (mode === 'replace') {
    return 'Değiştir';
  }
  if (mode === 'remove') {
    return 'Kaldır';
  }
  return 'Eski Yok Say';
}

function getFootwearActionLabel(mode) {
  if (mode === 'preserve') {
    return 'Orijinali Koru';
  }
  if (mode === 'replace') {
    return 'Değiştir';
  }
  if (mode === 'remove') {
    return 'Kaldır';
  }
  return 'Yok Say';
}

function getAccessoryActionHint(family, mode) {
  const label = getAccessoryFamilyLabel(family);
  if (mode === 'preserve') {
    return `${label}: hedef görseldeki mevcut durumu koru; yüklenen varlık yetkili hale gelmez.`;
  }
  if (mode === 'add') {
    return `${label}: referans kaynağı açıkken bu varlığı yeni ekleme olarak uygula.`;
  }
  if (mode === 'replace') {
    return `${label}: referans kaynağı açıkken mevcut öğeyi bu varlıkla değiştir.`;
  }
  if (mode === 'remove') {
    return `${label}: bu öğeyi sonuçtan kaldır.`;
  }
  return `${label}: eski yok say durumu yalnızca uyumluluk için tutulur.`;
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
  const mode = normalizeAccessoryItemUiMode(control.action?.value);
  const isActive = mode === 'add' || mode === 'replace';
  return summarizeActionSourcePlacement(
    getAccessoryActionLabel(mode),
    isActive ? getSourceLabel(normalizeSourceValue(control.source?.value, Boolean(control.asset?.value))) : '',
    isActive ? getPlacementLabel(normalizePlacementValue(family, control.placement?.value)) : ''
  );
}

function getHeadwearSummary() {
  const mode = normalizeHeadwearUiMode(elements.headwearMode?.value);
  const isActive = mode === 'add' || mode === 'replace';
  return summarizeActionSourcePlacement(
    getAccessoryActionLabel(mode),
    isActive ? getSourceLabel(normalizeSourceValue(elements.headwearSource?.value, Boolean(elements.headwearAssetId?.value))) : '',
    isActive ? getPlacementLabel(normalizePlacementValue('headwear', elements.headwearPlacement?.value)) : ''
  );
}

function getFootwearSummary() {
  const mode = normalizeFootwearUiMode(elements.footwearMode?.value);
  return summarizeActionSourcePlacement(
    getFootwearActionLabel(mode),
    footwearModeUsesReference(mode) ? getSourceLabel(elements.footwearSource?.value || inferSourceFromEntity(state.job?.entities?.footwear, footwearModeUsesReference)) : '',
    footwearModeUsesReference(mode) ? getPlacementLabel(state.job?.entities?.footwear?.placement || 'on_feet') : ''
  );
}

function getAccessoryFamilies() {
  return state.registry?.entities?.accessory?.families || ['eyewear', 'bag', 'neckwear'];
}

function getAccessoryFamilyLabel(family) {
  if (family === 'eyewear') {
    return 'Gözlük';
  }
  if (family === 'bag') {
    return 'Çanta';
  }
  if (family === 'neckwear') {
    return 'Boyun Aksesuarı';
  }
  return family || 'Aksesuar';
}

function getAccessoryItemModes() {
  return ['preserve', 'add', 'replace', 'remove'];
}

function getAccessoryVariants(family, registry = null) {
  const activeRegistry = registry || runtimeState?.registry || null;
  return activeRegistry?.entities?.accessory?.variantsByFamily?.[family] || ['default'];
}

function getAccessoryAssets(family, registry = null) {
  const activeRegistry = registry || runtimeState?.registry || null;
  return uniqueStrings([
    ...(activeRegistry?.entities?.accessory?.assetIdsByFamily?.[family] || []),
    ...getLibraryAssetIds(family),
  ]);
}

function createAccessoryItem(registry = null) {
  const activeRegistry = registry || runtimeState?.registry || null;
  const availableFamilies = activeRegistry?.entities?.accessory?.families || ['eyewear', 'bag', 'neckwear'];
  const family = availableFamilies.includes('neckwear')
    ? 'neckwear'
    : (availableFamilies.find((item) => item !== 'eyewear' && item !== 'bag') || availableFamilies[0] || 'eyewear');
  const variants = getAccessoryVariants(family, registry);
  return {
    family,
    variant: variants[0] || family,
    mode: 'add',
    source: 'system',
    placement: 'auto',
    asset_id: '',
  };
}

function createPrimaryAccessoryItem(family, registry = null) {
  return {
    family,
    variant: getAccessoryVariants(family, registry)[0] || family,
    mode: 'preserve',
    source: 'system',
    placement: normalizePlacementValue(family, undefined),
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
      physicalCorrections: ['Yüz Dengesi', 'Hafif Temizlik'],
      aestheticEnhancements: ['Katalog Cilası'],
      constraints: ['Pozu Koru', 'Ürünü Koru'],
    },
    styling: {
      openPanel: '',
    },
    inspect: {
      open: true,
      activeTab: 'compile-summary',
    },
    modals: {
      assetUpload: {
        open: false,
        family: '',
        variant: '',
      },
      inputSetUpload: {
        open: false,
      },
    },
    results: {
      activeVariationKey: '',
      approvedVariationKey: '',
      previewMode: 'compare',
    },
  };
}

function createWorkflowFriendlyDefaultJob(job, registry = null) {
  const nextJob = mergeDefaultJob(job);
  nextJob.entities.footwear = {
    ...nextJob.entities.footwear,
    mode: 'preserve',
    source: 'system',
    placement: 'on_feet',
    asset_id: '',
  };
  nextJob.entities.headwear = {
    ...nextJob.entities.headwear,
    mode: 'preserve',
    source: 'system',
    placement: 'auto',
    asset_id: '',
  };
  nextJob.entities.accessory = {
    ...nextJob.entities.accessory,
    mode: 'apply',
    items: [
      createPrimaryAccessoryItem('eyewear', registry),
      createPrimaryAccessoryItem('bag', registry),
    ],
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
        source: 'reference',
        placement: 'on_feet',
        variant: 'sandal',
        asset_id: 'footwear_0001',
      },
      headwear: {
        mode: 'add',
        source: 'reference',
        placement: 'on_head',
        variant: 'bandana',
        asset_id: 'headwear_bandana_0001',
      },
      accessory: {
        mode: 'apply',
        items: [
          {
            family: 'eyewear',
            variant: 'sunglasses',
            mode: 'preserve',
            source: 'system',
            placement: 'auto',
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
        modes: ['preserve', 'add', 'replace', 'remove', 'ignore'],
        variants: ['bandana', 'headband', 'hat'],
        assetIds: ['headwear_bandana_0001'],
      },
      accessory: {
        modes: ['apply', 'ignore'],
        itemModes: ['preserve', 'add', 'replace', 'remove', 'ignore'],
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
