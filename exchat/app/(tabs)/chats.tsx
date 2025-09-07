import ChatUserList from '@/components/ChatUserList';
import Options from '@/components/Options';
import { ContextProvider } from '@/hooks/SocketContext';
import React from 'react';
import { Text, View } from 'react-native';

const Chats = () => {
  return (
    <ContextProvider>
      <View className="flex w-full flex-col justify-center gap-4">
        <View className="mt-0 w-full">
          <View className="flex w-full items-start justify-start bg-blue-500 px-2 py-4">
            <Text className="text-2xl font-bold text-white">Chats List</Text>
          </View>
        </View>
        <Options>
          <View className="mt-2 flex w-full flex-col justify-center border-gray-900 px-2">
            <ChatUserList />
          </View>
        </Options>
      </View>
    </ContextProvider>
  );
};

export default Chats;
