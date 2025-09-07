import Peer from "simple-peer";

export interface PeerHandlers {
  createInitiatorPeer: (
    stream: MediaStream,
    onSignal: (signalData: Peer.SignalData) => void,
    onStream: (remoteStream: MediaStream) => void
  ) => Peer.Instance;

  createReceiverPeer: (
    stream: MediaStream,
    remoteSignal: Peer.SignalData,
    onSignal: (signalData: Peer.SignalData) => void,
    onStream: (remoteStream: MediaStream) => void
  ) => Peer.Instance;
  destroyPeer: (peer: Peer.Instance | null) => void;
}

const configuration: RTCConfiguration = {
  iceServers: [
    // Your TURN server
    {
      urls: [
        "stun:188.245.189.30:3478",
        "turn:188.245.189.30:3478",
        "turn:188.245.189.30:3478?transport=tcp",
      ],
      username: "turnserver",
      credential: "dev",
    },

    // With SSL (if configured)
    {
      urls: [
        "turns:188.245.189.30:5349",
        "turns:188.245.189.30:5349?transport=tcp",
      ],
      username: "turnserver",
      credential: "dev",
    },

    // Backup public STUN
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "stun:stun1.l.google.com:19302",
    },
    {
      urls: "stun:stun2.l.google.com:19302",
    },
    {
      urls: "stun:stun3.l.google.com:19302",
    },
    {
      urls: "stun:stun4.l.google.com:19302",
    },
  ],
};

export const peerHandler: PeerHandlers = {
  createInitiatorPeer(stream, onSignal, onStream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: configuration,
    });

    peer.on("signal", onSignal);
    peer.on("stream", onStream);

    return peer;
  },

  createReceiverPeer(stream, remoteSignal, onSignal, onStream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: configuration,
    });

    peer.on("signal", onSignal);
    peer.on("stream", onStream);

    peer.signal(remoteSignal);

    return peer;
  },

  destroyPeer(peer) {
    if (peer) {
      peer.destroy();
    }
  },
};
