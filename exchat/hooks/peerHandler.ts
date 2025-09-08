import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';

export interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: RTCIceCandidate;
}

export interface PeerConnection extends RTCPeerConnection {
  remoteCandidates?: RTCIceCandidate[];
}

export interface PeerHandlers {
  createInitiatorPeer: (
    stream: MediaStream,
    onSignal: (signalData: SignalData) => void,
    onStream: (remoteStream: MediaStream) => void
  ) => PeerConnection;
  createReceiverPeer: (
    stream: MediaStream,
    remoteSignal: SignalData,
    onSignal: (signalData: SignalData) => void,
    onStream: (remoteStream: MediaStream) => void
  ) => Promise<PeerConnection>;
  destroyPeer: (peer: PeerConnection | null) => void;
  handleRemoteSignal: (peer: PeerConnection, signalData: SignalData) => Promise<void>;
}

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

const sessionConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
  voiceActivityDetection: true,
};

const processCandidates = (peer: PeerConnection): void => {
  if (!peer.remoteCandidates || peer.remoteCandidates.length < 1) return;

  peer.remoteCandidates.forEach((candidate) => {
    peer.addIceCandidate(candidate).catch((err) => {
      console.error('❌ Error adding queued ICE candidate:', err);
    });
  });
  peer.remoteCandidates = [];
};

const handleRemoteCandidate = (peer: PeerConnection, iceCandidate: RTCIceCandidate): void => {
  if (!peer.remoteDescription) {
    if (!peer.remoteCandidates) {
      peer.remoteCandidates = [];
    }
    peer.remoteCandidates.push(iceCandidate);
    console.log('🧊 Queued ICE candidate (no remoteDescription yet)');
    return;
  }

  peer.addIceCandidate(iceCandidate).catch((err) => {
    console.error('❌ Error adding ICE candidate:', err);
  });
};

export const peerHandler: PeerHandlers = {
  createInitiatorPeer(stream, onSignal, onStream) {
    const peerConnection = new RTCPeerConnection(configuration) as PeerConnection;
    peerConnection.remoteCandidates = [];

    peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection State:', peerConnection.connectionState);
      switch (peerConnection.connectionState) {
        case 'closed':
          console.log('🔚 Peer connection closed');
          break;
        case 'connected':
          console.log('✅ Peer connection established');
          break;
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        console.log('✅ ICE gathering completed');
        return;
      }
      onSignal({ type: 'candidate', candidate: event.candidate });
    };

    peerConnection.onicecandidateerror = (event) => {
      console.warn('⚠️ ICE candidate error:', event);
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE Connection State:', peerConnection.iceConnectionState);
      switch (peerConnection.iceConnectionState) {
        case 'connected':
        case 'completed':
          console.log('✅ ICE connection established');
          break;
        case 'failed':
          console.error('❌ ICE connection failed');
          break;
        case 'disconnected':
          console.warn('⚠️ ICE connection disconnected');
          break;
      }
    };

    peerConnection.ontrack = (event) => {
      console.log('🎥 ontrack fired for track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        console.log('🎯 Setting remote stream:', event.streams[0].id);
        onStream(event.streams[0]);
      } else {
        console.warn('⚠️ No stream in ontrack event');
      }
    };

    peerConnection.onnegotiationneeded = async () => {
      try {
        console.log('🔄 Negotiation needed, creating offer');
        const offerDescription = await peerConnection.createOffer(sessionConstraints);
        await peerConnection.setLocalDescription(offerDescription);
        onSignal({ type: 'offer', sdp: offerDescription.sdp });
      } catch (err) {
        console.error('❌ Error creating offer:', err);
      }
    };

    console.log('➕ Adding local stream tracks');
    stream.getTracks().forEach((track) => {
      console.log('➕ Adding track:', track.kind);
      peerConnection.addTrack(track, stream);
    });

    return peerConnection;
  },

  async createReceiverPeer(stream, remoteSignal, onSignal, onStream) {
    const peerConnection = new RTCPeerConnection(configuration) as PeerConnection;
    peerConnection.remoteCandidates = [];

    peerConnection.onconnectionstatechange = () => {
      switch (peerConnection.connectionState) {
        case 'closed':
          console.log('🔚 Peer connection closed');
          break;
        case 'connected':
          console.log('✅ Peer connection established');
          break;
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        console.log('✅ ICE gathering completed');
        return;
      }
      onSignal({ type: 'candidate', candidate: event.candidate });
    };

    peerConnection.onicecandidateerror = (event) => {
      console.warn('⚠️ ICE candidate error:', event);
    };

    peerConnection.oniceconnectionstatechange = () => {
      switch (peerConnection.iceConnectionState) {
        case 'connected':
        case 'completed':
          console.log('✅ ICE connection established');
          break;
        case 'failed':
          console.error('❌ ICE connection failed');
          break;
      }
    };

    peerConnection.ontrack = (event) => {
      console.log('🎥 ontrack fired for track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        console.log('🎯 Setting remote stream:', event.streams[0].id);
        onStream(event.streams[0]);
      } else {
        console.warn('⚠️ No stream in ontrack event');
      }
    };

    console.log('➕ Adding local stream tracks');
    stream.getTracks().forEach((track) => {
      console.log('➕ Adding track:', track.kind);
      peerConnection.addTrack(track, stream);
    });

    if (remoteSignal.type === 'offer' && remoteSignal.sdp) {
      try {
        console.log('📥 Processing remote offer');
        const offerDescription = new RTCSessionDescription({
          type: 'offer',
          sdp: remoteSignal.sdp,
        });

        await peerConnection.setRemoteDescription(offerDescription);
        const answerDescription = await peerConnection.createAnswer(sessionConstraints);
        await peerConnection.setLocalDescription(answerDescription);

        processCandidates(peerConnection);

        onSignal({ type: 'answer', sdp: answerDescription.sdp });
      } catch (err) {
        console.error('❌ Error creating answer:', err);
        throw err;
      }
    }

    return peerConnection;
  },

  async handleRemoteSignal(peer, signalData) {
    try {
      switch (signalData.type) {
        case 'offer':
          if (signalData.sdp) {
            console.log('📥 Handling remote offer');
            const offerDescription = new RTCSessionDescription({
              type: 'offer',
              sdp: signalData.sdp,
            });
            await peer.setRemoteDescription(offerDescription);
            processCandidates(peer);
          }
          break;

        case 'answer':
          if (signalData.sdp) {
            console.log('📥 Handling remote answer');
            const answerDescription = new RTCSessionDescription({
              type: 'answer',
              sdp: signalData.sdp,
            });
            await peer.setRemoteDescription(answerDescription);
            processCandidates(peer);
          }
          break;

        case 'candidate':
          if (signalData.candidate) {
            console.log('🧊 Handling remote ICE candidate');
            handleRemoteCandidate(peer, signalData.candidate);
          }
          break;

        default:
          console.warn('⚠️ Unknown signal type:', signalData.type);
      }
    } catch (err) {
      console.error('❌ Error handling remote signal:', err);
      throw err;
    }
  },

  destroyPeer(peer) {
    if (peer) {
      console.log('🧹 Destroying peer connection');
      peer.close();
    }
  },
};
