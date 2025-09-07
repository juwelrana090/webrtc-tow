import { useEffect, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { mediaDevices, MediaStream, RTCView } from 'react-native-webrtc';

export default function App() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasPermissions, setHasPermissions] = useState<boolean>(false);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        const permissionsGranted =
          granted['android.permission.CAMERA'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.RECORD_AUDIO'] ===
            PermissionsAndroid.RESULTS.GRANTED;

        setHasPermissions(permissionsGranted);
        return permissionsGranted;
      } catch (error) {
        console.error('Permission error:', error);
        setHasPermissions(false);
        return false;
      }
    }
    // For iOS, permissions are handled through Info.plist
    setHasPermissions(true);
    return true;
  };

  const getMedia = async (): Promise<void> => {
    try {
      // Check if we already have permissions
      if (!hasPermissions) {
        const permissionsGranted = await requestPermissions();
        if (!permissionsGranted) {
          Alert.alert(
            'Permissions required',
            'Camera and microphone permissions are required for video calls',
          );
          return;
        }
      }

      // Get user media with proper constraints
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 30, ideal: 60, max: 120 },
          facingMode: 'user', // Use front camera
        },
      });

      console.log('Stream obtained:', stream);
      setLocalStream(stream);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      Alert.alert('Error', 'Failed to access camera or microphone');
    }
  };

  const stopMedia = (): void => {
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
      setLocalStream(null);
    }
  };

  useEffect(() => {
    // Request permissions and get media when component mounts
    const initialize = async () => {
      await requestPermissions();
      await getMedia();
    };

    initialize();

    // Cleanup when component unmounts
    return () => {
      stopMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaProvider style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to React Native WebRTC!</Text>

        <View style={styles.videoContainer}>
          {localStream ? (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.video}
              mirror={true}
              objectFit="cover"
              zOrder={0}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                {hasPermissions ? 'Loading camera...' : 'Permissions needed...'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          {localStream ? (
            <Text style={styles.controlText}>Camera is active</Text>
          ) : (
            <Text style={styles.controlText}>Press to start camera</Text>
          )}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  videoContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  controls: {
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  controlText: {
    fontSize: 16,
    color: '#000',
  },
});
