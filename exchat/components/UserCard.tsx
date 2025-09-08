import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { useSocket } from '@/hooks/useSocket';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserCard = ({ name, socketId, userId }: UserProps) => {
  const { idToCall } = useSocket();
  const router = useRouter();

  const handleSelect = async () => {
    await AsyncStorage.setItem('chatUser', JSON.stringify({ name, userId, socketId }));
    router.push(`/chats/${userId}`);
  };

  return (
    <TouchableOpacity
      className="mb-1 flex flex-row items-center rounded-xl border p-2 hover:bg-gray-100"
      onPress={handleSelect}>
      <View
        className={`flex h-8 w-8 items-center justify-center  ${
          idToCall === userId ? 'animate-bounce bg-green-500' : 'bg-indigo-800'
        }  rounded-full`}>
        <Text className="text-white">{name.charAt(0)}</Text>
      </View>
      <View className="ml-2 ">
        <Text className="text-sm font-semibold">{name}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default UserCard;
