import { useSocket } from '@/hooks/useSocket';
import React, { useRef } from 'react';
import { Text, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';

const VideoPlayer = () => {
  const {
    call,
    callAccepted,
    localStream,
    remoteStream,
    callEnded,
    isVideo,
    isFrontCamera,
    hasCameraPermission,
  } = useSocket();

  const localVideoRef = useRef<any>(null);

  if (!hasCameraPermission) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-5">
        <Text className="text-center text-lg text-white">
          Camera permission is required for video calls
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-black px-4 py-8">
      <View className="relative aspect-video w-full max-w-[400px] flex-1 overflow-hidden rounded-xl bg-gray-800">
        {/* Local Video */}
        {localStream && isVideo ? (
          <RTCView
            ref={localVideoRef}
            //@ts-ignore
            streamURL={localStream.toURL()}
            className="h-full w-full"
            objectFit="cover"
          />
        ) : (
          <View className="flex h-full w-full items-center justify-center bg-gray-700">
            <Text className="text-lg font-semibold text-white">Video Off</Text>
          </View>
        )}

        {/* Remote Video */}
        {callAccepted && !callEnded && remoteStream && (
          <RTCView
            //@ts-ignore
            streamURL={remoteStream.toURL()}
            className="absolute right-2 top-4 h-[140px] w-[100px] overflow-hidden rounded-md border-2 border-white"
            objectFit="cover"
          />
        )}

        {/* Labels */}
        <Text className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
          You
        </Text>
        {callAccepted && !callEnded && remoteStream && (
          <Text className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-semibold text-white">
            Remote User
          </Text>
        )}

        {/* Call Status */}
        {!callAccepted && call && (
          <View className="absolute left-0 right-0 top-1/2 -translate-y-3 items-center bg-black/80 py-3">
            <Text className="text-base font-semibold text-white">
              {call.isReceivingCall ? `${call.name} is calling...` : 'Calling...'}
            </Text>
          </View>
        )}
        {!call && !callAccepted && (
          <View className="absolute left-0 right-0 top-1/2 -translate-y-3 items-center bg-black/80 py-3">
            <Text className="text-base font-semibold text-white">Ready for calls</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default VideoPlayer;
