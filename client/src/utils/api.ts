import type { User, Board } from '../types';
import type { Workspace, WorkspaceMember, BoardTemplate, Notification, Task, ActivityItem } from '../types/saas';

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

  me: (token: string) => request<User>('/api/auth/me', { token }),

  // Workspaces
  getWorkspaces: (token: string) =>
    request<Workspace[]>('/api/workspaces', { token }),

  createWorkspace: (token: string, name: string) =>
    request<Workspace>('/api/workspaces', {
      method: 'POST',
      token,
      body: JSON.stringify({ name }),
    }),

  getWorkspace: (token: string, id: string) =>
    request<Workspace>(`/api/workspaces/${id}`, { token }),

  getWorkspaceBoards: (token: string, workspaceId: string) =>
    request<Board[]>(`/api/workspaces/${workspaceId}/boards`, { token }),

  createWorkspaceBoard: (
    token: string,
    workspaceId: string,
    data: { name: string; template?: string; folderId?: string },
  ) =>
    request<Board>(`/api/workspaces/${workspaceId}/boards`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  getWorkspaceMembers: (token: string, workspaceId: string) =>
    request<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`, { token }),

  inviteMember: (token: string, workspaceId: string, email: string, role: string) =>
    request<{ id: string }>(`/api/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      token,
      body: JSON.stringify({ email, role }),
    }),

  getTemplates: (token: string, workspaceId: string) =>
    request<BoardTemplate[]>(`/api/workspaces/${workspaceId}/templates`, { token }),

  getWorkspaceActivity: (token: string, workspaceId: string) =>
    request<ActivityItem[]>(`/api/workspaces/${workspaceId}/activity`, { token }),

  acceptInvite: (token: string, inviteToken: string) =>
    request<{ workspaceId: string; workspaceName: string }>(
      `/api/invitations/${inviteToken}/accept`,
      { method: 'POST', token },
    ),

  getInvite: (inviteToken: string) =>
    request<{ workspaceName: string; email: string; role: string }>(
      `/api/invitations/${inviteToken}`,
    ),

  // Boards
  getBoards: (token: string) => request<Board[]>('/api/boards', { token }),

  createBoard: (token: string, name: string, workspaceId?: string) =>
    request<Board>('/api/boards', {
      method: 'POST',
      token,
      body: JSON.stringify({ name, workspaceId }),
    }),

  getBoard: (id: string, token?: string | null) =>
    request<Board>('/api/boards/' + id, { token }),

  updateBoard: (token: string, id: string, data: Partial<Board>) =>
    request<Board>('/api/boards/' + id, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),

  duplicateBoard: (token: string, id: string) =>
    request<Board>('/api/boards/' + id + '/duplicate', { method: 'POST', token }),

  pinBoard: (token: string, id: string) =>
    request<{ pinned: boolean }>('/api/boards/' + id + '/pin', { method: 'POST', token }),

  archiveBoard: (token: string, id: string) =>
    request<Board>('/api/boards/' + id + '/archive', { method: 'POST', token }),

  deleteBoard: (token: string, id: string) =>
    request<void>('/api/boards/' + id, { method: 'DELETE', token }),

  saveCanvas: (token: string, id: string, canvasData: Record<string, unknown>) =>
    request<{ updatedAt: string }>('/api/boards/' + id + '/canvas', {
      method: 'PUT',
      token,
      body: JSON.stringify({ canvasData }),
    }),

  // Tasks
  getMyTasks: (token: string) => request<Task[]>('/api/tasks/my', { token }),

  updateTask: (token: string, taskId: string, data: Partial<Task>) =>
    request<Task>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),

  // Notifications
  getNotifications: (token: string) =>
    request<Notification[]>('/api/notifications', { token }),

  getUnreadCount: (token: string) =>
    request<{ count: number }>('/api/notifications/unread-count', { token }),

  markNotificationRead: (token: string, id: string) =>
    request<Notification>(`/api/notifications/${id}/read`, { method: 'PATCH', token }),

  markAllNotificationsRead: (token: string) =>
    request<void>('/api/notifications/read-all', { method: 'POST', token }),
};
