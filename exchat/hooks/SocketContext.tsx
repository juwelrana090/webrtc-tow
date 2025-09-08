import { API_URL } from '@/config';
import React, { createContext, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { mediaDevices, MediaStream } from 'react-native-webrtc';
import io from 'socket.io-client';
import { PeerConnection, peerHandler, SignalData } from './peerHandler';

// ==================== Types ====================
interface CallInfo {
  isReceivingCall: boolean;
  from: string;
  name: string;
  signal: SignalData;
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
  users: { name: string; userId: string }[];
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
}

// ==================== Context ====================
const SocketContext = createContext<ISocketContext | null>(null);

// ==================== Socket ====================
const socket = io(API_URL, { transports: ['websocket'] });

const ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [me, setMe] = useState<string | null>(null);
  const [users, setUsers] = useState<{ name: string; userId: string }[]>([]);
  const [call, setCall] = useState<CallInfo | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');
  const [idToCall, setIdToCall] = useState('');

  const [isVideo, setIsVideo] = useState(true);
  const [isAudio, setIsAudio] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const peerRef = useRef<PeerConnection | null>(null);
  const isCalling = useRef(false);
  const isAnswering = useRef(false);

  // ==================== Init ====================
  useEffect(() => {
    const init = async () => {
      await requestPermissions();
      await getMediaStream();
    };

    init();

    // Socket event listeners
    socket.on('me', (id: string) => {
      console.log('👤 Me:', id);
      setMe(id);
    });

    socket.on('userList', (users: { name: string; userId: string }[]) => setUsers(users));

    socket.on('callUser', async (data: { from: string; name: string; signal: SignalData }) => {
      console.log('📞 Incoming call from:', data.from);
      setCall({
        isReceivingCall: true,
        from: data.from,
        name: data.name,
        signal: data.signal,
      });
    });

    socket.on('callAccepted', async (data: { signal: SignalData }) => {
      if (!peerRef.current || !isCalling.current) return;

      try {
        console.log('✅ Call accepted, processing answer signal');
        await peerHandler.handleRemoteSignal(peerRef.current, data.signal);
        setCallAccepted(true);
        isCalling.current = false;
      } catch (error) {
        console.error('❌ Error handling call accepted signal:', error);
        isCalling.current = false;
      }
    });

    socket.on('signal', async (data: { signal: SignalData }) => {
      if (!peerRef.current) return;

      try {
        console.log(`📡 Received signal: ${data.signal.type}`);
        await peerHandler.handleRemoteSignal(peerRef.current, data.signal);
      } catch (err) {
        console.error('❌ Error handling signal:', err);
      }
    });

    socket.on('leaveCall', () => {
      console.log('🚪 Remote user left the call');
      endCallCleanup();
    });

    return () => {
      cleanupPeer();
      socket.off('me');
      socket.off('userList');
      socket.off('callUser');
      socket.off('callAccepted');
      socket.off('signal');
      socket.off('leaveCall');
    };
  }, []);

  // ==================== Media Stream ====================
  const getMediaStream = async () => {
    try {
      const currentStream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
        },
      });

      setStream(currentStream);
      setLocalStream(currentStream);
      return currentStream;
    } catch (error) {
      console.error('❌ Error getting media stream:', error);
      throw error;
    }
  };

  // ==================== Permissions ====================
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        if (
          grants['android.permission.CAMERA'] !== PermissionsAndroid.RESULTS.GRANTED ||
          grants['android.permission.RECORD_AUDIO'] !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.error('❌ Required permissions not granted');
          return false;
        }
        return true;
      } catch (error) {
        console.error('❌ Error requesting permissions:', error);
        return false;
      }
    }
    return true;
  };

  // ==================== Peer Management ====================
  const cleanupPeer = () => {
    if (peerRef.current) {
      peerHandler.destroyPeer(peerRef.current);
      peerRef.current = null;
    }
  };

  const handleSignalData = (signalData: SignalData) => {
    console.log(`📤 Sending signal: ${signalData.type}`);
    socket.emit('signal', { signal: signalData });
  };

  const handleRemoteStream = (stream: MediaStream) => {
    console.log('🎥 Received remote stream with ID:', stream.id);
    setRemoteStream(stream);
  };

  // ==================== Actions ====================
  const answerCall = async () => {
    if (!call || !stream || isAnswering.current) return;

    isAnswering.current = true;

    try {
      console.log('📞 Answering call from:', call.from);

      cleanupPeer();

      peerRef.current = await peerHandler.createReceiverPeer(
        stream,
        call.signal,
        (signalData) => {
          if (signalData.type === 'answer') {
            socket.emit('answerCall', { signal: signalData, to: call.from });
          } else {
            handleSignalData(signalData);
          }
        },
        handleRemoteStream
      );

      setCallAccepted(true);
      setCall(null);
      isAnswering.current = false;
    } catch (error) {
      console.error('❌ Error answering call:', error);
      isAnswering.current = false;
    }
  };

  const nextChat = (name: string, userId: string) => {
    socket.emit('registerUser', { name, userId });
  };

  const callUser = async (userId: string) => {
    if (!stream || isCalling.current) return;

    isCalling.current = true;

    try {
      console.log('📞 Calling user:', userId);

      cleanupPeer();

      peerRef.current = peerHandler.createInitiatorPeer(
        stream,
        (signalData) => {
          if (signalData.type === 'offer') {
            // ✅ FIXED: Use "signal", not "signalData"
            socket.emit('callUser', {
              userToCall: userId,
              signal: signalData, // ✅ CORRECT KEY
              from: me,
              name,
            });
          } else {
            handleSignalData(signalData);
          }
        },
        handleRemoteStream
      );
    } catch (error) {
      console.error('❌ Error calling user:', error);
      isCalling.current = false;
    }
  };

  const leaveCall = (userId: string) => {
    socket.emit('leaveCall', { to: userId });
    endCallCleanup();
  };

  const endCallCleanup = () => {
    console.log('🧹 Cleaning up call');

    setCall(null);
    setCallEnded(true);
    setCallAccepted(false);
    isCalling.current = false;
    isAnswering.current = false;

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    cleanupPeer();
  };

  const toggleVideo = () => {
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideo(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudio(audioTrack.enabled);
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
        me: socket.id,
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
      }}>
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
