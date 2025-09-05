"use client";

import React from "react";
import { ContextProvider } from "@/hooks/SocketContext";
import AddUser from "@/components/AddUser";

export default function Home() {
  return (
    <ContextProvider>
      <main className="w-full h-screen text-black dark:text-white flex flex-col items-center">
        <div className="w-full flex items-center justify-center mt-4">
          <div className="w-[300px] bg-gray-700 rounded p-4 text-center">
            <h2 className="text-2xl font-bold">QuickChat</h2>
          </div>
        </div>

        <div className="w-full flex items-center justify-center mt-4">
          <AddUser />
        </div>
      </main>
    </ContextProvider>
  );
}
