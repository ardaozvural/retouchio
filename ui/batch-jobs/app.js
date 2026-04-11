const state = {
  batchJobs: [],
  batchFilter: 'all',
  reviewSession: {
    batchName: '',
    runId: '',
    mode: 'output',
    filter: 'all',
    reviewedCount: 0,
    totalCount: 0,
    stateText: 'Open a completed or failed run to review outputs and manage attempts.',
    supportNote: 'Approve marks one final output per request key. Reject preserves history. Retry creates a new attempt.',
  },
  outputsReview: {
    open: false,
    batchName: '',
    runId: '',
    safeBatchName: '',
    outputDir: '',
    outputSource: '',
    mode: 'output',
    filter: 'all',
    items: [],
    attempts: [],
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
    state.outputsReview.filter = elements.outputsTagFilterSelect.value || 'all';
    syncReviewSessionFromOutputs();
    renderOutputsModal();
  });

  elements.outputsModalBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-output-action]');
    if (!button) {
      return;
    }

    const action = String(button.dataset.outputAction || '').trim();
    const attemptIndex = Number(button.dataset.attemptIndex);
    const itemIndex = Number(button.dataset.itemIndex);
    const item = getAttemptItem(attemptIndex, itemIndex);
    if (!item) {
      return;
    }

    if (action === 'preview-output') {
      openOutputImageModal(item, 'output');
      return;
    }
    if (action === 'preview-compare') {
      openOutputImageModal(item, 'compare');
      return;
    }
    if (action === 'approve') {
      await approveOutput(item);
      return;
    }
    if (action === 'reject') {
      await rejectOutput(item);
      return;
    }
    if (action === 'retry') {
      await retryOutputItem(item);
    }
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

async function retryBatchRun(runId, batchName = '') {
  if (!runId && !batchName) {
    showStatus('Retry target is missing.', true);
    return;
  }
  const label = batchName || runId;
  if (!window.confirm(`Create a new attempt for "${label}"?`)) {
    return;
  }

  setBusy('batchAction', true);
  try {
    const response = await fetch('/api/batch/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: runId || null,
        batchName: batchName || null,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Retry failed.');
    }

    state.batchJobs = Array.isArray(payload.batches) ? payload.batches : state.batchJobs;
    state.lastRefreshAt = new Date().toISOString();
    renderSummary();
    renderBatchJobs();
    renderReviewSession();

    if (state.outputsReview.open && state.outputsReview.batchName) {
      await reloadOutputsReview();
    }

    const nextBatchName = payload.retried?.batchName || payload.batchRecord?.batchName || 'new attempt';
    showStatus(`Retry submitted: ${nextBatchName}`);
  } catch (error) {
    showStatus(error.message || 'Retry failed.', true);
  } finally {
    setBusy('batchAction', false);
  }
}

async function approveOutput(item) {
  if (!item?.outputId) {
    showStatus('This output cannot be approved yet.', true);
    return;
  }
  setBusy('outputs', true);
  try {
    const response = await fetch('/api/batch/output/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputId: item.outputId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Approve failed.');
    }
    await refreshBatchJobs();
    await reloadOutputsReview();
    showStatus(`Output approved: ${item.key || item.output?.file || item.outputId}`);
  } catch (error) {
    showStatus(error.message || 'Approve failed.', true);
  } finally {
    setBusy('outputs', false);
  }
}

async function rejectOutput(item) {
  if (!item?.outputId) {
    showStatus('This output cannot be rejected yet.', true);
    return;
  }
  setBusy('outputs', true);
  try {
    const response = await fetch('/api/batch/output/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputId: item.outputId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Reject failed.');
    }
    await refreshBatchJobs();
    await reloadOutputsReview();
    showStatus(`Output rejected: ${item.key || item.output?.file || item.outputId}`);
  } catch (error) {
    showStatus(error.message || 'Reject failed.', true);
  } finally {
    setBusy('outputs', false);
  }
}

