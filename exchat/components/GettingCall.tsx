import { images } from '@/constants/images';
import React from 'react';
import { Image, View } from 'react-native';
import Button from './Button';

interface Props {
  className?: string;
  hangup: () => void;
  join: () => void;
}

const GettingCall = ({ className = '', hangup, join }: Props) => {
  return (
    <View className={`flex-1 items-center justify-end ${className}`}>
      <Image source={images.bg} className="absolute top-0 h-full w-full" />
      <View className="absolute bottom-32 flex-row gap-8">
        <Button onPress={join} iconName="call" className="bg-green-500" />
        <Button onPress={hangup} iconName="call-outline" className="bg-red-500" />
      </View>
    </View>
  );
};

export default GettingCall;
