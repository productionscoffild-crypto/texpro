import { ChatMessage, Invoice, Product, User } from '../types';

export interface CloudState {
  users: User[];
  products: Product[];
  invoices: Invoice[];
  chatMessages: ChatMessage[];
  notificationReadAtByUser: Record<string, string>;
}

const SUPABASE_URL = 'https://sjfhvfvgmyjyyhjzaefy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZmh2ZnZnbXlqeXloanphZWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTc5MjUsImV4cCI6MjA5Mjc5MzkyNX0.EbGUNM5r3yWJMNb6k6Ri0bFoi6OpUhwpKDkak-HAZ8A';
const SUPABASE_TABLE = 'textile_app_state';

const defaultState = (): CloudState => ({
  users: [
    {
      id: 'owner-root',
      name: 'Владелец',
      phone: '',
      position: 'Руководитель',
      email: 'owner@textilepro.local',
      passwordHash: 'owner12345',
      role: 'owner',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ],
  products: [],
  invoices: [],
  chatMessages: [],
  notificationReadAtByUser: {},
});

const normalizeCloudState = (state: Partial<CloudState> | null | undefined): CloudState => ({
  users: state?.users?.length ? state.users : defaultState().users,
  products: state?.products || [],
  invoices: state?.invoices || [],
  chatMessages: state?.chatMessages || [],
  notificationReadAtByUser: state?.notificationReadAtByUser || {},
});

const supabaseAnonKey = () => SUPABASE_ANON_KEY;

const hasSupabase = () => Boolean(SUPABASE_URL && supabaseAnonKey());

async function supabaseRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const key = supabaseAnonKey();
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Ошибка Supabase');
  return data as T;
}

async function getSupabaseState(): Promise<CloudState> {
  const rows = await supabaseRequest<{ state_json: CloudState }[]>(
    `/rest/v1/${SUPABASE_TABLE}?id=eq.1&select=state_json`
  );

  if (rows[0]?.state_json) return normalizeCloudState(rows[0].state_json);

  const state = defaultState();
  await saveSupabaseState(state);
  return state;
}

async function saveSupabaseState(state: CloudState): Promise<{ ok: true }> {
  await supabaseRequest(`/rest/v1/${SUPABASE_TABLE}?on_conflict=id`, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ id: 1, state_json: normalizeCloudState(state) }),
  });
  return { ok: true };
}

async function loginSupabase(email: string, password: string) {
  const state = await getSupabaseState();
  const normalizedEmail = email.trim().toLowerCase();
  const user = state.users.find(item => item.email.trim().toLowerCase() === normalizedEmail);
  if (!user) throw new Error('Пользователь не найден');
  if (!user.active) throw new Error('Доступ сотрудника отключён');
  if (user.passwordHash !== password) throw new Error('Неверный пароль');
  return { user, state };
}

const apiBase = () => {
  if (['5173', '4173'].includes(window.location.port)) {
    const configured = localStorage.getItem('textile-api-url');
    if (configured) return configured.replace(/\/$/, '');
    return `${window.location.protocol}//${window.location.hostname}:8787`;
  }
  return window.location.origin;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
  return data as T;
}

export const cloudApi = {
  baseUrl: () => hasSupabase() ? SUPABASE_URL : apiBase(),

  health: async () => {
    if (hasSupabase()) {
      await getSupabaseState();
      return { ok: true as const };
    }
    return request<{ ok: true }>('/api/health.php');
  },

  login: (email: string, password: string) => hasSupabase()
    ? loginSupabase(email, password)
    : request<{ user: User; state: CloudState }>('/api/login.php', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getState: () => hasSupabase()
    ? getSupabaseState()
    : request<CloudState>('/api/state.php'),

  saveState: (state: CloudState) => hasSupabase()
    ? saveSupabaseState(state)
    : request<{ ok: true }>('/api/state.php', {
      method: 'POST',
      body: JSON.stringify(state),
    }),
};