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
    <div className="w-full">
      <div className="w-full mt-2 px-4 py-2 flex items-center justify-center gap-4 flex-wrap">
        <form
          className="container mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-3 grid grid-cols-1 lg:grid-cols-2 gap-4"
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
            <CopyToClipboard text={me ?? ""} onCopy={() => alert("ID copied!")}>
              <span className="w-full mt-2 px-4 py-1.5 bg-blue-500 text-white rounded flex items-center cursor-pointer gap-4">
                <Assignment />
                <span className="ml-2">Copy ID</span>
              </span>
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
              <button
                className="w-full mt-2 p-2 bg-red-500 text-white rounded flex items-center cursor-pointer"
                onClick={leaveCall}
              >
                <PhoneDisabled />
                <span className="ml-2">Hang Up</span>
              </button>
            ) : (
              <span
                className="w-full mt-2 px-4 py-1.5 bg-green-500 text-white rounded flex items-center cursor-pointer gap-4"
                onClick={() => callUser(idToCall)}
              >
                <Phone />
                <span className="ml-2">Call</span>
              </span>
            )}
          </div>
        </form>
      </div>
      <div className="w-full flex items-center justify-center">{children}</div>
    </div>
  );
};

export default Options;
