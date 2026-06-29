export type Tool = 'pen' | 'rectangle' | 'circle' | 'line' | 'eraser' | 'text' | 'sticky' | 'select';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
}

export interface Board {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  canvasData?: Record<string, unknown>;
}

export interface CursorState {
  userId: string;
  name: string;
  avatarColor: string;
  x: number;
  y: number;
}

export interface DrawEvent {
  type: 'path' | 'object-added' | 'object-modified' | 'object-removed';
  object?: Record<string, unknown>;
  userId?: string;
}

export interface OnlineUser {
  userId: string;
  name: string;
  avatarColor: string;
}
