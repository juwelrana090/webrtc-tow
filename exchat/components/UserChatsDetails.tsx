import { useSocket } from '@/hooks/useSocket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import VideoPlayer from './VideoPlayer';

interface Props {
  id: string; // ← Should be TARGET USER'S userId (e.g., "user123")
  router: any;
}

const UserChatsDetails = ({ id, router }: Props) => {
  const {
    call,
    callAccepted,
    stream,
    name: myName,
    setName,
    callEnded,
    me, // ← My socket ID — must be set before calling
    idToCall,
    answerCall,
    callUser,
    leaveCall,
    toggleVideo,
    toggleAudio,
    isVideo,
    isAudio,
  } = useSocket();

  const [user, setUser] = useState<{ name: string; userId: string }>({
    name: '',
    userId: '',
  });

  const [loading, setLoading] = useState(true);

  // Load user from storage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const saved = await AsyncStorage.getItem('chatUser');
        if (saved) {
          setUser(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load chatUser:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Debug logs
  useEffect(() => {
    console.log('UserChatsDetails - Target User:', user);
    console.log('My Socket ID (me):', me);
    console.log('Local Stream Ready:', !!stream);
  }, [user, me, stream]);

  if (loading) {
    return (
      <SafeAreaView className="bg-primary flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading chat details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="relative flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center bg-blue-600 px-4 py-4">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            idToCall === user?.userId ? 'animate-pulse bg-green-500' : 'bg-indigo-700'
          }`}>
          <Text className="text-lg font-bold text-white">{user?.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-white">{user?.name}</Text>
          <Text className="text-xs text-blue-100">
            {idToCall === user?.userId ? 'Online • Available' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Incoming Call Banner */}
      <View className="absolute left-0 right-0 top-20 z-50 w-full">
        {call?.isReceivingCall && !callAccepted && (
          <View className="flex items-center justify-center rounded bg-yellow-200 p-4 text-black">
            <Text className="text-lg font-semibold">{call.name} is calling:</Text>
            <Button title="Answer" color="#00dd37b2" onPress={answerCall} />
          </View>
        )}
      </View>

      {/* Video Player */}
      <View className="flex-1">
        <VideoPlayer />
      </View>

      {/* Bottom Controls */}
      <View className="absolute bottom-0 left-0 right-0 z-50 bg-black px-4 py-4">
        <View className="flex-row items-center justify-between">
          {/* Audio Toggle */}
          <TouchableOpacity
            onPress={toggleAudio}
            disabled={!stream}
            className={`h-12 w-12 items-center justify-center rounded-full ${
              isAudio ? 'bg-green-500' : 'bg-red-500'
            }`}>
            <Text className="text-lg font-bold text-white">{isAudio ? '🎤' : '🔇'}</Text>
          </TouchableOpacity>

          {/* Video Toggle */}
          <TouchableOpacity
            onPress={toggleVideo}
            disabled={!stream}
            className={`h-12 w-12 items-center justify-center rounded-full ${
              isVideo ? 'bg-blue-500' : 'bg-gray-600'
            }`}>
            <Text className="text-lg font-bold text-white">{isVideo ? '📹' : '📷'}</Text>
          </TouchableOpacity>

          {/* Call Button */}
          <TouchableOpacity
            onPress={() => callUser(id)}
            disabled={!me || !stream} // ← CRITICAL: Wait for socket + stream
            className={`h-14 w-14 items-center justify-center rounded-full ${
              !me || !stream
                ? 'bg-gray-500'
                : callAccepted && !callEnded
                  ? 'bg-red-600'
                  : 'bg-green-600'
            }`}>
            <Text className="text-xl font-bold text-white">📞</Text>
          </TouchableOpacity>

          {/* Switch Camera (placeholder) */}
          <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-gray-600">
            <Text className="text-lg font-bold text-white">🔄</Text>
          </TouchableOpacity>

          {/* More Options */}
          <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-gray-600">
            <Text className="text-lg font-bold text-white">⋯</Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View className="mt-3 items-center">
          {!me && <Text className="text-sm text-yellow-300">Connecting to server...</Text>}
          {!stream && me && (
            <Text className="text-sm text-yellow-300">Waiting for camera/mic access...</Text>
          )}
          {!callAccepted && !callEnded && me && stream && (
            <Text className="text-sm text-gray-300">
              Tap the green button to start a video call
            </Text>
          )}
          {callAccepted && !callEnded && (
            <Text className="text-sm text-green-300">Call in progress</Text>
          )}
          {callEnded && <Text className="text-sm text-red-300">Call ended</Text>}
        </View>
      </View>
    </View>
  );
};

export default UserChatsDetails;
