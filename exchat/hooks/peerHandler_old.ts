import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';

export interface SignalData {
  type?: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
  candidate?: RTCIceCandidate;
}

export interface PeerHandlers {
  createInitiatorPeer: (
    stream: MediaStream,
    onSignal: (signalData: SignalData) => void,
    onStream: (remoteStream: MediaStream) => void
  ) => RTCPeerConnection;
  createReceiverPeer: (
    stream: MediaStream,
    remoteSignal: SignalData,
    onSignal: (signalData: SignalData) => void,
    onStream: (remoteStream: MediaStream) => void
  ) => RTCPeerConnection;
  destroyPeer: (peer: RTCPeerConnection | null) => void;
}

const configuration = {
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

export const peerHandler: PeerHandlers = {
  createInitiatorPeer(stream, onSignal, onStream) {
    const peer = new RTCPeerConnection(configuration) as any;

    // Add stream to peer connection
    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    // Handle ICE candidates
    peer.onicecandidate = (event: any) => {
      if (event.candidate) {
        onSignal({ candidate: event.candidate });
      }
    };

    // Handle remote stream
    peer.onaddstream = (event: any) => {
      onStream(event.stream);
    };

    // Create offer
    peer
      .createOffer()
      .then((offer: any) => {
        return peer.setLocalDescription(offer);
      })
      .then(() => {
        if (peer.localDescription) {
          onSignal({
            type: peer.localDescription.type as 'offer',
            sdp: peer.localDescription.sdp,
          });
        }
      })
      .catch((error: any) => {
        console.error('Error creating offer:', error);
      });

    return peer;
  },

  createReceiverPeer(stream, remoteSignal, onSignal, onStream) {
    const peer = new RTCPeerConnection(configuration) as any;

    // Add stream to peer connection
    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    // Handle ICE candidates
    peer.onicecandidate = (event: any) => {
      if (event.candidate) {
        onSignal({ candidate: event.candidate });
      }
    };

    // Handle remote stream
    peer.onaddstream = (event: any) => {
      onStream(event.stream);
    };

    // Set remote description and create answer
    if (remoteSignal.type && remoteSignal.sdp) {
      const remoteDescription = new RTCSessionDescription({
        type: remoteSignal.type,
        sdp: remoteSignal.sdp,
      });

      peer
        .setRemoteDescription(remoteDescription)
        .then(() => {
          return peer.createAnswer();
        })
        .then((answer: any) => {
          return peer.setLocalDescription(answer);
        })
        .then(() => {
          if (peer.localDescription) {
            onSignal({
              type: peer.localDescription.type as 'answer',
              sdp: peer.localDescription.sdp,
            });
          }
        })
        .catch((error: any) => {
          console.error('Error handling remote signal:', error);
        });
    }

    return peer;
  },

  destroyPeer(peer) {
    if (peer) {
      peer.close();
    }
  },
};

// Helper function to handle signaling after peer creation
export const handleSignal = (peer: RTCPeerConnection, signalData: SignalData): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signalData.candidate) {
      // Handle ICE candidate
      peer
        .addIceCandidate(signalData.candidate)
        .then(() => resolve())
        .catch(reject);
    } else if (signalData.type && signalData.sdp) {
      // Handle SDP (answer from receiver)
      const remoteDescription = new RTCSessionDescription({
        type: signalData.type,
        sdp: signalData.sdp,
      });

      peer
        .setRemoteDescription(remoteDescription)
        .then(() => resolve())
        .catch(reject);
    } else {
      resolve();
    }
  });
};
