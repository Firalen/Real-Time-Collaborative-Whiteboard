export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  timezone: string;
  ownerId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
  joinedAt: string;
}

export interface BoardTemplate {
  id: string;
  name: string;
  emoji: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  payload: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  boardId: string;
  boardName?: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assigneeName?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  emojiIcon?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  userName?: string;
  avatarColor?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
