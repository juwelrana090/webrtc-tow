import Button from '@/components/Button';
import GettingCall from '@/components/GettingCall';
import Video from '@/components/Video';
import '@/config/firebase';
import { ContextProvider } from '@/hooks/SocketContext';
import Utils from '@/hooks/Utils';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, View } from 'react-native';
import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    {
      urls: [
        'stun:188.245.189.30:3478',
        'turn:188.245.189.30:3478',
        'turn:188.245.189.30:3478?transport=tcp',
      ],
      username: 'turnserver',
      credential: 'dev',
    },
  ],
};

export default function Index() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [gettingCall, setGettingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const callDocRef = useRef<FirebaseFirestoreTypes.DocumentReference | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
  };

  const setupWebrtc = async (): Promise<boolean> => {
    try {
      pc.current = new RTCPeerConnection(configuration);

      // Get local stream
      const stream = await Utils.getStream();
      if (stream) {
        setLocalStream(stream);
        // Add tracks instead of deprecated addStream
        stream.getTracks().forEach((track) => {
          pc.current?.addTrack(track, stream);
        });
      } else {
        Alert.alert('Error', 'Could not access camera/microphone');
        return false;
      }

      // Handle remote stream using ontrack (modern approach)
      //@ts-ignore
      pc.current.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Handle connection state changes
      //@ts-ignore
      pc.current.onconnectionstatechange = () => {
        console.log('Connection state:', pc.current?.connectionState);
      };

      return true;
    } catch (error) {
      console.error('Error setting up WebRTC:', error);
      Alert.alert('Error', 'Failed to setup video call');
      return false;
    }
  };

  // Create a new call
  const createCall = async () => {
    try {
      const setupSuccess = await setupWebrtc();
      if (!setupSuccess) return;

      // Generate a unique call ID
      const callDoc = firestore().collection('meet').doc();
      callDocRef.current = callDoc;
      setCurrentCallId(callDoc.id);

      console.log('Call ID:', callDoc.id);
      Alert.alert('Call ID Created', `Share this ID: ${callDoc.id}`);

      // Collect ICE candidates
      collectIceCandidates(callDoc, 'caller', 'callee');

      // Create offer
      const offer = await pc.current!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.current!.setLocalDescription(offer);

      // Save offer to Firestore
      await callDoc.set({
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
        createdAt: firestore.FieldValue.serverTimestamp(),
        status: 'waiting',
      });

      // Listen for answer
      const unsubscribe = callDoc.onSnapshot(
        (snapshot) => {
          const data = snapshot.data();

          //@ts-ignore
          if (data?.answer && !pc.current?.currentRemoteDescription) {
            const answerDesc = new RTCSessionDescription(data.answer);
            pc.current
              ?.setRemoteDescription(answerDesc)
              .then(() => {
                setCallAccepted(true);
                setGettingCall(false);
              })
              .catch((err) => console.error('Error setting remote description:', err));
          }
        },
        (error) => {
          console.error('Error listening to call document:', error);
          Alert.alert('Error', 'Failed to listen for call updates');
        }
      );

      unsubscribeRef.current = unsubscribe;
      setGettingCall(true);
    } catch (err) {
      console.error('Error creating call:', err);
      Alert.alert('Error', 'Failed to create call');
    }
  };

  // Join an existing call
  const joinCall = async (callId?: string) => {
    try {
      if (!callId) {
        Alert.alert('Error', 'Call ID is required');
        return;
      }

      const setupSuccess = await setupWebrtc();
      if (!setupSuccess) return;

      const callDoc = firestore().collection('meet').doc(callId);
      callDocRef.current = callDoc;
      setCurrentCallId(callId);

      const callSnapshot = await callDoc.get();
      const callData = callSnapshot.data();

      if (!callSnapshot.exists || !callData?.offer) {
        Alert.alert('Error', 'Call not found or no offer available');
        return;
      }

      await pc.current!.setRemoteDescription(new RTCSessionDescription(callData.offer));

      //@ts-ignore
      const answer = await pc.current!.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.current!.setLocalDescription(answer);

      // Update the document with answer
      await callDoc.update({
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
        status: 'connected',
        joinedAt: firestore.FieldValue.serverTimestamp(),
      });

      collectIceCandidates(callDoc, 'callee', 'caller');
      setCallAccepted(true);
      setGettingCall(false);
    } catch (err) {
      console.error('Error joining call:', err);
      Alert.alert('Error', 'Failed to join call');
    }
  };

  // Hangup / cleanup
  const hangup = async () => {
    try {
      cleanup();

      setLocalStream(null);
      setRemoteStream(null);
      setGettingCall(false);
      setCallAccepted(false);

      if (currentCallId && callDocRef.current) {
        // Clean up Firestore data
        const subCollections = ['caller', 'callee'];

        for (const col of subCollections) {
          const snapshot = await callDocRef.current.collection(col).get();
          const deletePromises = snapshot.docs.map((doc) => doc.ref.delete());
          await Promise.all(deletePromises);
        }

        // Update call status or delete the document
        await callDocRef.current.update({
          status: 'ended',
          endedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      setCurrentCallId(null);
      callDocRef.current = null;
    } catch (err) {
      console.warn('Error during hangup cleanup:', err);
    }
  };

  // Exchange ICE candidates
  const collectIceCandidates = (
    callDoc: FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>,
    localName: string,
    remoteName: string
  ) => {
    const localCandidates = callDoc.collection(localName);
    const remoteCandidates = callDoc.collection(remoteName);

    // Send local ICE candidates
    //@ts-ignore
    pc.current!.onicecandidate = (event) => {
      if (event.candidate) {
        localCandidates
          .add({
            ...event.candidate.toJSON(),
            createdAt: firestore.FieldValue.serverTimestamp(),
          })
          .catch((err) => console.error('Error adding ICE candidate:', err));
      }
    };

    // Listen for remote ICE candidates
    const unsubscribe = remoteCandidates.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const candidate = new RTCIceCandidate({
              candidate: data.candidate,
              sdpMLineIndex: data.sdpMLineIndex,
              sdpMid: data.sdpMid,
            });
            pc.current
              ?.addIceCandidate(candidate)
              .catch((err) => console.error('Error adding ICE candidate:', err));
          }
        });
      },
      (error) => {
        console.error('Error listening to ICE candidates:', error);
      }
    );

    // Store unsubscribe function for cleanup
    const prevUnsubscribe = unsubscribeRef.current;
    unsubscribeRef.current = () => {
      unsubscribe();
      if (prevUnsubscribe) prevUnsubscribe();
    };
  };

  // Prompt for call ID when joining
  const promptJoinCall = () => {
    Alert.prompt(
      'Join Call',
      'Enter the call ID:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: (callId) => {
            if (callId && callId.trim()) {
              joinCall(callId.trim());
            }
          },
        },
      ],
      'plain-text'
    );
  };

  // UI Rendering
  if (gettingCall && !callAccepted) {
    return (
      <ContextProvider>
        <SafeAreaView className="flex-1 bg-black">
          <GettingCall hangup={hangup} join={promptJoinCall} className="flex-1" />
        </SafeAreaView>
      </ContextProvider>
    );
  }

  if (callAccepted && localStream) {
    return (
      <ContextProvider>
        <SafeAreaView className="flex-1 bg-black">
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
        <View className="absolute bottom-32 w-full flex-row justify-center gap-8">
          <Button onPress={createCall} iconName="videocam" className="bg-gray-700" />
          <Button onPress={promptJoinCall} iconName="call" className="bg-green-700" />
        </View>
      </SafeAreaView>
    </ContextProvider>
  );
}
