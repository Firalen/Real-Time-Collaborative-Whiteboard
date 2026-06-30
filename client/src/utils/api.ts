import type { User, Board } from '../types';
import type { Workspace, WorkspaceMember, BoardTemplate, Notification, Task, ActivityItem } from '../types/saas';

const API_URL = import.meta.env.VITE_API_URL || '';

if (import.meta.env.PROD && !API_URL) {
  console.error('VITE_API_URL is not set — API calls will fail. Add it in Vercel env vars and redeploy.');
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  if (!API_URL) {
    throw new Error(
      'API URL not configured. Set VITE_API_URL to your Render backend URL in Vercel and redeploy.',
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new Error(
      `Cannot reach the server at ${API_URL}. Check that Render is running and VITE_API_URL is correct.`,
    );
  }

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

  // Comments
  getComments: (token: string, boardId: string) =>
    request<import('../types/saas').Comment[]>(`/api/boards/${boardId}/comments`, { token }),

  postComment: (
    token: string,
    boardId: string,
    data: { content: string; elementId?: string; parentId?: string; mentionIds?: string[] },
  ) =>
    request<import('../types/saas').Comment>(`/api/boards/${boardId}/comments`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  resolveComment: (token: string, boardId: string, commentId: string) =>
    request<{ resolved: boolean }>(`/api/boards/${boardId}/comments/${commentId}/resolve`, {
      method: 'POST',
      token,
    }),

  addReaction: (token: string, boardId: string, elementId: string, emoji: string) =>
    request<unknown>(`/api/boards/${boardId}/comments/reactions`, {
      method: 'POST',
      token,
      body: JSON.stringify({ elementId, emoji }),
    }),

  getReactions: (token: string, boardId: string) =>
    request<unknown[]>(`/api/boards/${boardId}/comments/reactions`, { token }),

  // Chat
  getChat: (token: string, boardId: string) =>
    request<import('../types/saas').ChatMessage[]>(`/api/boards/${boardId}/chat`, { token }),

  sendChat: (token: string, boardId: string, content: string) =>
    request<import('../types/saas').ChatMessage>(`/api/boards/${boardId}/chat`, {
      method: 'POST',
      token,
      body: JSON.stringify({ content }),
    }),

  // Board tasks
  getBoardTasks: (token: string, boardId: string) =>
    request<Task[]>(`/api/tasks/board/${boardId}`, { token }),

  createTask: (
    token: string,
    boardId: string,
    data: Partial<Task> & { title: string; workspaceId?: string; elementId?: string },
  ) =>
    request<Task>(`/api/tasks/board/${boardId}`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  // Board sharing & history
  verifyBoardPassword: (boardId: string, password: string) =>
    request<{ ok: boolean; canvasData?: Record<string, unknown> }>(
      `/api/boards/${boardId}/verify-password`,
      { method: 'POST', body: JSON.stringify({ password }) },
    ),

  updateBoardSharing: (
    token: string,
    boardId: string,
    data: { visibility?: string; allowGuestView?: boolean; allowExport?: boolean; password?: string },
  ) =>
    request<Board>(`/api/boards/${boardId}/sharing`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),

  watchBoard: (token: string, boardId: string) =>
    request<{ watching: boolean }>(`/api/boards/${boardId}/watch`, { method: 'POST', token }),

  getBoardActivity: (token: string, boardId: string) =>
    request<ActivityItem[]>(`/api/boards/${boardId}/activity`, { token }),

  getBoardVersions: (token: string, boardId: string) =>
    request<import('../types/saas').BoardVersion[]>(`/api/boards/${boardId}/versions`, { token }),

  restoreBoardVersion: (token: string, boardId: string, versionId: string) =>
    request<{ updatedAt: string; canvasData: Record<string, unknown> }>(
      `/api/boards/${boardId}/versions/${versionId}/restore`,
      { method: 'POST', token },
    ),

  // Integrations
  getIntegrations: (token: string, workspaceId: string) =>
    request<{ type: string; enabled: boolean }[]>(
      `/api/workspaces/${workspaceId}/integrations`,
      { token },
    ),

  saveSlackIntegration: (token: string, workspaceId: string, webhookUrl: string) =>
    request<{ type: string }>(`/api/workspaces/${workspaceId}/integrations/slack`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ webhookUrl }),
    }),

  enableGoogleCalendar: (token: string, workspaceId: string) =>
    request<{ type: string }>(`/api/workspaces/${workspaceId}/integrations/google-calendar`, {
      method: 'PUT',
      token,
      body: JSON.stringify({}),
    }),

  getPlans: () => request<import('../types/enterprise').Plan[]>('/api/billing/plans'),
  getSubscription: (token: string, workspaceId: string) =>
    request<import('../types/enterprise').Subscription>(`/api/billing/workspace/${workspaceId}`, { token }),
  createCheckout: (token: string, workspaceId: string, planSlug: string, billingCycle = 'monthly') =>
    request<{ url: string }>(`/api/billing/workspace/${workspaceId}/checkout`, {
      method: 'POST',
      token,
      body: JSON.stringify({ planSlug, billingCycle }),
    }),
  aiMindMap: (token: string, workspaceId: string, data: { topic: string; boardId: string }) =>
    request<{ nodes: unknown }>(`/api/workspaces/${workspaceId}/ai/mind-map`, {
      method: 'POST', token, body: JSON.stringify(data),
    }),
  aiImage: (token: string, workspaceId: string, data: { prompt: string; boardId: string }) =>
    request<{ url: string }>(`/api/workspaces/${workspaceId}/ai/image`, {
      method: 'POST', token, body: JSON.stringify(data),
    }),
  getLayers: (token: string, boardId: string) =>
    request<import('../types/enterprise').BoardLayer[]>(`/api/boards/${boardId}/layers`, { token }),
  createLayer: (token: string, boardId: string, name: string) =>
    request<import('../types/enterprise').BoardLayer>(`/api/boards/${boardId}/layers`, {
      method: 'POST', token, body: JSON.stringify({ name }),
    }),
  updateLayer: (token: string, boardId: string, layerId: string, data: Partial<import('../types/enterprise').BoardLayer>) =>
    request<import('../types/enterprise').BoardLayer>(`/api/boards/${boardId}/layers/${layerId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ name: data.name, visible: data.visible, locked: data.locked, sortOrder: data.sortOrder }),
    }),
  uploadAsset: async (token: string, workspaceId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const API_URL = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/assets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json() as Promise<{ url: string }>;
  },

  getGallery: (params?: { category?: string; featured?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.featured) q.set('featured', 'true');
    const qs = q.toString();
    return request<import('../types/enterprise').GalleryBoard[]>(`/api/gallery${qs ? `?${qs}` : ''}`);
  },

  likeGalleryBoard: (token: string, boardId: string) =>
    request<{ liked: boolean }>(`/api/gallery/${boardId}/like`, { method: 'POST', token }),

  getBillingUsage: (token: string, workspaceId: string) =>
    request<{ boards: { used: number; limit: number }; ai_requests_monthly: { used: number; limit: number } }>(
      `/api/billing/workspace/${workspaceId}/usage`,
      { token },
    ),

  checkAdmin: (token: string) =>
    request<{ isAdmin: boolean }>('/api/admin/check', { token }),

  getAdminMetrics: (token: string) =>
    request<import('../types/enterprise').AdminMetrics>('/api/admin/metrics', { token }),

  getAdminWorkspaces: (token: string) =>
    request<import('../types/enterprise').AdminWorkspace[]>('/api/admin/workspaces', { token }),
};
