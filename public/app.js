'use strict';

const state = { policies: [], invoices: [], claims: [], activeView: 'resumen', editId: null, deleteId: null, deleteKind: null };
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function dynamicId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible completar la operación');
  return data;
}

async function loadData() {
  const data = await request('/api/dashboard');
  state.policies = data.policies;
  state.invoices = data.invoices;
  state.claims = data.claims || [];
  renderAll();
}

function showAlert(message, isError = false) {
  const alert = qs('#global-alert');
  alert.textContent = message;
  alert.classList.toggle('error', isError);
  alert.hidden = false;
  clearTimeout(showAlert.timer);
  showAlert.timer = setTimeout(() => { alert.hidden = true; }, 3400);
}

function statusBadge(status) {
  return `<span class="status status-${status.toLowerCase().replace(/\s/g, '-')}">${status}</span>`;
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function formatDate(value) {
  return shortDate.format(new Date(`${value}T00:00:00Z`));
}

function renderMetrics() {
  const active = state.policies.filter(policy => policy.status === 'Vigente').length;
  const pending = state.invoices.filter(invoice => invoice.status === 'Pendiente');
  const openClaims = state.claims.filter(claim => !['Rechazado', 'Pagado'].includes(claim.status));
  const annual = state.policies.filter(policy => policy.status !== 'Baja').reduce((sum, policy) => sum + policy.premium, 0);
  qs('[data-metrics]').innerHTML = [
    ['◇', 'Pólizas totales', state.policies.length, `${active} vigentes`],
    ['✓', 'Pólizas vigentes', active, 'Cartera activa'],
    ['▤', 'Facturas pendientes', pending.length, money.format(pending.reduce((sum, item) => sum + item.amount, 0))],
    ['△', 'Siniestros abiertos', openClaims.length, `${state.claims.length} reportados`],
    ['↗', 'Prima anual', money.format(annual), 'Sin pólizas dadas de baja']
  ].map(item => `<article class="metric-card"><i class="metric-icon">${item[0]}</i><span>${item[1]}</span><strong>${item[2]}</strong><small>${item[3]}</small></article>`).join('');
  qsa('[data-policy-count]').forEach(element => { element.textContent = state.policies.length; });
  qsa('[data-claim-count]').forEach(element => { element.textContent = state.claims.length; });
}

function renderRecent() {
  qs('[data-recent-policies]').innerHTML = state.policies.slice(0, 4).map(policy => `
    <div class="compact-row">
      <span class="compact-avatar">${initials(policy.holder)}</span>
      <div><strong>${escapeHtml(policy.holder)}</strong><small>${policy.id} · ${policy.type}</small></div>
      <div>${statusBadge(policy.status)}<small>${money.format(policy.premium)}</small></div>
    </div>`).join('');
}

function renderChart() {
  const colors = ['#1f5b49', '#d9ef83', '#8fc8ad', '#efb978', '#89a6d9'];
  const grouped = Object.entries(state.policies.filter(item => item.status !== 'Baja').reduce((result, item) => {
    result[item.type] = (result[item.type] || 0) + item.premium;
    return result;
  }, {})).sort((a, b) => b[1] - a[1]);
  const total = grouped.reduce((sum, item) => sum + item[1], 0) || 1;
  let start = 0;
  const stops = grouped.map(([_, value], index) => {
    const end = start + (value / total) * 100;
    const stop = `${colors[index % colors.length]} ${start}% ${end}%`;
    start = end;
    return stop;
  });
  qs('[data-donut]').style.background = `conic-gradient(${stops.join(',') || '#e7ece7 0 100%'})`;
  qs('[data-total-premium]').textContent = money.format(total);
  qs('[data-legend]').innerHTML = grouped.map(([type, value], index) => `<div class="legend-row"><i class="legend-dot" style="background:${colors[index % colors.length]}"></i><span>${type}</span><b>${Math.round(value / total * 100)}%</b></div>`).join('');
}

function policyRows() {
  const text = qs('[data-policy-search]').value.trim().toLowerCase();
  const status = qs('[data-policy-status]').value;
  return state.policies.filter(policy => {
    const haystack = `${policy.id} ${policy.holder} ${policy.email} ${policy.type}`.toLowerCase();
    return (!text || haystack.includes(text)) && (!status || policy.status === status);
  });
}

function renderPolicies() {
  const rows = policyRows();
  const tbody = qs('[data-policy-table] tbody');
  tbody.innerHTML = rows.map(policy => {
    const rowId = dynamicId('policy-row');
    return `<tr id="${rowId}" data-policy-key="${policy.id}">
      <td><span class="folio">${policy.id}</span><small>Alta ${formatDate(policy.createdAt.slice(0, 10))}</small></td>
      <td><strong>${escapeHtml(policy.holder)}</strong><small>${escapeHtml(policy.email)}</small></td>
      <td>${policy.type}<small>${escapeHtml(policy.coverage)}</small></td>
      <td>${formatDate(policy.startDate)}<small>al ${formatDate(policy.endDate)}</small></td>
      <td><strong>${money.format(policy.premium)}</strong></td>
      <td>${statusBadge(policy.status)}</td>
      <td class="row-actions"><button class="kebab" type="button" title="Acciones de ${escapeHtml(policy.id)}" data-menu-trigger>•••</button></td>
    </tr>`;
  }).join('');
  qs('[data-policy-empty]').hidden = rows.length > 0;
  qs('[data-policy-table]').hidden = rows.length === 0;
}

function invoiceRows() {
  const text = qs('[data-invoice-search]').value.trim().toLowerCase();
  const status = qs('[data-invoice-status]').value;
  return state.invoices.filter(invoice => {
    const haystack = `${invoice.id} ${invoice.policyId} ${invoice.holder}`.toLowerCase();
    return (!text || haystack.includes(text)) && (!status || invoice.status === status);
  });
}

function renderInvoices() {
  const rows = invoiceRows();
  qs('[data-invoice-table] tbody').innerHTML = rows.map(invoice => `<tr id="${dynamicId('invoice')}">
    <td><span class="folio">${invoice.id}</span></td><td>${invoice.policyId}</td><td><strong>${escapeHtml(invoice.holder)}</strong></td>
    <td>${formatDate(invoice.issuedAt)}</td><td>${formatDate(invoice.dueAt)}</td><td><strong>${money.format(invoice.amount)}</strong></td><td>${statusBadge(invoice.status)}</td>
    <td>${invoice.status === 'Pendiente' ? `<button class="mini-action" type="button" data-pay-invoice="${invoice.id}">Registrar pago</button>` : ''}</td>
  </tr>`).join('');
  qs('[data-invoice-empty]').hidden = rows.length > 0;
  qs('[data-invoice-table]').hidden = rows.length === 0;
}

function claimRows() {
  const text = qs('[data-claim-search]').value.trim().toLowerCase();
  const status = qs('[data-claim-status]').value;
  return state.claims.filter(claim => {
    const haystack = `${claim.id} ${claim.policyId} ${claim.holder} ${claim.type}`.toLowerCase();
    return (!text || haystack.includes(text)) && (!status || claim.status === status);
  });
}

function renderClaims() {
  const rows = claimRows();
  qs('[data-claim-table] tbody').innerHTML = rows.map(claim => `<tr id="${dynamicId('claim')}" data-claim-key="${claim.id}">
    <td><span class="folio">${claim.id}</span><small>Reporte ${formatDate(claim.createdAt.slice(0, 10))}</small></td>
    <td><strong>${claim.policyId}</strong><small>${escapeHtml(claim.holder)}</small></td>
    <td>${formatDate(claim.incidentDate)}</td><td>${escapeHtml(claim.type)}</td><td><strong>${money.format(claim.estimatedAmount)}</strong></td>
    <td><select class="status-select" data-claim-status-change="${claim.id}" aria-label="Estado de ${claim.id}">${['Reportado', 'En revisión', 'Aprobado', 'Rechazado', 'Pagado'].map(status => `<option${status === claim.status ? ' selected' : ''}>${status}</option>`).join('')}</select></td>
    <td><button class="kebab claim-delete" type="button" title="Eliminar ${claim.id}" data-delete-claim="${claim.id}">×</button></td>
  </tr>`).join('');
  qs('[data-claim-empty]').hidden = rows.length > 0;
  qs('[data-claim-table]').hidden = rows.length === 0;
}

function renderAll() {
  renderMetrics(); renderRecent(); renderChart(); renderPolicies(); renderInvoices(); renderClaims();
}

function switchView(view) {
  state.activeView = view;
  qsa('[data-section]').forEach(section => section.classList.toggle('is-visible', section.dataset.section === view));
  qsa('[data-view]').forEach(button => button.classList.toggle('is-active', button.dataset.view === view));
  const titles = { resumen: 'Resumen general', polizas: 'Administración de pólizas', facturas: 'Facturas creadas', siniestros: 'Gestión de siniestros', laboratorio: 'Laboratorio QA' };
  qs('[data-page-title]').textContent = titles[view];
  location.hash = view;
  closeMenus();
}

function setDynamicFormIds() {
  qsa('[data-policy-form] .field').forEach(field => {
    const control = qs('input:not([type="hidden"]), select', field);
    const label = qs('label', field);
    if (!control || !label) return;
    const id = dynamicId('field');
    control.id = id;
    label.htmlFor = id;
  });
}

function openPolicyModal(policy = null) {
  state.editId = policy?.id || null;
  const modal = qs('[data-policy-modal]');
  const form = qs('[data-policy-form]');
  form.reset(); clearErrors(); setDynamicFormIds();
  qs('#modal-title').textContent = policy ? `Editar ${policy.id}` : 'Nueva póliza';
  qs('[data-submit-label]').textContent = policy ? 'Guardar cambios' : 'Crear póliza';
  qs('[data-submit-icon]').textContent = policy ? '✓' : '＋';
  qs('[data-record-id]').value = policy?.id || '';
  if (policy) qsa('[data-field]', form).forEach(input => { input.value = policy[input.dataset.field] ?? ''; });
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => qs('[data-field="holder"]').focus(), 30);
}

