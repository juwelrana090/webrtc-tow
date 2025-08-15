"use client";

import Notifications from "@/components/Notifications";
import Options from "@/components/Options";
import { ContextProvider } from "@/hooks/SocketContext";

export default function Home() {
  return (
    <ContextProvider>
      <main className="w-full h-screen text-black dark:text-white flex flex-col items-center">
        <div className="w-full flex items-center justify-center mt-4">
          <div className="w-[300px] bg-gray-700 rounded p-4 text-center">
            <h2 className="text-2xl font-bold">Video Chat App</h2>
          </div>
        </div>
        <Options>
          <div className="w-full">
            <Notifications />
          </div>
        </Options>
      </main>
    </ContextProvider>
  );
}
