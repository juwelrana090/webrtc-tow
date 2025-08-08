"use client";

import React, { useContext } from "react";
import { SocketContext } from "@/hooks/SocketContext";
import { Phone } from "@material-ui/icons";

const Notifications = () => {
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
    <>
      {call?.isReceivingCall && !callAccepted && (
        <div className="flex justify-center items-center p-4 bg-yellow-200 text-black rounded">
          <h2 className="text-lg font-semibold">{call.name} is calling:</h2>
          <span
            onClick={answerCall}
            className="ml-2 px-4 py-1.5 bg-green-500 text-white rounded flex items-center cursor-pointer gap-4"
          >
            <Phone />
            Answer
          </span>
        </div>
      )}
    </>
  );
};

export default Notifications;
