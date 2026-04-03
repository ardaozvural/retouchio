const REVIEW_TAG_STORAGE_KEY = 'retouchio.batch_review_tags.v1';

const state = {
  batchJobs: [],
  batchFilter: 'all',
  reviewTags: loadReviewTags(),
  reviewSession: {
    batchName: '',
    mode: 'output',
    tagFilter: 'all',
    reviewedCount: 0,
    totalCount: 0,
    stateText: 'Open a completed run to start reviewing outputs.',
    supportNote: 'Compare uses saved pairing when available. Quality tags are local review notes stored in this browser.',
  },
  outputsReview: {
    open: false,
    batchName: '',
    safeBatchName: '',
    outputDir: '',
    outputSource: '',
    mode: 'output',
    tagFilter: 'all',
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
  busy: {
    refreshBatches: false,
    batchAction: false,
    outputs: false,
  },
  lastRefreshAt: '',
};

const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  bindEvents();
  closeOutputsModal();
  closeOutputImageModal();
  await refreshBatchJobs();
});

function cacheElements() {
  Object.assign(elements, {
    statusBanner: document.getElementById('statusBanner'),
    refreshAllBatchesButton: document.getElementById('refreshAllBatchesButton'),
    batchFilterSelect: document.getElementById('batchFilterSelect'),
    activeRunsSection: document.getElementById('activeRunsSection'),
    activeRunsEmpty: document.getElementById('activeRunsEmpty'),
    activeRunsList: document.getElementById('activeRunsList'),
    completedRunsSection: document.getElementById('completedRunsSection'),
    completedRunsEmpty: document.getElementById('completedRunsEmpty'),
    completedRunsList: document.getElementById('completedRunsList'),
    failedRunsSection: document.getElementById('failedRunsSection'),
    failedRunsEmpty: document.getElementById('failedRunsEmpty'),
    failedRunsList: document.getElementById('failedRunsList'),
    summaryTotal: document.getElementById('summaryTotal'),
    summaryActive: document.getElementById('summaryActive'),
    summaryDownloadNeeded: document.getElementById('summaryDownloadNeeded'),
    summaryLastRefresh: document.getElementById('summaryLastRefresh'),
    reviewSessionState: document.getElementById('reviewSessionState'),
    reviewSessionBatch: document.getElementById('reviewSessionBatch'),
    reviewSessionMode: document.getElementById('reviewSessionMode'),
    reviewSessionFilter: document.getElementById('reviewSessionFilter'),
    reviewSessionCounts: document.getElementById('reviewSessionCounts'),
    reviewSupportNote: document.getElementById('reviewSupportNote'),
    outputsModal: document.getElementById('outputsModal'),
    outputsModalBackdrop: document.getElementById('outputsModalBackdrop'),
    closeOutputsModalButton: document.getElementById('closeOutputsModalButton'),
    outputsModalTitle: document.getElementById('outputsModalTitle'),
    outputsModalMeta: document.getElementById('outputsModalMeta'),
    outputsModalSupportNote: document.getElementById('outputsModalSupportNote'),
    outputsModalBody: document.getElementById('outputsModalBody'),
    outputsModeOutputOnlyButton: document.getElementById('outputsModeOutputOnlyButton'),
    outputsModeCompareButton: document.getElementById('outputsModeCompareButton'),
    outputsTagFilterSelect: document.getElementById('outputsTagFilterSelect'),
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

function bindEvents() {
  elements.refreshAllBatchesButton.addEventListener('click', refreshAllBatchStatuses);
  elements.batchFilterSelect.addEventListener('change', () => {
    state.batchFilter = elements.batchFilterSelect.value || 'all';
    renderBatchJobs();
  });

  [
    elements.activeRunsList,
    elements.completedRunsList,
    elements.failedRunsList,
  ].forEach((listElement) => {
    if (!listElement) {
      return;
    }
    listElement.addEventListener('click', handleBatchListClick);
  });

  elements.closeOutputsModalButton.addEventListener('click', closeOutputsModal);
  elements.outputsModalBackdrop.addEventListener('click', closeOutputsModal);
  elements.closeOutputsImageModalButton.addEventListener('click', closeOutputImageModal);
  elements.outputsImageModalBackdrop.addEventListener('click', closeOutputImageModal);
  elements.outputsModeOutputOnlyButton.addEventListener('click', () => setOutputsReviewMode('output'));
  elements.outputsModeCompareButton.addEventListener('click', () => setOutputsReviewMode('compare'));
  elements.outputsTagFilterSelect.addEventListener('change', () => {
    state.outputsReview.tagFilter = elements.outputsTagFilterSelect.value || 'all';
    syncReviewSessionFromOutputs();
    renderOutputsModal();
  });

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

  elements.outputsModalBody.addEventListener('change', (event) => {
    const select = event.target.closest('[data-output-tag-index]');
    if (!select) {
      return;
    }
    const index = Number(select.dataset.outputTagIndex);
    if (Number.isNaN(index)) {
      return;
    }
    const item = state.outputsReview.items?.[index];
    if (!item) {
      return;
    }
    setReviewTag(state.outputsReview.batchName, item, select.value);
    renderOutputsModal();
  });

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
}

async function refreshBatchJobs() {
  setBusy('refreshBatches', true);
  try {
    const response = await fetch('/api/batch/list');
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load batch jobs.');
    }
    state.batchJobs = Array.isArray(payload.batches) ? payload.batches : [];
    state.lastRefreshAt = new Date().toISOString();
    renderSummary();
    renderBatchJobs();
    renderReviewSession();
  } catch (error) {
    showStatus(error.message || 'Failed to load batch jobs.', true);
  } finally {
    setBusy('refreshBatches', false);
  }
}

async function refreshAllBatchStatuses() {
  setBusy('batchAction', true);
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
    state.lastRefreshAt = new Date().toISOString();
    renderSummary();
    renderBatchJobs();
    renderReviewSession();
    showStatus(payload.success ? 'Batch statuses refreshed.' : 'Batch statuses refreshed with errors.', !payload.success);
  } catch (error) {
    showStatus(error.message || 'Batch refresh failed.', true);
  } finally {
    setBusy('batchAction', false);
  }
}

async function refreshSingleBatchStatus(batchName) {
  if (!batchName) {
    return;
  }
  setBusy('batchAction', true);
  try {
    const response = await fetch(`/api/batch/status?batchName=${encodeURIComponent(batchName)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Batch status refresh failed.');
    }
    upsertBatchState(payload.batch);
    state.lastRefreshAt = new Date().toISOString();
    renderSummary();
    renderBatchJobs();
    renderReviewSession();
    showStatus(`Batch status refreshed: ${batchName}`);
  } catch (error) {
    showStatus(error.message || 'Batch status refresh failed.', true);
  } finally {
    setBusy('batchAction', false);
  }
}

async function cancelBatch(batchName) {
  if (!batchName) {
    return;
  }
  if (!window.confirm(`Cancel batch "${batchName}"?`)) {
    return;
  }
  setBusy('batchAction', true);
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
    state.lastRefreshAt = new Date().toISOString();
    renderSummary();
    renderBatchJobs();
    renderReviewSession();
    showStatus(`Batch cancel request sent: ${batchName}`);
  } catch (error) {
    showStatus(error.message || 'Batch cancel failed.', true);
  } finally {
    setBusy('batchAction', false);
  }
}

async function downloadBatch(batchName) {
  if (!batchName) {
    return;
  }
  setBusy('batchAction', true);
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
    state.lastRefreshAt = new Date().toISOString();
    renderSummary();
    renderBatchJobs();
    renderReviewSession();
    const saved = payload.download?.savedCount ?? 0;
    showStatus(`Batch downloaded: ${batchName} (${saved} image${saved === 1 ? '' : 's'})`);
  } catch (error) {
    showStatus(error.message || 'Batch download failed.', true);
  } finally {
    setBusy('batchAction', false);
  }
}

async function viewBatchOutputs(batchName) {
  if (!batchName) {
    return;
  }

  state.reviewSession = {
    batchName,
    mode: 'output',
    tagFilter: state.outputsReview.tagFilter || 'all',
    reviewedCount: 0,
    totalCount: 0,
    stateText: 'Loading output review...',
    supportNote: 'Compare uses saved pairing when available. Quality tags are local review notes stored in this browser.',
  };
  state.outputsReview = {
    open: true,
    batchName,
    safeBatchName: '',
    outputDir: '',
    outputSource: '',
    mode: 'output',
    tagFilter: state.outputsReview.tagFilter || 'all',
    items: [],
    loading: true,
    error: '',
  };
  closeOutputImageModal();
  renderReviewSession();
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
    state.outputsReview.outputSource = payload.outputSource || '';
    state.outputsReview.items = Array.isArray(payload.items) ? payload.items : [];
    state.outputsReview.loading = false;
    state.outputsReview.error = '';
    syncReviewSessionFromOutputs();
    renderOutputsModal();
  } catch (error) {
    state.outputsReview.loading = false;
    state.outputsReview.error = error.message || 'Failed to load batch outputs.';
    syncReviewSessionFromOutputs();
    renderOutputsModal();
  }
}

function renderSummary() {
  const jobs = Array.isArray(state.batchJobs) ? state.batchJobs : [];
  const active = jobs.filter((item) => {
    const status = normalizeUiBatchState(item.status || item.lastKnownState);
    return status === 'PENDING' || status === 'RUNNING';
  }).length;
  const needsDownload = jobs.filter((item) => Boolean(item.downloadNeeded || (normalizeUiBatchState(item.status || item.lastKnownState) === 'SUCCEEDED' && !item.downloaded))).length;
  elements.summaryTotal.textContent = String(jobs.length);
  elements.summaryActive.textContent = String(active);
  elements.summaryDownloadNeeded.textContent = String(needsDownload);
  elements.summaryLastRefresh.textContent = state.lastRefreshAt ? formatDateTime(state.lastRefreshAt) : '-';
}

function renderReviewSession() {
  if (!elements.reviewSessionState) {
    return;
  }
  elements.reviewSessionState.textContent = state.reviewSession.stateText || 'Open a completed run to start reviewing outputs.';
  elements.reviewSessionBatch.textContent = state.reviewSession.batchName || '-';
  elements.reviewSessionMode.textContent = state.reviewSession.mode === 'compare' ? 'Compare' : 'Output Only';
  elements.reviewSessionFilter.textContent = getTagFilterLabel(state.reviewSession.tagFilter || 'all');
  elements.reviewSessionCounts.textContent = `${state.reviewSession.reviewedCount || 0} reviewed / ${state.reviewSession.totalCount || 0} total`;
  if (elements.reviewSupportNote) {
    elements.reviewSupportNote.textContent = state.reviewSession.supportNote || 'Compare uses saved pairing when available. Quality tags are local review notes stored in this browser.';
  }
}

function renderBatchJobs() {
  const all = Array.isArray(state.batchJobs) ? state.batchJobs.slice() : [];
  const isBusy = state.busy.batchAction || state.busy.refreshBatches;
  const active = all.filter((item) => isActiveBatch(item) && batchMatchesFilter(item, state.batchFilter));
  const completed = all.filter((item) => isCompletedBatch(item) && batchMatchesFilter(item, state.batchFilter));
  const failed = all.filter((item) => isFailedOrCancelledBatch(item) && batchMatchesFilter(item, state.batchFilter));

  const showActive = sectionMatchesFilter('active', state.batchFilter);
  const showCompleted = sectionMatchesFilter('completed', state.batchFilter);
  const showFailed = sectionMatchesFilter('failed', state.batchFilter) || sectionMatchesFilter('cancelled', state.batchFilter);

  elements.activeRunsSection.hidden = !showActive;
  elements.completedRunsSection.hidden = !showCompleted;
  elements.failedRunsSection.hidden = !showFailed;

  renderBatchSection(elements.activeRunsList, elements.activeRunsEmpty, active, isBusy, 'active');
  renderBatchSection(elements.completedRunsList, elements.completedRunsEmpty, completed, isBusy, 'completed');
  renderBatchSection(elements.failedRunsList, elements.failedRunsEmpty, failed, isBusy, 'failed');
}

function renderBatchSection(listElement, emptyElement, items, isBusy, sectionType) {
  if (!listElement || !emptyElement) {
    return;
  }

  if (!items.length) {
    emptyElement.hidden = false;
    listElement.innerHTML = '';
    emptyElement.textContent = getSectionEmptyMessage(sectionType, state.batchFilter);
    return;
  }

  emptyElement.hidden = true;
  listElement.innerHTML = items.map((batch) => renderBatchCard(batch, isBusy, sectionType)).join('');
}

function getSectionEmptyMessage(sectionType, filterValue) {
  if (filterValue === 'active') {
    return 'No active runs match the current view.';
  }
  if (filterValue === 'completed') {
    return 'No completed runs match the current view.';
  }
  if (filterValue === 'failed' || filterValue === 'cancelled') {
    return 'No failed or cancelled runs match the current view.';
  }
  if (sectionType === 'active') {
    return 'No active runs right now.';
  }
  if (sectionType === 'completed') {
    return 'No completed runs yet.';
  }
  return 'No failed or cancelled runs.';
}

function renderBatchCard(batch, isBusy, sectionType) {
  const status = normalizeUiBatchState(batch.status || batch.lastKnownState);
  const statusClass = status.toLowerCase();
  const batchName = batch.batchName || '-';
  const displayName = getBatchDisplayName(batch);
  const lastChecked = batch.lastCheckedAt || '-';
  const createdAt = batch.createdAt || '-';
  const downloadNeeded = Boolean(batch.downloadNeeded || (status === 'SUCCEEDED' && !batch.downloaded));
  const cancelled = Boolean(batch.cancelled);
  const canDownload = !isBusy && status === 'SUCCEEDED';
  const canViewOutputs = !isBusy && status === 'SUCCEEDED';
  const canCancel = !isBusy && !cancelled && (status === 'PENDING' || status === 'RUNNING');
  const reviewedCount = getReviewedCountForBatch(batchName);
  const reviewState = reviewedCount > 0 ? `${reviewedCount} reviewed` : 'Not reviewed yet';
  const indicatorText = downloadNeeded ? 'Download needed' : (batch.downloaded ? 'Downloaded' : 'Not downloaded');
  const sectionClass = sectionType === 'active'
    ? 'batch-job-card-active'
    : (sectionType === 'completed' ? 'batch-job-card-completed' : 'batch-job-card-secondary');
  const errorText = batch.lastError ? `<p class="batch-job-note batch-job-note-error">${escapeHtml(batch.lastError)}</p>` : '';
  const metaRows = [
    renderMetaRow('Batch name', batchName),
    renderMetaRow('Created', formatDateTime(createdAt)),
    renderMetaRow('Last checked', formatDateTime(lastChecked)),
    renderMetaRow('Source job', getBatchSourceLabel(batch)),
  ].join('');

  const actionButtons = [];
  if (sectionType === 'active') {
    actionButtons.push(`
      <button class="button button-small button-danger" data-batch-action="cancel" data-batch-name="${escapeAttribute(batchName)}"${canCancel ? '' : ' disabled'}>Cancel</button>
    `);
    actionButtons.push(`
      <button class="button button-small button-secondary" data-batch-action="refresh" data-batch-name="${escapeAttribute(batchName)}"${isBusy ? ' disabled' : ''}>Refresh Status</button>
    `);
  } else if (sectionType === 'completed') {
    actionButtons.push(`
      <button class="button button-small button-primary" data-batch-action="view-outputs" data-batch-name="${escapeAttribute(batchName)}"${canViewOutputs ? '' : ' disabled'}>View Outputs</button>
    `);
    actionButtons.push(`
      <button class="button button-small button-secondary" data-batch-action="download" data-batch-name="${escapeAttribute(batchName)}"${canDownload ? '' : ' disabled'}>Download</button>
    `);
    actionButtons.push(`
      <button class="button button-small button-secondary" data-batch-action="refresh" data-batch-name="${escapeAttribute(batchName)}"${isBusy ? ' disabled' : ''}>Refresh Status</button>
    `);
  } else {
    actionButtons.push(`
      <button class="button button-small button-secondary" data-batch-action="refresh" data-batch-name="${escapeAttribute(batchName)}"${isBusy ? ' disabled' : ''}>Refresh Status</button>
    `);
  }

  return `
    <article class="batch-job-card ${sectionClass}">
      <div class="batch-job-topline">
        <span class="status-badge ${statusClass}">${escapeHtml(getStatusLabel(status))}</span>
        <span class="indicator-pill ${downloadNeeded ? 'warn' : 'ok'}">${escapeHtml(indicatorText)}</span>
      </div>
      <div class="batch-job-header">
        <div class="batch-job-identity">
          <h3 class="batch-job-title" title="${escapeAttribute(displayName)}">${escapeHtml(displayName)}</h3>
          <p class="batch-job-subtitle">${escapeHtml(getBatchSubtitle(sectionType, batch, reviewState))}</p>
        </div>
      </div>
      <div class="batch-job-meta-grid">
        ${metaRows}
      </div>
      ${errorText}
      <div class="batch-actions">
        ${actionButtons.join('')}
      </div>
    </article>
  `;
}

function renderMetaRow(label, value) {
  return `<p class="batch-job-meta"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value || '-')}</span></p>`;
}

function getBatchDisplayName(batch) {
  const sourceJobId = String(batch?.sourceJobId || '').trim();
  if (sourceJobId) {
    return sourceJobId;
  }
  const sourceJobFile = String(batch?.sourceJobFile || '').trim();
  if (sourceJobFile) {
    const fileName = sourceJobFile.split('/').pop() || sourceJobFile;
    return fileName.replace(/\.canonical\.json$/i, '').replace(/\.json$/i, '');
  }
  return String(batch?.batchName || 'Batch run');
}

function getBatchSourceLabel(batch) {
  const sourceJobFile = String(batch?.sourceJobFile || '').trim();
  if (sourceJobFile) {
    return sourceJobFile;
  }
  return String(batch?.sourceJobId || '-');
}

function getBatchSubtitle(sectionType, batch, reviewState) {
  const status = normalizeUiBatchState(batch.status || batch.lastKnownState);
  if (sectionType === 'active') {
    return status === 'PENDING'
      ? 'Queued and waiting to start.'
      : 'Currently running. Cancel is available while active.';
  }
  if (sectionType === 'completed') {
    if (batch.downloadNeeded || !batch.downloaded) {
      return 'Finished and ready for download before review.';
    }
    return `Finished and ready for evaluation. ${reviewState}.`;
  }
  if (status === 'FAILED') {
    return 'Finished with an error. Refresh status or inspect the batch metadata.';
  }
  return 'Run was cancelled before completion.';
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
  if (action === 'cancel') {
    cancelBatch(batchName);
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

function renderOutputsModal() {
  if (!state.outputsReview.open) {
    elements.outputsModal.hidden = true;
    elements.outputsModal.setAttribute('aria-hidden', 'true');
    elements.outputsModalBody.innerHTML = '';
    elements.outputsModalMeta.textContent = '-';
    if (elements.outputsModalSupportNote) {
      elements.outputsModalSupportNote.textContent = 'Compare uses saved pairing when available. Missing pairs are shown honestly.';
    }
    elements.outputsTagFilterSelect.value = 'all';
    renderOutputsModeToggle();
    return;
  }

  elements.outputsModal.hidden = false;
  elements.outputsModal.setAttribute('aria-hidden', 'false');
  elements.outputsModalTitle.textContent = 'Output Review';
  const metaParts = [state.outputsReview.batchName || '-'];
  if (state.outputsReview.outputDir) {
    metaParts.push(state.outputsReview.outputDir);
  }
  elements.outputsModalMeta.textContent = metaParts.join(' | ');
  if (elements.outputsModalSupportNote) {
    elements.outputsModalSupportNote.textContent = getOutputReviewSupportNote();
  }
  elements.outputsTagFilterSelect.value = state.outputsReview.tagFilter || 'all';
  renderOutputsModeToggle();

  if (state.outputsReview.loading) {
    elements.outputsModalBody.innerHTML = '<div class="output-empty">Loading review items...</div>';
    return;
  }
  if (state.outputsReview.error) {
    elements.outputsModalBody.innerHTML = `<div class="output-empty">${escapeHtml(state.outputsReview.error)}</div>`;
    return;
  }

  const visibleItems = getFilteredOutputItems();
  if (visibleItems.length === 0) {
    elements.outputsModalBody.innerHTML = `<div class="output-empty">${escapeHtml(getOutputReviewEmptyState())}</div>`;
    return;
  }

  const mode = state.outputsReview.mode === 'compare' ? 'compare' : 'output';
  if (mode === 'output') {
    const outputItems = visibleItems
      .map((item) => ({ item, originalIndex: state.outputsReview.items.indexOf(item) }))
      .filter(({ item }) => Boolean(item?.output?.url));

    if (outputItems.length === 0) {
      elements.outputsModalBody.innerHTML = '<div class="output-empty">No outputs downloaded yet for this batch.</div>';
      return;
    }

    elements.outputsModalBody.innerHTML = `
      <div class="output-grid">
        ${outputItems.map(({ item, originalIndex }) => renderOutputOnlyCard(item, originalIndex)).join('')}
      </div>
    `;
    return;
  }

  elements.outputsModalBody.innerHTML = `
    <div class="output-grid">
      ${visibleItems.map((item) => renderCompareCard(item, state.outputsReview.items.indexOf(item))).join('')}
    </div>
  `;
}

function renderOutputOnlyCard(item, itemIndex) {
  const tag = getReviewTag(state.outputsReview.batchName, item);
  return `
    <article class="output-thumb-card">
      <button
        class="output-thumb-wrap output-thumb-single"
        type="button"
        data-output-action="preview-output"
        data-item-index="${itemIndex}"
      >
        <img
          src="${escapeAttribute(item.output.url)}"
          alt="${escapeAttribute(item.output.file || item.key || 'output image')}"
          loading="lazy"
        />
      </button>
      <div class="output-card-footer">
        <p class="output-thumb-name" title="${escapeAttribute(item.output.file || item.key || '')}">
          ${escapeHtml(item.output.file || item.key || 'Unnamed output')}
        </p>
        ${renderTagControls(tag, itemIndex)}
      </div>
    </article>
  `;
}

function renderCompareCard(item, itemIndex) {
  const tag = getReviewTag(state.outputsReview.batchName, item);
  return `
    <article class="output-thumb-card">
      <button
        class="output-thumb-wrap output-thumb-pair"
        type="button"
        data-output-action="preview-compare"
        data-item-index="${itemIndex}"
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
      <div class="output-card-footer">
        <p class="output-thumb-name" title="${escapeAttribute(item.key || item.output?.file || '')}">
          ${escapeHtml(item.key || item.output?.file || 'No key')}
        </p>
        ${renderTagControls(tag, itemIndex)}
      </div>
    </article>
  `;
}

function renderTagControls(tag, itemIndex) {
  const safeTag = tag || '';
  const pill = safeTag
    ? `<span class="tag-pill ${escapeAttribute(safeTag)}">${escapeHtml(getTagLabel(safeTag))}</span>`
    : '<span class="tag-pill">Not Reviewed</span>';
  return `
    <div class="output-tag-row">
      <span class="output-tag-label">Quality Tag</span>
      <select class="output-tag-select" data-output-tag-index="${itemIndex}">
        ${renderTagOptions(safeTag)}
      </select>
      ${pill}
    </div>
  `;
}

function renderTagOptions(selectedValue) {
  const options = [
    { value: '', label: 'Not reviewed' },
    { value: 'approved', label: 'Looks good' },
    { value: 'review', label: 'Needs Review' },
    { value: 'rejected', label: 'Reject' },
  ];
  return options.map((option) => {
    const selected = option.value === selectedValue ? ' selected' : '';
    return `<option value="${escapeAttribute(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
  }).join('');
}

