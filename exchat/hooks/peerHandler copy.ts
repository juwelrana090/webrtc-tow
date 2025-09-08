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
    // Your TURN server
    {
      urls: [
        'stun:188.245.189.30:3478',
        'turn:188.245.189.30:3478',
        'turn:188.245.189.30:3478?transport=tcp',
      ],
      username: 'turnserver',
      credential: 'dev',
    },
    // With SSL (if configured)
    {
      urls: ['turns:188.245.189.30:5349', 'turns:188.245.189.30:5349?transport=tcp'],
      username: 'turnserver',
      credential: 'dev',
    },
    // Backup public STUN
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'stun:stun1.l.google.com:19302',
    },
    {
      urls: 'stun:stun2.l.google.com:19302',
    },
    {
      urls: 'stun:stun3.l.google.com:19302',
    },
    {
      urls: 'stun:stun4.l.google.com:19302',
    },
  ],
};

const sessionConstraints = {
  mandatory: {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: true,
    VoiceActivityDetection: true,
  },
};

// Helper function to process queued remote candidates
const processCandidates = (peer: PeerConnection): void => {
  if (!peer.remoteCandidates || peer.remoteCandidates.length < 1) return;

  peer.remoteCandidates.forEach((candidate) => {
    peer.addIceCandidate(candidate).catch((err) => {
      console.error('Error adding ICE candidate:', err);
    });
  });
  peer.remoteCandidates = [];
};

// Helper function to handle remote candidates
const handleRemoteCandidate = (peer: PeerConnection, iceCandidate: RTCIceCandidate): void => {
  if (!peer.remoteDescription) {
    // Queue candidates if remote description is not set yet
    if (!peer.remoteCandidates) {
      peer.remoteCandidates = [];
    }
    peer.remoteCandidates.push(iceCandidate);
    return;
  }

  peer.addIceCandidate(iceCandidate).catch((err) => {
    console.error('Error adding ICE candidate:', err);
  });
};

export const peerHandler: PeerHandlers = {
  createInitiatorPeer(stream, onSignal, onStream) {
    const peerConnection = new RTCPeerConnection(configuration) as PeerConnection;
    peerConnection.remoteCandidates = [];

    // Set up event listeners
    //@ts-ignore
    peerConnection.addEventListener('connectionstatechange', () => {
      switch (peerConnection.connectionState) {
        case 'closed':
          console.log('Peer connection closed');
          break;
        case 'connected':
          console.log('Peer connection established');
          break;
      }
    });

    //@ts-ignore
    peerConnection.addEventListener('icecandidate', (event) => {
      if (!event.candidate) {
        // ICE gathering completed
        console.log('ICE gathering completed');
        return;
      }

      onSignal({
        type: 'candidate',
        candidate: event.candidate,
      });
    });

    //@ts-ignore
    peerConnection.addEventListener('icecandidateerror', (event) => {
      console.warn('ICE candidate error:', event);
    });

    //@ts-ignore
    peerConnection.addEventListener('iceconnectionstatechange', () => {
      switch (peerConnection.iceConnectionState) {
        case 'connected':
        case 'completed':
          console.log('ICE connection established');
          break;
        case 'failed':
          console.error('ICE connection failed');
          break;
      }
    });

    //@ts-ignore
    peerConnection.addEventListener('addstream', (event) => {
      onStream(event.stream);
    });

    //@ts-ignore
    peerConnection.addEventListener('negotiationneeded', async () => {
      try {
        //@ts-ignore
        const offerDescription = await peerConnection.createOffer(sessionConstraints);
        await peerConnection.setLocalDescription(offerDescription);

        onSignal({
          type: 'offer',
          sdp: offerDescription.sdp,
        });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    });

    // Add the local stream
    //@ts-ignore
    peerConnection.addStream(stream);

    return peerConnection;
  },

  async createReceiverPeer(stream, remoteSignal, onSignal, onStream) {
    const peerConnection = new RTCPeerConnection(configuration) as PeerConnection;
    peerConnection.remoteCandidates = [];

    // Set up event listeners
    //@ts-ignore
    peerConnection.addEventListener('connectionstatechange', () => {
      switch (peerConnection.connectionState) {
        case 'closed':
          console.log('Peer connection closed');
          break;
        case 'connected':
          console.log('Peer connection established');
          break;
      }
    });

    //@ts-ignore
    peerConnection.addEventListener('icecandidate', (event) => {
      if (!event.candidate) {
        console.log('ICE gathering completed');
        return;
      }

      onSignal({
        type: 'candidate',
        candidate: event.candidate,
      });
    });

    //@ts-ignore
    peerConnection.addEventListener('icecandidateerror', (event) => {
      console.warn('ICE candidate error:', event);
    });

    //@ts-ignore
    peerConnection.addEventListener('iceconnectionstatechange', () => {
      switch (peerConnection.iceConnectionState) {
        case 'connected':
        case 'completed':
          console.log('ICE connection established');
          break;
        case 'failed':
          console.error('ICE connection failed');
          break;
      }
    });

    //@ts-ignore
    peerConnection.addEventListener('addstream', (event) => {
      onStream(event.stream);
    });

    // Add the local stream
    //@ts-ignore
    peerConnection.addStream(stream);

    // Handle the initial remote signal (should be an offer)
    if (remoteSignal.type === 'offer' && remoteSignal.sdp) {
      try {
        const offerDescription = new RTCSessionDescription({
          type: 'offer',
          sdp: remoteSignal.sdp,
        });

        await peerConnection.setRemoteDescription(offerDescription);
        //@ts-ignore
        const answerDescription = await peerConnection.createAnswer(sessionConstraints);
        await peerConnection.setLocalDescription(answerDescription);

        // Process any queued candidates
        processCandidates(peerConnection);

        onSignal({
          type: 'answer',
          sdp: answerDescription.sdp,
        });
      } catch (err) {
        console.error('Error creating answer:', err);
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
            handleRemoteCandidate(peer, signalData.candidate);
          }
          break;

        default:
          console.warn('Unknown signal type:', signalData.type);
      }
    } catch (err) {
      console.error('Error handling remote signal:', err);
      throw err;
    }
  },

  destroyPeer(peer) {
    if (peer) {
      // Clean up event listeners and close connection
      peer.close();
    }
  },
};
