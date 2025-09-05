import React, { FormEvent, useContext, useEffect } from "react";
import { ContextProvider, SocketContext } from "@/hooks/SocketContext";
import { API_URL } from "@/config";
import Skeleton from "./Skeleton";
import { useRouter } from "next/navigation";

const AddUser = () => {
  const route = useRouter();

  const socketContext = useContext(SocketContext);
  const { me, nextChat } = socketContext || {};
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");

  useEffect(() => {
    console.log("me:", me);
    const username = localStorage.getItem("username");
    console.log("username:", username);
    if (username) setName(username);
    if (me) setLoading(false);
  }, [me]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log(name);

    localStorage.setItem("username", name);

    if (nextChat && typeof me === "string") {
      nextChat(name, me);
    }

    // const request = await fetch(`${API_URL}/add`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ name, userId: me }),
    // });

    // const result = await request.json();

    // if (result.status === "success") {
    //   route.push("/chats");
    // } else if (
    //   result.status === "error" &&
    //   result.message === "User already exists"
    // ) {
    // }

    route.push("/chats");

    // console.log("API result", result);
  };

  return (
    <div className="w-full">
      {loading ? (
        <form className="max-w-sm mx-auto space-y-5">
          <div>
            <Skeleton className="h-4 w-16 mb-2" /> {/* label */}
            <Skeleton className="h-10 w-full" /> {/* input */}
          </div>
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28" /> {/* button */}
            <Skeleton className="h-10 w-20" />
          </div>
        </form>
      ) : (
        <form className="max-w-sm mx-auto" onSubmit={handleSubmit}>
          <div className="mb-5">
            <label
              htmlFor="name"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="John Doe"
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </div>
          <button
            type="submit"
            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          >
            Next
          </button>
        </form>
      )}
    </div>
  );
};

export default AddUser;
