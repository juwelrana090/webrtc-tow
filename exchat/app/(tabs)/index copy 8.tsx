import Button from '@/components/Button';
import GettingCall from '@/components/GettingCall';
import Video from '@/components/Video';
import { ContextProvider } from '@/hooks/SocketContext';
import Utils from '@/hooks/Utils';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, Text, View } from 'react-native';
import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import io from 'socket.io-client';

// Replace with your server URL
const SERVER_URL = 'https://rtcback.madrasah.dev'; // Change this to your backend URL
const ROOM_ID = 'default-room'; // You can make this dynamic

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'stun:188.245.189.30:3478',
        'turn:188.245.189.30:3478',
        'turn:188.245.189.30:3478?transport=tcp',
      ],
      username: 'turnserver',
      credential: 'dev',
    },
    {
      urls: [
        'stun:madrasah.dev:3478',
        'turn:madrasah.dev:3478?transport=udp',
        'turn:madrasah.dev:3478?transport=tcp',
        'turns:madrasah.dev:5349?transport=tcp',
      ],
      username: 'turnserver',
      credential: 'dev',
    },
    {
      urls: [
        'stun:turn.madrasah.dev:3478',
        'turn:turn.madrasah.dev:3478?transport=udp',
        'turn:turn.madrasah.dev:3478?transport=tcp',
        'turns:turn.madrasah.dev:5349?transport=tcp',
      ],
      username: 'turnserver',
      credential: 'dev',
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceTransportPolicy: 'all',
};

