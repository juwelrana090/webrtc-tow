import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { AssetManager } from '../utils/AssetManager';
import { AppLogo } from './AppLogo';

interface SplashScreenProps {
  isLoading?: boolean;
  loadingText?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isLoading = true,
  loadingText = 'Loading...',
}) => {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: AssetManager.getSplashBackgroundColor() },
      ]}
    >
      <AppLogo size={120} />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
});