function closePolicyModal() {
  qs('[data-policy-modal]').hidden = true;
  document.body.style.overflow = '';
  state.editId = null;
}

function openClaimModal() {
  const modal = qs('[data-claim-modal]');
  const form = qs('[data-claim-form]');
  form.reset();
  qsa('.field', form).forEach(field => { field.classList.remove('has-error'); qs('.field-error', field).textContent = ''; });
  const policySelect = qs('[data-claim-field="policyId"]');
  policySelect.innerHTML = '<option value="">Selecciona una póliza</option>' + state.policies
    .filter(policy => policy.status === 'Vigente')
    .map(policy => `<option value="${policy.id}">${policy.id} · ${escapeHtml(policy.holder)}</option>`).join('');
  qsa('[data-claim-field]', form).forEach(control => {
    const label = qs('label', control.closest('.field'));
    const id = dynamicId('claim-field'); control.id = id; if (label) label.htmlFor = id;
  });
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => policySelect.focus(), 30);
}

function closeClaimModal() {
  qs('[data-claim-modal]').hidden = true;
  document.body.style.overflow = '';
}

async function saveClaim(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(qsa('[data-claim-field]', form).map(control => [control.dataset.claimField, control.value.trim()]));
  let valid = true;
  qsa('[data-claim-field]', form).forEach(control => {
    const field = control.closest('.field'); const error = qs('.field-error', field);
    field.classList.remove('has-error'); error.textContent = '';
    if (!control.value.trim()) { field.classList.add('has-error'); error.textContent = 'Este campo es obligatorio'; valid = false; }
  });
  if (data.estimatedAmount && Number(data.estimatedAmount) <= 0) {
    const field = qs('[data-claim-field="estimatedAmount"]').closest('.field'); field.classList.add('has-error'); qs('.field-error', field).textContent = 'Debe ser mayor a cero'; valid = false;
  }
  if (!valid) return showAlert('Revisa los datos del siniestro.', true);
  try {
    const claim = await request('/api/claims', { method: 'POST', body: JSON.stringify(data) });
    closeClaimModal(); await loadData(); switchView('siniestros'); showAlert(`Siniestro ${claim.id} reportado correctamente.`);
  } catch (error) { showAlert(error.message, true); }
}

