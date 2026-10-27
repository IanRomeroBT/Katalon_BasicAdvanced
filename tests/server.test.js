'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePolicy } = require('../server');

const valid = {
  holder: 'Persona de Prueba', email: 'qa@example.com', type: 'Auto', coverage: 'Amplia',
  premium: 1200, startDate: '2026-01-01', endDate: '2027-01-01'
};

test('acepta una póliza válida', () => assert.equal(validatePolicy(valid), null));
test('rechaza correo inválido', () => assert.match(validatePolicy({ ...valid, email: 'correo' }), /correo/i));
test('rechaza prima no positiva', () => assert.match(validatePolicy({ ...valid, premium: 0 }), /prima/i));
test('rechaza vigencia invertida', () => assert.match(validatePolicy({ ...valid, endDate: '2025-01-01' }), /fecha/i));
