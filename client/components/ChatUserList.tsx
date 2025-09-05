"use client";
import React, { useEffect, useState, useContext } from "react";
import Link from "next/link";
import Notifications from "@/components/Notifications";
import Options from "@/components/Options";

import { SocketContext } from "@/hooks/SocketContext";
import { API_URL } from "@/config";

const ChatUserList = () => {
  const socketContext = useContext(SocketContext);
  const { users, me, idToCall, setIdToCall, nextChat } = socketContext || {};

  const [username, setUsername] = useState("");

  console.log("me chat:", me);
  console.log("users in ChatUserList:", users);

  useEffect(() => {
    const addUser = async () => {
      console.log("me:", me);
      const username = localStorage.getItem("username");
      console.log("username:", username);
      if (username) setUsername(username);

      if (nextChat && typeof me === "string" && typeof username === "string") {
        nextChat(username, me);
      }
    };
    addUser();
  }, [me]);

  return (
    <div className="w-full flex h-screen antialiased text-gray-800">
      <div className="w-full flex flex-col lg:flex-row h-full overflow-x-hidden">
        <div className="w-full lg:w-64 flex flex-col py-8 pl-6 pr-2  bg-white flex-shrink-0">
          <div className="flex flex-row items-center justify-center h-12 w-full">
            <div className="flex items-center justify-center rounded-2xl text-indigo-700 bg-indigo-100 h-10 w-10">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <Link href="/" className="ml-2 font-bold text-2xl">
              QuickChat
            </Link>
          </div>
          <div className="flex flex-col mt-8">
            <div className="flex flex-col space-y-1 mt-4 -mx-2 h-full overflow-y-auto">
              {users &&
                users.map((user, index) => (
                  <React.Fragment key={index}>
                    {username === user.name ? null : (
                      <button
                        className="flex flex-row items-center hover:bg-gray-100 rounded-xl p-2"
                        onClick={() => setIdToCall && setIdToCall(user.userId)}
                      >
                        <div
                          className={`flex items-center justify-center h-8 w-8 text-white ${
                            idToCall === user.userId
                              ? "animate-bounce bg-green-500"
                              : "bg-indigo-800"
                          }  rounded-full`}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div className="ml-2 text-sm font-semibold">
                          {user.name}
                        </div>
                      </button>
                    )}
                  </React.Fragment>
                ))}
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col flex-auto h-full p-0">
          <div className="flex flex-col flex-auto flex-shrink-0  bg-gray-100 h-full p-4">
            <Options>
              <div className="w-full">
                <Notifications />
              </div>
            </Options>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatUserList;
