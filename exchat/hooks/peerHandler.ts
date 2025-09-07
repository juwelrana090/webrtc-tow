import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';

export interface SignalData {
  type?: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: RTCIceCandidateInit; // Changed to RTCIceCandidateInit for better compatibility
}

export interface PeerInstance {
  addStream: (stream: MediaStream) => void;
  createOffer: () => Promise<RTCSessionDescription>;
  createAnswer: () => Promise<RTCSessionDescription>;
  setLocalDescription: (description: RTCSessionDescription) => Promise<void>;
  setRemoteDescription: (description: RTCSessionDescription) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidate) => Promise<void>;
  close: () => void;
  onicecandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null;
  onaddstream: ((event: { stream: MediaStream }) => void) | null;
}

export interface PeerHandlers {
  createInitiatorPeer: (
    stream: MediaStream,
    onSignal: (signalData: SignalData) => void,
    onStream: (remoteStream: MediaStream) => void
  ) => PeerInstance;
  createReceiverPeer: (
    stream: MediaStream,
    onSignal: (signalData: SignalData) => void,
    onStream: (remoteStream: MediaStream) => void
  ) => PeerInstance;
  destroyPeer: (peer: PeerInstance | null) => void;
  handleSignal: (
    peer: PeerInstance,
    signal: SignalData,
    onSignal: (signalData: SignalData) => void
  ) => void;
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
  iceCandidatePoolSize: 10, // Added for better performance
};

class PeerWrapper implements PeerInstance {
  public peerConnection: RTCPeerConnection;
  private pendingCandidates: RTCIceCandidate[] = [];
  private isRemoteDescriptionSet = false;

  public onicecandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null = null;
  public onaddstream: ((event: { stream: MediaStream }) => void) | null = null;

  constructor() {
    this.peerConnection = new RTCPeerConnection(configuration);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    //@ts-ignore
    this.peerConnection.onicecandidate = (event) => {
      if (this.onicecandidate) {
        this.onicecandidate(event);
      }
    };

    //@ts-ignore
    this.peerConnection.onaddstream = (event) => {
      if (this.onaddstream) {
        this.onaddstream(event);
      }
    };

    // Add additional event handlers for better error handling
    //@ts-ignore
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed:', this.peerConnection.connectionState);
    };

    //@ts-ignore
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', this.peerConnection.iceConnectionState);
    };
  }

  addStream(stream: MediaStream) {
    //@ts-ignore
    this.peerConnection.addStream(stream);
  }

  async createOffer(): Promise<RTCSessionDescription> {
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescription> {
    const answer = await this.peerConnection.createAnswer();
    return answer;
  }

  async setLocalDescription(description: RTCSessionDescription): Promise<void> {
    await this.peerConnection.setLocalDescription(description);
  }

  async setRemoteDescription(description: RTCSessionDescription): Promise<void> {
    try {
      await this.peerConnection.setRemoteDescription(description);
      this.isRemoteDescriptionSet = true;

      // Add any pending ICE candidates
      for (const candidate of this.pendingCandidates) {
        await this.peerConnection.addIceCandidate(candidate);
      }
      this.pendingCandidates = [];
    } catch (error) {
      console.error('Error setting remote description:', error);
      throw error;
    }
  }

  async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    try {
      if (this.isRemoteDescriptionSet) {
        await this.peerConnection.addIceCandidate(candidate);
      } else {
        // Queue the candidate until remote description is set
        this.pendingCandidates.push(candidate);
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
      throw error;
    }
  }

  close() {
    this.peerConnection.close();
  }
}

export const peerHandler: PeerHandlers = {
  createInitiatorPeer(stream, onSignal, onStream) {
    const peer = new PeerWrapper();

    peer.addStream(stream);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        onSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON(), // Convert to JSON for better serialization
        });
      }
    };

    peer.onaddstream = (event) => {
      onStream(event.stream);
    };

    // Create and set offer
    peer
      .createOffer()
      .then((offer) => {
        return peer.setLocalDescription(offer);
      })
      .then(() => {
        // Get the local description after setting it
        if (peer.peerConnection.localDescription) {
          onSignal({
            type: 'offer',
            sdp: peer.peerConnection.localDescription.sdp,
          });
        }
      })
      .catch((error) => {
        console.error('Error creating offer:', error);
      });

    return peer;
  },

  createReceiverPeer(stream, onSignal, onStream) {
    const peer = new PeerWrapper();

    peer.addStream(stream);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        onSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON(), // Convert to JSON for better serialization
        });
      }
    };

    peer.onaddstream = (event) => {
      onStream(event.stream);
    };

    return peer;
  },

  destroyPeer(peer) {
    if (peer) {
      peer.close();
    }
  },

  handleSignal(peer: PeerInstance, signal: SignalData, onSignal: (signalData: SignalData) => void) {
    if (signal.type === 'offer' && signal.sdp) {
      const remoteDescription = new RTCSessionDescription({
        type: 'offer',
        sdp: signal.sdp,
      });

      peer
        .setRemoteDescription(remoteDescription)
        .then(() => {
          return peer.createAnswer();
        })
        .then((answer) => {
          return peer.setLocalDescription(answer);
        })
        .then(() => {
          if (peer instanceof PeerWrapper && peer.peerConnection.localDescription) {
            onSignal({
              type: 'answer',
              sdp: peer.peerConnection.localDescription.sdp,
            });
          }
        })
        .catch((error) => {
          console.error('Error handling offer:', error);
        });
    } else if (signal.type === 'answer' && signal.sdp) {
      const remoteDescription = new RTCSessionDescription({
        type: 'answer',
        sdp: signal.sdp,
      });

      peer.setRemoteDescription(remoteDescription).catch((error) => {
        console.error('Error setting remote description (answer):', error);
      });
    } else if (signal.type === 'candidate' && signal.candidate) {
      const iceCandidate = new RTCIceCandidate(signal.candidate);
      peer.addIceCandidate(iceCandidate).catch((error) => {
        console.error('Error adding ICE candidate:', error);
      });
    }
  },
};
