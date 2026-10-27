'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DB_FILE = path.join(ROOT, 'data', 'db.json');
const PORT = Number(process.env.PORT || 4173);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(db) {
  const temporary = `${DB_FILE}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, DB_FILE);
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': contentTypes['.json'] });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error('Payload demasiado grande'));
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

function validatePolicy(policy) {
  const required = ['holder', 'email', 'type', 'coverage', 'premium', 'startDate', 'endDate'];
  const missing = required.filter(key => policy[key] === undefined || String(policy[key]).trim() === '');
  if (missing.length) return `Campos requeridos: ${missing.join(', ')}`;
  if (!/^\S+@\S+\.\S+$/.test(policy.email)) return 'Correo electrónico inválido';
  if (Number(policy.premium) <= 0) return 'La prima debe ser mayor a cero';
  if (policy.endDate <= policy.startDate) return 'La fecha final debe ser posterior a la inicial';
  return null;
}

function nextPolicyId(policies) {
  const year = new Date().getFullYear();
  const max = policies
    .map(item => /^POL-\d{4}-(\d+)$/.exec(item.id))
    .filter(Boolean)
    .reduce((value, match) => Math.max(value, Number(match[1])), 0);
  return `POL-${year}-${String(max + 1).padStart(3, '0')}`;
}

function nextInvoiceId(invoices) {
  const date = new Date();
  const prefix = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const sequence = 1000 + invoices.length + Math.floor(Math.random() * 8000);
  return `FAC-${prefix}-${sequence}`;
}

async function handleApi(req, res, url) {
  const db = readDb();

  if (req.method === 'GET' && url.pathname === '/api/dashboard') {
    return json(res, 200, db);
  }

  if (req.method === 'POST' && url.pathname === '/api/policies') {
    const input = await readBody(req);
    const error = validatePolicy(input);
    if (error) return json(res, 400, { error });
    const policy = {
      id: nextPolicyId(db.policies),
      holder: input.holder.trim(),
      email: input.email.trim(),
      type: input.type,
      coverage: input.coverage.trim(),
      premium: Number(input.premium),
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status || 'Vigente',
      createdAt: new Date().toISOString()
    };
    const invoice = {
      id: nextInvoiceId(db.invoices),
      policyId: policy.id,
      holder: policy.holder,
      amount: policy.premium,
      issuedAt: policy.startDate,
      dueAt: policy.startDate,
      status: 'Pendiente'
    };
    db.policies.unshift(policy);
    db.invoices.unshift(invoice);
    writeDb(db);
    return json(res, 201, { policy, invoice });
  }

  const policyMatch = /^\/api\/policies\/([^/]+)$/.exec(url.pathname);
  if (policyMatch && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const id = decodeURIComponent(policyMatch[1]);
    const index = db.policies.findIndex(item => item.id === id);
    if (index < 0) return json(res, 404, { error: 'Póliza no encontrada' });

    if (req.method === 'DELETE') {
      db.policies.splice(index, 1);
      db.invoices = db.invoices.filter(item => item.policyId !== id);
      writeDb(db);
      return json(res, 200, { deleted: id });
    }

    const input = await readBody(req);
    if (req.method === 'PATCH') {
      db.policies[index].status = input.status;
      db.invoices
        .filter(item => item.policyId === id)
        .forEach(item => { item.status = input.status === 'Baja' ? 'Cancelada' : 'Pendiente'; });
      writeDb(db);
      return json(res, 200, db.policies[index]);
    }

    const error = validatePolicy(input);
    if (error) return json(res, 400, { error });
    db.policies[index] = {
      ...db.policies[index],
      holder: input.holder.trim(),
      email: input.email.trim(),
      type: input.type,
      coverage: input.coverage.trim(),
      premium: Number(input.premium),
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status || db.policies[index].status
    };
    db.invoices
      .filter(item => item.policyId === id)
      .forEach(item => {
        item.holder = db.policies[index].holder;
        item.amount = db.policies[index].premium;
      });
    writeDb(db);
    return json(res, 200, db.policies[index]);
  }

  return json(res, 404, { error: 'Ruta no encontrada' });
}

function serveStatic(res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const normalized = path.normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(PUBLIC_DIR, normalized);
  if (!file.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'Acceso denegado' });
  fs.readFile(file, (error, content) => {
    if (error) return json(res, error.code === 'ENOENT' ? 404 : 500, { error: 'Archivo no disponible' });
    res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    serveStatic(res, url.pathname);
  } catch (error) {
    json(res, 500, { error: error.message || 'Error interno' });
  }
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Póliza Lab disponible en http://localhost:${PORT}`);
  });
}

module.exports = { server, validatePolicy };
