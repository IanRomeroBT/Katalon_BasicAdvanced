'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePolicy, validateClaim } = require('../server');

const valid = {
  holder: 'Persona de Prueba', email: 'qa@example.com', type: 'Auto', coverage: 'Amplia',
  premium: 1200, startDate: '2026-01-01', endDate: '2027-01-01'
};

test('acepta una póliza válida', () => assert.equal(validatePolicy(valid), null));
test('rechaza correo inválido', () => assert.match(validatePolicy({ ...valid, email: 'correo' }), /correo/i));
test('rechaza prima no positiva', () => assert.match(validatePolicy({ ...valid, premium: 0 }), /prima/i));
test('rechaza vigencia invertida', () => assert.match(validatePolicy({ ...valid, endDate: '2025-01-01' }), /fecha/i));

const db = { policies: [{ id: 'POL-2026-001', status: 'Vigente', startDate: '2026-01-01', endDate: '2026-12-31' }] };
const validClaim = { policyId: 'POL-2026-001', incidentDate: '2026-06-15', type: 'Colisión', estimatedAmount: 5000, description: 'Daño de prueba' };

test('acepta un siniestro dentro de la vigencia', () => assert.equal(validateClaim(validClaim, db), null));
test('rechaza un siniestro fuera de vigencia', () => assert.match(validateClaim({ ...validClaim, incidentDate: '2027-01-01' }, db), /vigencia/i));
test('rechaza siniestros para pólizas no vigentes', () => assert.match(validateClaim(validClaim, { policies: [{ ...db.policies[0], status: 'Baja' }] }), /vigentes/i));
