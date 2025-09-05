"use client";
import React from "react";
import { ContextProvider } from "@/hooks/SocketContext";
import ChatUserList from "@/components/ChatUserList";

const ChatPage = () => {
  //   const [users, setUsers] = React.useState([]);

  //   const getUsers = async () => {
  //     const request = await fetch("http://localhost:5000/get");
  //     const result = await request.json();
  //     setUsers(result.users);
  //   };

  //   React.useEffect(() => {
  //     getUsers();
  //   }, []);

  //   console.log("users ++++:", users);

  return (
    <ContextProvider>
      <div className="w-full">
        <ChatUserList />
      </div>
    </ContextProvider>
  );
};

export default ChatPage;
