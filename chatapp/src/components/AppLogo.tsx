import React from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { AssetManager } from '../utils/AssetManager';

interface AppLogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
  type?: 'logo' | 'icon';
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 100,
  style,
  type = 'logo',
}) => {
  const logoPath =
    type === 'logo'
      ? AssetManager.getAssetPath('logo')
      : AssetManager.getAssetPath('icon');

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={{ uri: logoPath }}
        style={{
          width: '100%',
          height: '100%',
          resizeMode: AssetManager.getResizeMode('logo'),
        }}
        onError={error => console.error('Failed to load logo:', error)}
      />
    </View>
  );
};
