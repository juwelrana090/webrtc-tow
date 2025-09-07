import { AppConfig } from './types/app-config';
import { version } from './package.json';

const appConfig: AppConfig = {
  name: 'WebRTC Video Call',
  slug: 'webrtc-video-call',
  version: version,
  orientation: 'portrait',
  icon: './assets/images/logo.png',
  userInterfaceStyle: 'automatic',

  assetConfig: {
    logo: {
      path: './assets/images/logo.png',
      resizeMode: 'contain',
    },
    splash: {
      image: './assets/images/logo.png',
      backgroundColor: '#000000',
      resizeMode: 'contain',
    },
    favicon: './assets/images/logo.png',
    adaptiveIcon: {
      foreground: './assets/adaptive-icon-foreground.png',
      background: './assets/adaptive-icon-background.png',
    },
  },

  android: {
    package: 'com.webrtc.videocall',
    versionCode: 1,
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'MODIFY_AUDIO_SETTINGS',
      'ACCESS_NETWORK_STATE',
      'INTERNET',
    ],
    compileSdkVersion: 33,
    targetSdkVersion: 33,
    minSdkVersion: 21,
    buildToolsVersion: '33.0.0',
    icon: './assets/images/logo.png',
    adaptiveIcon: {
      foregroundImage: './assets/android/adaptive-icon-foreground.png',
      backgroundColor: '#000000',
    },
  },

  ios: {
    bundleIdentifier: 'com.webrtc.videocall',
    buildNumber: '1',
    permissions: {
      camera: 'Camera permission is required for video calls',
      microphone: 'Microphone permission is required for audio calls',
    },
    icon: './assets/images/logo.png',
  },

  web: {
    favicon: './assets/images/logo.png',
  },
};

export { appConfig };