function renderThumb(node, emptyText) {
  if (!node || !node.url) {
    return `<div class="output-thumb-empty">${escapeHtml(emptyText)}</div>`;
  }
  const alt = node.file || emptyText;
  return `<img src="${escapeAttribute(node.url)}" alt="${escapeAttribute(alt)}" loading="lazy" />`;
}

function getFilteredOutputItems() {
  const baseItems = Array.isArray(state.outputsReview.items) ? state.outputsReview.items : [];
  const mode = state.outputsReview.mode === 'compare' ? 'compare' : 'output';
  let items = mode === 'output'
    ? baseItems.filter((item) => Boolean(item?.output?.url))
    : baseItems.slice();

  const tagFilter = state.outputsReview.tagFilter || 'all';
  if (tagFilter === 'tagged') {
    items = items.filter((item) => Boolean(getReviewTag(state.outputsReview.batchName, item)));
  } else if (tagFilter === 'untagged') {
    items = items.filter((item) => !getReviewTag(state.outputsReview.batchName, item));
  }
  return items;
}

function setOutputsReviewMode(mode) {
  if (!state.outputsReview.open) {
    return;
  }
  const nextMode = mode === 'compare' ? 'compare' : 'output';
  if (state.outputsReview.mode === nextMode) {
    return;
  }
  state.outputsReview.mode = nextMode;
  syncReviewSessionFromOutputs();
  renderOutputsModal();
}

