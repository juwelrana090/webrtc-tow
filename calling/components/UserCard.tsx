import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { useSocket } from '@/hooks/useSocket';
import { useEffect } from 'react';

const UserCard = ({ name, socketId, userId }: UserProps) => {
  const { idToCall, user, setUser } = useSocket();
  const router = useRouter();

  const handleSelect = () => {
    const selectedUser = { name, userId };
    setUser(selectedUser);

    // ✅ Use selectedUser directly instead of waiting for state
    // router.push(`/chats/${userId}`);
  };

  useEffect(() => {
    if (user) {
      router.push(`/chats/${user.userId}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
