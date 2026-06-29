import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import type { Comment, ChatMessage, Task, ActivityItem, BoardVersion, WorkspaceMember } from '../types/saas';

export function useBoardCollaboration(
  boardId: string,
  token: string | null,
  workspaceId?: string,
) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [versions, setVersions] = useState<BoardVersion[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [c, t, a, v] = await Promise.all([
      api.getComments(token, boardId),
      api.getBoardTasks(token, boardId),
      api.getBoardActivity(token, boardId),
      api.getBoardVersions(token, boardId),
    ]);
    setComments(c);
    setTasks(t);
    setActivity(a);
    setVersions(v);

    if (workspaceId) {
      const m = await api.getWorkspaceMembers(token, workspaceId);
      setMembers(m);
    }

    try {
      const chat = await api.getChat(token, boardId);
      setChatMessages(chat);
    } catch {
      // chat requires auth
    }
  }, [token, boardId, workspaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addComment = async (content: string, mentionIds: string[] = []) => {
    if (!token) return;
    const comment = await api.postComment(token, boardId, {
      content,
      elementId: selectedElementId || undefined,
      mentionIds,
    });
    setComments((prev) => [...prev, comment]);
    return comment;
  };

  const resolveComment = async (commentId: string) => {
    if (!token) return;
    const { resolved } = await api.resolveComment(token, boardId, commentId);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, resolved } : c)),
    );
  };

  const sendChat = async (content: string, emitSocket?: (c: string) => void) => {
    if (!token) return;
    if (emitSocket) {
      emitSocket(content);
      return;
    }
    const msg = await api.sendChat(token, boardId, content);
    setChatMessages((prev) => [...prev, msg]);
  };

  const onRemoteComment = (comment: Comment) => {
    setComments((prev) => {
      if (prev.some((c) => c.id === comment.id)) return prev;
      return [...prev, comment];
    });
  };

  const onRemoteChat = (message: ChatMessage) => {
    setChatMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  };

  const createTask = async (data: {
    title: string;
    elementId?: string;
    assignedTo?: string;
    dueDate?: string;
    priority?: Task['priority'];
  }) => {
    if (!token) return;
    const task = await api.createTask(token, boardId, {
      ...data,
      workspaceId,
    });
    setTasks((prev) => [...prev, task]);
    return task;
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    if (!token) return;
    const updated = await api.updateTask(token, taskId, { status });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    return updated;
  };

  const restoreVersion = async (versionId: string) => {
    if (!token) return;
    return api.restoreBoardVersion(token, boardId, versionId);
  };

  const updateSharing = async (data: Parameters<typeof api.updateBoardSharing>[2]) => {
    if (!token) return;
    return api.updateBoardSharing(token, boardId, data);
  };

  const parseMentions = (text: string): string[] => {
    const ids: string[] = [];
    members.forEach((m) => {
      if (text.includes(`@${m.name}`)) ids.push(m.id);
    });
    return ids;
  };

  return {
    comments,
    chatMessages,
    tasks,
    activity,
    versions,
    members,
    selectedElementId,
    setSelectedElementId,
    addComment,
    resolveComment,
    sendChat,
    onRemoteComment,
    onRemoteChat,
    createTask,
    updateTaskStatus,
    restoreVersion,
    updateSharing,
    parseMentions,
    refresh,
  };
}