function renderOutputsModeToggle() {
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
  elements.outputsTagFilterSelect.disabled = loading;
}

function closeOutputsModal() {
  state.outputsReview = {
    open: false,
    batchName: '',
    safeBatchName: '',
    outputDir: '',
    outputSource: '',
    mode: 'output',
    tagFilter: 'all',
    items: [],
    loading: false,
    error: '',
  };
  closeOutputImageModal();
  renderReviewSession();
  renderOutputsModal();
}

function openOutputImageModal(item, previewMode = 'compare') {
  const mode = previewMode === 'output' ? 'output' : 'compare';
  const key = String(item?.key || '').trim() || '-';
  const input = item?.input && typeof item.input === 'object'
    ? { file: item.input.file || null, url: item.input.url || null }
    : null;
  const output = item?.output && typeof item.output === 'object'
    ? { file: item.output.file || null, url: item.output.url || null }
    : null;

  state.outputImagePreview = { open: true, mode, key, input, output };
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
    elements.outputsLargeOutputEmpty.hidden = false;
    elements.outputsLargeOutputEmpty.textContent = 'No output';
  }
}

function closeOutputImageModal() {
  state.outputImagePreview = { open: false, mode: 'output', key: '', input: null, output: null };
  elements.outputsImageModal.hidden = true;
  elements.outputsImageModal.setAttribute('aria-hidden', 'true');
  elements.outputsImageModalMeta.textContent = '-';
  elements.outputsCompareGrid.classList.remove('output-single-mode');
  elements.outputsLargeInputPane.hidden = false;
  elements.outputsLargeOutputPane.classList.remove('output-compare-pane-full');
  elements.outputsLargeInputImage.hidden = true;
  elements.outputsLargeInputImage.src = '';
  elements.outputsLargeInputEmpty.hidden = true;
  elements.outputsLargeOutputImage.hidden = true;
  elements.outputsLargeOutputImage.src = '';
  elements.outputsLargeOutputEmpty.hidden = true;
}

