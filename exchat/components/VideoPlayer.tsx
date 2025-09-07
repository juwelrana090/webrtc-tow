import { SocketContext } from '@/hooks/SocketContext';
import React, { useContext, useState } from 'react';
import { Text, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';

const VideoPlayer = () => {
  const socketContext = useContext(SocketContext);
  const [localStreamUrl, setLocalStreamUrl] = useState('');
  const [remoteStreamUrl, setRemoteStreamUrl] = useState('');

  if (!socketContext) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-lg text-white">Socket context not available.</Text>
      </View>
    );
  }

  const { call, callAccepted, localStream, remoteStream, stream, name, callEnded } = socketContext;

  return (
    <View className="z-10 flex h-full w-full items-center justify-center bg-gray-900 px-0 py-0">
      <View className="h-full w-full overflow-hidden ">
        {/* Local Video Stream */}
        {localStream ? (
          <RTCView
            streamURL={localStream.toURL()}
            style={{ width: '100%', height: '100%' }}
            mirror={true}
            objectFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-gray-800">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-blue-500">
              <Text className="text-2xl font-bold text-white">
                {name ? name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text className="mt-4 text-white">Waiting for your video...</Text>
          </View>
        )}

        {/* Remote Video Stream (Picture-in-Picture) */}
        {callAccepted && !callEnded && remoteStream && (
          <View className="absolute right-2 top-2 h-48 w-32 overflow-hidden rounded-lg border-2 border-white bg-gray-700">
            <RTCView
              streamURL={remoteStream.toURL()}
              style={{ width: '100%', height: '100%' }}
              mirror={true}
              objectFit="cover"
            />
            <View className="absolute bottom-2 left-2 rounded bg-black bg-opacity-50 px-2 py-1">
              <Text className="text-xs text-white">{name || 'Remote User'}</Text>
            </View>
          </View>
        )}

        {/* Call Status Indicators */}
        {callAccepted && !callEnded && !remoteStreamUrl && (
          <View className="absolute right-2 top-2 h-48 w-32 items-center justify-center rounded-lg bg-gray-700">
            <View className="animate-pulse">
              <View className="mb-2 h-12 w-12 rounded-full bg-blue-500"></View>
              <Text className="text-center text-xs text-white">Connecting...</Text>
            </View>
          </View>
        )}

        {/* Local Video Label */}
        <View className="absolute left-4 top-8 rounded-full bg-black bg-opacity-50 px-3 py-2">
          <Text className="text-sm text-white">You</Text>
        </View>
      </View>
    </View>
  );
};

export default VideoPlayer;
