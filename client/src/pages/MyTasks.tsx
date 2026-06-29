import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AppLayout from '../components/AppLayout';
import type { Task } from '../types/saas';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
};

export default function MyTasks() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.getMyTasks(token)
      .then(setTasks)
      .finally(() => setLoading(false));
  }, [token]);

  const handleStatusChange = async (taskId: string, status: string) => {
    if (!token) return;
    const updated = await api.updateTask(token, taskId, { status: status as Task['status'] });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6">My Tasks</h1>

        {loading && <p className="text-gray-500">Loading tasks...</p>}

        {!loading && tasks.length === 0 && (
          <p className="text-gray-500 text-center py-16">No tasks assigned to you yet.</p>
        )}

        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-[#1a1d27] border border-[#2e3348]"
            >
              <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={(e) => handleStatusChange(task.id, e.target.checked ? 'done' : 'todo')}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${task.status === 'done' ? 'line-through text-gray-500' : ''}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {task.boardName && (
                    <Link to={`/board/${task.boardId}`} className="text-xs text-indigo-400 hover:text-indigo-300">
                      {task.emojiIcon} {task.boardName}
                    </Link>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-gray-500">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  <span className={`text-xs capitalize ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
