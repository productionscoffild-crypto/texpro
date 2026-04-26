import { ChatMessage, Invoice, Product, User } from '../types';

export interface CloudState {
  users: User[];
  products: Product[];
  invoices: Invoice[];
  chatMessages: ChatMessage[];
  notificationReadAtByUser: Record<string, string>;
}

const apiBase = () => {
  const configured = localStorage.getItem('textile-api-url');
  if (configured) return configured.replace(/\/$/, '');
  if (['5173', '4173'].includes(window.location.port)) {
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
  baseUrl: apiBase,

  health: () => request<{ ok: true }>('/api/health'),

  login: (email: string, password: string) =>
    request<{ user: User; state: CloudState }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getState: () => request<CloudState>('/api/state'),

  saveState: (state: CloudState) =>
    request<{ ok: true }>('/api/state', {
      method: 'PUT',
      body: JSON.stringify(state),
    }),
};