async function updateClaimStatus(id, status) {
  try {
    await request(`/api/claims/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await loadData(); showAlert(`Siniestro ${id} actualizado a ${status}.`);
  } catch (error) { await loadData(); showAlert(error.message, true); }
}

async function payInvoice(id) {
  try {
    await request(`/api/invoices/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'Pagada' }) });
    await loadData(); showAlert(`Pago registrado en la factura ${id}.`);
  } catch (error) { showAlert(error.message, true); }
}

function clearErrors() {
  qsa('.field').forEach(field => { field.classList.remove('has-error'); const error = qs('.field-error', field); if (error) error.textContent = ''; });
}

function formData() {
  return Object.fromEntries(qsa('[data-policy-form] [data-field]').map(input => [input.dataset.field, input.value.trim()]));
}

function validateForm(data) {
  clearErrors();
  const errors = {};
  ['holder', 'email', 'type', 'coverage', 'premium', 'startDate', 'endDate'].forEach(key => { if (!data[key]) errors[key] = 'Este campo es obligatorio'; });
  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) errors.email = 'Ingresa un correo válido';
  if (data.premium && Number(data.premium) <= 0) errors.premium = 'La prima debe ser mayor a cero';
  if (data.startDate && data.endDate && data.endDate <= data.startDate) errors.endDate = 'Debe ser posterior al inicio';
  Object.entries(errors).forEach(([key, message]) => {
    const input = qs(`[data-field="${key}"]`); const field = input.closest('.field');
    field.classList.add('has-error'); qs('.field-error', field).textContent = message;
  });
  return Object.keys(errors).length === 0;
}