export default function Index() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [gettingCall, setGettingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [connectionState, setConnectionState] = useState('new');
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const [socketConnected, setSocketConnected] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<any>(null);
  const connecting = useRef(false);
  const userId = useRef(`user_${Math.random().toString(36).substr(2, 9)}`);
  const callerSocketId = useRef<string | null>(null);

  useEffect(() => {
    // Initialize socket connection
    initializeSocket();

    return () => {
      cleanupSocket();
    };
  }, []);

  const initializeSocket = () => {
    console.log('🔌 Connecting to Socket.IO server...');

    socket.current = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
    });

    // Socket connection events
    socket.current.on('connect', () => {
      console.log('✅ Connected to Socket.IO server:', socket.current.id);
      setSocketConnected(true);

      // Join the room
      socket.current.emit('join-room', {
        roomId: ROOM_ID,
        userId: userId.current,
      });
    });

    socket.current.on('disconnect', (reason: string) => {
      console.log('❌ Disconnected from Socket.IO server:', reason);
      setSocketConnected(false);
    });

    socket.current.on('connect_error', (error: any) => {
      console.error('🔌 Socket connection error:', error);
      setSocketConnected(false);
    });

    // Room events
    socket.current.on('room-joined', (data: any) => {
      console.log('🏠 Joined room:', data);
    });

    socket.current.on('user-joined', (data: any) => {
      console.log('👤 User joined room:', data);
    });

    socket.current.on('user-left', (data: any) => {
      console.log('👋 User left room:', data);
    });

    // Call events
    socket.current.on('incoming-call', async (data: any) => {
      console.log('📞 Incoming call from:', data.callerId);

      if (!connecting.current) {
        callerSocketId.current = data.callerSocketId;
        setGettingCall(true);

        // Setup WebRTC for receiving call
        const setupSuccess = await setupWebrtc();
        if (setupSuccess && pc.current) {
          try {
            // Set remote description with the offer
            await pc.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            console.log('📥 Remote description set with offer');
          } catch (error) {
            console.error('❌ Error setting remote description:', error);
          }
        }
      }
    });

    socket.current.on('call-answered', async (data: any) => {
      console.log('📞 Call answered by:', data.answererId);

      if (pc.current && !pc.current.remoteDescription) {
        try {
          await pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('✅ Remote description set with answer');
          setCallAccepted(true);
        } catch (error) {
          console.error('❌ Error setting remote description:', error);
        }
      }
    });

    socket.current.on('call-rejected', (data: any) => {
      console.log('❌ Call rejected by:', data.rejectedBy);
      Alert.alert('Call Rejected', 'The call was rejected by the other user');
      hangup();
    });

    socket.current.on('call-ended', (data: any) => {
      console.log('📴 Call ended by:', data.endedBy);
      hangup();
    });

    socket.current.on('call-connected', (data: any) => {
      console.log('🎉 Call connected:', data);
      setCallAccepted(true);
    });

    // ICE candidate events
    socket.current.on('ice-candidate', async (data: any) => {
      console.log('🧊 Received ICE candidate from:', data.senderId);

      if (pc.current && data.candidate) {
        try {
          const candidate = new RTCIceCandidate(data.candidate);
          await pc.current.addIceCandidate(candidate);
          console.log('✅ ICE candidate added');
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error);
        }
      }
    });
  };

  const cleanupSocket = () => {
    if (socket.current) {
      socket.current.disconnect();
      socket.current = null;
    }
    setSocketConnected(false);
  };

  const setupWebrtc = async (): Promise<boolean> => {
    try {
      console.log('🚀 Setting up WebRTC...');
      pc.current = new RTCPeerConnection(configuration);

      // Get local stream
      const stream = await Utils.getStream();
      if (stream) {
        console.log('📹 Got local stream with tracks:', stream.getTracks().length);
        setLocalStream(stream);

        // Add tracks to peer connection
        stream.getTracks().forEach((track) => {
          console.log(`➕ Adding ${track.kind} track:`, track.id);
          pc.current?.addTrack(track, stream);
        });
      } else {
        Alert.alert('Error', 'Could not access camera/microphone');
        return false;
      }

      // Handle remote stream
      pc.current.ontrack = (event) => {
        console.log(
          '🎯 Received remote track:',
          event.track.kind,
          'State:',
          event.track.readyState
        );

        if (event.streams && event.streams[0]) {
          const stream = event.streams[0];
          console.log(
            '📺 Setting remote stream. Tracks:',
            stream.getTracks().map((t) => t.kind)
          );
          setRemoteStream(stream);

          stream.getTracks().forEach((track) => {
            console.log(`Track ${track.kind}:`, {
              id: track.id,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            });
          });
        }
      };

      // Handle connection state changes
      pc.current.onconnectionstatechange = () => {
        const state = pc.current?.connectionState || 'unknown';
        console.log('🔗 Connection state:', state);
        setConnectionState(state);
        if (state === 'connected') {
          console.log('🎉 Peer connection established successfully!');
        }
      };

      // Handle ICE connection state changes
      pc.current.oniceconnectionstatechange = () => {
        const state = pc.current?.iceConnectionState || 'unknown';
        console.log('🧊 ICE connection state:', state);
        setIceConnectionState(state);
      };

      // Handle ICE candidates
      pc.current.onicecandidate = (event) => {
        if (event.candidate && socket.current) {
          console.log('🧊 Sending ICE candidate');
          socket.current.emit('ice-candidate', {
            roomId: ROOM_ID,
            candidate: {
              candidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid,
            },
            targetSocketId: callerSocketId.current, // Send to specific peer if known
          });
        }
      };

      return true;
    } catch (error) {
      console.error('❌ Error setting up WebRTC:', error);
      Alert.alert('Error', 'Failed to setup video call');
      return false;
    }
  };

  const create = async () => {
    try {
      if (!socketConnected) {
        Alert.alert('Error', 'Not connected to server');
        return;
      }

      console.log('📞 Creating call...');
      const setupSuccess = await setupWebrtc();
      if (!setupSuccess) return;

      connecting.current = true;

      if (pc.current) {
        // Create offer
        const offer = await pc.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });

        console.log('📋 Created offer');
        await pc.current.setLocalDescription(offer);

        // Send offer through socket
        socket.current.emit('create-offer', {
          roomId: ROOM_ID,
          offer: {
            type: offer.type,
            sdp: offer.sdp,
          },
        });

        console.log('📤 Offer sent via Socket.IO');
      }
    } catch (err) {
      console.error('❌ Error creating call:', err);
      Alert.alert('Error', 'Failed to create call');
    }
  };

  const join = async () => {
    try {
      if (!socketConnected) {
        Alert.alert('Error', 'Not connected to server');
        return;
      }

      console.log('🤝 Joining call...');
      connecting.current = true;
      setGettingCall(false);

      if (pc.current && pc.current.remoteDescription) {
        try {
          // Create answer
          const answer = await pc.current.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });

          console.log('📋 Created answer');
          await pc.current.setLocalDescription(answer);

          // Send answer through socket
          socket.current.emit('answer-call', {
            roomId: ROOM_ID,
            answer: {
              type: answer.type,
              sdp: answer.sdp,
            },
            callerSocketId: callerSocketId.current,
          });

          console.log('📤 Answer sent via Socket.IO');
          setCallAccepted(true);
        } catch (error) {
          console.error('❌ Error creating/sending answer:', error);
          Alert.alert('Error', 'Failed to answer call');
        }
      }
    } catch (err) {
      console.error('❌ Error joining call:', err);
      Alert.alert('Error', 'Failed to join call');
    }
  };

  const reject = () => {
    console.log('❌ Rejecting call');

    if (socket.current && callerSocketId.current) {
      socket.current.emit('reject-call', {
        roomId: ROOM_ID,
        callerSocketId: callerSocketId.current,
      });
    }

    setGettingCall(false);
    callerSocketId.current = null;
    connecting.current = false;
  };

  const hangup = async () => {
    try {
      console.log('📴 Hanging up call...');

      // Notify other users
      if (socket.current && connecting.current) {
        socket.current.emit('hangup-call', {
          roomId: ROOM_ID,
        });
      }

      connecting.current = false;
      setCallAccepted(false);
      setGettingCall(false);
      callerSocketId.current = null;

      // Clean up streams
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localStream.release();
      }
      setLocalStream(null);
      setRemoteStream(null);

      // Close peer connection
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }

      console.log('🧹 Cleanup completed');
    } catch (err) {
      console.error('❌ Error hanging up call:', err);
    }
  };

  // Debug component
  const DebugInfo = () => (
    <View className="absolute left-4 top-10 z-10 rounded bg-black/80 p-2">
      <Text className="text-xs text-white">
        Socket: {socketConnected ? '✅' : '❌'} | Connection: {connectionState}
      </Text>
      <Text className="text-xs text-white">
        ICE: {iceConnectionState} | User: {userId.current}
      </Text>
      <Text className="text-xs text-white">
        Local: {localStream ? '✅' : '❌'} | Remote: {remoteStream ? '✅' : '❌'}
      </Text>
      <Text className="text-xs text-white">
        Call State: {gettingCall ? 'Getting' : callAccepted ? 'Accepted' : 'Idle'}
      </Text>
    </View>
  );

  // UI States
  if (gettingCall && !callAccepted) {
    return (
      <ContextProvider>
        <SafeAreaView className="flex-1 bg-black">
          <DebugInfo />
          <GettingCall hangup={reject} join={join} className="flex-1" />
        </SafeAreaView>
      </ContextProvider>
    );
  }

  if (localStream) {
    return (
      <ContextProvider>
        <SafeAreaView className="flex-1 bg-black">
          <DebugInfo />
          <Video
            hangup={hangup}
            className="flex-1"
            localStream={localStream}
            remoteStream={remoteStream}
          />
        </SafeAreaView>
      </ContextProvider>
    );
  }

  return (
    <ContextProvider>
      <SafeAreaView className="flex-1 bg-black">
        <DebugInfo />
        <View className="absolute bottom-32 w-full flex-row justify-center gap-8">
          <Button
            onPress={create}
            iconName="videocam"
            className={`${socketConnected ? 'bg-green-600' : 'bg-gray-700'}`}
            disabled={!socketConnected}
          />
        </View>

        {!socketConnected && (
          <View className="absolute bottom-20 w-full">
            <Text className="text-center text-sm text-white">Connecting to server...</Text>
          </View>
        )}
      </SafeAreaView>
    </ContextProvider>
  );
}
