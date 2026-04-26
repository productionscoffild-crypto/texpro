const STATE_KEY = 'textile-app-state-v1';

const owner = () => ({
  id: 'owner-root',
  name: 'Владелец',
  phone: '',
  position: 'Руководитель',
  email: 'owner@textilepro.local',
  passwordHash: 'owner12345',
  role: 'owner',
  active: true,
  createdAt: new Date().toISOString(),
});

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
      'access-control-allow-headers': 'Content-Type',
    },
  });

const normalizeUser = (user) => {
  const role = user?.role || 'employee';
  return {
    ...user,
    email: String(user?.email || '').trim().toLowerCase(),
    role,
    active: user?.active ?? true,
    phone: user?.phone || '',
    position: user?.position || (role === 'owner' ? 'Руководитель' : 'Менеджер'),
  };
};

const uniqueUsers = (users) => {
  const map = new Map();
  users.map(normalizeUser).forEach((user) => {
    if (user.email) map.set(user.email, user);
  });
  return Array.from(map.values());
};

const normalizeState = (state = {}) => ({
  users: uniqueUsers([owner(), ...(state.users || [])]),
  products: (state.products || []).map((product) => ({ ...product, composition: product.composition || '' })),
  invoices: state.invoices || [],
  chatMessages: (state.chatMessages || []).map((message) => ({
    ...message,
    kind: message.kind || 'text',
    text: message.text || '',
  })),
  notificationReadAtByUser: state.notificationReadAtByUser || {},
});

const getKv = (env) => env.TEXTILE_KV || env.textile_kv || env.KV;

async function readState(env) {
  const kv = getKv(env);
  if (!kv) throw new Error('KV binding TEXTILE_KV is not configured');

  const raw = await kv.get(STATE_KEY);
  if (!raw) {
    const state = normalizeState({});
    await kv.put(STATE_KEY, JSON.stringify(state));
    return state;
  }

  return normalizeState(JSON.parse(raw));
}

async function writeState(env, state) {
  const kv = getKv(env);
  if (!kv) throw new Error('KV binding TEXTILE_KV is not configured');
  const normalized = normalizeState(state);
  await kv.put(STATE_KEY, JSON.stringify(normalized));
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\//, '').replace(/\.php$/, '');

  if (request.method === 'OPTIONS') return json({ ok: true });

  try {
    if (route === 'health') {
      const hasKv = Boolean(getKv(env));
      return json({ ok: hasKv, storage: hasKv ? 'cloudflare-kv' : 'missing-kv' }, hasKv ? 200 : 500);
    }

    if (route === 'state' && request.method === 'GET') {
      return json(await readState(env));
    }

    if (route === 'state' && (request.method === 'POST' || request.method === 'PUT')) {
      const body = await request.json();
      await writeState(env, body);
      return json({ ok: true });
    }

    if (route === 'login' && request.method === 'POST') {
      const body = await request.json();
      const state = await readState(env);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const user = state.users.find((item) => item.email === email);

      if (!user) return json({ error: 'Пользователь не найден' }, 404);
      if (!user.active) return json({ error: 'Доступ сотрудника отключён' }, 403);
      if (user.passwordHash !== password) return json({ error: 'Неверный пароль' }, 401);

      return json({ user, state });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Server error' }, 500);
  }
}
