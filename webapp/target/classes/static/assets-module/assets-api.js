/* ================================================================
   AgriSmart — Assets Module API & Page Logic
   All navigation uses Spring Boot MVC routes (/assets/...).
   ================================================================ */

const API_BASE_URL = '/api';   // relative — works regardless of port

// ── Utility ──────────────────────────────────────────────────────

function getQueryParam(param) {
    return new URLSearchParams(window.location.search).get(param);
}

function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
}

// ── Fetch helpers ─────────────────────────────────────────────────

async function fetchAssets() {
    try {
        const r = await fetch(`${API_BASE_URL}/assets`);
        if (!r.ok) throw new Error('Failed to fetch assets');
        return await r.json();
    } catch (e) { console.error(e); return []; }
}

async function fetchAssetById(id) {
    try {
        const r = await fetch(`${API_BASE_URL}/assets/${id}`);
        if (!r.ok) throw new Error('Failed to fetch asset');
        return await r.json();
    } catch (e) { console.error(e); return null; }
}

async function fetchManagers() {
    try {
        const r = await fetch(`${API_BASE_URL}/managers`);
        if (!r.ok) throw new Error('Failed to fetch managers');
        return await r.json();
    } catch (e) { console.error(e); return []; }
}

async function fetchMaintenance(assetId) {
    try {
        const r = await fetch(`${API_BASE_URL}/maintenance/asset/${assetId}`);
        if (!r.ok) throw new Error('Failed to fetch maintenance records');
        return await r.json();
    } catch (e) { console.error(e); return []; }
}

// ── Sidebar dynamic links ─────────────────────────────────────────
// The sidebar nav links for context-sensitive pages (Details, Edit, etc.)
// are set by the HTML. This function upgrades them when an asset ?id= is known.

function updateSidebarLinks() {
    const assetId = getQueryParam('id');
    if (!assetId) return; // no asset selected — keep the static alert hrefs

    const map = {
        'nav-details-link': `/assets/details?id=${assetId}`,
        'nav-edit-link':    `/assets/edit?id=${assetId}`,
        'nav-maint-link':   `/assets/maintenance?id=${assetId}`,
        'nav-decomm-link':  `/assets/lifecycle?id=${assetId}`,
    };

    Object.entries(map).forEach(([id, href]) => {
        const el = document.getElementById(id);
        if (el) {
            el.href = href;
            el.onclick = null; // remove alert handler
        }
    });
}

// ── Managers dropdown ─────────────────────────────────────────────

