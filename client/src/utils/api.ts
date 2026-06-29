import type { User, Board } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) =>
    request<User>('/api/auth/me', { token }),

  getBoards: (token: string) =>
    request<Board[]>('/api/boards', { token }),

  createBoard: (token: string, name: string) =>
    request<Board>('/api/boards', {
      method: 'POST',
      token,
      body: JSON.stringify({ name }),
    }),

  getBoard: (id: string, token?: string | null) =>
    request<Board>('/api/boards/' + id, { token }),

  updateBoard: (token: string, id: string, name: string) =>
    request<Board>('/api/boards/' + id, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ name }),
    }),

  deleteBoard: (token: string, id: string) =>
    request<void>('/api/boards/' + id, { method: 'DELETE', token }),

  saveCanvas: (token: string, id: string, canvasData: Record<string, unknown>) =>
    request<{ updatedAt: string }>('/api/boards/' + id + '/canvas', {
      method: 'PUT',
      token,
      body: JSON.stringify({ canvasData }),
    }),
};
