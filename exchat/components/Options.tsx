import { useSocket } from '@/hooks/useSocket';
import React from 'react';
import { Button, Text, View } from 'react-native';

const Options: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { call, callAccepted, answerCall } = useSocket();

  return (
    <View className="w-full">
      <View className="mb-2 w-full">
        {call?.isReceivingCall && !callAccepted && (
          <View className="flex items-center justify-center rounded bg-yellow-200 p-4 text-black">
            <Text className="text-lg font-semibold">{call.name} is calling:</Text>
            <Button title="Answer" color="#00dd37b2" onPress={answerCall} />
          </View>
        )}
      </View>
      <View className="w-full">{children}</View>
    </View>
  );
};

export default Options;
