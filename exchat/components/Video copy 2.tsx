import React from 'react';
import { Text, View } from 'react-native';
import { MediaStream, RTCView } from 'react-native-webrtc';
import Button from './Button';

interface Props {
  className?: string;
  hangup: () => void;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
}

const ButtonContainer = ({ hangup }: { hangup: () => void }) => {
  return (
    <View className="absolute bottom-32 w-full flex-row items-center justify-center gap-8">
      <Button onPress={hangup} iconName="call-outline" className="bg-red-500" />
    </View>
  );
};

const Video = ({ className, localStream, remoteStream, hangup }: Props) => {
  console.log('Video component - localStream:', !!localStream, 'remoteStream:', !!remoteStream);
  console.log('Video localStream:', localStream);
  console.log('Video remoteStream:', remoteStream);

  // Show connection status for debugging
  const ConnectionStatus = () => (
    <View className="absolute left-4 top-20 rounded bg-black/50 px-3 py-1">
      <Text className="text-sm text-white">
        Local: {localStream ? '✓' : '✗'} | Remote: {remoteStream ? '✓' : '✗'}
      </Text>
    </View>
  );

  // On call with both local and remote streams
  if (localStream && remoteStream) {
    return (
      <View className="flex-1 items-center justify-end">
        {/* Remote stream (main view) */}
        <RTCView
          streamURL={remoteStream.toURL()}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
          objectFit="cover"
        />

        {/* Local stream (small preview) */}
        <RTCView
          streamURL={localStream.toURL()}
          style={{
            position: 'absolute',
            top: 60,
            right: 20,
            width: 120,
            height: 160,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: 'white',
          }}
          objectFit="cover"
          mirror={true}
        />

        <ConnectionStatus />
        <ButtonContainer hangup={hangup} />
      </View>
    );
  }

  // On call with localStream only (waiting for remote)
  if (localStream && !remoteStream) {
    return (
      <View className="flex-1 items-center justify-end">
        {/* Local stream full screen */}
        <RTCView
          streamURL={localStream.toURL()}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
          objectFit="cover"
          mirror={true}
        />

        {/* Waiting indicator */}
        <View className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-black/70 px-6 py-3">
          <Text className="text-center text-lg text-white">Waiting for other participant...</Text>
        </View>

        <ConnectionStatus />
        <ButtonContainer hangup={hangup} />
      </View>
    );
  }

  // Fallback - no streams
  return (
    <View className="flex-1 items-center justify-center bg-gray-900">
      <Text className="mb-4 text-lg text-white">No video streams available</Text>
      <ConnectionStatus />
      <ButtonContainer hangup={hangup} />
    </View>
  );
};

export default Video;
