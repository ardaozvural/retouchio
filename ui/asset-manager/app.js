const FAMILY_VARIANTS = {
  footwear: ['sandal'],
  headwear: ['bandana', 'headband', 'hat'],
  eyewear: ['sunglasses'],
  bag: ['hand_bag'],
  neckwear: ['neck_scarf'],
  garment_material: ['material_detail'],
  garment_pattern: ['pattern_detail'],
};

const FAMILY_LABELS = {
  footwear: 'Footwear',
  headwear: 'Headwear',
  eyewear: 'Eyewear',
  bag: 'Bag',
  neckwear: 'Neckwear',
  garment_material: 'Garment Material',
  garment_pattern: 'Garment Pattern',
};

const ASSET_BINDING_STORAGE_KEY = 'retouchio.asset_binding.v1';

const state = {
  assetsByFamily: {},
  assetsFlat: [],
  summary: null,
  filter: 'all',
  assetMap: {},
  modal: {
    open: false,
    asset: null,
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
  populateFamilies();
  await refreshAssets();
});

function cacheElements() {
  elements.uploadForm = document.getElementById('uploadForm');
  elements.familySelect = document.getElementById('familySelect');
  elements.variantSelect = document.getElementById('variantSelect');
  elements.filesInput = document.getElementById('filesInput');
  elements.uploadButton = document.getElementById('uploadButton');
  elements.refreshButton = document.getElementById('refreshButton');
  elements.statusBanner = document.getElementById('statusBanner');
  elements.filesHint = document.getElementById('filesHint');
  elements.summaryLine = document.getElementById('summaryLine');
  elements.assetGrid = document.getElementById('assetGrid');
  elements.emptyState = document.getElementById('emptyState');
  elements.filterTabs = Array.from(document.querySelectorAll('.filter-tab'));
  elements.previewModal = document.getElementById('previewModal');
  elements.modalBackdrop = document.getElementById('modalBackdrop');
  elements.closeModalButton = document.getElementById('closeModalButton');
  elements.deleteAssetFromModalButton = document.getElementById('deleteAssetFromModalButton');
  elements.modalTitle = document.getElementById('modalTitle');
  elements.modalMeta = document.getElementById('modalMeta');
  elements.modalBody = document.getElementById('modalBody');
}

function bindEvents() {
  elements.familySelect.addEventListener('change', () => {
    populateVariants(elements.familySelect.value);
    updateUploadAvailability();
  });

  elements.variantSelect.addEventListener('change', updateUploadAvailability);
  elements.filesInput.addEventListener('change', () => {
    const count = Array.from(elements.filesInput.files || []).length;
    elements.filesHint.textContent = count > 0
      ? `${count} file${count === 1 ? '' : 's'} selected.`
      : 'No files selected.';
    updateUploadAvailability();
  });

  elements.uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await uploadAsset();
  });

  elements.refreshButton.addEventListener('click', async () => {
    await refreshAssets();
  });

  elements.filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter || 'all';
      setFilter(filter);
    });
  });

  elements.assetGrid.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-asset-action]');
    if (actionButton) {
      const action = actionButton.dataset.assetAction;
      const key = actionButton.dataset.assetKey;
      const asset = state.assetMap[key];
      if (!asset) {
        return;
      }
      if (action === 'preview') {
        await openPreviewModal(asset);
      } else if (action === 'use-in-job-builder') {
        handoffAssetToJobBuilder(asset);
      } else if (action === 'delete-asset') {
        await deleteAsset(asset);
      }
      return;
    }

    const card = event.target.closest('[data-asset-key]');
    if (!card) {
      return;
    }
    const key = card.dataset.assetKey;
    const asset = state.assetMap[key];
    if (!asset) {
      return;
    }
    await openPreviewModal(asset);
  });
  elements.assetGrid.addEventListener('keydown', async (event) => {
    if (event.target.closest('[data-asset-action]')) {
      return;
    }
    const isOpenKey = event.key === 'Enter' || event.key === ' ';
    if (!isOpenKey) {
      return;
    }
    const card = event.target.closest('[data-asset-key]');
    if (!card) {
      return;
    }
    event.preventDefault();
    const key = card.dataset.assetKey;
    const asset = state.assetMap[key];
    if (!asset) {
      return;
    }
    await openPreviewModal(asset);
  });

  elements.closeModalButton.addEventListener('click', closePreviewModal);
  elements.deleteAssetFromModalButton.addEventListener('click', async () => {
    if (!state.modal.asset) {
      return;
    }
    await deleteAsset(state.modal.asset);
  });
  elements.modalBody.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-modal-action="delete-file"]');
    if (!deleteButton) {
      return;
    }
    const fileName = String(deleteButton.dataset.fileName || '').trim();
    if (!fileName || !state.modal.asset) {
      return;
    }
    await deleteAssetFile(state.modal.asset, fileName);
  });
  elements.modalBackdrop.addEventListener('click', closePreviewModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isModalOpen()) {
      closePreviewModal();
    }
  });
}

