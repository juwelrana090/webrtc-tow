import { API_URL } from '@/config';
import React, { createContext, useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { mediaDevices, MediaStream } from 'react-native-webrtc';
import io from 'socket.io-client';
import { handleSignal, peerHandler, SignalData } from './peerHandler';

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
const socket = io(API_URL, {
  transports: ['websocket'],
});

const ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [call, setCall] = useState<CallInfo | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');
  const [isVideo, setIsVideo] = useState(true);
  const [isAudio, setIsAudio] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [users, setUsers] = useState<{ name: string; userId: string }[]>([]);
  const [idToCall, setIdToCall] = useState('');

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const connectionRef = useRef<any>(null);
  const [hasPermissions, setHasPermissions] = useState<boolean>(false);

  useEffect(() => {
    const requestPermissions = async (): Promise<boolean> => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);

          const permissionsGranted =
            granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;

          setHasPermissions(permissionsGranted);
          return permissionsGranted;
        } catch (error) {
          console.error('Permission error:', error);
          setHasPermissions(false);
          return false;
        }
      }
      setHasPermissions(true);
      return true;
    };

    const getMedia = async () => {
      if (!hasPermissions) {
        const permissionsGranted = await requestPermissions();
        if (!permissionsGranted) {
          Alert.alert(
            'Permissions required',
            'Camera and microphone permissions are required for video calls'
          );
          return;
        }
      }

      try {
        const currentStream = await mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            frameRate: 30,
            facingMode: isFrontCamera ? 'user' : 'environment',
          },
        });
        setStream(currentStream);
        setLocalStream(currentStream);
      } catch (error) {
        console.error('Error getting media:', error);
      }
    };

    getMedia();

    socket.on('me', (id: string) => {
      setMe(id);
      console.log('My socket ID:', id);
    });

    socket.on('userList', (users: { name: string; userId: string }[]) => {
      setUsers(users);
      console.log('User list updated:', users);
    });

    socket.on(
      'callUser',
      ({ from, name, signal }: { from: string; name: string; signal: SignalData }) => {
        setCall({
          isReceivingCall: true,
          from,
          name,
          signal,
        });
      }
    );

    socket.on('callAccepted', (signal: SignalData) => {
      if (connectionRef.current) {
        handleSignal(connectionRef.current, signal);
        setCallAccepted(true);
      }
    });

    socket.on('signal', (signal: SignalData) => {
      if (connectionRef.current) {
        handleSignal(connectionRef.current, signal);
      }
    });

    socket.on('leaveCall', () => {
      setCall(null);
      setCallEnded(true);
      setCallAccepted(false);

      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        setRemoteStream(null);
      }

      peerHandler.destroyPeer(connectionRef.current);
      connectionRef.current = null;
    });

    return () => {
      socket.off('me');
      socket.off('userList');
      socket.off('callUser');
      socket.off('callAccepted');
      socket.off('signal');
      socket.off('leaveCall');
    };
  }, [hasPermissions, isFrontCamera]);

  // ==================== Call Actions ====================
  const answerCall = () => {
    if (!call || !stream) return;

    const peer = peerHandler.createReceiverPeer(
      stream,
      call.signal,
      (signalData) => {
        socket.emit('answerCall', { signal: signalData, to: call.from });
      },
      (remoteStreamObj) => {
        setRemoteStream(remoteStreamObj);
      }
    );

    connectionRef.current = peer;

    // Handle the initial offer signal
    if (call.signal) {
      handleSignal(peer, call.signal);
    }

    setCallAccepted(true);
  };

  const nextChat = (name: string, userId: string) => {
    socket.emit('registerUser', { name, userId });
  };

  const callUser = (userId: string) => {
    if (!stream) return;

    const peer = peerHandler.createInitiatorPeer(
      stream,
      (signalData) => {
        socket.emit('callUser', {
          userToCall: userId,
          signalData,
          from: me,
          name,
        });
      },
      (remoteStreamObj) => {
        setRemoteStream(remoteStreamObj);
      }
    );

    connectionRef.current = peer;
  };

  const leaveCall = (userId: string) => {
    setCallEnded(true);
    setCall(null);
    setCallAccepted(false);

    socket.emit('leaveCall', { to: userId });

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    peerHandler.destroyPeer(connectionRef.current);
    connectionRef.current = null;
  };

  // ==================== Media Toggles ====================
  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideo(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudio(audioTrack.enabled);
      }
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
        me: socket.id || me,
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
