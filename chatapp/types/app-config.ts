export interface AndroidConfig {
  package: string;
  versionCode: number;
  permissions: string[];
  compileSdkVersion: number;
  targetSdkVersion: number;
  minSdkVersion: number;
  buildToolsVersion: string;
  icon: string;
  adaptiveIcon: {
    foregroundImage: string;
    backgroundColor: string;
  };
}

export interface IOSConfig {
  bundleIdentifier: string;
  buildNumber: string;
  permissions: {
    camera: string;
    microphone: string;
    [key: string]: string;
  };
  icon: string;
}

export interface AssetConfig {
  logo: {
    path: string;
    resizeMode: 'contain' | 'cover' | 'stretch';
  };
  splash: {
    image: string;
    backgroundColor: string;
    resizeMode: 'contain' | 'cover' | 'stretch';
  };
  favicon: string;
  adaptiveIcon: {
    foreground: string;
    background: string;
  };
}

export interface AppConfig {
  name: string;
  slug: string;
  version: string;
  orientation: 'portrait' | 'landscape';
  icon: string;
  userInterfaceStyle: 'light' | 'dark' | 'automatic';
  assetConfig: AssetConfig;
  android: AndroidConfig;
  ios: IOSConfig;
  web: {
    favicon: string;
  };
}
