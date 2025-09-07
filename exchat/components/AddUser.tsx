import Skeleton from '@/components/Skeleton';
import { useSocket } from '@/hooks/useSocket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';

const AddUser = () => {
  // Use the custom hook instead of useContext directly
  const { me, nextChat } = useSocket();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  // Load saved username from AsyncStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const username = await AsyncStorage.getItem('username');
        if (username) setName(username);
      } catch (error) {
        console.error('Failed to load username:', error);
      } finally {
        // Only stop loading if me is available
        if (me) setLoading(false);
      }
    };
    loadData();
  }, [me]);

  // Handle submission
  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    try {
      await AsyncStorage.setItem('username', trimmedName);

      if (nextChat && me) {
        nextChat(trimmedName, me);
      }

      router.push('/chats');
    } catch (error) {
      console.error('Failed to save username:', error);
      Alert.alert('Error', 'Failed to save username');
    }
  };

  // Render
  return (
    <View className="w-full p-4">
      {loading ? (
        <View className="mx-auto max-w-sm space-y-5">
          <View>
            <Skeleton className="mb-2 h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </View>
          <View>
            <Skeleton className="mb-2 h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </View>
          <View className="flex-row gap-3">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-20" />
          </View>
        </View>
      ) : (
        <View className="flex w-full flex-col gap-4">
          <View className="bg-dark-200 h-[48px] rounded-full px-5 py-0">
            <Text className="ml-4 text-base font-semibold text-gray-500">Name:</Text>
          </View>

          <View className="bg-dark-200 -mt-4 mb-4 flex-row justify-center rounded-full px-5 py-0">
            <TextInput
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              className="ml-2 h-[48px] w-full flex-1 rounded-full border border-gray-600 px-4 py-2 text-black"
              placeholderTextColor="#A8B5DB"
            />
          </View>

          <View className="bg-dark-200 mt-8 h-[48px] justify-center rounded-full px-6 py-2">
            <Button title="Next" color="#f194ff" onPress={handleSubmit} />
          </View>
        </View>
      )}
    </View>
  );
};

export default AddUser;
