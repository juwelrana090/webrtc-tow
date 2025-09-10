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
      urls: ['turns:188.245.189.30:5349', 'turns:188.245.189.30:5349?transport=tcp'],
      username: 'turnserver',
      credential: 'dev',
    },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export default function Index() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [gettingCall, setGettingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const connecting = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const candidatesUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cRef = firestore().collection('meet').doc('chatId');

    // Listens for data changes in the document
    const subscribe = cRef.onSnapshot((snapshot) => {
      const data = snapshot.data();
      console.log('Snapshot data: ', data);

      // On answer start the call
      if (pc.current && !pc.current.remoteDescription && data && data.answer) {
        console.log('Setting remote description with answer');
        pc.current
          .setRemoteDescription(new RTCSessionDescription(data.answer))
          .then(() => {
            console.log('Remote description set successfully');
            setCallAccepted(true);
          })
          .catch((err) => console.error('Error setting remote description:', err));
      }

      // If there is offer for chatId, set getting call state
      if (data && data.offer && !connecting.current) {
        setGettingCall(true);
      }
    });

    unsubscribeRef.current = subscribe;

    // If the call is deleted, hangup
    const subscribeDelete = cRef.collection('caller').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === 'removed') {
          hangup();
        }
      });
    });

    candidatesUnsubscribeRef.current = subscribeDelete;

    // Clean up
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (candidatesUnsubscribeRef.current) candidatesUnsubscribeRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupWebrtc = async (): Promise<boolean> => {
    try {
      console.log('Setting up WebRTC...');
      pc.current = new RTCPeerConnection(configuration);

      // Get local stream
      const stream = await Utils.getStream();
      if (stream) {
        console.log('Got local stream');
        setLocalStream(stream);
        // Add tracks to peer connection
        stream.getTracks().forEach((track) => {
          console.log('Adding track:', track.kind);
          pc.current?.addTrack(track, stream);
        });
      } else {
        Alert.alert('Error', 'Could not access camera/microphone');
        return false;
      }

      // Handle remote stream using ontrack (modern approach)
      //@ts-ignore
      pc.current.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          console.log('Setting remote stream');
          setRemoteStream(event.streams[0]);
        }
      };

      // Handle connection state changes
      //@ts-ignore
      pc.current.onconnectionstatechange = () => {
        console.log('Connection state:', pc.current?.connectionState);
        if (pc.current?.connectionState === 'connected') {
          console.log('Peer connection established successfully!');
        }
      };

      // Handle ICE connection state changes
      //@ts-ignore
      pc.current.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.current?.iceConnectionState);
      };

      return true;
    } catch (error) {
      console.error('Error setting up WebRTC:', error);
      Alert.alert('Error', 'Failed to setup video call');
      return false;
    }
  };

  const create = async () => {
    try {
      console.log('Create call');
      // SetUp webrtc
      const setupSuccess = await setupWebrtc();
      if (!setupSuccess) return;

      connecting.current = true;

      // Document for call
      const cRef = firestore().collection('meet').doc('chatId');

      // Exchanging ICE between the peers
      collectIceCandidates(cRef, 'caller', 'callee');

      // Create offer
      if (pc.current) {
        const offer = await pc.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });

        console.log('Created offer:', offer);
        await pc.current.setLocalDescription(offer);

        await cRef.set({
          offer: {
            type: offer.type,
            sdp: offer.sdp,
          },
          createdAt: firestore.FieldValue.serverTimestamp(),
          status: 'waiting',
        });
        console.log('Offer saved to Firestore');
      }
    } catch (err) {
      console.error('Error creating call:', err);
      Alert.alert('Error', 'Failed to create call');
    }
  };

  const join = async () => {
    try {
      console.log('Join call');
      connecting.current = true;
      setGettingCall(false);

      // Document for call
      const cRef = firestore().collection('meet').doc('chatId');
      const callData = (await cRef.get()).data();
      const offer = callData?.offer;
      console.log('Got offer data:', offer);

      if (offer) {
        // SetUp webrtc
        const setupSuccess = await setupWebrtc();
        if (!setupSuccess) return;

        // Exchanging ICE between the peers
        // Note: check the parameter, it's reversed. Since this is joining part is callee
        collectIceCandidates(cRef, 'callee', 'caller');

        if (pc.current) {
          // Set remote description with the offer
          console.log('Setting remote description with offer');
          await pc.current.setRemoteDescription(new RTCSessionDescription(offer));

          // Create answer for the call
          //@ts-ignore
          const answer = await pc.current.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });

          console.log('Created answer:', answer);
          await pc.current.setLocalDescription(answer);

          // Update the document with answer
          await cRef.update({
            answer: {
              type: answer.type,
              sdp: answer.sdp,
            },
            status: 'connected',
          });
          console.log('Answer saved to Firestore');
        }
      }

      setCallAccepted(true);
    } catch (err) {
      console.error('Error joining call:', err);
      Alert.alert('Error', 'Failed to join call');
    }
  };

  /**
   *  For disconnecting the call close the peer connection, local stream and remote stream
   *  And delete the call document from firestore
   */
  const hangup = async () => {
    try {
      console.log('Hanging up call');
      connecting.current = false;
      setCallAccepted(false);
      setGettingCall(false);

      // Clean up streams first
      await streamCleanUp();

      // Close peer connection
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }

      // Clean up Firestore
      await firestoreCleanUp();
    } catch (err) {
      console.error('Error hanging up call:', err);
      Alert.alert('Error', 'Failed to hang up call');
    }
  };

  // Clean up local and remote stream
  const streamCleanUp = async () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
      localStream.release();
    }
    setLocalStream(null);
    setRemoteStream(null);
  };

  const firestoreCleanUp = async () => {
    try {
      const cRef = firestore().collection('meet').doc('chatId');

      // Delete subcollections
      const calleeCandidates = await cRef.collection('callee').get();
      const callerCandidates = await cRef.collection('caller').get();

      const deletePromises = [
        ...calleeCandidates.docs.map((doc) => doc.ref.delete()),
        ...callerCandidates.docs.map((doc) => doc.ref.delete()),
      ];

      await Promise.all(deletePromises);
      await cRef.delete();
      console.log('Firestore cleanup completed');
    } catch (error) {
      console.error('Error cleaning up Firestore:', error);
    }
  };

  // Helper functions
  const collectIceCandidates = (
    cRef: FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>,
    localName: string,
    remoteName: string
  ) => {
    const candidatesCollection = cRef.collection(localName);

    if (pc.current) {
      // On new ICE candidate add it to firestore
      //@ts-ignore
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Adding local ICE candidate:', event.candidate);
          candidatesCollection
            .add({
              candidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid,
              usernameFragment: event.candidate.usernameFragment,
            })
            .catch((err) => console.error('Error adding ICE candidate:', err));
        }
      };
    }

    // Get the candidates added to firestore and add them to peer connection
    const unsubscribe = cRef.collection(remoteName).onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          const candidate = new RTCIceCandidate({
            candidate: candidateData.candidate,
            sdpMLineIndex: candidateData.sdpMLineIndex,
            sdpMid: candidateData.sdpMid,
            //@ts-ignore
            usernameFragment: candidateData.usernameFragment,
          });
          console.log('Adding remote ICE candidate:', candidate);
          pc.current
            ?.addIceCandidate(candidate)
            .then(() => console.log('ICE candidate added successfully'))
            .catch((err) => console.error('Error adding ICE candidate:', err));
        }
      });
    });

    // Store unsubscribe function for cleanup
    const prevUnsubscribe = candidatesUnsubscribeRef.current;
    candidatesUnsubscribeRef.current = () => {
      unsubscribe();
      if (prevUnsubscribe) prevUnsubscribe();
    };
  };

  // Displays the gettingCall component
  if (gettingCall && !callAccepted) {
    return (
      <ContextProvider>
        <SafeAreaView className="flex-1 bg-black">
          <GettingCall hangup={hangup} join={join} className="flex-1" />
        </SafeAreaView>
      </ContextProvider>
    );
  }

  // Displays localStream
  if (localStream) {
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
        <View className="absolute bottom-32 w-full flex-row justify-center gap-8 ">
          <Button onPress={create} iconName="videocam" className="bg-gray-700" />
        </View>
      </SafeAreaView>
    </ContextProvider>
  );
}
