async page => {
  await page.goto('http://localhost:4173');
  if (!(await page.locator('body').innerText()).includes('RELEASE 2.0')) throw new Error('No se mostró la versión 2.0');

  await page.getByRole('button', { name: /Siniestros/ }).click();
  await page.getByRole('button', { name: /Reportar siniestro/ }).click();
  await page.locator('[data-claim-field="policyId"]').selectOption('POL-2026-001');
  await page.locator('[data-claim-field="incidentDate"]').fill('2026-06-20');
  await page.locator('[data-claim-field="type"]').selectOption('Robo');
  await page.locator('[data-claim-field="estimatedAmount"]').fill('17500');
  await page.locator('[data-claim-field="description"]').fill('Expediente temporal de prueba automatizada 2.0');
  await page.getByRole('button', { name: /Crear reporte/ }).click();

  const row = page.locator('tr[data-claim-key]').filter({ hasText: 'Robo' }).filter({ hasText: '$17,500' });
  await row.waitFor();
  const claimId = await row.getAttribute('data-claim-key');
  await row.locator('[data-claim-status-change]').selectOption('En revisión');
  await page.waitForFunction(id => document.querySelector(`tr[data-claim-key="${id}"] select`)?.value === 'En revisión', claimId);

  const blockedDelete = await page.request.delete('http://localhost:4173/api/policies/POL-2026-001');
  if (blockedDelete.status() !== 409) throw new Error(`Se esperaba HTTP 409 y se recibió ${blockedDelete.status()}`);

  let currentRow = page.locator(`tr[data-claim-key="${claimId}"]`);
  await currentRow.locator('[data-claim-status-change]').selectOption('Rechazado');
  await page.waitForFunction(id => document.querySelector(`tr[data-claim-key="${id}"] select`)?.value === 'Rechazado', claimId);
  currentRow = page.locator(`tr[data-claim-key="${claimId}"]`);
  await currentRow.locator('[data-delete-claim]').click();
  await page.getByRole('button', { name: 'Eliminar definitivamente' }).click();
  await page.waitForFunction(id => !document.querySelector(`tr[data-claim-key="${id}"]`), claimId);

  await page.getByRole('button', { name: '▤ Facturas' }).click();
  const invoiceRow = page.locator('[data-invoice-table] tbody tr').filter({ hasText: 'FAC-2603-1197' });
  await invoiceRow.getByRole('button', { name: 'Registrar pago' }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-invoice-table] tbody tr')].some(row => row.innerText.includes('FAC-2603-1197') && row.innerText.includes('Pagada')));

  return { release: '2.0', claimId, policyDeleteStatus: blockedDelete.status(), payment: 'Pagada', result: 'Flujos 2.0 validados' };
}