async function populateManagersDropdown(selectId, selectedId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const managers = await fetchManagers();
    managers.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.firstName} ${m.lastName}`;
        if (selectedId && m.id == selectedId) opt.selected = true;
        select.appendChild(opt);
    });
}

// ── Dashboard ─────────────────────────────────────────────────────

async function loadDashboard(filterText = '') {
    const tableBody = document.getElementById('assets-table-body');
    if (!tableBody) return; // not on dashboard

    const assets = await fetchAssets();
    tableBody.innerHTML = '';

    let total = 0, available = 0, inUse = 0, repair = 0, decommissioned = 0;
    let rowsAdded = 0;

    if (assets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:2rem;color:#A1B3A5;font-style:italic;">
            No assets found. <a href="/assets/register" style="color:#42944A;font-weight:600;">Register one</a></td></tr>`;
        updateStatCards(0, 0, 0, 0, 0);
        return;
    }

    assets.forEach(asset => {
        total++;
        const normStatus = (asset.currentStatus || 'Unknown').replace(/_/g, ' ');

        let statusBadge = '';
        if      (normStatus === 'Available')    { available++;     statusBadge = '<span class="status-badge available">Available</span>'; }
        else if (normStatus === 'In Use')        { inUse++;         statusBadge = '<span class="status-badge in-use">In Use</span>'; }
        else if (normStatus === 'Under Repair')  { repair++;        statusBadge = '<span class="status-badge repair">Under Repair</span>'; }
        else { decommissioned++; statusBadge = `<span class="status-badge decommissioned">${normStatus}</span>`; }

        // Search filter
        if (filterText) {
            const q = filterText.toLowerCase();
            const snMatch  = (asset.serialNumber || String(asset.id || '')).toLowerCase().includes(q);
            const modMatch = (asset.model        || '').toLowerCase().includes(q);
            const typMatch = (asset.type         || '').toLowerCase().includes(q);
            if (!snMatch && !modMatch && !typMatch) return;
        }

        // Hide decommissioned rows from default view (not when searching)
        if (!filterText) {
            const skip = ['End of Life', 'Beyond Repair', 'Decommissioned', 'Sold'];
            if (skip.includes(normStatus)) return;
        }

        tableBody.innerHTML += `
            <tr>
                <td>
                    <div class="asset-name-cell">
                        <a href="/assets/details?id=${asset.id}" class="asset-name">${asset.model || '—'}</a>
                        <span class="asset-sn">SN: ${asset.serialNumber || asset.id}</span>
                    </div>
                </td>
                <td>${asset.type || '—'}</td>
                <td>${statusBadge}</td>
                <td>${asset.purchaseDate || '—'}</td>
                <td>
                    <a href="/assets/details?id=${asset.id}"    title="View Details" class="action-btn"><i class="ph ph-eye"></i></a>
                    <a href="/assets/edit?id=${asset.id}"       title="Edit"         class="action-btn"><i class="ph ph-pencil-simple"></i></a>
                    <a href="/assets/maintenance?id=${asset.id}"title="Maintenance"  class="action-btn"><i class="ph ph-wrench"></i></a>
                </td>
            </tr>`;
        rowsAdded++;
    });

    if (rowsAdded === 0) {
        tableBody.innerHTML = filterText
            ? `<tr><td colspan="5" class="text-center" style="padding:2rem;">No assets matching "<strong>${filterText}</strong>".</td></tr>`
            : `<tr><td colspan="5" class="text-center" style="padding:2rem;color:#A1B3A5;font-style:italic;">No active assets found. <a href="/assets/register" style="color:#42944A;font-weight:600;">Register one</a></td></tr>`;
    }

    updateStatCards(total, available, inUse, repair, decommissioned);
}

function updateStatCards(total, available, inUse, repair, decommissioned) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('total-assets-val',  total);
    set('available-val',     available);
    set('in-use-val',        inUse);
    set('repair-val',        repair);
    set('decommissioned-val',decommissioned);
}

// ── Asset Details page ────────────────────────────────────────────

async function loadAssetDetails() {
    const assetId = getQueryParam('id');
    if (!assetId) return;

    // Only run on the details page
    if (!document.getElementById('info-type') && !document.getElementById('detail-asset-title')) return;

    const asset = await fetchAssetById(assetId);
    if (!asset) {
        alert('Asset not found!');
        window.location.href = '/assets';
        return;
    }

    // Title & status
    const titleEl = document.getElementById('detail-asset-title');
    if (titleEl) titleEl.textContent = `${asset.type || 'Asset'}: ${asset.model || 'Unknown'}`;

    const statusSpan = document.getElementById('detail-asset-status');
    if (statusSpan) {
        statusSpan.textContent = asset.currentStatus || 'N/A';
        statusSpan.className = 'status-badge';
        if      (asset.currentStatus === 'Available')    statusSpan.classList.add('available');
        else if (asset.currentStatus === 'In Use')       statusSpan.classList.add('in-use');
        else if (asset.currentStatus === 'Under Repair') statusSpan.classList.add('repair');
        else                                             statusSpan.classList.add('decommissioned');
    }

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
    setVal('info-type',         asset.type);
    setVal('info-model',        asset.model);
    setVal('info-sn',           asset.serialNumber || asset.id);
    setVal('info-purchase-date',asset.purchaseDate);
    setVal('info-warranty-end', asset.warrantyEndDate);
    const costEl = document.getElementById('info-cost');
    if (costEl) costEl.textContent = asset.cost ? `$${asset.cost}` : '—';

    // "View All" maintenance link
    const viewAllBtn = document.getElementById('view-all-maint');
    if (viewAllBtn) viewAllBtn.href = `/assets/maintenance?id=${assetId}`;

    // Maintenance table on details page
    const maintBody = document.getElementById('maintenance-table-body');
    if (maintBody) {
        try {
            const logs = await fetchMaintenance(assetId);
            maintBody.innerHTML = '';
            if (!Array.isArray(logs) || logs.length === 0) {
                maintBody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:1.5rem;color:#A1B3A5;font-style:italic;">No maintenance records found.</td></tr>`;
            } else {
                logs.forEach(log => {
                    maintBody.insertAdjacentHTML('beforeend', `
                        <tr>
                            <td>${log.serviceDate    || '—'}</td>
                            <td>${log.type           || '—'}</td>
                            <td>${log.description    || '—'}</td>
                            <td>${log.cost ? '$' + log.cost : '—'}</td>
                            <td>${log.nextServiceDue || '—'}</td>
                        </tr>`);
                });
            }
        } catch (e) {
            console.error('Error loading maintenance logs', e);
            maintBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--color-red);">Error loading records.</td></tr>`;
        }
    }
}

