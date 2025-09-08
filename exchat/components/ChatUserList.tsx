import { SocketContext } from '@/hooks/SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import UserCard from './UserCard';

const ChatUserList = () => {
  const socketContext = useContext(SocketContext);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [userList, setUserList] = useState<any[]>([]);

  const users = socketContext?.users ?? [];
  const me = socketContext?.me ?? null;
  const nextChat = socketContext?.nextChat;

  console.log('Users from context:', users);
  console.log('Current me:', me);

  // Load username once on component mount
  useEffect(() => {
    const loadUsername = async () => {
      try {
        const storedName = await AsyncStorage.getItem('username');
        if (storedName) {
          console.log('Loaded username from storage:', storedName);
          setUsername(storedName);
        } else {
          console.log('No username found in storage');
          setLoading(false); // Stop loading if no username
        }
      } catch (error) {
        console.error('Error loading username:', error);
        setLoading(false);
      }
    };
    loadUsername();
  }, []);

  // Handle nextChat when both username and me are available
  useEffect(() => {
    if (nextChat && typeof me === 'string' && username) {
      console.log('Calling nextChat with:', username, me);
      nextChat(username, me);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, username]);

  // Filter and update user list when dependencies change
  useEffect(() => {
    console.log('=== Filtering Users ===');
    console.log('Total users:', users.length);
    console.log('Username for filtering:', username);
    console.log('My ID:', me);

    // Only proceed if we have a username to filter with
    if (username) {
      const filtered = users.filter((user) => {
        // Show users whose names contain your username OR show all other users
        const matchesName = user.name && user.name.includes(username);
        const isDifferentUser = user.name !== username;

        // Either matches your name pattern OR is a completely different user
        const shouldShow = matchesName || isDifferentUser;

        // Exclude yourself
        const notMeById = me ? user.userId !== me : true;
        const notMeByName = user.name !== username;
        const notMe = notMeById && notMeByName;

        return shouldShow && notMe;
      });

      console.log('Filtered users count:', filtered.length);
      console.log('Filtered users:', filtered);
      setUserList(filtered);
    } else {
      // If no username yet, show empty list but don't filter
      setUserList([]);
    }

    setLoading(false);
  }, [users, username, me]);

  // Show loading spinner
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-2 text-gray-600">Loading users...</Text>
      </View>
    );
  }

  // Show message if no username is available
  if (!username) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-600">Username not found. Please log in again.</Text>
      </View>
    );
  }

  // Show message if no users are available from socket
  if (!users || users.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-600">No users connected</Text>
      </View>
    );
  }

  // Show message if no users match the filter
  if (userList.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-600">No users found matching your criteria</Text>
      </View>
    );
  }

  console.log('Rendering FlatList with users:', userList.length);

  return (
    <FlatList
      data={userList}
      renderItem={({ item }) => {
        console.log('Rendering user:', item);
        return <UserCard {...item} />;
      }}
      keyExtractor={(item, index) => {
        // Provide fallback key in case userId is undefined
        return item?.userId?.toString() || `user-${index}`;
      }}
      contentContainerStyle={{
        padding: 10,
        paddingBottom: 32,
        flexGrow: 1, // Ensures container takes full height
      }}
      // Force FlatList to re-render when userList changes
      extraData={userList}
      // Add some performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      // Add pull to refresh if needed
      // onRefresh={() => {/* refresh logic */}}
      // refreshing={loading}
    />
  );
};

export default ChatUserList;
