import React from 'react';
import { View } from 'react-native';
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
  // On call with localStream
  if (localStream && !remoteStream) {
    return (
      <View className="flex-1 items-center justify-end">
        <RTCView
          streamURL={localStream.toURL()}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
          objectFit="cover"
        />
        <ButtonContainer hangup={hangup} />
      </View>
    );
  }

  // On call with remoteStream only (rare case)
  if (localStream && remoteStream) {
    return (
      <View className="flex-1 items-center justify-end">
        <RTCView
          streamURL={localStream.toURL()}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
          objectFit="cover"
        />
        <RTCView
          streamURL={remoteStream.toURL()}
          style={{
            position: 'absolute',
            top: 0,
            left: 20,
            width: 100,
            height: 150,
            elevation: 10,
            borderRadius: 8,
            overflow: 'hidden',
          }}
          objectFit="cover"
        />
        <ButtonContainer hangup={hangup} />
      </View>
    );
  }

  return <ButtonContainer hangup={hangup} />;
};

export default Video;
