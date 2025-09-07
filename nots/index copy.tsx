import { useEffect, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Text, TouchableOpacity, View } from 'react-native';
import { mediaDevices, MediaStream, RTCView } from 'react-native-webrtc';

export default function Index() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasPermissions, setHasPermissions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        const permissionsGranted =
          granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;

        setHasPermissions(permissionsGranted);
        return permissionsGranted;
      } catch (error) {
        console.error('Permission error:', error);
        setHasPermissions(false);
        return false;
      }
    }
    // For iOS, permissions are handled through Info.plist
    // But we still need to check if we can actually access the media
    setHasPermissions(true);
    return true;
  };

  const getMedia = async (): Promise<void> => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      // Check if we already have permissions
      if (!hasPermissions) {
        const permissionsGranted = await requestPermissions();
        if (!permissionsGranted) {
          Alert.alert(
            'Permissions required',
            'Camera and microphone permissions are required for video calls'
          );
          setIsLoading(false);
          return;
        }
      }

      // Stop any existing stream
      if (localStream) {
        stopMedia();
      }

      // Get user media with proper constraints
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: 30,
          facingMode: 'user', // Use front camera
        },
      });

      console.log('Stream obtained:', stream);
      setLocalStream(stream);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      Alert.alert('Error', 'Failed to access camera or microphone');
    } finally {
      setIsLoading(false);
    }
  };

  const stopMedia = (): void => {
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
      setLocalStream(null);
    }
  };

  const toggleMedia = (): void => {
    if (localStream) {
      stopMedia();
    } else {
      getMedia();
    }
  };

  useEffect(() => {
    // Request permissions when component mounts
    requestPermissions();

    // Cleanup when component unmounts
    return () => {
      stopMedia();
    };
  }, []);

  return (
    <View className="mt-2 flex w-full items-center justify-center bg-white">
      <Text className="text-center text-[38px] font-bold text-blue-500">
        Welcome to Nativewind!
      </Text>

      <View className="w-full flex-1 items-center justify-center p-4">
        <Text className="text-center text-[24px] font-bold">Welcome to React Native WebRTC!</Text>

        <View className="mb-5 h-72 w-full overflow-hidden rounded-lg border border-gray-300 ">
          {localStream ? (
            <RTCView
              streamURL={localStream.toURL()}
              style={{ width: '100%', height: '100%' }}
              mirror={true}
              objectFit="cover"
            />
          ) : (
            <View className="flex h-full w-full items-center justify-center bg-[#1C1C1E]">
              <Text className="text-[16px] text-gray-500">
                {isLoading ? 'Loading camera...' : 'Camera not active'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          className={`flex w-full items-center rounded-lg p-4 ${localStream ? 'bg-red-500' : 'bg-green-500'}`}
          onPress={toggleMedia}
          disabled={isLoading}>
          <Text className="text-[16px] text-white">
            {isLoading ? 'Loading...' : localStream ? 'Stop Camera' : 'Start Camera'}
          </Text>
        </TouchableOpacity>

        {!hasPermissions && (
          <Text className="mt-4 text-center text-red-500">
            Camera and microphone permissions are required
          </Text>
        )}
      </View>
    </View>
  );
}
