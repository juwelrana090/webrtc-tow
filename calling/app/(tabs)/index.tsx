import { ContextProvider } from '@/hooks/SocketContext';
import React from 'react';
import { Text, View } from 'react-native';

import AddUser from '@/components/AddUser';
import Options from '@/components/Options';

export default function Index() {
  return (
    <ContextProvider>
      <View className="flex w-full flex-col justify-center gap-4">
        <View className="mt-6 flex w-full items-center justify-center ">
          <View className="flex w-[300px] items-center justify-center rounded bg-gray-700 p-4">
            <Text className="text-2xl font-bold text-white">QuickChat</Text>
          </View>
        </View>
          <View className="mt-2 flex w-full flex-1 justify-center px-2">
            <AddUser />
          </View>
      </View>
    </ContextProvider>
  );
}
