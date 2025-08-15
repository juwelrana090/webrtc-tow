import React, { useContext, useState } from "react";
import { Button, TextField } from "@material-ui/core";
import { CopyToClipboard } from "react-copy-to-clipboard";
import VideoPlayer from "@/components/VideoPlayer";
import {
  Assignment,
  Phone,
  PhoneDisabled,
  Mic,
  MicOff,
  Call,
  VideocamOff,
  Videocam,
} from "@material-ui/icons";
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
    toggleVideo,
    toggleAudio,
    isVideo,
    isAudio,
  } = socketContext;

  return (
    <div className="w-full">
      <div className="w-full flex items-center justify-center">{children}</div>
      <div className="w-full rounded-[12px] border border-[#F0F3FA]/10 bg-[#F0F3FA] shadow-md">
        <div className="w-full">
          <div className="flex h-[34px] w-full items-center justify-end">
            <div className="absolute right-1 top-1 flex cursor-pointer items-center justify-center rounded-full p-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                height={24}
                viewBox="0 0 32 32"
              >
                <path
                  fill="black"
                  d="M16 2C8.2 2 2 8.2 2 16s6.2 14 14 14s14-6.2 14-14S23.8 2 16 2m0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12s-5.4 12-12 12"
                ></path>
                <path
                  fill="black"
                  d="M21.4 23L16 17.6L10.6 23L9 21.4l5.4-5.4L9 10.6L10.6 9l5.4 5.4L21.4 9l1.6 1.6l-5.4 5.4l5.4 5.4z"
                ></path>
              </svg>
            </div>
          </div>

          <div className="flex w-full items-center justify-center p-4">
            <div className="flex h-[350px] w-full flex-col items-center justify-center rounded-2xl border-gray-50/15 bg-white shadow-sm">
              <div className="flex w-full items-center justify-center overflow-hidden px-12 py-3">
                <VideoPlayer />
              </div>
            </div>
          </div>

          <div className="w-full mt-2 px-4 py-2 flex items-center justify-center gap-4 flex-wrap">
            <form
              className="w-full  p-3 grid grid-cols-1 gap-4"
              noValidate
              autoComplete="off"
            >
              <div className="w-full flex justify-start gap-2">
                <label
                  className="w-full mb-2 text-black text-[32px] font-medium"
                  htmlFor="name"
                >
                  Account Info :
                </label>
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <TextField
                    className="w-full"
                    id="name"
                    label="Name"
                    variant="outlined"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <CopyToClipboard text={me ?? ""}>
                    <span className="w-[100px] px-4 py-3 bg-blue-500 text-white rounded flex justify-center items-center cursor-pointer gap-4">
                      <Assignment />
                    </span>
                  </CopyToClipboard>
                </div>
              </div>
              <div className="w-full flex justify-start gap-2">
                <label
                  className="w-full mb-2 text-black text-[32px] font-medium"
                  htmlFor="idToCall"
                >
                  Make a Call
                </label>
                <div className="w-full">
                  <TextField
                    className="w-full"
                    id="idToCall"
                    label="ID to call"
                    variant="outlined"
                    value={idToCall}
                    onChange={(e) => setIdToCall(e.target.value)}
                  />
                </div>
              </div>
            </form>
          </div>
          <div className="flex w-full items-center justify-between px-0.5 py-4">
            <ul className="flex justify-start gap-2">
              <li>
                <div className="flex items-center justify-between gap-4 rounded-full border-gray-50 bg-white px-3 py-2">
                  {/* <DeviceSelectors
                    type="audio"
                    selectedDeviceId={audioDeviceID}
                    onChange={setAudioDeviceID}
                  /> */}
                  {isAudio ? (
                    <button
                      type="button"
                      aria-label="Toggle Microphone"
                      className="btn flex h-12 w-12 items-center justify-center rounded-full border-transparent bg-green-500 text-white hover:bg-green-600"
                      onClick={toggleAudio}
                    >
                      <span className="flex h-12 w-12 items-center justify-center bg-transparent text-xl">
                        <Mic />
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Toggle Microphone"
                      className="btn flex h-12 w-12 items-center justify-center rounded-full border-transparent bg-green-500 text-white hover:bg-green-600"
                      onClick={toggleAudio}
                    >
                      <span className="flex h-12 w-12 items-center justify-center bg-transparent text-xl">
                        <MicOff />
                      </span>
                    </button>
                  )}
                </div>
              </li>
              <li>
                <div className="flex items-center justify-between gap-4 rounded-full border-gray-50 bg-white px-3 py-2">
                  {/* <DeviceSelectors
                    type="video"
                    selectedDeviceId={videoDeviceID}
                    onChange={setVideoDeviceID}
                  /> */}
                  {isVideo ? (
                    <button
                      type="button"
                      aria-label="Toggle Microphone"
                      className="btn flex h-12 w-12 items-center justify-center rounded-full border-transparent bg-green-500 text-white hover:bg-green-600"
                      onClick={toggleVideo}
                    >
                      <span className="flex h-12 w-12 items-center justify-center bg-transparent text-xl">
                        <Videocam />
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Toggle Microphone"
                      className="btn flex h-12 w-12 items-center justify-center rounded-full border-transparent bg-green-500 text-white hover:bg-green-600"
                      onClick={toggleVideo}
                    >
                      <span className="flex h-12 w-12 items-center justify-center bg-transparent text-xl">
                        <VideocamOff />
                      </span>
                    </button>
                  )}
                </div>
              </li>
            </ul>
            <ul className="mb-1 flex justify-end">
              {callAccepted && !callEnded ? (
                <>
                  <li className="ml-0 mr-2 px-2">
                    <button
                      type="button"
                      aria-label="Toggle Microphone"
                      className="btn flex h-12 w-12 items-center justify-center rounded-full border-transparent bg-red-500 text-white hover:bg-red-600"
                      onClick={() => leaveCall(idToCall ?? me ?? "")}
                    >
                      <span className="flex h-12 w-12 items-center justify-center bg-transparent text-xl">
                        <PhoneDisabled />
                      </span>
                    </button>
                  </li>
                </>
              ) : (
                <>
                  {call?.isReceivingCall && !callAccepted ? (
                    <li className="px-2">
                      <button
                        type="button"
                        aria-label="Toggle Microphone"
                        className="btn flex h-12 w-12 items-center justify-center rounded-full border-transparent bg-green-500 text-white hover:bg-green-600"
                        onClick={answerCall}
                      >
                        <span className="flex h-12 w-12 items-center justify-center bg-transparent text-xl">
                          <Call />
                        </span>
                      </button>
                    </li>
                  ) : (
                    <li className="px-2">
                      <button
                        type="button"
                        aria-label="Toggle Microphone"
                        className="btn flex h-12 w-12 items-center justify-center rounded-full border-transparent bg-green-500 text-white hover:bg-green-600"
                        onClick={() => callUser(idToCall ?? me ?? "")}
                      >
                        <span className="flex h-12 w-12 items-center justify-center bg-transparent text-xl">
                          <Call />
                        </span>
                      </button>
                    </li>
                  )}
                  <li className="ml-0 mr-2 px-2">
                    <button
                      type="button"
                      aria-label="Toggle Microphone"
                      className="btn flex h-12 w-12 items-center justify-center rounded-full border-transparent bg-red-500 text-white hover:bg-red-600"
                      onClick={() => leaveCall(idToCall ?? me ?? "")}
                    >
                      <span className="flex h-12 w-12 items-center justify-center bg-transparent text-xl">
                        <PhoneDisabled />
                      </span>
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Options;
