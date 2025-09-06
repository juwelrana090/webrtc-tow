import { useSocket } from '@/hooks/useSocket';
import { Text, View } from 'react-native';

interface Props {
  id: string;
  router: any;
}

const UserChatsDetails = ({ id, router }: Props) => {
  const { user, users, me, idToCall, setIdToCall, nextChat } = useSocket();
  const { name, userId } = user;

  console.log('UserChatsDetails - user:', user);

  return (
    <View className="mt-0 w-full">
      <View className="flex w-full items-start justify-start bg-blue-500 px-2 py-4">
        <View
          className={`flex h-8 w-8 items-center justify-center  ${
            idToCall === userId ? 'animate-bounce bg-green-500' : 'bg-indigo-800'
          }  rounded-full`}>
          <Text className="text-white">{name.charAt(0)}</Text>
        </View>
        <View className="ml-2 ">
          <Text className="text-sm font-semibold">{name}</Text>
        </View>
      </View>
    </View>
  );
};

export default UserChatsDetails;