async function retryOutputItem(item) {
  if (!item?.runId || !item?.key) {
    showStatus('This output cannot be retried.', true);
    return;
  }
  if (!window.confirm(`Create a new attempt for request "${item.key}"?`)) {
    return;
  }

  setBusy('outputs', true);
  try {
    const response = await fetch('/api/batch/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: item.runId,
        batchName: item.batchName || null,
        requestKey: item.key,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Retry failed.');
    }

    state.batchJobs = Array.isArray(payload.batches) ? payload.batches : state.batchJobs;
    state.lastRefreshAt = new Date().toISOString();
    renderSummary();
    renderBatchJobs();
    renderReviewSession();
    await reloadOutputsReview();

    const nextBatchName = payload.retried?.batchName || payload.batchRecord?.batchName || 'new attempt';
    showStatus(`Retry submitted for ${item.key}: ${nextBatchName}`);
  } catch (error) {
    showStatus(error.message || 'Retry failed.', true);
  } finally {
    setBusy('outputs', false);
  }
}

async function viewBatchOutputs(batchName) {
  if (!batchName) {
    return;
  }

  state.outputsReview.open = true;
  state.outputsReview.batchName = batchName;
  state.outputsReview.loading = true;
  state.outputsReview.error = '';
  closeOutputImageModal();
  syncReviewSessionFromOutputs();
  renderOutputsModal();

  try {
    const payload = await fetchBatchOutputsPayload(batchName);
    applyOutputsPayload(payload, batchName);
  } catch (error) {
    state.outputsReview.loading = false;
    state.outputsReview.error = error.message || 'Failed to load batch outputs.';
    syncReviewSessionFromOutputs();
    renderOutputsModal();
  }
}

async function reloadOutputsReview() {
  if (!state.outputsReview.open || !state.outputsReview.batchName) {
    return;
  }
  try {
    const payload = await fetchBatchOutputsPayload(state.outputsReview.batchName);
    applyOutputsPayload(payload, state.outputsReview.batchName);
  } catch (error) {
    state.outputsReview.error = error.message || 'Failed to refresh output review.';
    state.outputsReview.loading = false;
    syncReviewSessionFromOutputs();
    renderOutputsModal();
  }
}

