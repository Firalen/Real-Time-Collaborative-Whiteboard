import { useEffect, useRef } from 'react';
import type { RemotePeer } from '../../hooks/useWebRTC';

interface MeetingPanelProps {
  inCall: boolean;
  localStream: MediaStream | null;
  remotePeers: RemotePeer[];
  muted: boolean;
  videoOff: boolean;
  error: string | null;
  onlineCount: number;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  viewOnly?: boolean;
}

function VideoTile({
  stream,
  label,
  muted: audioMuted,
  mirror,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirror?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="meeting-tile">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={audioMuted}
        className={mirror ? 'mirror' : ''}
      />
      <span className="meeting-tile-label">{label}</span>
    </div>
  );
}

export default function MeetingPanel(props: MeetingPanelProps) {
  if (props.viewOnly) {
    return (
      <div className="panel-content">
        <p className="task-meta">Sign in to join video calls</p>
      </div>
    );
  }

  return (
    <div className="panel-content meeting-panel">
      <h3>Video meeting</h3>
      <p className="task-meta">{props.onlineCount} online on this board</p>

      {props.error && <p className="meeting-error">{props.error}</p>}

      {!props.inCall ? (
        <button type="button" className="panel-btn meeting-join-btn" onClick={props.onJoin}>
          📹 Join call
        </button>
      ) : (
        <>
          <div className="meeting-grid">
            <VideoTile stream={props.localStream} label="You" muted mirror />
            {props.remotePeers.map((p) => (
              <VideoTile key={p.userId} stream={p.stream} label={p.name} />
            ))}
          </div>
          <div className="meeting-controls">
            <button type="button" className={`panel-btn sm ${props.muted ? 'active' : ''}`} onClick={props.onToggleMute}>
              {props.muted ? '🔇 Unmute' : '🎤 Mute'}
            </button>
            <button type="button" className={`panel-btn sm ${props.videoOff ? 'active' : ''}`} onClick={props.onToggleVideo}>
              {props.videoOff ? '📷 Video on' : '📷 Video off'}
            </button>
            <button type="button" className="panel-btn sm meeting-leave-btn" onClick={props.onLeave}>
              Leave
            </button>
          </div>
        </>
      )}
    </div>
  );
}
