"use client";

import React, { useContext } from "react";
import { SocketContext } from "@/hooks/SocketContext";

const VideoPlayer = () => {
  const socketContext = useContext(SocketContext);

  if (!socketContext) {
    return <div>Socket context not available.</div>;
  }

  const {
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
  } = socketContext;

  return (
    <div className="w-full mt-2 px-4 py-2 flex items-center justify-center gap-2">
      {/* My Video */}
      {stream && (
        <div className="flex flex-col items-center justify-center p-3 bg-white border-2 border-dashed border-gray-300 rounded-lg">
          <div className="w-full">
            <h3 className="text-lg text-black font-semibold">
              {name || "Name"}
            </h3>
          </div>
          <video
            ref={myVideo}
            className="min-w-[300px] max-w-[550px] h-full mt-2"
            autoPlay
            playsInline
            muted
          />
        </div>
      )}

      {/* user Video */}
      {callAccepted && !callEnded && (
        <div className="flex flex-col items-center justify-center p-3 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="w-full">
            <h3 className="text-lg text-black font-semibold">
              {call?.name || "Name"}
            </h3>
          </div>
          <video
            ref={userVideo}
            className="min-w-[300px] max-w-[550px] h-full mt-2"
            autoPlay
            playsInline
            muted
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
