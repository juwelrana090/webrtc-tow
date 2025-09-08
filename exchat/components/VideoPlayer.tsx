import { SocketContext } from '@/hooks/SocketContext';
import React, { useContext } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';

const VideoPlayer = () => {
  const socketContext = useContext(SocketContext);

  if (!socketContext) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-lg text-white">Socket context not available.</Text>
      </View>
    );
  }

  const { call, callAccepted, localStream, remoteStream, name, callEnded } = socketContext;

  return (
    <View className="z-10 flex h-full w-full items-center justify-center bg-gray-900 px-0 py-0">
      <View className="h-full w-full overflow-hidden">
        {/* Remote Video (Main) */}
        {callAccepted && !callEnded && remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={{ width: '100%', height: '100%' }}
            objectFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-gray-800">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-blue-500">
              <Text className="text-2xl font-bold text-white">
                {name ? name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text className="mt-4 text-white">
              {call ? `📞 Incoming call from ${call.name}` : '⏳ Waiting for connection...'}
            </Text>
          </View>
        )}

        {/* Local Video (PiP) */}
        {localStream && (
          <View className="absolute right-2 top-2 h-48 w-32 overflow-hidden rounded-lg border-2 border-white bg-gray-700">
            <RTCView
              streamURL={localStream.toURL()}
              style={{ width: '100%', height: '100%' }}
              mirror={true}
              objectFit="cover"
            />
            <View className="absolute bottom-2 left-2 rounded bg-black bg-opacity-50 px-2 py-1">
              <Text className="text-xs text-white">You</Text>
            </View>
          </View>
        )}

        {/* Connecting Overlay */}
        {callAccepted && !callEnded && !remoteStream && (
          <View className="absolute inset-0 items-center justify-center bg-black bg-opacity-70">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text className="mt-4 text-white">⏳ Connecting...</Text>
          </View>
        )}

        {/* Incoming Call Overlay */}
        {call && !callAccepted && (
          <View className="absolute inset-0 items-center justify-center bg-black bg-opacity-70">
            <Text className="text-xl text-white">📞 Incoming call from {call.name}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default VideoPlayer;
