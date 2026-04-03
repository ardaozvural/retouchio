const INPUT_SET_BINDING_STORAGE_KEY = 'retouchio.input_set_binding.v1';

const state = {
  inputSets: [],
  setMap: {},
  summary: null,
  modal: {
    open: false,
    setItem: null,
    images: [],
    loading: false,
  },
  busy: {
    upload: false,
    refresh: false,
    delete: false,
  },
};

const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  bindEvents();
  closePreviewModal();
  await refreshInputSets();
});

function cacheElements() {
  elements.uploadForm = document.getElementById('uploadForm');
  elements.setNameInput = document.getElementById('setNameInput');
  elements.filesInput = document.getElementById('filesInput');
  elements.uploadButton = document.getElementById('uploadButton');
  elements.refreshButton = document.getElementById('refreshButton');
  elements.statusBanner = document.getElementById('statusBanner');
  elements.filesHint = document.getElementById('filesHint');
  elements.summaryLine = document.getElementById('summaryLine');
  elements.setGrid = document.getElementById('setGrid');
  elements.emptyState = document.getElementById('emptyState');
  elements.previewModal = document.getElementById('previewModal');
  elements.modalBackdrop = document.getElementById('modalBackdrop');
  elements.closeModalButton = document.getElementById('closeModalButton');
  elements.deleteSetFromModalButton = document.getElementById('deleteSetFromModalButton');
  elements.modalTitle = document.getElementById('modalTitle');
  elements.modalMeta = document.getElementById('modalMeta');
  elements.modalBody = document.getElementById('modalBody');
}

function bindEvents() {
  elements.filesInput.addEventListener('change', () => {
    const count = Array.from(elements.filesInput.files || []).length;
    elements.filesHint.textContent = count > 0
      ? `${count} file${count === 1 ? '' : 's'} selected.`
      : 'No files selected.';
    updateUploadAvailability();
  });
  elements.setNameInput.addEventListener('input', updateUploadAvailability);

  elements.uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await uploadInputSet();
  });

  elements.refreshButton.addEventListener('click', async () => {
    await refreshInputSets();
  });

  elements.setGrid.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-set-action]');
    if (actionButton) {
      const action = actionButton.dataset.setAction;
      const setId = actionButton.dataset.setId;
      const setItem = state.setMap[setId];
      if (!setItem) {
        return;
      }

      if (action === 'preview') {
        await openPreviewModal(setItem);
      } else if (action === 'use-in-job-builder') {
        useInputSetInJobBuilder(setItem);
      } else if (action === 'delete-set') {
        await deleteInputSet(setItem);
      }
      return;
    }

    const card = event.target.closest('[data-set-id]');
    if (!card) {
      return;
    }
    const setId = card.dataset.setId;
    const setItem = state.setMap[setId];
    if (!setItem) {
      return;
    }
    await openPreviewModal(setItem);
  });

  elements.setGrid.addEventListener('keydown', async (event) => {
    if (event.target.closest('[data-set-action]')) {
      return;
    }
    const isOpenKey = event.key === 'Enter' || event.key === ' ';
    if (!isOpenKey) {
      return;
    }
    const card = event.target.closest('[data-set-id]');
    if (!card) {
      return;
    }
    event.preventDefault();
    const setId = card.dataset.setId;
    const setItem = state.setMap[setId];
    if (!setItem) {
      return;
    }
    await openPreviewModal(setItem);
  });

  elements.deleteSetFromModalButton.addEventListener('click', async () => {
    if (!state.modal.setItem) {
      return;
    }
    await deleteInputSet(state.modal.setItem);
  });

  elements.modalBody.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-modal-action="delete-file"]');
    if (!deleteButton || !state.modal.setItem) {
      return;
    }
    const fileName = String(deleteButton.dataset.fileName || '').trim();
    if (!fileName) {
      return;
    }
    await deleteInputFile(state.modal.setItem, fileName);
  });

  elements.closeModalButton.addEventListener('click', closePreviewModal);
  elements.modalBackdrop.addEventListener('click', closePreviewModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isModalOpen()) {
      closePreviewModal();
    }
  });
}

async function uploadInputSet() {
  const name = String(elements.setNameInput.value || '').trim();
  const files = Array.from(elements.filesInput.files || []);
  if (!name) {
    showStatus('Input set name is required.', true);
    return;
  }
  if (files.length === 0) {
    showStatus('Select at least one target image.', true);
    return;
  }

  setBusy('upload', true);
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
      throw new Error(payload.error || 'Input set upload failed.');
    }

    elements.uploadForm.reset();
    elements.filesHint.textContent = 'No files selected.';
    showStatus(`Input set ready for Production Flow: ${payload.name || payload.inputSetId} (${payload.fileCount} image${payload.fileCount === 1 ? '' : 's'}).`);
    await refreshInputSets();
  } catch (error) {
    showStatus(error.message || 'Input set upload failed.', true);
  } finally {
    setBusy('upload', false);
  }
}