// ── Register Asset form ───────────────────────────────────────────

const registerForm = document.getElementById('register-asset-form');
if (registerForm) {
    populateManagersDropdown('manager-id');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const type          = document.getElementById('asset-type').value;
        const model         = document.getElementById('asset-model').value;
        const serialNumber  = document.getElementById('asset-sn').value;
        const purchaseDate  = document.getElementById('purchase-date').value;
        const warrantyEnd   = document.getElementById('warranty-end').value;
        const cost          = document.getElementById('initial-cost').value;
        const managerId     = document.getElementById('manager-id').value;

        if (cost && parseFloat(cost) < 0) { alert('Cost cannot be negative.'); return; }
        if (purchaseDate && warrantyEnd && new Date(warrantyEnd) < new Date(purchaseDate)) {
            alert('Warranty end date must be after purchase date.'); return;
        }

        const payload = {
            type, model, serialNumber,
            purchaseDate:    purchaseDate  || null,
            warrantyEndDate: warrantyEnd   || null,
            cost:            cost ? parseFloat(cost) : null,
            currentStatus:   'Available'
        };
        if (managerId) payload.manager = { id: managerId };

        try {
            const r = await fetch(`${API_BASE_URL}/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (r.ok) {
                showToast('Asset registered successfully!', 'success');
                setTimeout(() => { window.location.href = '/assets'; }, 1200);
            } else {
                const err = await r.text();
                alert('Failed to register asset: ' + err);
            }
        } catch (err) { console.error(err); alert('Network error. Please try again.'); }
    });
}

// ── Edit Asset form (full page) ───────────────────────────────────

const editFormPage = document.getElementById('edit-asset-form-page');
if (editFormPage) {
    editFormPage.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id            = document.getElementById('edit-asset-id').value;
        const type          = document.getElementById('edit-type').value;
        const model         = document.getElementById('edit-model').value;
        const serialNumber  = document.getElementById('edit-sn').value;
        const purchaseDate  = document.getElementById('edit-purchase').value;
        const warrantyEnd   = document.getElementById('edit-warranty').value;
        const cost          = document.getElementById('edit-cost').value;      // ← was missing, caused ReferenceError
        const managerId     = document.getElementById('edit-manager').value;

        if (cost && parseFloat(cost) < 0) { alert('Cost cannot be negative.'); return; }
        if (purchaseDate && warrantyEnd && new Date(warrantyEnd) < new Date(purchaseDate)) {
            alert('Warranty end date must be after purchase date.'); return;
        }

        const payload = {
            type, model, serialNumber,
            purchaseDate:    purchaseDate || null,
            warrantyEndDate: warrantyEnd  || null,
            cost:            cost ? parseFloat(cost) : null
        };
        if (managerId) payload.manager = { id: managerId };

        try {
            const r = await fetch(`${API_BASE_URL}/assets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (r.ok) {
                showToast('Asset updated!', 'success');
                setTimeout(() => { window.location.href = `/assets/details?id=${id}`; }, 1000);
            } else {
                alert('Failed to update asset.');
            }
        } catch (err) { console.error(err); }
    });
}

// ── Maintenance form (full page) ──────────────────────────────────