async function savePolicy(event) {
  event.preventDefault();
  const data = formData();
  if (!validateForm(data)) return showAlert('Revisa los campos marcados.', true);
  const button = qs('[data-policy-form] button[type="submit"]');
  button.disabled = true;
  try {
    if (state.editId) {
      await request(`/api/policies/${encodeURIComponent(state.editId)}`, { method: 'PUT', body: JSON.stringify(data) });
      showAlert(`Póliza ${state.editId} actualizada correctamente.`);
    } else {
      const result = await request('/api/policies', { method: 'POST', body: JSON.stringify(data) });
      showAlert(`Póliza ${result.policy.id} y factura ${result.invoice.id} creadas.`);
    }
    closePolicyModal(); await loadData(); switchView('polizas');
  } catch (error) { showAlert(error.message, true); }
  finally { button.disabled = false; }
}

function closeMenus() { qsa('.action-menu').forEach(menu => menu.remove()); }

function openActionMenu(button) {
  const row = button.closest('tr'); const id = row.dataset.policyKey;
  closeMenus();
  const policy = state.policies.find(item => item.id === id);
  const menu = document.createElement('div');
  menu.className = 'action-menu';
  menu.innerHTML = `<button type="button" data-action="edit">Editar póliza</button><button type="button" data-action="status">${policy.status === 'Baja' ? 'Reactivar póliza' : 'Dar de baja'}</button><button type="button" class="delete-option" data-action="delete">Eliminar</button>`;
  menu.addEventListener('click', event => handleRowAction(event, policy));
  button.parentElement.appendChild(menu);
}