async function refreshInputSets() {
  setBusy('refresh', true);
  try {
    const response = await fetch('/api/inputs/list');
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load input sets.');
    }

    state.inputSets = Array.isArray(payload.inputSets) ? payload.inputSets : [];
    state.setMap = {};
    for (const setItem of state.inputSets) {
      state.setMap[setItem.inputSetId] = setItem;
    }
    state.summary = payload.summary || null;
    renderInputSets();

    if (state.modal.setItem) {
      const refreshed = state.setMap[state.modal.setItem.inputSetId];
      if (!refreshed) {
        closePreviewModal();
      } else {
        state.modal.setItem = refreshed;
        state.modal.images = resolveSetImages(refreshed);
        if (state.modal.open) {
          renderModalImages();
        }
      }
    }
  } catch (error) {
    showStatus(error.message || 'Failed to load input sets.', true);
  } finally {
    setBusy('refresh', false);
  }
}

function renderInputSets() {
  const summary = state.summary || { totalSets: 0, totalFiles: 0 };
  elements.summaryLine.textContent = `${summary.totalSets} input set${summary.totalSets === 1 ? '' : 's'} / ${summary.totalFiles} image${summary.totalFiles === 1 ? '' : 's'}`;
  elements.setGrid.innerHTML = state.inputSets.map((setItem) => renderInputSetCard(setItem)).join('');
  elements.emptyState.hidden = state.inputSets.length > 0;
  if (state.inputSets.length === 0) {
    elements.emptyState.textContent = 'No input sets yet. Upload images to start a new transformation.';
  }
  applyDeleteBusyState();
}

function renderInputSetCard(setItem) {
  const thumb = setItem.preview
    ? `<img src="${escapeAttribute(setItem.preview)}" alt="${escapeAttribute(setItem.inputSetId)}" loading="lazy" />`
    : '<div class="thumb-empty">No preview</div>';

  return `
    <article class="set-card" role="button" tabindex="0" data-set-id="${escapeAttribute(setItem.inputSetId)}">
      <div class="thumb-wrap">${thumb}</div>
      <div class="set-card-copy">
        <p class="set-kicker">Target Inputs</p>
        <h3 class="set-title">${escapeHtml(setItem.name || setItem.inputSetId)}</h3>
        <p class="set-subtitle">Ready to become the selected input source in Production Flow.</p>
        <div class="set-meta-list">
          <p class="set-meta"><strong>Images</strong><span>${escapeHtml(String(setItem.fileCount || 0))}</span></p>
          <p class="set-meta"><strong>Created</strong><span>${escapeHtml(formatDateLabel(setItem.createdAt || '-'))}</span></p>
          <p class="set-meta"><strong>Set ID</strong><span>${escapeHtml(setItem.inputSetId)}</span></p>
        </div>
      </div>
      <div class="set-actions">
        <button class="button button-primary button-sm" type="button" data-set-action="use-in-job-builder" data-set-id="${escapeAttribute(setItem.inputSetId)}">Use in Production Flow</button>
        <button class="button button-secondary button-sm" type="button" data-set-action="preview" data-set-id="${escapeAttribute(setItem.inputSetId)}">Preview</button>
        <button class="button button-danger button-sm" type="button" data-set-action="delete-set" data-set-id="${escapeAttribute(setItem.inputSetId)}">Delete</button>
      </div>
    </article>
  `;
}

function useInputSetInJobBuilder(setItem) {
  const payload = {
    type: 'input_set_binding',
    inputSetId: setItem.inputSetId,
    inputSource: setItem.path,
    created_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(INPUT_SET_BINDING_STORAGE_KEY, JSON.stringify(payload));
    window.location.assign('/job-builder');
  } catch (error) {
    showStatus(`Failed to send input set into Production Flow: ${error.message}`, true);
  }
}

async function openPreviewModal(setItem) {
  if (!setItem) {
    return;
  }
  state.modal.open = true;
  state.modal.setItem = setItem;
  state.modal.images = resolveSetImages(setItem);
  state.modal.loading = false;

  elements.previewModal.hidden = false;
  elements.previewModal.setAttribute('aria-hidden', 'false');
  elements.modalTitle.textContent = setItem.name || setItem.inputSetId;
  elements.modalMeta.textContent = `${setItem.inputSetId} • ${setItem.fileCount || 0} image${setItem.fileCount === 1 ? '' : 's'}`;
  renderModalImages();
}

function closePreviewModal() {
  state.modal.open = false;
  state.modal.setItem = null;
  state.modal.images = [];
  state.modal.loading = false;
  elements.previewModal.hidden = true;
  elements.previewModal.setAttribute('aria-hidden', 'true');
  elements.modalBody.innerHTML = '';
  elements.deleteSetFromModalButton.disabled = true;
}

function isModalOpen() {
  return Boolean(state.modal.open && state.modal.setItem);
}

