import React, { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

interface ISocketContext {
  call: {
    isReceivingCall: boolean;
    from: string;
    name: string;
    signal: any;
  } | null;
  callAccepted: boolean;
  myVideo: React.RefObject<any>;
  userVideo: React.RefObject<any>;
  stream: MediaStream | null;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  callEnded: boolean;
  me: string | null;
  answerCall: () => void;
  callUser: (userId: string) => void;
  leaveCall: () => void;
}

const SocketContext = createContext<ISocketContext | null>(null);
const socket = io("http://localhost:5000");

const ContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [call, setCall] = useState<{
    isReceivingCall: boolean;
    from: string;
    name: string;
    signal: any;
  } | null>(null);
  const [callAccepted, setCallAccepted] = useState<boolean>(false);
  const [callEnded, setCallEnded] = useState<boolean>(false);
  const [name, setName] = useState<string>("");

  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const connectionRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);

        //@ts-ignore
        myVideo.current?.srcObject = currentStream;
      });

    socket.on("me", (id: string) => setMe(id));

    socket.on("callUser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });
  }, []);

  const answerCall = () => {
    if (call !== null) {
      setCallAccepted(true);
      const peer = new Peer({ initiator: false, trickle: false });

      peer.on("signal", (data) => {
        socket.emit("answerCall", { signal: data, to: call.from });
      });

      peer.on("stream", (currentStream) => {
        //@ts-ignore
        userVideo.current?.srcObject = currentStream;
      });

      peer.signal(call.signal);

      //@ts-ignore
      connectionRef.current = peer;
    }
  };

  const callUser = (userId: string) => {
    const peer = new Peer({ initiator: true, trickle: false });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: userId,
        signalData: data,
        from: me,
        name,
      });
    });

    peer.on("stream", (currentStream) => {
      //@ts-ignore
      userVideo.current?.srcObject = currentStream;
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    //@ts-ignore
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);

    //@ts-ignore
    connectionRef.current.destroy();
    window.location.reload();
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
