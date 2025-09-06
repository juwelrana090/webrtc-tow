import { useSocket } from '@/hooks/useSocket';
import { Camera } from 'expo-camera';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

  if (!hasCameraPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission is required for video calls</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {/* Local video (your camera) - Using Expo Camera */}
        {isVideo && localStream && (
          <Camera
            style={styles.localVideo}
            type={isFrontCamera ? CameraType.front : CameraType.back}
          />
        )}

        {/* Local video placeholder when video is off */}
        {!isVideo && (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>Video Off</Text>
          </View>
        )}

        {/* Remote user video placeholder (since WebRTC isn't available in Expo Go) */}
        {callAccepted && !callEnded && remoteStream && (
          <View style={styles.remoteVideoContainer}>
            <View style={styles.remoteVideoPlaceholder}>
              <Text style={styles.remoteVideoText}>Remote</Text>
              <Text style={styles.remoteVideoSubtext}>WebRTC not available in Expo Go</Text>
            </View>
            <Text style={styles.remoteLabel}>Remote User</Text>
          </View>
        )}

        {/* Local video label */}
        <Text style={styles.localLabel}>You</Text>

        {/* Call status overlay */}
        {!callAccepted && call && (
          <View style={styles.callStatusOverlay}>
            <Text style={styles.callStatusText}>
              {call.isReceivingCall ? `${call.name} is calling...` : 'Calling...'}
            </Text>
          </View>
        )}

        {/* No call active overlay */}
        {!call && !callAccepted && (
          <View style={styles.callStatusOverlay}>
            <Text style={styles.callStatusText}>Ready for calls</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
    backgroundColor: '#000',
  },
  videoContainer: {
    position: 'relative',
    flex: 1,
    width: '100%',
    maxWidth: 400,
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  remoteVideoContainer: {
    position: 'absolute',
    top: 16,
    right: 8,
    width: 100,
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#555',
  },
  remoteVideoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  remoteVideoSubtext: {
    color: '#ccc',
    fontSize: 8,
    textAlign: 'center',
    marginTop: 4,
  },
  localLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  remoteLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  callStatusOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    transform: [{ translateY: -15 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  callStatusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
