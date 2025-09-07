import { useSocket } from '@/hooks/useSocket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import UserCard from './UserCard';

const ChatUserList = () => {
  const { users, me, nextChat } = useSocket();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const addUser = async () => {
      const storedName = await AsyncStorage.getItem('username');
      if (storedName) setUsername(storedName);

      if (nextChat && typeof me === 'string' && typeof storedName === 'string') {
        nextChat(storedName, me);
      }
      setLoading(false); // stop loading regardless
    };
    addUser();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!users || users.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>No users found</Text>
      </View>
    );
  }

  console.log('Rendering users:', users);

  // return (
  //   <FlatList
  //     data={users}
  //     //@ts-ignore
  //     renderItem={({ item }) => <UserCard {...item} />}
  //     keyExtractor={(item) => item?.userId?.toString()}
  //     numColumns={2}
  //     columnWrapperStyle={{
  //       justifyContent: 'flex-start',
  //       gap: 20,
  //       paddingRight: 5,
  //       marginBottom: 10,
  //     }}
  //     contentContainerStyle={{ padding: 10, paddingBottom: 32 }}
  //   />
  // );

  return (
    <FlatList
      data={users}
      //@ts-ignore
      renderItem={({ item }) => <UserCard {...item} />}
      keyExtractor={(item) => item?.userId?.toString()}
      // 👇 one column list
      contentContainerStyle={{ padding: 10, paddingBottom: 32 }}
    />
  );
};

export default ChatUserList;
