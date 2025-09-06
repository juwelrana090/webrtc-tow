import UserChatsDetails from '@/components/UserChatsDetails';
import { ContextProvider } from '@/hooks/SocketContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

const UserChats = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  return (
    <ContextProvider>
      <View className="bg-primary flex-1">
        <UserChatsDetails id={id.toString()} router={router} />
      </View>
    </ContextProvider>
  );
};
export default UserChats;
