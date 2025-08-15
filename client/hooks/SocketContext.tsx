"use client";

import React, { createContext, useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";

// <-- Peer handler
import { peerHandler } from "./peerHandler";

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
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://42c17942b859.ngrok-free.app"
);

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
  const connectionRef = useRef<ReturnType<
    typeof peerHandler.createInitiatorPeer
  > | null>(null);

  // Attach immediately
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
      setMe(id);
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
      setCall(null);
      setCallEnded(true);
      setCallAccepted(false);

      if (userVideo.current?.srcObject) {
        (userVideo.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
        userVideo.current.srcObject = null;
      }

      peerHandler.destroyPeer(connectionRef.current);
      connectionRef.current = null;
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
      socket.off("leaveCall");
    };
  }, []);

  // ==================== Call Actions ====================
  const answerCall = () => {
    if (!call || !stream) return;

    const peer = peerHandler.createReceiverPeer(
      stream,
      call.signal,
      (signalData) => {
        socket.emit("answerCall", { signal: signalData, to: call.from });
      },
      (remoteStream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      }
    );

    connectionRef.current = peer;
    setCallAccepted(true);
  };

  const callUser = (userId: string) => {
    if (!stream) return;

    const peer = peerHandler.createInitiatorPeer(
      stream,
      (signalData) => {
        socket.emit("callUser", {
          userToCall: userId,
          signalData,
          from: socket.id || me,
          name,
        });
      },
      (remoteStream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      }
    );

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

    if (userVideo.current?.srcObject) {
      (userVideo.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      userVideo.current.srcObject = null;
    }

    peerHandler.destroyPeer(connectionRef.current);
    connectionRef.current = null;
  };

  // ==================== Media Toggles ====================
  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideo(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudio(audioTrack.enabled);
      }
    }
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
        me: socket.id || me,
        answerCall,
        callUser,
        leaveCall,
        isVideo,
        setIsVideo,
        isAudio,
        setIsAudio,
        toggleVideo,
        toggleAudio,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