async function fetchBatchOutputsPayload(batchName) {
  const response = await fetch(`/api/batch/outputs?batchName=${encodeURIComponent(batchName)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load batch outputs.');
  }
  return payload;
}

function applyOutputsPayload(payload, requestedBatchName) {
  state.outputsReview.batchName = payload.batchName || requestedBatchName || '';
  state.outputsReview.runId = payload.runId || '';
  state.outputsReview.safeBatchName = payload.safeBatchName || '';
  state.outputsReview.outputDir = payload.outputDir || '';
  state.outputsReview.outputSource = payload.outputSource || '';
  state.outputsReview.items = Array.isArray(payload.items) ? payload.items : [];
  state.outputsReview.attempts = normalizeAttemptGroups(payload.attempts, payload.runId || '');
  state.outputsReview.loading = false;
  state.outputsReview.error = '';
  syncReviewSessionFromOutputs();
  renderOutputsModal();
}

function normalizeAttemptGroups(attempts, fallbackRunId = '') {
  return (Array.isArray(attempts) ? attempts : []).map((attempt) => {
    const attemptItems = Array.isArray(attempt?.items) ? attempt.items : [];
    return {
      ...attempt,
      runId: attempt?.runId || fallbackRunId || '',
      attemptId: attempt?.attemptId || '',
      batchName: attempt?.batchName || '',
      items: attemptItems.map((item) => ({
        ...item,
        batchName: attempt?.batchName || '',
        runId: attempt?.runId || fallbackRunId || '',
        attemptId: attempt?.attemptId || '',
        review_state: normalizeReviewState(item?.review_state),
        is_final: Boolean(item?.is_final),
      })),
    };
  });
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
  elements.reviewSessionState.textContent = state.reviewSession.stateText || 'Open a completed or failed run to review outputs and manage attempts.';
  elements.reviewSessionBatch.textContent = state.reviewSession.batchName || '-';
  elements.reviewSessionMode.textContent = state.reviewSession.mode === 'compare' ? 'Compare' : 'Output Only';
  elements.reviewSessionFilter.textContent = getReviewFilterLabel(state.reviewSession.filter || 'all');
  elements.reviewSessionCounts.textContent = `${state.reviewSession.reviewedCount || 0} reviewed / ${state.reviewSession.totalCount || 0} total`;
  if (elements.reviewSupportNote) {
    elements.reviewSupportNote.textContent = state.reviewSession.supportNote || 'Approve marks one final output per request key. Reject preserves history. Retry creates a new attempt.';
  }
}

function renderBatchJobs() {
  const all = Array.isArray(state.batchJobs) ? state.batchJobs.slice() : [];
  const busy = state.busy.batchAction || state.busy.refreshBatches || state.busy.outputs;
  const active = all.filter((item) => isActiveBatch(item) && batchMatchesFilter(item, state.batchFilter));
  const completed = all.filter((item) => isCompletedBatch(item) && batchMatchesFilter(item, state.batchFilter));
  const failed = all.filter((item) => isFailedOrCancelledBatch(item) && batchMatchesFilter(item, state.batchFilter));

  const showActive = sectionMatchesFilter('active', state.batchFilter);
  const showCompleted = sectionMatchesFilter('completed', state.batchFilter);
  const showFailed = sectionMatchesFilter('failed', state.batchFilter) || sectionMatchesFilter('cancelled', state.batchFilter);

  elements.activeRunsSection.hidden = !showActive;
  elements.completedRunsSection.hidden = !showCompleted;
  elements.failedRunsSection.hidden = !showFailed;

  renderBatchSection(elements.activeRunsList, elements.activeRunsEmpty, active, busy, 'active');
  renderBatchSection(elements.completedRunsList, elements.completedRunsEmpty, completed, busy, 'completed');
  renderBatchSection(elements.failedRunsList, elements.failedRunsEmpty, failed, busy, 'failed');
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
  const canViewOutputs = !isBusy && (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED');
  const canCancel = !isBusy && !cancelled && (status === 'PENDING' || status === 'RUNNING');
  const canRetry = !isBusy && Boolean(batch.runId);
  const sectionClass = sectionType === 'active'
    ? 'batch-job-card-active'
    : (sectionType === 'completed' ? 'batch-job-card-completed' : 'batch-job-card-secondary');
  const errorText = batch.lastError ? `<p class="batch-job-note batch-job-note-error">${escapeHtml(batch.lastError)}</p>` : '';
  const runReviewText = getRunReviewSummaryText(batch.runSummary || batch.outputSummary);
  const metaRows = [
    renderMetaRow('Batch name', batchName),
    renderMetaRow('Run', batch.runId || '-'),
    renderMetaRow('Attempt', batch.attemptId || '-'),
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
      <button class="button button-small button-secondary" data-batch-action="retry-run" data-batch-name="${escapeAttribute(batchName)}" data-run-id="${escapeAttribute(batch.runId || '')}"${canRetry ? '' : ' disabled'}>Retry</button>
    `);
    actionButtons.push(`
      <button class="button button-small button-secondary" data-batch-action="refresh" data-batch-name="${escapeAttribute(batchName)}"${isBusy ? ' disabled' : ''}>Refresh Status</button>
    `);
  } else {
    actionButtons.push(`
      <button class="button button-small button-secondary" data-batch-action="view-outputs" data-batch-name="${escapeAttribute(batchName)}"${canViewOutputs ? '' : ' disabled'}>View Outputs</button>
    `);
    actionButtons.push(`
      <button class="button button-small button-secondary" data-batch-action="retry-run" data-batch-name="${escapeAttribute(batchName)}" data-run-id="${escapeAttribute(batch.runId || '')}"${canRetry ? '' : ' disabled'}>Retry</button>
    `);
    actionButtons.push(`
      <button class="button button-small button-secondary" data-batch-action="refresh" data-batch-name="${escapeAttribute(batchName)}"${isBusy ? ' disabled' : ''}>Refresh Status</button>
    `);
  }

  return `
    <article class="batch-job-card ${sectionClass}">
      <div class="batch-job-topline">
        <span class="status-badge ${statusClass}">${escapeHtml(getStatusLabel(status))}</span>
        <span class="indicator-pill ${downloadNeeded ? 'warn' : 'ok'}">${escapeHtml(downloadNeeded ? 'Download needed' : (batch.downloaded ? 'Downloaded' : 'Not downloaded'))}</span>
      </div>
      <div class="batch-job-header">
        <div class="batch-job-identity">
          <h3 class="batch-job-title" title="${escapeAttribute(displayName)}">${escapeHtml(displayName)}</h3>
          <p class="batch-job-subtitle">${escapeHtml(getBatchSubtitle(sectionType, batch, runReviewText))}</p>
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

function handleBatchListClick(event) {
  const button = event.target.closest('[data-batch-action]');
  if (!button) {
    return;
  }
  const action = button.dataset.batchAction;
  const batchName = button.dataset.batchName;
  const runId = button.dataset.runId || '';

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
    return;
  }
  if (action === 'retry-run') {
    retryBatchRun(runId, batchName);
  }
}

function renderOutputsModal() {
  if (!state.outputsReview.open) {
    elements.outputsModal.hidden = true;
    elements.outputsModal.setAttribute('aria-hidden', 'true');
    elements.outputsModalBody.innerHTML = '';
    elements.outputsModalMeta.textContent = '-';
    if (elements.outputsModalSupportNote) {
      elements.outputsModalSupportNote.textContent = 'Approve marks one final output per request key. Reject preserves history. Retry creates a new attempt.';
    }
    elements.outputsTagFilterSelect.value = 'all';
    renderOutputsModeToggle();
    return;
  }

  elements.outputsModal.hidden = false;
  elements.outputsModal.setAttribute('aria-hidden', 'false');
  elements.outputsModalTitle.textContent = 'Output Review';
  const metaParts = [state.outputsReview.batchName || '-'];
  if (state.outputsReview.runId) {
    metaParts.push(state.outputsReview.runId);
  }
  if (state.outputsReview.outputDir) {
    metaParts.push(state.outputsReview.outputDir);
  }
  elements.outputsModalMeta.textContent = metaParts.join(' | ');
  if (elements.outputsModalSupportNote) {
    elements.outputsModalSupportNote.textContent = getOutputReviewSupportNote();
  }
  elements.outputsTagFilterSelect.value = state.outputsReview.filter || 'all';
  renderOutputsModeToggle();

  if (state.outputsReview.loading) {
    elements.outputsModalBody.innerHTML = '<div class="output-empty">Loading review items...</div>';
    return;
  }
  if (state.outputsReview.error) {
    elements.outputsModalBody.innerHTML = `<div class="output-empty">${escapeHtml(state.outputsReview.error)}</div>`;
    return;
  }

  const groups = getRenderableAttemptGroups();
  if (groups.length === 0) {
    elements.outputsModalBody.innerHTML = `<div class="output-empty">${escapeHtml(getOutputReviewEmptyState())}</div>`;
    return;
  }

  elements.outputsModalBody.innerHTML = groups.map((group, attemptIndex) => renderAttemptGroup(group, attemptIndex)).join('');
}

function renderAttemptGroup(group, attemptIndex) {
  const status = normalizeUiBatchState(group.status);
  const statusClass = status.toLowerCase();
  const summary = summarizeOutputItems(group.items);
  const metaParts = [
    group.batchName || '-',
    group.runId || '-',
    group.attemptId || '-',
  ];
  if (group.createdAt) {
    metaParts.push(formatDateTime(group.createdAt));
  }

  const content = group.visibleItems.length > 0
    ? `
      <div class="output-grid">
        ${group.visibleItems.map(({ item, originalIndex }) => (
          state.outputsReview.mode === 'compare'
            ? renderCompareCard(item, attemptIndex, originalIndex)
            : renderOutputOnlyCard(item, attemptIndex, originalIndex)
        )).join('')}
      </div>
    `
    : `<div class="output-empty">${escapeHtml(getAttemptEmptyState(group))}</div>`;

  return `
    <section class="attempt-group">
      <div class="attempt-group-header">
        <div class="attempt-group-copy">
          <p class="attempt-group-title">Attempt ${escapeHtml(group.attemptId || '-')}</p>
          <p class="attempt-group-meta">${escapeHtml(metaParts.join(' | '))}</p>
        </div>
        <div class="attempt-group-pills">
          <span class="status-badge ${statusClass}">${escapeHtml(getStatusLabel(status))}</span>
          <span class="indicator-pill">${escapeHtml(`${summary.total} output${summary.total === 1 ? '' : 's'}`)}</span>
          ${summary.final > 0 ? `<span class="tag-pill approved">${escapeHtml(`${summary.final} final`)}</span>` : ''}
        </div>
      </div>
      ${content}
    </section>
  `;
}

function renderOutputOnlyCard(item, attemptIndex, itemIndex) {
  return `
    <article class="output-thumb-card">
      <button
        class="output-thumb-wrap output-thumb-single"
        type="button"
        data-output-action="preview-output"
        data-attempt-index="${attemptIndex}"
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
        ${renderOutputStatusRow(item)}
        ${renderOutputActions(item, attemptIndex, itemIndex)}
      </div>
    </article>
  `;
}

function renderCompareCard(item, attemptIndex, itemIndex) {
  return `
    <article class="output-thumb-card">
      <button
        class="output-thumb-wrap output-thumb-pair"
        type="button"
        data-output-action="preview-compare"
        data-attempt-index="${attemptIndex}"
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
        ${renderOutputStatusRow(item)}
        ${renderOutputActions(item, attemptIndex, itemIndex)}
      </div>
    </article>
  `;
}

function renderOutputStatusRow(item) {
  const chips = [
    `<span class="tag-pill ${escapeAttribute(getReviewTone(item.review_state))}">${escapeHtml(getReviewStateLabel(item.review_state))}</span>`,
  ];
  if (item.is_final) {
    chips.push('<span class="tag-pill approved">Final</span>');
  }
  if (item.key) {
    chips.push(`<span class="indicator-pill">${escapeHtml(item.key)}</span>`);
  }
  return `
    <div class="output-status-row">
      ${chips.join('')}
    </div>
  `;
}

function renderOutputActions(item, attemptIndex, itemIndex) {
  const busy = state.busy.outputs || state.busy.batchAction || state.busy.refreshBatches;
  return `
    <div class="output-action-row">
      <button
        class="button button-small button-primary"
        type="button"
        data-output-action="approve"
        data-attempt-index="${attemptIndex}"
        data-item-index="${itemIndex}"
        ${busy || !item.outputId ? 'disabled' : ''}
      >Approve</button>
      <button
        class="button button-small button-secondary"
        type="button"
        data-output-action="reject"
        data-attempt-index="${attemptIndex}"
        data-item-index="${itemIndex}"
        ${busy || !item.outputId ? 'disabled' : ''}
      >Reject</button>
      <button
        class="button button-small button-secondary"
        type="button"
        data-output-action="retry"
        data-attempt-index="${attemptIndex}"
        data-item-index="${itemIndex}"
        ${busy || !item.runId || !item.key ? 'disabled' : ''}
      >Retry</button>
    </div>
  `;
}

function renderThumb(node, emptyText) {
  if (!node || !node.url) {
    return `<div class="output-thumb-empty">${escapeHtml(emptyText)}</div>`;
  }
  const alt = node.file || emptyText;
  return `<img src="${escapeAttribute(node.url)}" alt="${escapeAttribute(alt)}" loading="lazy" />`;
}

function getRenderableAttemptGroups() {
  const attempts = Array.isArray(state.outputsReview.attempts) ? state.outputsReview.attempts : [];
  return attempts
    .map((attempt) => ({
      ...attempt,
      visibleItems: getVisibleItemsForAttempt(attempt).map((item) => ({
        item,
        originalIndex: attempt.items.indexOf(item),
      })),
    }))
    .filter((attempt) => attempt.visibleItems.length > 0 || shouldShowAttemptWithoutItems(attempt));
}

function getVisibleItemsForAttempt(attempt) {
  const baseItems = Array.isArray(attempt?.items) ? attempt.items.slice() : [];
  const mode = state.outputsReview.mode === 'compare' ? 'compare' : 'output';
  let items = mode === 'output'
    ? baseItems.filter((item) => Boolean(item?.output?.url))
    : baseItems.slice();

  const filter = state.outputsReview.filter || 'all';
  if (filter === 'in_review') {
    items = items.filter((item) => normalizeReviewState(item?.review_state) === 'in_review');
  } else if (filter === 'approved') {
    items = items.filter((item) => normalizeReviewState(item?.review_state) === 'approved');
  } else if (filter === 'rejected') {
    items = items.filter((item) => normalizeReviewState(item?.review_state) === 'rejected');
  } else if (filter === 'final') {
    items = items.filter((item) => Boolean(item?.is_final));
  }
  return items;
}

function shouldShowAttemptWithoutItems(attempt) {
  const status = normalizeUiBatchState(attempt?.status);
  return status === 'PENDING' || status === 'RUNNING' || status === 'FAILED' || status === 'CANCELLED';
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
  const loading = Boolean(state.outputsReview.loading || state.busy.outputs);
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
    runId: '',
    safeBatchName: '',
    outputDir: '',
    outputSource: '',
    mode: 'output',
    filter: 'all',
    items: [],
    attempts: [],
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

function getAttemptItem(attemptIndex, itemIndex) {
  const attempt = Array.isArray(state.outputsReview.attempts) ? state.outputsReview.attempts[attemptIndex] : null;
  return Array.isArray(attempt?.items) ? attempt.items[itemIndex] || null : null;
}

function getFlattenedOutputItems() {
  const attempts = Array.isArray(state.outputsReview.attempts) ? state.outputsReview.attempts : [];
  return attempts.flatMap((attempt) => Array.isArray(attempt?.items) ? attempt.items : []);
}

function syncReviewSessionFromOutputs() {
  const items = getFlattenedOutputItems().filter((item) => Boolean(item?.output?.url));
  const reviewedCount = items.filter((item) => {
    const reviewState = normalizeReviewState(item?.review_state);
    return reviewState === 'approved' || reviewState === 'rejected';
  }).length;

  let stateText = 'Open a completed or failed run to review outputs and manage attempts.';
  if (state.outputsReview.loading) {
    stateText = 'Loading output review...';
  } else if (state.outputsReview.error) {
    stateText = state.outputsReview.error;
  } else if (state.outputsReview.batchName) {
    stateText = items.length > 0
      ? `Reviewing ${items.length} output${items.length === 1 ? '' : 's'} across ${Math.max(1, state.outputsReview.attempts.length)} attempt${state.outputsReview.attempts.length === 1 ? '' : 's'}.`
      : 'No downloaded outputs yet for this run. Pending attempts stay visible here.';
  }

  state.reviewSession = {
    batchName: state.outputsReview.batchName || '',
    runId: state.outputsReview.runId || '',
    mode: state.outputsReview.mode === 'compare' ? 'compare' : 'output',
    filter: state.outputsReview.filter || 'all',
    reviewedCount,
    totalCount: items.length,
    stateText,
    supportNote: getOutputReviewSupportNote(),
  };
  renderReviewSession();
}

function getOutputReviewSupportNote() {
  if (state.outputsReview.outputSource === 'legacyFlat') {
    return 'Review is reading from a legacy flat output folder. Decisions still persist in the file registry, and retry still creates a new attempt.';
  }
  if (state.outputsReview.mode === 'compare') {
    return 'Compare uses saved pairing when available. Approve marks one final output per request key across attempts.';
  }
  return 'Approve marks one final output per request key. Reject preserves history. Retry creates a new attempt.';
}

function getOutputReviewEmptyState() {
  if (state.outputsReview.mode === 'compare') {
    if (state.outputsReview.filter === 'approved') return 'No approved compare items yet.';
    if (state.outputsReview.filter === 'rejected') return 'No rejected compare items yet.';
    if (state.outputsReview.filter === 'in_review') return 'No in-review compare items remain.';
    if (state.outputsReview.filter === 'final') return 'No final compare items yet.';
    return 'No paired items are available for compare review yet.';
  }
  if (state.outputsReview.filter === 'approved') return 'No approved outputs yet.';
  if (state.outputsReview.filter === 'rejected') return 'No rejected outputs yet.';
  if (state.outputsReview.filter === 'in_review') return 'No in-review outputs remain.';
  if (state.outputsReview.filter === 'final') return 'No final outputs yet.';
  return 'No outputs downloaded yet.';
}

function getAttemptEmptyState(attempt) {
  const status = normalizeUiBatchState(attempt?.status);
  if (status === 'PENDING') {
    return 'This attempt is queued. Outputs will appear here after download.';
  }
  if (status === 'RUNNING') {
    return 'This attempt is still running. Outputs will appear here after download.';
  }
  if (status === 'FAILED') {
    return 'This attempt failed before reviewable outputs were available.';
  }
  if (status === 'CANCELLED') {
    return 'This attempt was cancelled before reviewable outputs were available.';
  }
  return getOutputReviewEmptyState();
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

function summarizeOutputItems(items) {
  const summary = {
    total: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
    final: 0,
  };

  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.output?.url) {
      continue;
    }
    const reviewState = normalizeReviewState(item.review_state);
    summary.total += 1;
    summary[reviewState] += 1;
    if (item.is_final) {
      summary.final += 1;
    }
  }

  return summary;
}

function getRunReviewSummaryText(summary) {
  const normalized = {
    total: Number(summary?.total || 0),
    approved: Number(summary?.approved || 0),
    rejected: Number(summary?.rejected || 0),
    final: Number(summary?.final || 0),
  };

  if (normalized.total === 0) {
    return 'No downloaded outputs yet.';
  }
  return `${normalized.approved} approved, ${normalized.rejected} rejected, ${normalized.final} final.`;
}

function getBatchDisplayName(batch) {
  const sourceJobId = String(batch?.sourceJobId || batch?.jobId || '').trim();
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
  return String(batch?.sourceJobId || batch?.jobId || '-');
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
    return `Finished. ${reviewState}`;
  }
  if (status === 'FAILED') {
    return 'Finished with an error. Retry creates a new attempt without overwriting history.';
  }
  return 'Run was cancelled before completion. Retry creates a new attempt without overwriting history.';
}

function getStatusLabel(status) {
  if (status === 'PENDING') return 'Pending';
  if (status === 'RUNNING') return 'Running';
  if (status === 'SUCCEEDED') return 'Completed';
  if (status === 'FAILED') return 'Failed';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Unknown';
}

function getReviewStateLabel(reviewState) {
  if (reviewState === 'approved') return 'Approved';
  if (reviewState === 'rejected') return 'Rejected';
  return 'In Review';
}

function getReviewTone(reviewState) {
  if (reviewState === 'approved') return 'approved';
  if (reviewState === 'rejected') return 'rejected';
  return 'review';
}

function normalizeReviewState(value) {
  return value === 'approved' || value === 'rejected' ? value : 'in_review';
}

function getReviewFilterLabel(filterValue) {
  if (filterValue === 'in_review') return 'In Review';
  if (filterValue === 'approved') return 'Approved';
  if (filterValue === 'rejected') return 'Rejected';
  if (filterValue === 'final') return 'Final';
  return 'All';
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
  const busy = state.busy.batchAction || state.busy.refreshBatches || state.busy.outputs;
  elements.refreshAllBatchesButton.disabled = busy;
  elements.refreshAllBatchesButton.textContent = busy ? 'Working...' : 'Refresh All';
  elements.batchFilterSelect.disabled = busy;
  renderBatchJobs();
  renderOutputsModal();
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
