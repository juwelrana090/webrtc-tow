import { useSocket } from '@/hooks/useSocket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, Text, View } from 'react-native';

interface Props {
  id: string;
  router: any;
}

const UserChatsDetails = ({ id, router }: Props) => {
  const { users, me, idToCall, setIdToCall, nextChat } = useSocket();

  const [user, setUser] = useState<{ name: string; userId: string }>({
    name: '',
    userId: '',
  });

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('chatUser').then((saved) => {
      if (saved) setUser(JSON.parse(saved));
    });

    setLoading(false); // stop loading regardless
  }, []);

  console.log('UserChatsDetails - user:', user);

  if (loading)
    return (
      <SafeAreaView className="bg-primary flex-1">
        <ActivityIndicator />
      </SafeAreaView>
    );

  return (
    <View className="mt-0 w-full">
      <View className="flex w-full items-start justify-start bg-blue-500 px-2 py-4">
        <View
          className={`flex h-8 w-8 items-center justify-center  ${
            idToCall === user?.userId ? 'animate-bounce bg-green-500' : 'bg-indigo-800'
          }  rounded-full`}>
          <Text className="text-white">{user?.name.charAt(0)}</Text>
        </View>
        <View className="ml-2 ">
          <Text className="text-sm font-semibold">{user?.name}</Text>
        </View>
      </View>
    </View>
  );
};

export default UserChatsDetails;
