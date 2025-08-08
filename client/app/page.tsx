"use client";

import Notifications from "@/components/Notifications";
import Options from "@/components/Options";
import VideoPlayer from "@/components/VideoPlayer";
import { ContextProvider, SocketContext } from "@/hooks/SocketContext";

export default function Home() {
  return (
    <ContextProvider>
      <div className="w-full h-screen text-black dark:text-white flex flex-col items-center ">
        <div className="w-full flex items-center justify-center mt-4">
          <div className="w-[300px] bg-gray-700 rounded p-4 text-center">
            <h2 className="text-2xl font-bold">Video Chat App</h2>
          </div>
        </div>
        <div className="w-full">
          {/* Video Player */}
          <VideoPlayer />
        </div>

        <Options>
          <div className="w-full">
            {/* Notifications */}
            <Notifications />
          </div>
        </Options>
        <div className="w-full"></div>
      </div>
    </ContextProvider>
  );
}
