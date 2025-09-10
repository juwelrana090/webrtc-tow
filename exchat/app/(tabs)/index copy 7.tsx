import Button from '@/components/Button';
import GettingCall from '@/components/GettingCall';
import Video from '@/components/Video';
import '@/config/firebase';
import { ContextProvider } from '@/hooks/SocketContext';
import Utils from '@/hooks/Utils';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, Text, View } from 'react-native';
import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';

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

  const pc = useRef<RTCPeerConnection | null>(null);
  const connecting = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const candidatesUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cRef = firestore().collection('meet').doc('chatId');

    // Listens for data changes in the document
    const subscribe = cRef.onSnapshot((snapshot) => {
      const data = snapshot.data();
      console.log('📄 Snapshot data: ', data ? 'Has data' : 'No data');

      // On answer start the call
      if (pc.current && !pc.current.remoteDescription && data && data.answer) {
        console.log('📥 Setting remote description with answer');
        pc.current
          .setRemoteDescription(new RTCSessionDescription(data.answer))
          .then(() => {
            console.log('✅ Remote description set successfully');
            setCallAccepted(true);
          })
          .catch((err) => console.error('❌ Error setting remote description:', err));
      }

      // If there is offer for chatId, set getting call state
      if (data && data.offer && !connecting.current) {
        console.log('📞 Incoming call detected');
        setGettingCall(true);
      }
    });

    unsubscribeRef.current = subscribe;

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (candidatesUnsubscribeRef.current) candidatesUnsubscribeRef.current();
    };
  }, []);

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

      // Handle remote stream using ontrack
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

          // Log track details
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

      return true;
    } catch (error) {
      console.error('❌ Error setting up WebRTC:', error);
      Alert.alert('Error', 'Failed to setup video call');
      return false;
    }
  };

  const create = async () => {
    try {
      console.log('📞 Creating call...');
      const setupSuccess = await setupWebrtc();
      if (!setupSuccess) return;

      connecting.current = true;

      const cRef = firestore().collection('meet').doc('chatId');

      // Clean existing call data
      try {
        await cRef.delete();
        console.log('🧹 Cleaned existing call data');
      } catch (e) {
        // Document might not exist, that's fine
      }

      // Set up ICE candidate collection
      collectIceCandidates(cRef, 'caller', 'callee');

      // Create offer
      if (pc.current) {
        const offer = await pc.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });

        console.log('📋 Created offer');
        await pc.current.setLocalDescription(offer);

        await cRef.set({
          offer: {
            type: offer.type,
            sdp: offer.sdp,
          },
          createdAt: firestore.FieldValue.serverTimestamp(),
          status: 'waiting',
        });
        console.log('💾 Offer saved to Firestore');
      }
    } catch (err) {
      console.error('❌ Error creating call:', err);
      Alert.alert('Error', 'Failed to create call');
    }
  };

  const join = async () => {
    try {
      console.log('🤝 Joining call...');
      connecting.current = true;
      setGettingCall(false);

      const cRef = firestore().collection('meet').doc('chatId');
      const callData = (await cRef.get()).data();
      const offer = callData?.offer;
      console.log('📥 Got offer data:', offer ? 'Present' : 'Missing');

      if (offer) {
        const setupSuccess = await setupWebrtc();
        if (!setupSuccess) return;

        // Set up ICE candidate collection (reversed for callee)
        collectIceCandidates(cRef, 'callee', 'caller');

        if (pc.current) {
          // Set remote description with the offer
          console.log('📤 Setting remote description with offer');
          await pc.current.setRemoteDescription(new RTCSessionDescription(offer));

          // Create answer
          const answer = await pc.current.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });

          console.log('📋 Created answer');
          await pc.current.setLocalDescription(answer);

          // Save answer to Firestore
          await cRef.update({
            answer: {
              type: answer.type,
              sdp: answer.sdp,
            },
            status: 'connected',
          });
          console.log('💾 Answer saved to Firestore');
        }
      }

      setCallAccepted(true);
    } catch (err) {
      console.error('❌ Error joining call:', err);
      Alert.alert('Error', 'Failed to join call');
    }
  };

  const hangup = async () => {
    try {
      console.log('📴 Hanging up call...');
      connecting.current = false;
      setCallAccepted(false);
      setGettingCall(false);

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

      // Clean up Firestore
      const cRef = firestore().collection('meet').doc('chatId');
      try {
        const [callerCandidates, calleeCandidates] = await Promise.all([
          cRef.collection('caller').get(),
          cRef.collection('callee').get(),
        ]);

        const deletePromises = [
          ...callerCandidates.docs.map((doc) => doc.ref.delete()),
          ...calleeCandidates.docs.map((doc) => doc.ref.delete()),
        ];

        await Promise.all(deletePromises);
        await cRef.delete();
        console.log('🧹 Firestore cleanup completed');
      } catch (error) {
        console.warn('⚠️  Cleanup warning:', error);
      }
    } catch (err) {
      console.error('❌ Error hanging up call:', err);
    }
  };

  const collectIceCandidates = (
    cRef: FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>,
    localName: string,
    remoteName: string
  ) => {
    const candidatesCollection = cRef.collection(localName);

    if (pc.current) {
      // Handle local ICE candidates
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Adding local ICE candidate');

          // Create clean candidate data (avoid undefined values)
          const candidateData = {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            timestamp: firestore.FieldValue.serverTimestamp(),
          };

          candidatesCollection
            .add(candidateData)
            .then(() => console.log('✅ ICE candidate saved'))
            .catch((err) => console.error('❌ Error saving ICE candidate:', err));
        }
      };
    }

    // Listen for remote ICE candidates
    const unsubscribe = cRef.collection(remoteName).onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidateData = change.doc.data();
            const candidate = new RTCIceCandidate({
              candidate: candidateData.candidate,
              sdpMLineIndex: candidateData.sdpMLineIndex,
              sdpMid: candidateData.sdpMid,
            });

            console.log('🧊 Adding remote ICE candidate');
            pc.current
              ?.addIceCandidate(candidate)
              .then(() => console.log('✅ Remote ICE candidate added'))
              .catch((err) => console.error('❌ Error adding remote ICE candidate:', err));
          }
        });
      },
      (error) => {
        console.error('❌ ICE candidates listener error:', error);
      }
    );

    // Store unsubscribe function
    const prevUnsubscribe = candidatesUnsubscribeRef.current;
    candidatesUnsubscribeRef.current = () => {
      unsubscribe();
      if (prevUnsubscribe) prevUnsubscribe();
    };
  };

  // Debug component
  const DebugInfo = () => (
    <View className="absolute left-4 top-10 rounded bg-black/80 p-2">
      <Text className="text-xs text-white">
        Connection: {connectionState} | ICE: {iceConnectionState}
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
          <GettingCall hangup={hangup} join={join} className="flex-1" />
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
          <Button onPress={create} iconName="videocam" className="bg-gray-700" />
        </View>
      </SafeAreaView>
    </ContextProvider>
  );
}