async function handleRowAction(event, policy) {
  const action = event.target.dataset.action;
  if (!action) return;
  closeMenus();
  if (action === 'edit') return openPolicyModal(policy);
  if (action === 'delete') return openConfirm(policy);
  if (action === 'status') {
    const status = policy.status === 'Baja' ? 'Vigente' : 'Baja';
    try {
      await request(`/api/policies/${encodeURIComponent(policy.id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadData(); showAlert(status === 'Baja' ? `Póliza ${policy.id} dada de baja.` : `Póliza ${policy.id} reactivada.`);
    } catch (error) { showAlert(error.message, true); }
  }
}

function openConfirm(policy) {
  state.deleteId = policy.id;
  state.deleteKind = 'policy';
  qs('#confirm-title').textContent = 'Eliminar póliza';
  qs('[data-confirm-message]').textContent = `Se eliminarán ${policy.id} y sus facturas relacionadas. Esta acción no se puede deshacer.`;
  qs('[data-confirm-modal]').hidden = false;
}

function openClaimConfirm(claim) {
  state.deleteId = claim.id;
  state.deleteKind = 'claim';
  qs('#confirm-title').textContent = 'Eliminar siniestro';
  qs('[data-confirm-message]').textContent = `Se eliminará el reporte ${claim.id}. Solo los reportes iniciales o rechazados pueden eliminarse.`;
  qs('[data-confirm-modal]').hidden = false;
}

function closeConfirm() { qs('[data-confirm-modal]').hidden = true; state.deleteId = null; state.deleteKind = null; qs('#confirm-title').textContent = 'Eliminar póliza'; }

async function deleteRecord() {
  const id = state.deleteId;
  const kind = state.deleteKind;
  try {
    const resource = kind === 'claim' ? 'claims' : 'policies';
    await request(`/api/${resource}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    closeConfirm(); await loadData(); showAlert(kind === 'claim' ? `Siniestro ${id} eliminado.` : `Póliza ${id} eliminada definitivamente.`);
  } catch (error) { showAlert(error.message, true); }
}

function exportCsv() {
  const headers = ['Factura', 'Póliza', 'Cliente', 'Emisión', 'Vencimiento', 'Importe', 'Estado'];
  const rows = invoiceRows().map(item => [item.id, item.policyId, item.holder, item.issuedAt, item.dueAt, item.amount, item.status]);
  const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
  link.download = `facturas-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  showAlert('Archivo CSV generado.');
}

function escapeHtml(value) {
  const div = document.createElement('div'); div.textContent = value; return div.innerHTML;
}

document.addEventListener('click', event => {
  const nav = event.target.closest('[data-view]'); if (nav) switchView(nav.dataset.view);
  const link = event.target.closest('[data-view-link]'); if (link) switchView(link.dataset.viewLink);
  if (event.target.closest('[data-open-policy]')) openPolicyModal();
  if (event.target.closest('[data-open-claim]')) openClaimModal();
  if (event.target.closest('.modal-close,[data-cancel-form]')) closePolicyModal();
  if (event.target.closest('[data-close-claim]')) closeClaimModal();
  const payment = event.target.closest('[data-pay-invoice]'); if (payment) payInvoice(payment.dataset.payInvoice);
  const claimDelete = event.target.closest('[data-delete-claim]');
  if (claimDelete) openClaimConfirm(state.claims.find(claim => claim.id === claimDelete.dataset.deleteClaim));
  const menuTrigger = event.target.closest('[data-menu-trigger]');
  if (menuTrigger) { event.stopPropagation(); openActionMenu(menuTrigger); }
  else if (!event.target.closest('.action-menu')) closeMenus();
});

qs('[data-policy-form]').addEventListener('submit', savePolicy);
qs('[data-policy-search]').addEventListener('input', renderPolicies);
qs('[data-policy-status]').addEventListener('change', renderPolicies);
qs('[data-invoice-search]').addEventListener('input', renderInvoices);
qs('[data-invoice-status]').addEventListener('change', renderInvoices);
qs('[data-claim-search]').addEventListener('input', renderClaims);
qs('[data-claim-status]').addEventListener('change', renderClaims);
qs('[data-claim-table]').addEventListener('change', event => { if (event.target.matches('[data-claim-status-change]')) updateClaimStatus(event.target.dataset.claimStatusChange, event.target.value); });
qs('[data-claim-form]').addEventListener('submit', saveClaim);
qs('[data-download-csv]').addEventListener('click', exportCsv);
qs('[data-confirm-cancel]').addEventListener('click', closeConfirm);
qs('[data-confirm-delete]').addEventListener('click', deleteRecord);
qsa('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => {
  if (event.target !== backdrop) return;
  if (backdrop.matches('[data-policy-modal]')) closePolicyModal();
  else if (backdrop.matches('[data-claim-modal]')) closeClaimModal();
  else closeConfirm();
}));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenus(); if (!qs('[data-confirm-modal]').hidden) closeConfirm(); else if (!qs('[data-claim-modal]').hidden) closeClaimModal(); else if (!qs('[data-policy-modal]').hidden) closePolicyModal(); } });

const initialView = location.hash.slice(1);
if (['resumen', 'polizas', 'facturas', 'siniestros', 'laboratorio'].includes(initialView)) switchView(initialView);
loadData().catch(error => showAlert(`No se pudo iniciar la aplicación: ${error.message}`, true));