function populateFamilies() {
  const families = Object.keys(FAMILY_VARIANTS);
  elements.familySelect.innerHTML = families
    .map((family) => `<option value="${escapeHtml(family)}">${escapeHtml(getFamilyLabel(family))}</option>`)
    .join('');
  populateVariants(families[0] || '');
}

function populateVariants(family) {
  const variants = FAMILY_VARIANTS[family] || [];
  elements.variantSelect.innerHTML = variants
    .map((variant) => `<option value="${escapeHtml(variant)}">${escapeHtml(getVariantLabel(variant))}</option>`)
    .join('');
  updateUploadAvailability();
}

async function uploadAsset() {
  const family = String(elements.familySelect.value || '').trim();
  const variant = String(elements.variantSelect.value || '').trim();
  const files = Array.from(elements.filesInput.files || []);

  if (!FAMILY_VARIANTS[family]) {
    showStatus(`Unsupported family: ${family}`, true);
    return;
  }
  if (!FAMILY_VARIANTS[family].includes(variant)) {
    showStatus(`Unsupported variant "${variant}" for family "${family}"`, true);
    return;
  }
  if (files.length === 0) {
    showStatus('Select at least one file.', true);
    return;
  }

  setBusy('upload', true);
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
      throw new Error(payload.error || 'Upload failed.');
    }

    const uploadedAssetId = payload.asset_id;
    elements.uploadForm.reset();
    populateFamilies();
    elements.filesHint.textContent = 'No files selected.';
    showStatus(`Reference added to the library: ${uploadedAssetId} (${payload.fileCount} image${payload.fileCount === 1 ? '' : 's'}).`);
    await refreshAssets();
  } catch (error) {
    showStatus(error.message || 'Upload failed.', true);
  } finally {
    setBusy('upload', false);
  }
}

async function refreshAssets() {
  setBusy('refresh', true);
  try {
    const response = await fetch('/api/assets/list');
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load assets.');
    }
    state.assetsByFamily = payload.assetsByFamily || {};
    state.assetsFlat = flattenAssets(state.assetsByFamily);
    state.assetMap = {};
    for (const asset of state.assetsFlat) {
      state.assetMap[getAssetKey(asset)] = asset;
    }
    state.summary = payload.summary || null;
    renderAssets();
  } catch (error) {
    showStatus(error.message || 'Failed to load assets.', true);
  } finally {
    setBusy('refresh', false);
  }
}

function renderAssets() {
  const summary = state.summary || { totalAssets: 0, totalFiles: 0 };
  const filtered = getFilteredAssets();
  elements.summaryLine.textContent = `${filtered.length} shown / ${summary.totalAssets} references / ${summary.totalFiles} image${summary.totalFiles === 1 ? '' : 's'}`;
  elements.assetGrid.innerHTML = filtered
    .map((asset) => renderAssetCard(asset))
    .join('');
  elements.emptyState.hidden = filtered.length > 0;
  if (filtered.length === 0) {
    elements.emptyState.textContent = state.assetsFlat.length === 0
      ? 'No references yet. Upload one to use it in Production Flow.'
      : 'No references match the current filter.';
  }
}

