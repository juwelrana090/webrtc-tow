import UserChatsDetails from '@/components/UserChatsDetails';
import { ContextProvider } from '@/hooks/SocketContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

const UserChats = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  return (
    <ContextProvider>
      <View className="flex-1 bg-gray-100">
        <UserChatsDetails id={id.toString()} router={router} />
      </View>
    </ContextProvider>
  );
};
export default UserChats;
