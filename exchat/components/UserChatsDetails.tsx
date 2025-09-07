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
  id: string;
  router: any;
}

const UserChatsDetails = ({ id, router }: Props) => {
  const {
    call,
    callAccepted,
    stream,
    name,
    setName,
    callEnded,
    me,
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
  const [username, setUsername] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('chatUser').then((saved) => {
      if (saved) setUser(JSON.parse(saved));
      setLoading(false);
    });
  }, []);

  console.log('UserChatsDetails - user:', user);

  if (loading)
    return (
      <SafeAreaView className="bg-primary flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading chat details...</Text>
      </SafeAreaView>
    );

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

      {/* Bottom Controls - Fixed positioning */}
      <View className="absolute bottom-0 left-0 right-0 z-50 bg-black px-4 py-4">
        <View className="flex-row items-center justify-between">
          {/* Audio Toggle */}
          <TouchableOpacity
            onPress={toggleAudio}
            className={`h-12 w-12 items-center justify-center rounded-full ${
              isAudio ? 'bg-green-500' : 'bg-red-500'
            }`}>
            <Text className="text-lg font-bold text-white">{isAudio ? '🎤' : '🔇'}</Text>
          </TouchableOpacity>

          {/* Video Toggle */}
          <TouchableOpacity
            onPress={toggleVideo}
            className={`h-12 w-12 items-center justify-center rounded-full ${
              isVideo ? 'bg-blue-500' : 'bg-gray-600'
            }`}>
            <Text className="text-lg font-bold text-white">{isVideo ? '📹' : '📷'}</Text>
          </TouchableOpacity>

          {/* Call Actions */}
          {callAccepted && !callEnded ? (
            <TouchableOpacity
              onPress={() => leaveCall(id)}
              className="h-14 w-14 items-center justify-center rounded-full bg-red-600">
              <Text className="text-xl font-bold text-white">📞</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => callUser(id)}
              className="h-14 w-14 items-center justify-center rounded-full bg-green-600">
              <Text className="text-xl font-bold text-white">📞</Text>
            </TouchableOpacity>
          )}

          {/* Switch Camera (placeholder) */}
          <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-gray-600">
            <Text className="text-lg font-bold text-white">🔄</Text>
          </TouchableOpacity>

          {/* More Options (placeholder) */}
          <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-gray-600">
            <Text className="text-lg font-bold text-white">⋯</Text>
          </TouchableOpacity>
        </View>

        {/* Status Message */}
        <View className="mt-3 items-center">
          {!callAccepted && !callEnded && (
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