function renderAssetCard(asset) {
  const thumb = asset.preview
    ? `<img src="${escapeAttribute(asset.preview)}" alt="${escapeAttribute(asset.asset_id)}" loading="lazy" />`
    : '<div class="thumb-empty">No preview</div>';
  const familyLabel = getFamilyLabel(asset.family);
  const variantLabel = getVariantLabel(asset.variant || 'reference');
  const referenceName = `${familyLabel} reference`;

  return `
    <article class="asset-card" role="button" tabindex="0" data-asset-key="${escapeAttribute(getAssetKey(asset))}">
      <div class="thumb-wrap">${thumb}</div>
      <div class="asset-card-copy">
        <p class="asset-kicker">${escapeHtml(familyLabel)}</p>
        <h3 class="asset-title">${escapeHtml(variantLabel)}</h3>
        <p class="asset-subtitle">${escapeHtml(referenceName)}</p>
        <div class="asset-meta-list">
          <p class="asset-meta"><strong>Reference ID</strong><span>${escapeHtml(asset.asset_id)}</span></p>
          <p class="asset-meta"><strong>Images</strong><span>${escapeHtml(String(asset.fileCount || 0))}</span></p>
        </div>
      </div>
      <div class="asset-actions">
        <button
          class="button button-primary button-sm"
          type="button"
          data-asset-action="use-in-job-builder"
          data-asset-key="${escapeAttribute(getAssetKey(asset))}"
        >Use in Production Flow</button>
        <button
          class="button button-secondary button-sm"
          type="button"
          data-asset-action="preview"
          data-asset-key="${escapeAttribute(getAssetKey(asset))}"
        >Preview</button>
        <button
          class="button button-danger button-sm"
          type="button"
          data-asset-action="delete-asset"
          data-asset-key="${escapeAttribute(getAssetKey(asset))}"
        >Delete</button>
      </div>
    </article>
  `;
}

function setFilter(filter) {
  state.filter = filter;
  elements.filterTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.filter === filter);
  });
  renderAssets();
}

function getFilteredAssets() {
  if (state.filter === 'all') {
    return state.assetsFlat.slice();
  }
  return state.assetsFlat.filter((asset) => asset.family === state.filter);
}

function flattenAssets(assetsByFamily) {
  const output = [];
  for (const family of Object.keys(FAMILY_VARIANTS)) {
    const familyAssets = Array.isArray(assetsByFamily[family]) ? assetsByFamily[family] : [];
    for (const asset of familyAssets) {
      output.push(asset);
    }
  }
  return output;
}

function getAssetKey(asset) {
  return `${asset.family}::${asset.asset_id}`;
}

function handoffAssetToJobBuilder(asset) {
  const payload = {
    type: 'asset_binding',
    family: asset.family,
    variant: asset.variant || null,
    asset_id: asset.asset_id,
    created_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(ASSET_BINDING_STORAGE_KEY, JSON.stringify(payload));
    window.location.assign('/job-builder');
  } catch (error) {
    showStatus(`Failed to send reference into Production Flow: ${error.message}`, true);
  }
}

async function openPreviewModal(asset) {
  if (!asset) {
    return;
  }
  state.modal.open = true;
  state.modal.asset = asset;
  state.modal.images = [];
  state.modal.loading = true;

  elements.previewModal.hidden = false;
  elements.previewModal.setAttribute('aria-hidden', 'false');
  elements.deleteAssetFromModalButton.disabled = state.busy.delete;
  elements.modalTitle.textContent = `${getVariantLabel(asset.variant || asset.family)} Reference`;
  elements.modalMeta.textContent = `${getFamilyLabel(asset.family)} • ${asset.asset_id} • ${asset.fileCount || 0} image${asset.fileCount === 1 ? '' : 's'}`;
  elements.modalBody.innerHTML = `
    <p class="loading-pill"><span class="loading-dot"></span>Loading reference images...</p>
  `;

  try {
    state.modal.images = resolveAssetImages(asset);
    renderModalImages();
  } finally {
    state.modal.loading = false;
  }
}

function closePreviewModal() {
  state.modal.open = false;
  state.modal.asset = null;
  state.modal.images = [];
  state.modal.loading = false;
  elements.previewModal.hidden = true;
  elements.previewModal.setAttribute('aria-hidden', 'true');
  elements.deleteAssetFromModalButton.disabled = true;
  elements.modalBody.innerHTML = '';
}

function isModalOpen() {
  return Boolean(state.modal.open && state.modal.asset);
}

