import Button from '@/components/Button';
import GettingCall from '@/components/GettingCall';
import Video from '@/components/Video';
import { ContextProvider } from '@/hooks/SocketContext';
import Utils from '@/hooks/Utils';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import React, { useRef, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { MediaStream, RTCIceCandidate, RTCPeerConnection } from 'react-native-webrtc';

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

  const setupWebrtc = async () => {
    pc.current = new RTCPeerConnection(configuration);

    // Get the video stream
    const stream = await Utils.getStream();
    if (stream) {
      setLocalStream(stream);
      //@ts-nocheck
      //@ts-ignore
      pc.current.addStream(stream);
    }

    // When a remote stream arrives display it
    //@ts-nocheck
    //@ts-ignore
    pc.current.onaddstream = (event: EventOnAddStream) => {
      setRemoteStream(event.stream);
    };
  };

  const create = async () => {
    console.log('Create call');
    connecting.current = true;

    // SetUp webrtc
    await setupWebrtc();

    // Document for call
    const cRef = firestore().collection('meet').doc('chatId');
    const doc = await firestore().collection('meet').doc('chatId').get();
    console.log(doc.data());

    // Exchanging ICE between the peers
    collectIceCandidates(cRef, 'caller', 'callee');

    // Create offer
    if (pc.current) {
      const offer = await pc.current.createOffer();
      pc.current.setLocalDescription(offer);

      const cWithOffer = {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      };

      cRef.set(cWithOffer);
    }
  };

  const join = async () => {};

  const hangup = async () => {};

  // Helper functions
  const collectIceCandidates = async (
    cRef: FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>,
    localName: string,
    remoteName: string
  ) => {
    const candidatesCollection = cRef.collection(`${localName}`);

    if (pc.current) {
      // On new ICE candidate add it to firestore
      //@ts-nocheck
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
