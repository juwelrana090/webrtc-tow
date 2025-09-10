import React, { useEffect, useState } from 'react';
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
    <View className="absolute bottom-32 z-10 w-full flex-row items-center justify-center gap-8">
      <Button onPress={hangup} iconName="call-outline" className="bg-red-500" />
    </View>
  );
};

const Video = ({ className, localStream, remoteStream, hangup }: Props) => {
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string>('');
  const [localStreamUrl, setLocalStreamUrl] = useState<string>('');

  useEffect(() => {
    if (localStream) {
      const url = localStream.toURL();
      setLocalStreamUrl(url);
      console.log('Local stream URL:', url);
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      const url = remoteStream.toURL();
      setRemoteStreamUrl(url);
      console.log('Remote stream URL:', url);
      console.log(
        'Remote stream tracks:',
        remoteStream.getTracks().map((t) => ({
          id: t.id,
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          muted: t.muted,
        }))
      );

      // Check if tracks are receiving data
      remoteStream.getTracks().forEach((track, index) => {
        console.log(`Remote track ${index} (${track.kind}):`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });
    }
  }, [remoteStream]);

  console.log('Video component - localStream:', !!localStream, 'remoteStream:', !!remoteStream);
  console.log('Video localStream:', localStream);
  console.log('Video remoteStream:', remoteStream);

  // Show connection status for debugging
  const ConnectionStatus = () => (
    <View className="absolute left-4 top-20 z-10 rounded bg-black/80 px-3 py-2">
      <Text className="text-xs text-white">
        Local: {localStream ? '✓' : '✗'} | Remote: {remoteStream ? '✓' : '✗'}
      </Text>
      <Text className="text-xs text-white">Remote URL: {remoteStreamUrl ? 'Valid' : 'Empty'}</Text>
      {remoteStream && (
        <Text className="text-xs text-white">
          Tracks: {remoteStream.getTracks().length}
          (A:{remoteStream.getAudioTracks().length}, V:{remoteStream.getVideoTracks().length})
        </Text>
      )}
    </View>
  );

  // Test with a different rendering approach
  const RemoteStreamView = () => {
    if (!remoteStream || !remoteStreamUrl) return null;

    return (
      <RTCView
        streamURL={remoteStreamUrl}
        style={{
          flex: 1,
          //   backgroundColor: 'black',
        }}
        objectFit="cover"
        mirror={false}
        zOrder={0}
      />
    );
  };

  const LocalStreamView = () => {
    if (!localStream || !localStreamUrl) return null;

    return (
      <RTCView
        streamURL={localStreamUrl}
        style={{
          position: 'absolute',
          top: 80,
          right: 20,
          width: 120,
          height: 160,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: 'white',
          backgroundColor: 'gray',
        }}
        objectFit="cover"
        mirror={true}
        zOrder={1}
      />
    );
  };

  // On call with both local and remote streams
  if (localStream && remoteStream) {
    return (
      <View className="flex-1 bg-black">
        <RemoteStreamView />
        <LocalStreamView />
        <ConnectionStatus />
        <ButtonContainer hangup={hangup} />
      </View>
    );
  }

  // On call with localStream only (waiting for remote)
  if (localStream && !remoteStream) {
    return (
      <View className="flex-1 bg-black">
        {/* Local stream full screen */}
        <RTCView
          streamURL={localStreamUrl}
          style={{
            flex: 1,
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