const maintFormPage = document.getElementById('log-maintenance-form-page');
if (maintFormPage) {
    maintFormPage.addEventListener('submit', async (e) => {
        e.preventDefault();

        const assetId       = getQueryParam('id');
        const serviceDate   = document.getElementById('maint-date').value;
        const type          = document.getElementById('maint-type').value;
        const cost          = document.getElementById('maint-cost').value;
        const managerId     = document.getElementById('maint-manager').value;
        const nextDue       = document.getElementById('maint-next').value;

        if (cost && parseFloat(cost) < 0) { alert('Cost cannot be negative.'); return; }
        if (nextDue && new Date(nextDue) < new Date().setHours(0,0,0,0)) {
            alert('Next service date cannot be in the past.'); return;
        }

        const payload = {
            asset: { id: assetId }, type,
            serviceDate:    serviceDate || null,
            nextServiceDue: nextDue     || null,
            description:    document.getElementById('maint-desc').value || null,
            cost:           cost ? parseFloat(cost) : null
        };
        if (managerId) payload.manager = { id: managerId };

        try {
            const r = await fetch(`${API_BASE_URL}/maintenance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (r.ok) {
                showToast('Maintenance logged!', 'success');
                setTimeout(() => { window.location.href = `/assets/details?id=${assetId}`; }, 1000);
            } else {
                alert('Failed to log maintenance.');
            }
        } catch (err) { console.error(err); }
    });
}

// ── Lifecycle / Decommission page ─────────────────────────────────

async function submitLifecyclePage() {
    const assetId  = getQueryParam('id');
    const isDecomm = document.getElementById('lc-decomm-check').checked;

    if (isDecomm) {
        const reason = document.getElementById('lc-reason').value;
        if (!reason) { alert('Please select a reason for decommissioning.'); return; }

        try {
            const r = await fetch(`${API_BASE_URL}/assets/${assetId}/decommission`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, status: reason })
            });
            if (r.ok) {
                showToast('Asset decommissioned.', 'success');
                setTimeout(() => { window.location.href = '/assets'; }, 1200);
            } else {
                alert('Failed to decommission asset.');
            }
        } catch (err) { console.error(err); }
    } else {
        const status = document.getElementById('lc-status').value;
        try {
            const r = await fetch(`${API_BASE_URL}/assets/${assetId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentStatus: status })
            });
            if (r.ok) {
                showToast('Status updated!', 'success');
                setTimeout(() => { window.location.href = `/assets/details?id=${assetId}`; }, 1000);
            } else {
                alert('Failed to update status.');
            }
        } catch (err) { console.error(err); }
    }
}

// ── Delete Asset ──────────────────────────────────────────────────

async function deleteAsset(id) {
    if (!confirm('Are you sure you want to permanently delete this asset?')) return;
    try {
        const r = await fetch(`${API_BASE_URL}/assets/${id}`, { method: 'DELETE' });
        if (r.ok) loadDashboard();
        else alert('Failed to delete asset.');
    } catch (err) { console.error(err); }
}

// ── Page-specific initialisation ──────────────────────────────────

