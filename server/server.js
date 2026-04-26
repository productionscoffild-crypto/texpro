import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = Number(process.env.PORT || 8787);

const owner = {
  id: 'owner-root',
  name: 'Владелец',
  phone: '',
  position: 'Руководитель',
  email: 'owner@textilepro.local',
  passwordHash: 'owner12345',
  role: 'owner',
  active: true,
  createdAt: new Date().toISOString(),
};

const emptyState = () => ({
  users: [owner],
  products: [],
  invoices: [],
  chatMessages: [],
  notificationReadAtByUser: {},
});

const normalizeUser = user => ({
  ...user,
  email: String(user.email || '').trim().toLowerCase(),
  role: user.role || 'employee',
  active: user.active ?? true,
  phone: user.phone || '',
  position: user.position || (user.role === 'owner' ? 'Руководитель' : 'Менеджер'),
});

const normalizeState = state => {
  const usersMap = new Map();
  [owner, ...(state.users || [])].map(normalizeUser).forEach(user => usersMap.set(user.email, user));
  return {
    users: Array.from(usersMap.values()),
    products: (state.products || []).map(product => ({ ...product, composition: product.composition || '' })),
    invoices: state.invoices || [],
    chatMessages: (state.chatMessages || []).map(message => ({ ...message, kind: message.kind || 'text', text: message.text || '' })),
    notificationReadAtByUser: state.notificationReadAtByUser || {},
  };
};

async function ensureDb() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) await writeDb(emptyState());
}

async function readDb() {
  await ensureDb();
  const raw = await readFile(DB_FILE, 'utf8');
  return normalizeState(JSON.parse(raw));
}

async function writeDb(state) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(normalizeState(state), null, 2), 'utf8');
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

async function sendFile(res, filePath, contentType) {
  try {
    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(file);
  } catch {
    send(res, 404, { error: 'File not found' });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  try {
    if (req.url === '/api/health') return send(res, 200, { ok: true });

    if (req.url === '/api/state' && req.method === 'GET') {
      return send(res, 200, await readDb());
    }

    if (req.url === '/api/state' && req.method === 'PUT') {
      const body = await readJson(req);
      await writeDb(body);
      return send(res, 200, { ok: true });
    }

    if (req.url === '/api/login' && req.method === 'POST') {
      const { email, password } = await readJson(req);
      const state = await readDb();
      const user = state.users.find(item => item.email === String(email || '').trim().toLowerCase());
      if (!user) return send(res, 404, { error: 'Пользователь не найден' });
      if (!user.active) return send(res, 403, { error: 'Доступ сотрудника отключён' });
      if (user.passwordHash !== password) return send(res, 401, { error: 'Неверный пароль' });
      return send(res, 200, { user, state });
    }

    if (req.method === 'GET') {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath !== '/' && urlPath !== '/index.html') {
        const staticPath = path.join(DIST_DIR, urlPath.replace(/^\//, ''));
        if (staticPath.startsWith(DIST_DIR) && existsSync(staticPath)) {
          const ext = path.extname(staticPath).toLowerCase();
          const type = ext === '.js' ? 'application/javascript; charset=utf-8'
            : ext === '.css' ? 'text/css; charset=utf-8'
              : ext === '.svg' ? 'image/svg+xml'
                : 'application/octet-stream';
          return sendFile(res, staticPath, type);
        }
      }
      return sendFile(res, path.join(DIST_DIR, 'index.html'), 'text/html; charset=utf-8');
    }

    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    return send(res, 500, { error: error instanceof Error ? error.message : 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Textile backend listening on http://localhost:${PORT}`);
});