import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

interface Props {
  onPress: () => void;
  iconName: any;
  className?: string;
  disabled?: boolean;
}

const Button = ({ onPress, iconName, className = '', disabled = false }: Props) => {
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        className={`h-[60px] w-[60px] flex-1 items-center justify-center rounded-[50%] p-4 ${className}`}
        disabled={disabled}>
        <Ionicons name={iconName} size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default Button;
