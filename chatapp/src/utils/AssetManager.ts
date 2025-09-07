import { Platform } from 'react-native';
import { appConfig } from '../../app.config';

export type AssetType = 'logo' | 'splash' | 'icon' | 'favicon' | 'adaptiveIcon';

export class AssetManager {
  static getAssetPath(
    assetType: AssetType,
    platform?: 'android' | 'ios' | 'web',
  ): string {
    const platformConfig = platform || Platform.OS;

    switch (assetType) {
      case 'logo':
        return appConfig.assetConfig.logo.path;

      case 'splash':
        return appConfig.assetConfig.splash.image;

      case 'favicon':
        return appConfig.assetConfig.favicon;

      case 'icon':
        if (platformConfig === 'android') return appConfig.android.icon;
        if (platformConfig === 'ios') return appConfig.ios.icon;
        return appConfig.icon;

      case 'adaptiveIcon':
        if (platformConfig === 'android') {
          return appConfig.android.adaptiveIcon.foregroundImage;
        }
        return appConfig.assetConfig.adaptiveIcon.foreground;

      default:
        return appConfig.icon;
    }
  }

  static getSplashBackgroundColor(): string {
    return appConfig.assetConfig.splash.backgroundColor;
  }

  static getAdaptiveIconBackground(): string {
    if (Platform.OS === 'android') {
      return appConfig.android.adaptiveIcon.backgroundColor;
    }
    return appConfig.assetConfig.adaptiveIcon.background;
  }

  static getResizeMode(
    assetType: 'logo' | 'splash',
  ): 'contain' | 'cover' | 'stretch' {
    if (assetType === 'logo') {
      return appConfig.assetConfig.logo.resizeMode;
    }
    return appConfig.assetConfig.splash.resizeMode;
  }

  static getAllAssets(): {
    type: AssetType;
    path: string;
    platform?: string;
  }[] {
    return [
      { type: 'logo', path: appConfig.assetConfig.logo.path },
      { type: 'splash', path: appConfig.assetConfig.splash.image },
      { type: 'favicon', path: appConfig.assetConfig.favicon },
      { type: 'icon', path: appConfig.icon, platform: 'default' },
      { type: 'icon', path: appConfig.android.icon, platform: 'android' },
      { type: 'icon', path: appConfig.ios.icon, platform: 'ios' },
      {
        type: 'adaptiveIcon',
        path: appConfig.android.adaptiveIcon.foregroundImage,
        platform: 'android',
      },
      {
        type: 'adaptiveIcon',
        path: appConfig.assetConfig.adaptiveIcon.foreground,
        platform: 'default',
      },
    ];
  }
}
