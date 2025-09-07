import { API_URL } from '@/config';
import React, { createContext, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  mediaDevices,
  MediaStream,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import io from 'socket.io-client';

// ==================== Types ====================
interface CallInfo {
  isReceivingCall: boolean;
  from: string;
  name: string;
  signal: any;
}

interface ISocketContext {
  call: CallInfo | null;
  callAccepted: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  stream: MediaStream | null;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  callEnded: boolean;
  me: string | null;
  users: { name: string; userId: string; socketId: string }[];
  idToCall: string;
  setIdToCall: React.Dispatch<React.SetStateAction<string>>;
  answerCall: () => void;
  nextChat: (name: string, userId: string) => void;
  callUser: (userId: string) => void;
  leaveCall: (userId: string) => void;
  isVideo: boolean;
  setIsVideo: React.Dispatch<React.SetStateAction<boolean>>;
  isAudio: boolean;
  setIsAudio: React.Dispatch<React.SetStateAction<boolean>>;
  toggleVideo: () => void;
  toggleAudio: () => void;
  isFrontCamera: boolean;
  setIsFrontCamera: React.Dispatch<React.SetStateAction<boolean>>;
  switchCamera: () => void;
}

// ==================== Context ====================
const SocketContext = createContext<ISocketContext | null>(null);

// ==================== Socket ====================
const socket = io(API_URL, { transports: ['websocket'] });

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:188.245.189.30:3478',
      username: 'turnserver',
      credential: 'dev',
    },
    {
      urls: 'turns:188.245.189.30:5349?transport=tcp',
      username: 'turnserver',
      credential: 'dev',
    },
  ],
};

const ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [me, setMe] = useState<string | null>(null);
  const [users, setUsers] = useState<{ name: string; userId: string; socketId: string }[]>([]);
  const [call, setCall] = useState<CallInfo | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');
  const [idToCall, setIdToCall] = useState('');

  const [isVideo, setIsVideo] = useState(true);
  const [isAudio, setIsAudio] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const pc = useRef<RTCPeerConnection | null>(null);

  // ==================== Init ====================
  useEffect(() => {
    const init = async () => {
      await requestPermissions();

      createPeerConnection();

      const currentStream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
        },
      });

      currentStream.getTracks().forEach((track) => {
        pc.current?.addTrack(track, currentStream);
      });

      setStream(currentStream);
      setLocalStream(currentStream);
    };

    init();

    // socket listeners
    socket.on('me', (id: string) => setMe(id));
    //@ts-ignore
    socket.on('userList', (list) => setUsers(list));

    //@ts-ignore
    socket.on('callUser', async ({ from, name, signal }) => {
      if (!pc.current) return;
      await pc.current.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.emit('answerCall', { signal: answer, to: from });
      setCall({ isReceivingCall: true, from, name, signal });
    });

    //@ts-ignore
    socket.on('callAccepted', async (signal) => {
      if (!pc.current) return;
      await pc.current.setRemoteDescription(new RTCSessionDescription(signal));
      setCallAccepted(true);
    });

    socket.on('leaveCall', () => {
      endCallCleanup();
    });

    socket.on('callEnded', () => {
      endCallCleanup();
    });

    return () => {
      pc.current?.close();
      socket.off('me');
      socket.off('userList');
      socket.off('callUser');
      socket.off('callAccepted');
      socket.off('leaveCall');
      socket.off('callEnded');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPeerConnection = () => {
    pc.current = new RTCPeerConnection(configuration);

    //@ts-ignore
    pc.current.onicecandidate = (event) => {
      if (event.candidate && call?.from) {
        socket.emit('signal', { candidate: event.candidate, to: call.from });
      }
    };

    //@ts-ignore
    pc.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
  };

  // ==================== Permissions ====================
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
    }
  };

  // ==================== Actions ====================
  const answerCall = async () => {
    if (!call || !pc.current) return;

    await pc.current.setRemoteDescription(new RTCSessionDescription(call.signal));
    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);

    socket.emit('answerCall', { signal: answer, to: call.from });
    setCallAccepted(true);
  };

  const nextChat = (name: string, userId: string) => {
    socket.emit('registerUser', { name, userId });
  };

  const callUser = async (userId: string) => {
    if (!pc.current) return;

    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);

    socket.emit('callUser', { userToCall: userId, signalData: offer, from: me, name });
  };

  const leaveCall = (userId: string) => {
    socket.emit('leaveCall', { to: userId });
    endCallCleanup();
  };

  const endCallCleanup = () => {
    setCall(null);
    setCallEnded(true);
    setCallAccepted(false);

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    pc.current?.close();
    createPeerConnection();
  };

  const toggleVideo = () => {
    const videoTrack = stream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideo(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    const audioTrack = stream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudio(audioTrack.enabled);
    }
  };

  const switchCamera = () => {
    const videoTrack: any = stream?.getVideoTracks()[0];
    if (videoTrack && typeof videoTrack._switchCamera === 'function') {
      videoTrack._switchCamera();
      setIsFrontCamera((prev) => !prev);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        call,
        callAccepted,
        localStream,
        remoteStream,
        stream,
        name,
        setName,
        callEnded,
        me,
        users,
        idToCall,
        setIdToCall,
        answerCall,
        nextChat,
        callUser,
        leaveCall,
        isVideo,
        setIsVideo,
        isAudio,
        setIsAudio,
        toggleVideo,
        toggleAudio,
        isFrontCamera,
        setIsFrontCamera,
        switchCamera,
      }}>
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
