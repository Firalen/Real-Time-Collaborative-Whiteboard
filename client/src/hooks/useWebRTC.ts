import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

export interface RemotePeer {
  userId: string;
  name: string;
  stream: MediaStream;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function useWebRTC(
  socketRef: React.RefObject<Socket | null>,
  userId: string,
  _userName: string,
) {
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerNamesRef = useRef<Map<string, string>>(new Map());

  const createPeerConnection = useCallback((remoteUserId: string, remoteName: string) => {
    if (peersRef.current.has(remoteUserId)) return peersRef.current.get(remoteUserId)!;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerNamesRef.current.set(remoteUserId, remoteName);

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = (event) => {
      setRemotePeers((prev) => {
        const filtered = prev.filter((p) => p.userId !== remoteUserId);
        return [...filtered, {
          userId: remoteUserId,
          name: peerNamesRef.current.get(remoteUserId) || remoteName,
          stream: event.streams[0],
        }];
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc-signal', {
          targetUserId: remoteUserId,
          type: 'ice',
          payload: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peersRef.current.delete(remoteUserId);
        setRemotePeers((prev) => prev.filter((p) => p.userId !== remoteUserId));
      }
    };

    peersRef.current.set(remoteUserId, pc);
    return pc;
  }, [socketRef]);

  const sendOffer = useCallback(async (remoteUserId: string, remoteName: string) => {
    const pc = createPeerConnection(remoteUserId, remoteName);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('webrtc-signal', {
      targetUserId: remoteUserId,
      type: 'offer',
      payload: offer,
    });
  }, [socketRef, createPeerConnection]);

  const handleSignal = useCallback(async (
    fromUserId: string,
    fromName: string,
    type: string,
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ) => {
    if (fromUserId === userId) return;

    if (type === 'offer') {
      const pc = createPeerConnection(fromUserId, fromName);
      await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('webrtc-signal', {
        targetUserId: fromUserId,
        type: 'answer',
        payload: answer,
      });
    } else if (type === 'answer') {
      const pc = peersRef.current.get(fromUserId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
    } else if (type === 'ice') {
      const pc = peersRef.current.get(fromUserId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload as RTCIceCandidateInit));
        } catch {
          // ignore stale candidates
        }
      }
    }
  }, [createPeerConnection, socketRef]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onExistingPeers = ({ peers }: { peers: { userId: string; name: string }[] }) => {
      peers.forEach((p) => sendOffer(p.userId, p.name));
    };

    const onPeerJoined = ({ userId: peerId, name }: { userId: string; name: string }) => {
      if (peerId !== userId && inCall) sendOffer(peerId, name);
    };

    const onPeerLeft = ({ userId: peerId }: { userId: string }) => {
      const pc = peersRef.current.get(peerId);
      pc?.close();
      peersRef.current.delete(peerId);
      setRemotePeers((prev) => prev.filter((p) => p.userId !== peerId));
    };

    const onSignal = ({
      fromUserId,
      fromName,
      type,
      payload,
    }: {
      fromUserId: string;
      fromName: string;
      type: string;
      payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
    }) => {
      if (inCall) handleSignal(fromUserId, fromName, type, payload);
    };

    socket.on('webrtc-existing-peers', onExistingPeers);
    socket.on('webrtc-peer-joined', onPeerJoined);
    socket.on('webrtc-peer-left', onPeerLeft);
    socket.on('webrtc-signal', onSignal);

    return () => {
      socket.off('webrtc-existing-peers', onExistingPeers);
      socket.off('webrtc-peer-joined', onPeerJoined);
      socket.off('webrtc-peer-left', onPeerLeft);
      socket.off('webrtc-signal', onSignal);
    };
  }, [socketRef, userId, inCall, sendOffer, handleSignal]);

  const joinCall = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setInCall(true);
      socketRef.current?.emit('webrtc-join');
    } catch {
      setError('Camera/microphone access denied');
    }
  };

  const leaveCall = () => {
    socketRef.current?.emit('webrtc-leave');
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemotePeers([]);
    setInCall(false);
  };

  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  };

  const toggleVideo = () => {
    const next = !videoOff;
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setVideoOff(next);
  };

  return {
    inCall,
    localStream,
    remotePeers,
    muted,
    videoOff,
    error,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
  };
}
