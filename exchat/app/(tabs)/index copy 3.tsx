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
  const pc = useRef<RTCPeerConnection>(null);
  const connecting = useRef(false);

  useEffect(() => {
    const cRef = firestore().collection('meet').doc('chatId');

    // Listens for data changes in the document
    const subscribe = cRef.onSnapshot((snapshot) => {
      const data = snapshot.data();
      console.log('Snapshot data: ', data);

      // On answer start the call
      if (pc.current && !pc.current?.remoteDescription && data && data.answer) {
        pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      // If there is offer for chatId, set getting call state
      if (data && data.offer && !connecting.current) {
        setGettingCall(true);
      }
    });

    // If the call is deleted, hangup
    const subscribeDelete = cRef.collection('caller').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === 'removed') {
          hangup();
        }
      });
    });

    // Clean up
    return () => {
      subscribe();
      subscribeDelete();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const create = async () => {
    try {
      console.log('Create call');
      // SetUp webrtc
      const setupSuccess = await setupWebrtc();
      if (!setupSuccess) return;

      connecting.current = true;

      // Document for call
      const cRef = firestore().collection('meet').doc('chatId');
      const doc = await firestore().collection('meet').doc('chatId').get();
      console.log('Document data', doc.data());

      // Exchanging ICE between the peers
      collectIceCandidates(cRef, 'caller', 'callee');

      // Create offer
      if (pc.current) {
        const offer = await pc.current!.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.current!.setLocalDescription(offer);

        await cRef.set({
          offer: {
            type: offer.type,
            sdp: offer.sdp,
          },
          createdAt: firestore.FieldValue.serverTimestamp(),
          status: 'waiting',
        });
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
      const offer = (await cRef.get()).data()?.offer;
      console.log('Document data', offer);

      if (offer) {
        // SetUp webrtc
        const setupSuccess = await setupWebrtc();
        if (!setupSuccess) return;

        // Exchanging ICE between the peers
        // Note: check the parameter, ITs reversed. Since this is joining part is callee
        collectIceCandidates(cRef, 'callee', 'caller');

        if (pc.current) {
          const offer = await pc.current!.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.current!.setRemoteDescription(new RTCSessionDescription(offer));

          // Create answer for the call
          // Update the document with answer
          const answer = await pc.current!.createAnswer();
          await pc.current!.setLocalDescription(answer);
          await cRef.update({
            answer: {
              type: answer.type,
              sdp: answer.sdp,
            },
          });
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
      connecting.current = false;
      setCallAccepted(false);
      setGettingCall(false);
      streamCleanUp();
      firestoreCleanUp();

      if (pc.current) {
        await pc.current?.close();
      }
    } catch (err) {
      console.error('Error hanging up call:', err);
      Alert.alert('Error', 'Failed to hang up call');
    }
  };

  // Clean up local and remote stream
  const streamCleanUp = async () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream.release();
    }
    setLocalStream(null);
    setRemoteStream(null);
  };

  const firestoreCleanUp = async () => {
    const cRef = firestore().collection('meet').doc('chatId');

    if (cRef) {
      const calleeCandidates = await cRef.collection('callee').get();
      calleeCandidates.forEach(async (candidate) => {
        await candidate.ref.delete();
      });

      const callerCandidates = await cRef.collection('caller').get();
      callerCandidates.forEach(async (candidate) => {
        await candidate.ref.delete();
      });

      await cRef.delete();
    }
  };

  // Helper functions
  const collectIceCandidates = async (
    cRef: FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>,
    localName: string,
    remoteName: string
  ) => {
    const candidatesCollection = cRef.collection(`${localName}`);

    if (pc.current) {
      // On new ICE candidate add it to firestore

      //@ts-ignore
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          candidatesCollection.add(event.candidate);
        }
      };
    }

    // Get the candidates added to firestore and add them to peer connection
    cRef.collection(`${remoteName}`).onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          console.log('Got new remote ICE candidate: ', candidate);
          pc.current?.addIceCandidate(candidate);
        }
      });
    });
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
