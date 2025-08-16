"use client";

import React, { createContext, useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import Peer from "simple-peer";

// ==================== Types ====================
interface CallInfo {
  isReceivingCall: boolean;
  from: string;
  name: string;
  signal: any;
}

interface ISocketContext {
  call: CallInfo | null;
  callAccepted: boolean;
  myVideo: React.RefObject<HTMLVideoElement | null>;
  userVideo: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  callEnded: boolean;
  me: string | null;
  answerCall: () => void;
  callUser: (userId: string) => void;
  leaveCall: (userId: string) => void;
  isVideo: boolean;
  setIsVideo: React.Dispatch<React.SetStateAction<boolean>>;
  isAudio: boolean;
  setIsAudio: React.Dispatch<React.SetStateAction<boolean>>;
  toggleVideo: () => void;
  toggleAudio: () => void;
}

// ==================== Context ====================
const SocketContext = createContext<ISocketContext | null>(null);

// ==================== Socket ====================
const socket: Socket = io(
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"
);

const configuration = {
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

// ==================== Provider ====================
const ContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [call, setCall] = useState<CallInfo | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [isVideo, setIsVideo] = useState(true);
  const [isAudio, setIsAudio] = useState(true);

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Peer.Instance | null>(null);

  // Attach immediately, outside useEffect
  socket.on("connect", () => {
    console.log("Connected to socket:", socket.id);
  });

  // Get camera & mic stream
  useEffect(() => {
    const getMedia = async () => {
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({
          video: isVideo,
          audio: isAudio,
        });
        setStream(currentStream);

        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    getMedia();

    socket.on("me", (id: string) => {
      console.log("Got socket ID:", id);
      setMe(id); // you might need useState callback form here
    });

    socket.on("callUser", ({ from, name, signal }) => {
      setCall({
        isReceivingCall: true,
        from,
        name,
        signal,
      });
    });

    socket.on("leaveCall", () => {
      // same cleanup on their side, e.g.:
      setCall(null);
      setCallEnded(true);
      setCallAccepted(false);

      if (userVideo.current && userVideo.current.srcObject) {
        (userVideo.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
        userVideo.current.srcObject = null;
      }

      if (connectionRef.current) {
        connectionRef.current.destroy();
        connectionRef.current = null;
      }
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
      socket.off("leaveCall");
    };
  }, []);

  const answerCall = () => {
    if (!call) return;

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream || undefined,
      config: configuration,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: call.from });
    });

    peer.on("stream", (currentStream: MediaStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    peer.signal(call.signal);
    connectionRef.current = peer;

    setCallAccepted(true);
  };

  const callUser = (userId: string) => {
    console.log("Calling user:", userId);
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream || undefined,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }, // STUN server
        ],
      },
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: userId,
        signalData: data,
        from: socket.id || me,
        name,
      });
    });

    peer.on("stream", (currentStream: MediaStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const leaveCall = (userId: string) => {
    setCallEnded(true);
    setCall(null);
    setCallAccepted(false);

    socket.emit("leaveCall", { to: userId });

    // Stop remote video tracks safely
    if (userVideo.current && userVideo.current.srcObject) {
      const remoteStream = userVideo.current.srcObject as MediaStream;
      remoteStream.getTracks().forEach((track) => track.stop());
      userVideo.current.srcObject = null;
    }

    // Stop local stream if you want to free camera/mic
    // if (stream) {
    //   stream.getTracks().forEach((track) => track.stop());
    //   setStream(null);
    // }

    // Destroy the peer connection
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideo(videoTrack.enabled);
      }
    }
  };

  // Toggle Audio
  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudio(audioTrack.enabled);
      }
    }
  };

  console.log("socket.id:", socket.id);
  console.log("socket.id me:", me);

  return (
    <SocketContext.Provider
      value={{
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        name,
        setName,
        callEnded,
        me: socket.id || me,
        answerCall,
        callUser,
        leaveCall,
        isVideo,
        setIsVideo,
        isAudio,
        setIsAudio,
        toggleVideo, // NEW
        toggleAudio, // NEW
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
