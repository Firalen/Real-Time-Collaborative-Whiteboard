import { useState } from 'react';
import { api } from '../../utils/api';

interface AiPanelProps {
  workspaceId?: string;
  boardId: string;
  token: string | null;
  onMindMap: (nodes: unknown) => void;
  onImageUrl: (url: string) => void;
}

export default function AiPanel({ workspaceId, boardId, token, onMindMap, onImageUrl }: AiPanelProps) {
  const [topic, setTopic] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!workspaceId || !token) return null;

  const runMindMap = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await api.aiMindMap(token, workspaceId, { topic, boardId });
      onMindMap(result.nodes);
      setMessage('Mind map generated!');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'AI failed');
    } finally {
      setLoading(false);
    }
  };

  const runImage = async () => {
    if (!imagePrompt.trim()) return;
    setLoading(true);
    try {
      const result = await api.aiImage(token, workspaceId, { prompt: imagePrompt, boardId });
      onImageUrl(result.url);
      setMessage('Image generated!');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Image gen failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-panel">
      <h3>AI Tools</h3>
      <div className="panel-form">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Mind map topic..."
        />
        <button type="button" disabled={loading} onClick={runMindMap}>Generate mind map</button>
      </div>
      <div className="panel-form">
        <input
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          placeholder="Image prompt..."
        />
        <button type="button" disabled={loading} onClick={runImage}>Generate image</button>
      </div>
      {message && <p className="task-meta">{message}</p>}
    </div>
  );
}
