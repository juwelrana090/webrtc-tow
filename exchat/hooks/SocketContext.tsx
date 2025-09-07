import { API_URL } from '@/config';
import React, { createContext, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
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
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  // ==================== Init ====================
  useEffect(() => {
    const init = async () => {
      await requestPermissions();

      const currentStream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
        },
      });

      setStream(currentStream);
      setLocalStream(currentStream);

      createPeerConnection(currentStream);
    };

    init();

    // Socket listeners
    socket.on('me', (id: string) => {
      console.log('📱 My socket ID:', id);
      setMe(id);
    });

    socket.on('userList', (list: any) => {
      console.log('👥 Users list updated:', list);
      setUsers(list);
    });

    socket.on('callUser', async ({ from, name, signal }: any) => {
      console.log('📞 Incoming call from:', name);
      setCall({ isReceivingCall: true, from, name, signal });
    });

    socket.on('callAccepted', async (signal: any) => {
      console.log('✅ Call accepted');
      if (pc.current && signal) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(signal));
        setCallAccepted(true);

        // Process queued ICE candidates
        iceCandidatesQueue.current.forEach(async (candidate) => {
          await pc.current?.addIceCandidate(candidate);
        });
        iceCandidatesQueue.current = [];
      }
    });

    socket.on('iceCandidate', async ({ candidate }: any) => {
      console.log('🧊 ICE candidate received');
      if (pc.current && pc.current.remoteDescription) {
        await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue ICE candidates if remote description not set yet
        iceCandidatesQueue.current.push(new RTCIceCandidate(candidate));
      }
    });

    socket.on('leaveCall', () => {
      console.log('❌ Call ended by peer');
      endCallCleanup();
    });

    socket.on('callEnded', () => {
      console.log('📞 Call ended');
      endCallCleanup();
    });

    return () => {
      pc.current?.close();
      socket.off('me');
      socket.off('userList');
      socket.off('callUser');
      socket.off('callAccepted');
      socket.off('iceCandidate');
      socket.off('leaveCall');
      socket.off('callEnded');
    };
  }, []);

  const createPeerConnection = (mediaStream?: MediaStream) => {
    pc.current = new RTCPeerConnection(configuration);

    // Add local stream tracks to peer connection
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        pc.current?.addTrack(track, mediaStream);
      });
    }

    // Handle ICE candidates
    //@ts-ignore
    pc.current.onicecandidate = (event) => {
      console.log('🧊 ICE candidate generated');
      if (event.candidate) {
        const targetId = call?.from || idToCall;
        if (targetId) {
          socket.emit('iceCandidate', {
            candidate: event.candidate,
            to: targetId,
          });
        }
      }
    };

    // Handle remote stream
    //@ts-ignore
    pc.current.ontrack = (event) => {
      console.log('📺 Remote stream received');
      setRemoteStream(event.streams[0]);
    };

    // Connection state monitoring
    //@ts-ignore
    pc.current.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', pc.current?.connectionState);
    };

    //@ts-ignore
    pc.current.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', pc.current?.iceConnectionState);
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
    console.log('📞 Answering call...');
    if (!call || !pc.current) return;

    try {
      // Set remote description (offer)
      await pc.current.setRemoteDescription(new RTCSessionDescription(call.signal));

      // Create answer
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      // Send answer back
      socket.emit('answerCall', { signal: answer, to: call.from });
      setCallAccepted(true);

      // Process queued ICE candidates
      iceCandidatesQueue.current.forEach(async (candidate) => {
        await pc.current?.addIceCandidate(candidate);
      });
      iceCandidatesQueue.current = [];
    } catch (error) {
      console.error('❌ Error answering call:', error);
    }
  };

  const nextChat = (name: string, userId: string) => {
    console.log('👤 Registering user:', name, userId);
    socket.emit('registerUser', { name, userId });
  };

  const callUser = async (userId: string) => {
    console.log('📞 Calling user:', userId);
    if (!pc.current) return;

    try {
      setIdToCall(userId);

      // Create offer
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      // Send offer
      socket.emit('callUser', {
        userToCall: userId,
        signalData: offer,
        from: me,
        name,
      });
    } catch (error) {
      console.error('❌ Error calling user:', error);
    }
  };

  const leaveCall = (userId: string) => {
    console.log('👋 Leaving call with:', userId);
    socket.emit('leaveCall', { to: userId });
    endCallCleanup();
  };

  const endCallCleanup = () => {
    console.log('🧹 Cleaning up call...');
    setCall(null);
    setCallEnded(true);
    setCallAccepted(false);
    setIdToCall('');

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    pc.current?.close();

    // Recreate peer connection with current stream
    if (stream) {
      createPeerConnection(stream);
    }
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