function loadReviewTags() {
  try {
    const raw = localStorage.getItem(REVIEW_TAG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function persistReviewTags() {
  try {
    localStorage.setItem(REVIEW_TAG_STORAGE_KEY, JSON.stringify(state.reviewTags));
  } catch (_error) {
    // ignore storage failures
  }
}

function getReviewTagKey(batchName, item) {
  return `${batchName}::${item?.key || item?.output?.file || item?.input?.file || 'unknown'}`;
}

function getReviewTag(batchName, item) {
  const key = getReviewTagKey(batchName, item);
  return state.reviewTags[key] || '';
}

function setReviewTag(batchName, item, tag) {
  const key = getReviewTagKey(batchName, item);
  const value = String(tag || '').trim();
  if (!value) {
    delete state.reviewTags[key];
  } else {
    state.reviewTags[key] = value;
  }
  persistReviewTags();
  syncReviewSessionFromOutputs();
}

function getTagLabel(tag) {
  if (tag === 'approved') return 'Looks Good';
  if (tag === 'review') return 'Needs Review';
  if (tag === 'rejected') return 'Reject';
  return 'Not Reviewed';
}

function getTagFilterLabel(filterValue) {
  if (filterValue === 'tagged') return 'Reviewed';
  if (filterValue === 'untagged') return 'Not Reviewed';
  return 'All';
}

function getReviewedCountForBatch(batchName) {
  if (!batchName) {
    return 0;
  }
  const prefix = `${batchName}::`;
  return Object.keys(state.reviewTags).filter((key) => key.startsWith(prefix) && state.reviewTags[key]).length;
}

function syncReviewSessionFromOutputs() {
  const items = Array.isArray(state.outputsReview.items) ? state.outputsReview.items : [];
  const reviewedCount = items.filter((item) => Boolean(getReviewTag(state.outputsReview.batchName, item))).length;
  let stateText = 'Open a completed run to start reviewing outputs.';
  if (state.outputsReview.loading) {
    stateText = 'Loading output review...';
  } else if (state.outputsReview.error) {
    stateText = state.outputsReview.error;
  } else if (state.outputsReview.batchName) {
    stateText = items.length > 0
      ? `Reviewing ${items.length} item${items.length === 1 ? '' : 's'} from the selected batch.`
      : 'No outputs downloaded yet for this batch.';
  }

  state.reviewSession = {
    batchName: state.outputsReview.batchName || state.reviewSession.batchName || '',
    mode: state.outputsReview.mode === 'compare' ? 'compare' : 'output',
    tagFilter: state.outputsReview.tagFilter || 'all',
    reviewedCount,
    totalCount: items.length,
    stateText,
    supportNote: getOutputReviewSupportNote(),
  };
  renderReviewSession();
}

function getOutputReviewSupportNote() {
  if (state.outputsReview.outputSource === 'legacyFlat') {
    return 'Review is reading from a legacy flat output folder for this batch. Compare still uses saved pairing when available.';
  }
  if (state.outputsReview.mode === 'compare') {
    return 'Compare uses saved pairing when available. Missing pairs are shown honestly, not guessed.';
  }
  return 'Quality tags are local review notes stored in this browser. Compare uses saved pairing when available.';
}

function getOutputReviewEmptyState() {
  if (state.outputsReview.mode === 'compare') {
    if (state.outputsReview.tagFilter === 'tagged') {
      return 'No reviewed compare items yet.';
    }
    if (state.outputsReview.tagFilter === 'untagged') {
      return 'No unreviewed compare items remain.';
    }
    return 'No paired inputs found for compare review yet.';
  }
  if (state.outputsReview.tagFilter === 'tagged') {
    return 'No reviewed outputs yet.';
  }
  if (state.outputsReview.tagFilter === 'untagged') {
    return 'No unreviewed outputs remain.';
  }
  return 'No outputs downloaded yet.';
}

function getStatusLabel(status) {
  if (status === 'PENDING') return 'Pending';
  if (status === 'RUNNING') return 'Running';
  if (status === 'SUCCEEDED') return 'Completed';
  if (status === 'FAILED') return 'Failed';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Unknown';
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
  if (filterValue === 'active') return status === 'PENDING' || status === 'RUNNING';
  if (filterValue === 'completed') return status === 'SUCCEEDED';
  if (filterValue === 'failed') return status === 'FAILED';
  if (filterValue === 'cancelled') return status === 'CANCELLED';
  return true;
}

function sectionMatchesFilter(sectionType, filterValue) {
  if (filterValue === 'all') {
    return true;
  }
  if (sectionType === 'active') {
    return filterValue === 'active';
  }
  if (sectionType === 'completed') {
    return filterValue === 'completed';
  }
  return filterValue === 'failed' || filterValue === 'cancelled';
}

function isActiveBatch(batch) {
  const status = normalizeUiBatchState(batch.status || batch.lastKnownState);
  return status === 'PENDING' || status === 'RUNNING';
}

function isCompletedBatch(batch) {
  return normalizeUiBatchState(batch.status || batch.lastKnownState) === 'SUCCEEDED';
}

function isFailedOrCancelledBatch(batch) {
  const status = normalizeUiBatchState(batch.status || batch.lastKnownState);
  return status === 'FAILED' || status === 'CANCELLED' || status === 'UNKNOWN';
}

function upsertBatchState(batch) {
  if (!batch || !batch.batchName) {
    return;
  }
  const items = Array.isArray(state.batchJobs) ? state.batchJobs.slice() : [];
  const index = items.findIndex((item) => item.batchName === batch.batchName);
  if (index >= 0) {
    items[index] = { ...items[index], ...batch };
  } else {
    items.push(batch);
  }
  state.batchJobs = items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function setBusy(action, isBusy) {
  state.busy[action] = isBusy;
  const busy = state.busy.batchAction || state.busy.refreshBatches;
  elements.refreshAllBatchesButton.disabled = busy;
  elements.refreshAllBatchesButton.textContent = busy ? 'Refreshing...' : 'Refresh All';
  elements.batchFilterSelect.disabled = busy;
  renderBatchJobs();
}

function showStatus(message, isError = false) {
  elements.statusBanner.hidden = false;
  elements.statusBanner.textContent = message;
  elements.statusBanner.classList.toggle('error', Boolean(isError));
}

function formatDateTime(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '-';
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }
  return date.toLocaleString();
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
