import React, { createContext, useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { mediaDevices, MediaStream, RTCSessionDescription } from 'react-native-webrtc';
import { io, Socket } from 'socket.io-client';

// <-- Peer handler
import { API_URL } from '@/config';
import { peerHandler, PeerInstance, SignalData } from './peerHandler';

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
}

// ==================== Context ====================
const SocketContext = createContext<ISocketContext | null>(null);

// ==================== Socket ====================
const socket: Socket = io(API_URL, {
  transports: ['websocket'],
});

// ==================== Provider ====================
const ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
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

  const connectionRef = useRef<PeerInstance | null>(null);

  // Request permissions on Android
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const grants = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);

          if (
            grants[PermissionsAndroid.PERMISSIONS.CAMERA] !== 'granted' ||
            grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== 'granted'
          ) {
            Alert.alert(
              'Permissions required',
              'Camera and microphone permissions are required for video calls'
            );
          }
        } catch (err) {
          console.warn(err);
        }
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

  // Get camera & mic stream
  useEffect(() => {
    const getMedia = async () => {
      try {
        const constraints = {
          audio: isAudio,
          video: isVideo
            ? {
                mandatory: {
                  minWidth: 500,
                  minHeight: 300,
                  minFrameRate: 30,
                },
                facingMode: isFrontCamera ? 'user' : 'environment',
                optional: [],
              }
            : false,
        };

        const stream = await mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    getMedia();
  }, [isVideo, isAudio, isFrontCamera]);

  // Socket event listeners
  useEffect(() => {
    if (users.length < 0) {
      socket.emit('getUsers');
      console.log('No users available');
    }

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

      // Stop remote stream
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        setRemoteStream(null);
      }

      // Destroy peer connection
      peerHandler.destroyPeer(connectionRef.current);
      connectionRef.current = null;
    });

    return () => {
      socket.off('me');
      socket.off('userList');
      socket.off('callUser');
      socket.off('leaveCall');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteStream]);

  // Handle signaling for active calls
  useEffect(() => {
    const handleCallAccepted = (signal: SignalData) => {
      setCallAccepted(true);
      if (connectionRef.current && signal.type === 'answer' && signal.sdp) {
        connectionRef.current
          .setRemoteDescription(
            new RTCSessionDescription({
              type: 'answer',
              sdp: signal.sdp,
            })
          )
          .catch((error) => {
            console.error('Error setting remote description:', error);
          });
      } else if (connectionRef.current && signal.candidate) {
        connectionRef.current.addIceCandidate(signal.candidate).catch((error) => {
          console.error('Error adding ICE candidate:', error);
        });
      }
    };

    socket.on('callAccepted', handleCallAccepted);

    return () => {
      socket.off('callAccepted');
    };
  }, []);

  // ==================== Call Actions ====================
  const answerCall = () => {
    if (!call || !localStream) return;

    const peer = peerHandler.createReceiverPeer(
      localStream,
      call.signal,
      (signalData: SignalData) => {
        socket.emit('answerCall', { signal: signalData, to: call.from });
      },
      (stream: MediaStream) => {
        setRemoteStream(stream);
      }
    );

    connectionRef.current = peer;
    setCallAccepted(true);
  };

  const nextChat = (name: string, userId: string) => {
    socket.emit('registerUser', { name, userId });
  };

  const callUser = (userId: string) => {
    if (!localStream) return;

    const peer = peerHandler.createInitiatorPeer(
      localStream,
      (signalData: SignalData) => {
        socket.emit('callUser', {
          userToCall: userId,
          signalData,
          from: socket.id || me,
          name,
        });
      },
      (stream: MediaStream) => {
        setRemoteStream(stream);
      }
    );

    connectionRef.current = peer;
  };

  const leaveCall = (userId: string) => {
    setCallEnded(true);
    setCall(null);
    setCallAccepted(false);
    socket.emit('leaveCall', { to: userId });

    // Stop remote stream
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    // Destroy peer connection
    peerHandler.destroyPeer(connectionRef.current);
    connectionRef.current = null;
  };

  // ==================== Media Toggles ====================
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideo(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudio(audioTrack.enabled);
      }
    }
  };

  const toggleCamera = async () => {
    if (localStream) {
      try {
        // Stop current video track
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStream.removeTrack(videoTrack);
        }

        // Get new video stream with opposite camera
        const newFacing = !isFrontCamera;
        const constraints = {
          audio: false,
          video: {
            mandatory: {
              minWidth: 500,
              minHeight: 300,
              minFrameRate: 30,
            },
            facingMode: newFacing ? 'user' : 'environment',
            optional: [],
          },
        };

        const newStream = await mediaDevices.getUserMedia(constraints);
        const newVideoTrack = newStream.getVideoTracks()[0];

        if (newVideoTrack) {
          localStream.addTrack(newVideoTrack);
          setIsFrontCamera(newFacing);

          // If in a call, replace the track in the peer connection
          if (connectionRef.current && callAccepted) {
            // Note: This might need adjustment based on your PeerInstance interface
            // You may need to implement track replacement in your peer wrapper
            console.log('Camera switched during call - track replacement needed');
          }
        }
      } catch (error) {
        console.error('Error switching camera:', error);
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
      }}>
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
