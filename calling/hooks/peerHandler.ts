import {
    MediaStream,
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription,
} from 'react-native-webrtc';

export interface SignalData {
  type?: 'offer' | 'answer';
  sdp?: string;
  candidate?: RTCIceCandidate;
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
    remoteSignal: SignalData,
    onSignal: (signalData: SignalData) => void,
    onStream: (remoteStream: MediaStream) => void
  ) => PeerInstance;
  destroyPeer: (peer: PeerInstance | null) => void;
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

class PeerWrapper implements PeerInstance {
  private peerConnection: RTCPeerConnection;
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
        this.onicecandidate({ candidate: event.candidate });
      }
    };

    //@ts-ignore
    this.peerConnection.onaddstream = (event) => {
      if (this.onaddstream) {
        this.onaddstream({ stream: event.stream });
      }
    };
  }

  addStream(stream: MediaStream) {
    //@ts-ignore
    this.peerConnection.addStream(stream);
  }

  async createOffer(): Promise<RTCSessionDescription> {
    const offer = await this.peerConnection.createOffer();
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
    await this.peerConnection.setRemoteDescription(description);
    this.isRemoteDescriptionSet = true;

    // Add any pending ICE candidates
    for (const candidate of this.pendingCandidates) {
      await this.peerConnection.addIceCandidate(candidate);
    }
    this.pendingCandidates = [];
  }

  async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (this.isRemoteDescriptionSet) {
      await this.peerConnection.addIceCandidate(candidate);
    } else {
      // Queue the candidate until remote description is set
      this.pendingCandidates.push(candidate);
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
        onSignal({ candidate: event.candidate });
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
        onSignal({
          type: 'offer',
          //@ts-ignore
          sdp: peer.peerConnection.localDescription?.sdp,
        });
      })
      .catch((error) => {
        console.error('Error creating offer:', error);
      });

    return peer;
  },

  createReceiverPeer(stream, remoteSignal, onSignal, onStream) {
    const peer = new PeerWrapper();

    peer.addStream(stream);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        onSignal({ candidate: event.candidate });
      }
    };

    peer.onaddstream = (event) => {
      onStream(event.stream);
    };

    // Handle the remote signal
    if (remoteSignal.type === 'offer' && remoteSignal.sdp) {
      const remoteDescription = new RTCSessionDescription({
        type: 'offer',
        sdp: remoteSignal.sdp,
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
          onSignal({
            type: 'answer',
            //@ts-ignore
            sdp: peer.peerConnection.localDescription?.sdp,
          });
        })
        .catch((error) => {
          console.error('Error handling offer:', error);
        });
    } else if (remoteSignal.candidate) {
      peer.addIceCandidate(remoteSignal.candidate).catch((error) => {
        console.error('Error adding ICE candidate:', error);
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
