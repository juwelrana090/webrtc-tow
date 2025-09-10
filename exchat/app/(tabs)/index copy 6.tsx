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
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },

    // Your TURN servers with proper configuration
    {
      urls: [
        'stun:188.245.189.30:3478',
        'turn:188.245.189.30:3478?transport=udp',
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

    // Backup free TURN servers for testing
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceTransportPolicy: 'all', // Try 'relay' if still having issues
  // Add these for better connectivity
  enableDtlsSrtp: true,
  sdpSemantics: 'unified-plan',
};

// Enhanced media constraints for better audio quality
const mediaConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 2,
    volume: 1.0,
  },
  video: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { min: 15, ideal: 30, max: 30 },
    facingMode: 'user',
  },
};

export default function Index() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [gettingCall, setGettingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [connectionState, setConnectionState] = useState('new');
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const [iceGatheringState, setIceGatheringState] = useState('new');
  const [signalingState, setSignalingState] = useState('stable');

  const pc = useRef<RTCPeerConnection | null>(null);
  const connecting = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const candidatesUnsubscribeRef = useRef<(() => void) | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    const cRef = firestore().collection('meet').doc('chatId');

    // Enhanced snapshot listener with better error handling
    const subscribe = cRef.onSnapshot(
      (snapshot) => {
        const data = snapshot.data();
        console.log('📄 Snapshot data: ', data ? 'Has data' : 'No data');
        console.log('📄 Current signaling state:', pc.current?.signalingState);

        // On answer start the call - only if we're in the right state
        if (
          pc.current &&
          !pc.current.remoteDescription &&
          data &&
          data.answer &&
          pc.current.signalingState === 'have-local-offer'
        ) {
          console.log('📥 Setting remote description with answer');
          pc.current
            .setRemoteDescription(new RTCSessionDescription(data.answer))
            .then(() => {
              console.log('✅ Remote description set successfully');
              setCallAccepted(true);
              // Process queued ICE candidates
              processQueuedCandidates();
            })
            .catch((err) => console.error('❌ Error setting remote description:', err));
        }

        // If there is offer for chatId, set getting call state
        if (data && data.offer && !connecting.current) {
          console.log('📞 Incoming call detected');
          setGettingCall(true);
        }
      },
      (error) => {
        console.error('❌ Firestore snapshot error:', error);
      }
    );

    unsubscribeRef.current = subscribe;

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (candidatesUnsubscribeRef.current) candidatesUnsubscribeRef.current();
    };
  }, []);

  const processQueuedCandidates = () => {
    console.log(`🧊 Processing ${iceCandidatesQueue.current.length} queued ICE candidates`);
    iceCandidatesQueue.current.forEach((candidateInit) => {
      const candidate = new RTCIceCandidate(candidateInit);
      pc.current
        ?.addIceCandidate(candidate)
        .then(() => console.log('✅ Queued ICE candidate added'))
        .catch((err) => console.error('❌ Error adding queued ICE candidate:', err));
    });
    iceCandidatesQueue.current = [];
  };

  const setupWebrtc = async (): Promise<boolean> => {
    try {
      console.log('🚀 Setting up WebRTC...');
      pc.current = new RTCPeerConnection(configuration);

      // Get local stream with enhanced audio settings
      const stream = await Utils.getStream(mediaConstraints);
      if (stream) {
        console.log('📹 Got local stream with tracks:', stream.getTracks().length);

        // Enhance audio track settings
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
          // Apply audio constraints if supported
          if (track.applyConstraints) {
            track
              .applyConstraints({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                volume: 1.0,
              })
              .catch(console.warn);
          }
          console.log(`🔊 Audio track settings:`, {
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          });
        });

        setLocalStream(stream);

        // Add tracks to peer connection with enhanced settings
        stream.getTracks().forEach((track) => {
          console.log(`➕ Adding ${track.kind} track:`, track.id);
          const sender = pc.current?.addTrack(track, stream);

          // Set encoding parameters for better quality
          if (sender && track.kind === 'audio') {
            sender
              .setParameters({
                encodings: [
                  {
                    maxBitrate: 128000, // 128 kbps for audio
                  },
                ],
              })
              .catch(console.warn);
          }
        });
      } else {
        Alert.alert('Error', 'Could not access camera/microphone');
        return false;
      }

      // Enhanced remote stream handling
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

          // Enhance received audio tracks
          stream.getAudioTracks().forEach((track) => {
            track.enabled = true;
            console.log(`🔊 Remote audio track:`, {
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            });
          });

          setRemoteStream(stream);

          // Log all track details
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

      // Enhanced connection state monitoring
      pc.current.onconnectionstatechange = () => {
        const state = pc.current?.connectionState || 'unknown';
        console.log('🔗 Connection state:', state);
        setConnectionState(state);
        if (state === 'connected') {
          console.log('🎉 Peer connection established successfully!');
        } else if (state === 'failed') {
          console.log('💥 Connection failed, attempting ICE restart...');
          pc.current?.restartIce();
        }
      };

      // Enhanced ICE connection state handling
      pc.current.oniceconnectionstatechange = () => {
        const state = pc.current?.iceConnectionState || 'unknown';
        console.log('🧊 ICE connection state:', state);
        setIceConnectionState(state);

        if (state === 'failed') {
          console.log('💥 ICE connection failed, restarting...');
          pc.current?.restartIce();
        }
      };

      // ICE gathering state monitoring
      pc.current.onicegatheringstatechange = () => {
        const state = pc.current?.iceGatheringState || 'unknown';
        console.log('🎲 ICE gathering state:', state);
        setIceGatheringState(state);
      };

      // Signaling state monitoring
      pc.current.onsignalingstatechange = () => {
        const state = pc.current?.signalingState || 'unknown';
        console.log('📡 Signaling state:', state);
        setSignalingState(state);
      };

      // Enhanced error handling
      pc.current.onicecandidateerror = (event) => {
        console.error('❌ ICE candidate error:', event);
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

      // Clean existing call data more thoroughly
      try {
        const [callerCandidates, calleeCandidates] = await Promise.all([
          cRef.collection('caller').get(),
          cRef.collection('callee').get(),
        ]);

        const deletePromises = [
          ...callerCandidates.docs.map((doc) => doc.ref.delete()),
          ...calleeCandidates.docs.map((doc) => doc.ref.delete()),
          cRef.delete(),
        ];

        await Promise.all(deletePromises);
        console.log('🧹 Cleaned existing call data completely');
      } catch (e) {
        console.log('⚠️ No existing data to clean');
      }

      // Set up ICE candidate collection
      collectIceCandidates(cRef, 'caller', 'callee');

      // Create offer with enhanced constraints
      if (pc.current) {
        const offer = await pc.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          voiceActivityDetection: false, // Better for consistent audio
        });

        console.log('📋 Created offer');
        await pc.current.setLocalDescription(offer);

        // Wait for ICE gathering to complete or timeout
        await waitForIceGathering();

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

          // Create answer with enhanced constraints
          const answer = await pc.current.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            voiceActivityDetection: false,
          });

          console.log('📋 Created answer');
          await pc.current.setLocalDescription(answer);

          // Wait for ICE gathering
          await waitForIceGathering();

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

  const waitForIceGathering = (): Promise<void> => {
    return new Promise((resolve) => {
      if (pc.current?.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        console.log('⏰ ICE gathering timeout, proceeding anyway');
        resolve();
      }, 3000); // 3 second timeout

      const handleStateChange = () => {
        if (pc.current?.iceGatheringState === 'complete') {
          console.log('✅ ICE gathering complete');
          clearTimeout(timeout);
          resolve();
        }
      };

      if (pc.current) {
        pc.current.onicegatheringstatechange = handleStateChange;
      }
    });
  };

  const hangup = async () => {
    try {
      console.log('📴 Hanging up call...');
      connecting.current = false;
      setCallAccepted(false);
      setGettingCall(false);

      // Clean up streams
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
          console.log(`🛑 Stopped ${track.kind} track`);
        });
        localStream.release();
      }
      setLocalStream(null);
      setRemoteStream(null);

      // Close peer connection
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }

      // Reset states
      setConnectionState('new');
      setIceConnectionState('new');
      setIceGatheringState('new');
      setSignalingState('stable');

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

      // Clear ICE candidates queue
      iceCandidatesQueue.current = [];
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
      // Enhanced local ICE candidate handling
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Adding local ICE candidate:', event.candidate.candidate);

          // Create clean candidate data
          const candidateData = {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            timestamp: firestore.FieldValue.serverTimestamp(),
            // Additional debugging info
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port,
          };

          candidatesCollection
            .add(candidateData)
            .then(() => console.log('✅ ICE candidate saved'))
            .catch((err) => console.error('❌ Error saving ICE candidate:', err));
        } else {
          console.log('🏁 ICE gathering completed (null candidate received)');
        }
      };
    }

    // Enhanced remote ICE candidates listener
    const unsubscribe = cRef.collection(remoteName).onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidateData = change.doc.data();
            const candidateInit: RTCIceCandidateInit = {
              candidate: candidateData.candidate,
              sdpMLineIndex: candidateData.sdpMLineIndex,
              sdpMid: candidateData.sdpMid,
            };

            console.log('🧊 Received remote ICE candidate:', candidateData.candidate);

            // Check if we can add the candidate immediately
            if (pc.current && pc.current.remoteDescription) {
              const candidate = new RTCIceCandidate(candidateInit);
              pc.current
                .addIceCandidate(candidate)
                .then(() => console.log('✅ Remote ICE candidate added immediately'))
                .catch((err) => console.error('❌ Error adding remote ICE candidate:', err));
            } else {
              // Queue the candidate for later processing
              console.log('⏳ Queueing ICE candidate (no remote description yet)');
              iceCandidatesQueue.current.push(candidateInit);
            }
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

  // Enhanced debug component
  const DebugInfo = () => (
    <View className="absolute left-4 top-10 z-10 rounded bg-black/80 p-2">
      <Text className="text-xs text-white">
        Connection: {connectionState} | ICE: {iceConnectionState}
      </Text>
      <Text className="text-xs text-white">
        Gathering: {iceGatheringState} | Signaling: {signalingState}
      </Text>
      <Text className="text-xs text-white">
        Local: {localStream ? '✅' : '❌'} | Remote: {remoteStream ? '✅' : '❌'}
      </Text>
      <Text className="text-xs text-white">
        Call State: {gettingCall ? 'Getting' : callAccepted ? 'Accepted' : 'Idle'}
      </Text>
      <Text className="text-xs text-white">Queued ICE: {iceCandidatesQueue.current.length}</Text>
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
