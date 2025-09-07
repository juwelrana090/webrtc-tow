// components/Skeleton.tsx

import { Text, View } from 'react-native';

export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <View className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`}>
      <Text className="opacity-0">
        Loading
      </Text>
    </View>
  );
}
