"use client";

import React, { useContext, useEffect } from "react";
import { SocketContext } from "@/hooks/SocketContext";

const VideoPlayer = () => {
  const socketContext = useContext(SocketContext);

  if (!socketContext) {
    return <div>Socket context not available.</div>;
  }

  const { call, callAccepted, myVideo, userVideo, stream, name, callEnded } =
    socketContext;

  // ✅ Attach stream to video when it's available
  useEffect(() => {
    if (myVideo.current && stream) {
      myVideo.current.srcObject = stream;
    }
  }, [stream, myVideo]);

  return (
    <div className="container mx-auto mt-2 px-4 py-2  flex flex-col lg:flex-col-reverse items-center justify-center gap-4 flex-wrap">
      {/* My Video */}
      <div className="flex flex-col items-center justify-center p-3 bg-white border-2 border-dashed border-gray-300 rounded-lg">
        <h3 className="text-lg text-black font-semibold mb-2">
          {name || "Me"}
        </h3>
        <video
          ref={myVideo}
          muted
          autoPlay
          playsInline
          className="min-w-[300px] max-w-[550px] h-auto rounded"
        />
      </div>

      {/* User Video */}
      {callAccepted && !callEnded && (
        <div className="flex flex-col items-center justify-center p-3 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
          <h3 className="text-lg text-black font-semibold mb-2">
            {call?.name || "Caller"}
          </h3>
          <video
            ref={userVideo}
            autoPlay
            playsInline
            className="min-w-[300px] max-w-[550px] h-auto rounded"
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
