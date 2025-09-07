import React from 'react';
import { View } from 'react-native';
// import { Audio } from "expo-audio";

const VideoPlayer = () => {
  // const {
  //   call,
  //   callAccepted,
  //   localStream,
  //   remoteStream,
  //   callEnded,
  //   isVideo,
  //   isFrontCamera,
  //   hasCameraPermission,
  // } = useSocket();

  // const localVideoRef = useRef<any>(null);

  // console.log('VideoPlayer - localStream:', localStream);
  // console.log('VideoPlayer - remoteStream:', remoteStream);

  // if (!hasCameraPermission) {
  //   return (
  //     <View className="flex-1 items-center justify-center bg-black px-5">
  //       <Text className="text-center text-lg text-white">
  //         Camera permission is required for video calls
  //       </Text>
  //     </View>
  //   );
  // }

  return (
    <View className="w-full h-full flex-1 items-center justify-center bg-black px-4 py-8">
      <View className="relative aspect-video w-full max-w-[400px] flex-1 overflow-hidden rounded-xl bg-gray-800">
        
      </View>
    </View>
  );
};

export default VideoPlayer;
