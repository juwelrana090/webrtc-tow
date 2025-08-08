import React, { useContext, useState } from "react";
import { Button, TextField } from "@material-ui/core";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Assignment, Phone, PhoneDisabled } from "@material-ui/icons";
import { SocketContext } from "@/hooks/SocketContext";

const Options: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketContext = useContext(SocketContext);
  const [idToCall, setIdToCall] = useState("");

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
    <div className="w-full bg-gray-100 p-4">
      <div className="w-full">
        <form
          className="w-full flex justify-between gap-2"
          noValidate
          autoComplete="off"
        >
          <div className="w-full">
            <label
              className="w-full mb-2 text-black text-[32px] font-medium"
              htmlFor="name"
            >
              Account Info
            </label>
            <TextField
              className="w-full"
              id="name"
              label="Name"
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <CopyToClipboard text={me ?? ""}>
              <button className="mt-2 p-2 bg-blue-500 text-white rounded flex items-center cursor-pointer">
                <Assignment />
                <span className="ml-2">Copy ID</span>
              </button>
            </CopyToClipboard>
          </div>
          <div className="w-full">
            <label
              className="w-full mb-2 text-black text-[32px] font-medium"
              htmlFor="idToCall"
            >
              Make a Call
            </label>
            <TextField
              className="w-full"
              id="idToCall"
              label="ID to call"
              variant="outlined"
              value={idToCall}
              onChange={(e) => setIdToCall(e.target.value)}
            />
            {callAccepted && !callEnded ? (
              <button className="mt-2 p-2 bg-red-500 text-white rounded flex items-center cursor-pointer">
                <PhoneDisabled />
                <span className="ml-2">Hang Up</span>
              </button>
            ) : (
              <button className="mt-2 p-2 bg-blue-500 text-white rounded flex items-center cursor-pointer">
                <Phone />
                <span className="ml-2">Call</span>
              </button>
            )}
          </div>
          <div className="w-full"></div>
        </form>
      </div>
      <div className="w-full "></div>
      <div className="w-full flex items-center justify-center">{children}</div>
    </div>
  );
};

export default Options;