function renderModalImages() {
  if (!state.modal.images.length) {
    elements.modalBody.innerHTML = '<p class="modal-empty">No previewable reference images found.</p>';
    applyDeleteBusyState();
    return;
  }

  elements.modalBody.innerHTML = state.modal.images
    .map((image) => `
      <div class="modal-image-wrap">
        <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.fileName || 'asset preview image')}" loading="lazy" />
        <div class="modal-image-actions">
          <button
            class="button button-danger button-sm"
            type="button"
            data-modal-action="delete-file"
            data-file-name="${escapeAttribute(image.fileName || '')}"
          >Delete Image</button>
        </div>
      </div>
    `)
    .join('');
  applyDeleteBusyState();
}

function resolveAssetImages(asset) {
  if (Array.isArray(asset.images) && asset.images.length > 0) {
    return asset.images
      .map((item) => ({
        fileName: String(item.fileName || '').trim(),
        url: String(item.url || '').trim(),
      }))
      .filter((item) => item.fileName && item.url);
  }

  if (asset.preview) {
    const fallbackName = String(asset.preview.split('/').pop() || 'preview_image').trim();
    return [{
      fileName: fallbackName,
      url: asset.preview,
    }];
  }

  return [];
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }
  return data;
}

async function deleteAsset(asset) {
  if (!asset || state.busy.delete) {
    return;
  }

  const confirmed = window.confirm(`Delete asset "${asset.asset_id}" and all reference images?`);
  if (!confirmed) {
    return;
  }

  setBusy('delete', true);
  try {
    await postJson('/api/assets/delete-asset', {
      family: asset.family,
      asset_id: asset.asset_id,
    });
    closePreviewModal();
    await refreshAssets();
    showStatus(`Reference removed from the library: ${asset.asset_id}`);
  } catch (error) {
    showStatus(error.message || 'Failed to delete reference.', true);
  } finally {
    setBusy('delete', false);
  }
}

async function deleteAssetFile(asset, fileName) {
  if (!asset || !fileName || state.busy.delete) {
    return;
  }

  const confirmed = window.confirm(`Delete image "${fileName}" from "${asset.asset_id}"?`);
  if (!confirmed) {
    return;
  }

  setBusy('delete', true);
  try {
    const result = await postJson('/api/assets/delete-file', {
      family: asset.family,
      asset_id: asset.asset_id,
      fileName,
    });

    await refreshAssets();
    const refreshedAsset = state.assetMap[getAssetKey(asset)];
    if (result.removedAsset || !refreshedAsset) {
      closePreviewModal();
      showStatus(`Last image removed. Reference deleted: ${asset.asset_id}`);
      return;
    }

    await openPreviewModal(refreshedAsset);
    showStatus(`Reference image deleted: ${fileName}`);
  } catch (error) {
    showStatus(error.message || 'Failed to delete reference image.', true);
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
  elements.uploadButton.textContent = uploadBusy ? 'Uploading...' : 'Upload Reference';

  elements.refreshButton.disabled = anyBusy;
  elements.refreshButton.textContent = refreshBusy ? 'Refreshing...' : 'Refresh Library';

  elements.familySelect.disabled = anyBusy;
  elements.variantSelect.disabled = anyBusy;
  elements.filesInput.disabled = anyBusy;
  applyDeleteBusyState();
  updateUploadAvailability();
}

function updateUploadAvailability() {
  const family = String(elements.familySelect.value || '').trim();
  const variant = String(elements.variantSelect.value || '').trim();
  const fileCount = Array.from(elements.filesInput.files || []).length;
  const validFamily = Boolean(FAMILY_VARIANTS[family]);
  const validVariant = validFamily && FAMILY_VARIANTS[family].includes(variant);
  const canUpload = !state.busy.upload && !state.busy.refresh && !state.busy.delete && validFamily && validVariant && fileCount > 0;

  elements.uploadButton.disabled = !canUpload;
}

function applyDeleteBusyState() {
  const deleteBusy = Boolean(state.busy.delete);
  const modalDeleteEnabled = isModalOpen() && !deleteBusy;
  elements.deleteAssetFromModalButton.disabled = !modalDeleteEnabled;
  elements.deleteAssetFromModalButton.textContent = deleteBusy ? 'Deleting...' : 'Delete Reference';

  document.querySelectorAll('[data-asset-action="delete-asset"]').forEach((button) => {
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

function getFamilyLabel(family) {
  return FAMILY_LABELS[family] || family || 'Reference';
}

function getVariantLabel(variant) {
  return String(variant || 'reference')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