function resolveSetImages(setItem) {
  if (Array.isArray(setItem.images) && setItem.images.length > 0) {
    return setItem.images
      .map((item) => ({
        fileName: String(item.fileName || '').trim(),
        url: String(item.url || '').trim(),
      }))
      .filter((item) => item.fileName && item.url);
  }

  if (setItem.preview) {
    const fallbackName = String(setItem.preview.split('/').pop() || 'target_image').trim();
    return [{ fileName: fallbackName, url: setItem.preview }];
  }

  return [];
}

function renderModalImages() {
  if (!state.modal.images.length) {
    elements.modalBody.innerHTML = '<p class="modal-empty">No previewable images found for this input set.</p>';
    applyDeleteBusyState();
    return;
  }

  elements.modalBody.innerHTML = state.modal.images
    .map((image) => `
      <div class="modal-image-wrap">
        <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.fileName)}" loading="lazy" />
        <div class="modal-image-actions">
          <button
            class="button button-danger button-sm"
            type="button"
            data-modal-action="delete-file"
            data-file-name="${escapeAttribute(image.fileName)}"
          >Delete Image</button>
        </div>
      </div>
    `)
    .join('');
  applyDeleteBusyState();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }
  return data;
}

async function deleteInputSet(setItem) {
  if (!setItem || state.busy.delete) {
    return;
  }
  const approved = window.confirm('Delete this input set permanently?');
  if (!approved) {
    return;
  }

  setBusy('delete', true);
  try {
    await postJson('/api/inputs/delete-set', { inputSetId: setItem.inputSetId });
    closePreviewModal();
    await refreshInputSets();
    showStatus(`Input set deleted: ${setItem.name || setItem.inputSetId}`);
  } catch (error) {
    showStatus(error.message || 'Failed to delete input set.', true);
  } finally {
    setBusy('delete', false);
  }
}

async function deleteInputFile(setItem, fileName) {
  if (!setItem || !fileName || state.busy.delete) {
    return;
  }
  const approved = window.confirm('Delete this target image?');
  if (!approved) {
    return;
  }

  setBusy('delete', true);
  try {
    const result = await postJson('/api/inputs/delete-file', {
      inputSetId: setItem.inputSetId,
      file: fileName,
    });
    await refreshInputSets();

    if (result.setDeleted) {
      closePreviewModal();
      showStatus('Last image removed. Input set deleted.');
      return;
    }

    const refreshed = state.setMap[setItem.inputSetId];
    if (!refreshed) {
      closePreviewModal();
      showStatus('Input set not found after delete.', true);
      return;
    }

    await openPreviewModal(refreshed);
    showStatus(`Image deleted: ${fileName}`);
  } catch (error) {
    showStatus(error.message || 'Failed to delete image.', true);
  } finally {
    setBusy('delete', false);
  }
}

function showStatus(message, isError = false) {
  elements.statusBanner.hidden = false;
  elements.statusBanner.classList.toggle('error', Boolean(isError));
  elements.statusBanner.textContent = message;
}

function setBusy(action, busy) {
  state.busy[action] = busy;
  const uploadBusy = state.busy.upload;
  const refreshBusy = state.busy.refresh;
  const deleteBusy = state.busy.delete;
  const anyBusy = uploadBusy || refreshBusy || deleteBusy;

  elements.uploadButton.disabled = anyBusy;
  elements.uploadButton.textContent = uploadBusy ? 'Uploading...' : 'Upload Input Set';

  elements.refreshButton.disabled = anyBusy;
  elements.refreshButton.textContent = refreshBusy ? 'Refreshing...' : 'Refresh Input Sets';

  elements.setNameInput.disabled = anyBusy;
  elements.filesInput.disabled = anyBusy;
  applyDeleteBusyState();
  updateUploadAvailability();
}

function updateUploadAvailability() {
  const name = String(elements.setNameInput.value || '').trim();
  const fileCount = Array.from(elements.filesInput.files || []).length;
  const canUpload = !state.busy.upload && !state.busy.refresh && !state.busy.delete && name.length > 0 && fileCount > 0;
  elements.uploadButton.disabled = !canUpload;
}

function applyDeleteBusyState() {
  const deleteBusy = Boolean(state.busy.delete);
  elements.deleteSetFromModalButton.disabled = deleteBusy || !isModalOpen();
  elements.deleteSetFromModalButton.textContent = deleteBusy ? 'Deleting...' : 'Delete Set';

  document.querySelectorAll('[data-set-action="delete-set"]').forEach((button) => {
    button.disabled = deleteBusy;
    button.textContent = deleteBusy ? 'Deleting...' : 'Delete';
  });

  document.querySelectorAll('[data-modal-action="delete-file"]').forEach((button) => {
    button.disabled = deleteBusy;
    button.textContent = deleteBusy ? 'Deleting...' : 'Delete Image';
  });
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

function formatDateLabel(value) {
  if (!value || value === '-') {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}
