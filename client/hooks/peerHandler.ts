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
        { urls: "stun:23.21.150.121" },
        { urls: "stun:stun01.sipphone.com" },
        { urls: "stun:stun.ekiga.net" },
        { urls: "stun:stun.fwdnet.net" },
        { urls: "stun:stun.ideasip.com" },
        { urls: "stun:stun.iptel.org" },
        { urls: "stun:stun.rixtelecom.se" },
        { urls: "stun:stun.schlund.de" },
        { urls: "stun:stunserver.org" },
        { urls: "stun:stun.softjoys.com" },
        { urls: "stun:stun.voiparound.com" },
        { urls: "stun:stun.voipbuster.com" },
        { urls: "stun:stun.voipstunt.com" },
        { urls: "stun:stun.voxgratia.org" },
        { urls: "stun:stun.xten.com" },
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
