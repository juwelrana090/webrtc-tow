import { Tabs } from 'expo-router';
import { Image, ImageBackground, Text, View } from 'react-native';

import { icons } from '@/constants/icons';
import { images } from '@/constants/images';

const TabIcon = ({ focused, icon, title }: TabIconProps) => {
  if (focused) {
    return (
      <ImageBackground
        source={images.highlight}
        className="mt-[16px] flex min-h-[68px] w-full min-w-[112px] flex-1 flex-row items-center justify-center overflow-hidden rounded-full">
        <Image source={icon} tintColor="#151312" className="size-5" />
        <Text className="text-secondary ml-2 text-base font-semibold">{title}</Text>
      </ImageBackground>
    );
  }

  return (
    <View className="mt-4 size-full items-center justify-center rounded-full">
      <Image source={icon} tintColor="#A8B5DB" className="size-5" />
    </View>
  );
};

const TabsLayout = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarItemStyle: {
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarStyle: {
          backgroundColor: '#0F0D23',
          borderRadius: 50,
          marginHorizontal: 10,
          marginBottom: 36,
          height: 52,
          position: 'absolute',
          overflow: 'hidden',
          borderWidth: 0,
          borderColor: '#0F0D23',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'index',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={icons.home} title="Home" />,
        }}
      />

      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.chat} title="Chats" />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