async function initSeparatePages() {
    const assetId  = getQueryParam('id');
    const path     = window.location.pathname;

    if (path.includes('/assets/edit') || path.endsWith('/edit')) {
        if (!assetId) { window.location.href = '/assets'; return; }
        const asset = await fetchAssetById(assetId);
        if (asset) {
            document.getElementById('edit-asset-id').value  = asset.id;
            document.getElementById('edit-type').value      = asset.type     || '';
            document.getElementById('edit-model').value     = asset.model    || '';
            document.getElementById('edit-sn').value        = asset.serialNumber || '';
            document.getElementById('edit-purchase').value  = asset.purchaseDate    || '';
            document.getElementById('edit-warranty').value  = asset.warrantyEndDate || '';
            document.getElementById('edit-cost').value      = asset.cost     || '';
            await populateManagersDropdown('edit-manager', asset.manager ? asset.manager.id : null);

            // Update page subtitle
            const sub = document.getElementById('edit-page-subtitle');
            if (sub) sub.textContent = `Editing: ${asset.model || asset.id}`;
        }

    } else if (path.includes('/assets/maintenance')) {
        if (!assetId) { window.location.href = '/assets'; return; }
        const asset = await fetchAssetById(assetId);
        if (asset) {
            const titleEl = document.getElementById('page-asset-title');
            if (titleEl) titleEl.textContent = `Maintenance — ${asset.model || asset.id}`;
        }
        document.getElementById('maint-asset-id').value = assetId;
        await populateManagersDropdown('maint-manager');

        // Maintenance history table on this page
        const histBody = document.getElementById('maintenance-history-table-body');
        if (histBody) {
            try {
                const logs = await fetchMaintenance(assetId);
                histBody.innerHTML = '';
                if (!Array.isArray(logs) || logs.length === 0) {
                    histBody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:1.5rem;color:#A1B3A5;font-style:italic;">No maintenance records found.</td></tr>`;
                } else {
                    logs.forEach(log => {
                        histBody.insertAdjacentHTML('beforeend', `
                            <tr>
                                <td>${log.serviceDate    || '—'}</td>
                                <td>${log.type           || '—'}</td>
                                <td>${log.description    || '—'}</td>
                                <td>${log.cost ? '$' + log.cost : '—'}</td>
                                <td>${log.nextServiceDue || '—'}</td>
                            </tr>`);
                    });
                }
            } catch (err) {
                console.error('Error loading maintenance history', err);
                histBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--color-red);">Error loading records.</td></tr>`;
            }
        }

    } else if (path.includes('/assets/lifecycle')) {
        if (!assetId) { window.location.href = '/assets'; return; }
        const asset = await fetchAssetById(assetId);
        if (asset) {
            const titleEl = document.getElementById('page-asset-title');
            if (titleEl) titleEl.textContent = `Lifecycle — ${asset.model || asset.id}`;
            const statusSel = document.getElementById('lc-status');
            if (statusSel && asset.currentStatus) statusSel.value = asset.currentStatus;
            document.getElementById('lc-asset-id').value = assetId;
        }
    }
}

// ── Toast notification ────────────────────────────────────────────

function showToast(message, type = 'success') {
    // Remove any existing toast
    const existing = document.getElementById('agri-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'agri-toast';
    const bg    = type === 'success' ? '#F2FAF4' : '#FDF5F5';
    const color = type === 'success' ? '#42944A' : '#D15B5B';
    const icon  = type === 'success' ? 'ph-check-circle' : 'ph-warning';
    toast.style.cssText = `
        position:fixed; bottom:2rem; right:2rem; z-index:9999;
        background:${bg}; color:${color};
        border:1px solid ${type === 'success' ? 'rgba(66,148,74,.25)' : 'rgba(209,91,91,.25)'};
        border-radius:1rem; padding:1rem 1.5rem;
        display:flex; align-items:center; gap:.75rem;
        font-family:'Outfit',sans-serif; font-weight:600; font-size:.95rem;
        box-shadow:0 16px 40px rgba(0,0,0,.08);
        animation: toastIn .4s cubic-bezier(.16,1,.3,1);
    `;
    toast.innerHTML = `<i class="ph-fill ${icon}" style="font-size:1.25rem;"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    // Inject keyframe once
    if (!document.getElementById('toast-style')) {
        const s = document.createElement('style');
        s.id = 'toast-style';
        s.textContent = `@keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`;
        document.head.appendChild(s);
    }

    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── Search ────────────────────────────────────────────────────────

function handleSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    const query = searchInput.value.trim();
    // If not on dashboard, redirect to dashboard with search param
    if (!document.getElementById('assets-table-body')) {
        window.location.href = `/assets?search=${encodeURIComponent(query)}`;
    } else {
        loadDashboard(query);
    }
}

// ── DOMContentLoaded — boot sequence ─────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Update context-sensitive sidebar links
    updateSidebarLinks();

    // 2. Dashboard
    const searchParam = getQueryParam('search');
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchParam) {
        searchInput.value = searchParam;
        await loadDashboard(searchParam);
    } else {
        await loadDashboard();
    }

    // 3. Details page
    await loadAssetDetails();

    // 4. Sub-pages (edit, maintenance, lifecycle)
    await initSeparatePages();

    // 5. Search events
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleSearch();
            else loadDashboard(e.target.value);
        });
    }
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
});
