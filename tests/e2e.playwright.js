async page => {
  await page.goto('http://localhost:4173');
  await page.getByRole('button', { name: /Nueva póliza/ }).first().click();

  const firstId = await page.locator('[data-field="holder"]').getAttribute('id');
  await page.locator('[data-field="holder"]').fill('Automatización Katalon');
  await page.locator('[data-field="email"]').fill('qa.katalon@example.com');
  await page.locator('[data-field="type"]').selectOption('Auto');
  await page.locator('[data-field="coverage"]').fill('Cobertura de prueba');
  await page.locator('[data-field="premium"]').fill('9999');
  await page.locator('[data-field="status"]').selectOption('Vigente');
  await page.locator('[data-field="startDate"]').fill('2026-11-01');
  await page.locator('[data-field="endDate"]').fill('2027-10-31');
  await page.getByRole('button', { name: /Crear póliza/ }).click();

  const row = page.locator('tr[data-policy-key]').filter({ hasText: 'Automatización Katalon' });
  await row.waitFor();
  const policyId = await row.getAttribute('data-policy-key');
  await row.locator('[data-menu-trigger]').click();
  await row.getByRole('button', { name: 'Editar póliza' }).click();
  const secondId = await page.locator('[data-field="holder"]').getAttribute('id');
  if (firstId === secondId) throw new Error('El ID dinámico no cambió');

  await page.locator('[data-field="premium"]').fill('10500');
  await page.getByRole('button', { name: /Guardar cambios/ }).click();
  const editedRow = page.locator(`tr[data-policy-key="${policyId}"]`);
  await page.waitForFunction(id => /10,500/.test(document.querySelector(`tr[data-policy-key="${id}"]`)?.innerText || ''), policyId);

  await page.getByRole('button', { name: '▤ Facturas' }).click();
  await page.locator('[data-invoice-search]').fill(policyId);
  const invoiceCount = await page.locator('[data-invoice-table] tbody tr').count();
  if (invoiceCount !== 1) throw new Error('No se localizó la factura relacionada');

  await page.getByRole('button', { name: /Pólizas/ }).click();
  let currentRow = page.locator(`tr[data-policy-key="${policyId}"]`);
  await currentRow.locator('[data-menu-trigger]').click();
  await currentRow.getByRole('button', { name: 'Dar de baja' }).click();
  await page.waitForFunction(id => document.querySelector(`tr[data-policy-key="${id}"]`)?.innerText.includes('Baja'), policyId);

  currentRow = page.locator(`tr[data-policy-key="${policyId}"]`);
  await currentRow.locator('[data-menu-trigger]').click();
  await currentRow.getByRole('button', { name: 'Reactivar póliza' }).click();
  await page.waitForFunction(id => document.querySelector(`tr[data-policy-key="${id}"]`)?.innerText.includes('Vigente'), policyId);

  currentRow = page.locator(`tr[data-policy-key="${policyId}"]`);
  await currentRow.locator('[data-menu-trigger]').click();
  await currentRow.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('button', { name: 'Eliminar definitivamente' }).click();
  await page.waitForFunction(id => !document.querySelector(`tr[data-policy-key="${id}"]`), policyId);

  return { policyId, firstId, secondId, invoiceCount, result: 'CRUD completo validado' };
}
