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
  leaveCall: () => void;
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
    // Add TURN servers here if needed (paid)
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

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Peer.Instance | null>(null);

  // Get camera & mic stream
  useEffect(() => {
    const getMedia = async () => {
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
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

    // Socket listeners
    socket.on("me", (id: string) => setMe(id));

    socket.on("callUser", ({ from, name, signal }) => {
      setCall({
        isReceivingCall: true,
        from,
        name,
        signal,
      });
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
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
        from: me,
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

  const leaveCall = () => {
    setCallEnded(true);
    setCall(null);
    setCallAccepted(false);

    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    window.location.reload(); // Optional
  };

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
        me,
        answerCall,
        callUser,
        leaveCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
