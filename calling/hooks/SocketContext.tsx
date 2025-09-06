import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';
import React, { createContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { io, Socket } from 'socket.io-client';

// <-- API Configuration
import { API_URL } from '@/config';

// ==================== Types ====================
interface CallInfo {
  isReceivingCall: boolean;
  from: string;
  name: string;
  signal: any; // Simplified for now
}

// Simplified MediaStream interface for Expo
interface SimpleMediaStream {
  id: string;
  active: boolean;
  getVideoTracks: () => any[];
  getAudioTracks: () => any[];
}

interface ISocketContext {
  call: CallInfo | null;
  callAccepted: boolean;
  localStream: SimpleMediaStream | null;
  remoteStream: SimpleMediaStream | null;
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
  toggleCamera: () => void;
  // Camera permissions
  hasCameraPermission: boolean;
  hasAudioPermission: boolean;
}

// ==================== Context ====================
const SocketContext = createContext<ISocketContext | null>(null);

// ==================== Socket ====================
const socket: Socket = io(API_URL, {
  transports: ['websocket'],
});

// ==================== Provider ====================
const ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<SimpleMediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<SimpleMediaStream | null>(null);
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
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);

  const connectionRef = useRef<any>(null); // Simplified peer reference

  // Request permissions
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // Request camera permissions
        const cameraStatus = await Camera.requestCameraPermissionsAsync();
        setHasCameraPermission(cameraStatus.status === 'granted');

        // Request audio permissions
        const audioStatus = await Audio.requestPermissionsAsync();
        setHasAudioPermission(audioStatus.status === 'granted');

        if (cameraStatus.status !== 'granted' || audioStatus.status !== 'granted') {
          Alert.alert(
            'Permissions required',
            'Camera and microphone permissions are required for video calls'
          );
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    };

    requestPermissions();
  }, []);

  // Attach socket listeners immediately
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to socket:', socket.id);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Simulate media stream creation (for Expo compatibility)
  useEffect(() => {
    if (hasCameraPermission && hasAudioPermission) {
      const createSimulatedStream = () => {
        const simulatedStream: SimpleMediaStream = {
          id: 'local-stream-' + Math.random(),
          active: true,
          getVideoTracks: () => [{ enabled: isVideo, id: 'video-track' }],
          getAudioTracks: () => [{ enabled: isAudio, id: 'audio-track' }],
        };
        setLocalStream(simulatedStream);
      };

      createSimulatedStream();
    }
  }, [hasCameraPermission, hasAudioPermission, isVideo, isAudio, isFrontCamera]);

  // Socket event listeners
  useEffect(() => {
    socket.on('me', (id: string) => {
      setMe(id);
      console.log('My socket ID:', id);
    });

    socket.on('userList', (users: { name: string; userId: string }[]) => {
      setUsers(users);
      console.log('User list updated:', users);
    });

    socket.on('callUser', ({ from, name, signal }) => {
      setCall({
        isReceivingCall: true,
        from,
        name,
        signal,
      });
    });

    socket.on('leaveCall', () => {
      setCall(null);
      setCallEnded(true);
      setCallAccepted(false);
      setRemoteStream(null);
      connectionRef.current = null;
    });

    socket.on('callAccepted', (signal: any) => {
      setCallAccepted(true);
      console.log('Call accepted with signal:', signal);
      // In a real WebRTC implementation, you would handle the signaling here
    });

    return () => {
      socket.off('me');
      socket.off('userList');
      socket.off('callUser');
      socket.off('leaveCall');
      socket.off('callAccepted');
    };
  }, []);

  // ==================== Call Actions ====================
  const answerCall = () => {
    if (!call || !localStream) {
      console.log('Cannot answer call: missing call info or local stream');
      return;
    }

    console.log('Answering call from:', call.name);

    // Simulate answering call
    socket.emit('answerCall', { signal: { type: 'answer' }, to: call.from });
    setCallAccepted(true);

    // Simulate remote stream
    const simulatedRemoteStream: SimpleMediaStream = {
      id: 'remote-stream-' + Math.random(),
      active: true,
      getVideoTracks: () => [{ enabled: true, id: 'remote-video-track' }],
      getAudioTracks: () => [{ enabled: true, id: 'remote-audio-track' }],
    };
    setRemoteStream(simulatedRemoteStream);
  };

  const nextChat = (name: string, userId: string) => {
    console.log('Registering user:', name, userId);
    socket.emit('registerUser', { name, userId });
  };

  const callUser = (userId: string) => {
    if (!localStream) {
      console.log('Cannot call user: no local stream');
      return;
    }

    console.log('Calling user:', userId);

    socket.emit('callUser', {
      userToCall: userId,
      signalData: { type: 'offer' }, // Simplified signal
      from: socket.id || me,
      name,
    });
  };

  const leaveCall = (userId: string) => {
    console.log('Leaving call with:', userId);

    setCallEnded(true);
    setCall(null);
    setCallAccepted(false);
    setRemoteStream(null);

    socket.emit('leaveCall', { to: userId });
    connectionRef.current = null;
  };

  // ==================== Media Toggles ====================
  const toggleVideo = () => {
    setIsVideo(!isVideo);
    console.log('Video toggled:', !isVideo);
  };

  const toggleAudio = () => {
    setIsAudio(!isAudio);
    console.log('Audio toggled:', !isAudio);
  };

  const toggleCamera = async () => {
    setIsFrontCamera(!isFrontCamera);
    console.log('Camera switched to:', !isFrontCamera ? 'front' : 'back');
  };

  return (
    <SocketContext.Provider
      value={{
        call,
        callAccepted,
        localStream,
        remoteStream,
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
        toggleCamera,
        hasCameraPermission,
        hasAudioPermission,
      }}>
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
