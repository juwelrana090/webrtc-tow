//@ts-ignore
import fs from 'fs';
//@ts-ignore
import path from 'path';
//@ts-ignore
import { dirname } from 'path';
//@ts-ignore
import { fileURLToPath } from 'url';
import { appConfig } from '../app.config';
import { AssetManager } from '../src/utils/AssetManager';

//@ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AndroidConfigurationOptions {
  buildGradlePath?: string;
  manifestPath?: string;
  stringsPath?: string;
  stylesPath?: string;
}

export class AndroidConfigurator {
  private buildGradlePath: string;
  private manifestPath: string;
  private stringsPath: string;
  private stylesPath: string;

  constructor(options?: AndroidConfigurationOptions) {
    this.buildGradlePath =
      options?.buildGradlePath ||
      path.join(__dirname, '../android/app/build.gradle');
    this.manifestPath =
      options?.manifestPath ||
      path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');
    this.stringsPath =
      options?.stringsPath ||
      path.join(__dirname, '../android/app/src/main/res/values/strings.xml');
    this.stylesPath =
      options?.stylesPath ||
      path.join(__dirname, '../android/app/src/main/res/values/styles.xml');
  }

  private readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  private writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content);
  }

  configureBuildGradle(): void {
    let content = this.readFile(this.buildGradlePath);

    // Update SDK versions
    content = content.replace(
      /compileSdkVersion\\s+\\d+/,
      `compileSdkVersion ${appConfig.android.compileSdkVersion}`,
    );
    content = content.replace(
      /targetSdkVersion\\s+\\d+/,
      `targetSdkVersion ${appConfig.android.targetSdkVersion}`,
    );
    content = content.replace(
      /minSdkVersion\\s+\\d+/,
      `minSdkVersion ${appConfig.android.minSdkVersion}`,
    );

    // Update buildToolsVersion
    if (content.includes('buildToolsVersion')) {
      content = content.replace(
        /buildToolsVersion\\s+"[^"]+"/,
        `buildToolsVersion "${appConfig.android.buildToolsVersion}"`,
      );
    }

    this.writeFile(this.buildGradlePath, content);
  }

  configureAndroidManifest(): void {
    let content = this.readFile(this.manifestPath);

    // Add permissions
    appConfig.android.permissions.forEach(permission => {
      const permissionString = `<uses-permission android:name="android.permission.${permission}" />`;
      if (!content.includes(permissionString)) {
        content = content.replace(
          '<manifest xmlns:android="<http://schemas.android.com/apk/res/android>">',
          `<manifest xmlns:android="<http://schemas.android.com/apk/res/android>">\\n    ${permissionString}`,
        );
      }
    });

    // Set orientation
    const orientationConfig =
      appConfig.orientation === 'portrait' ? 'portrait' : 'sensorLandscape';

    content = content.replace(
      /android:screenOrientation="[^"]+"/,
      `android:screenOrientation="${orientationConfig}"`,
    );

    this.writeFile(this.manifestPath, content);
  }

  configureStringsXml(): void {
    let content = this.readFile(this.stringsPath);

    // Update app name

    //@ts-ignore
    content = content.replace(
      /<string name="app_name">[^<]+<\/string>/,
      `<string name="app_name">${appConfig.name}</string>`,
    );

    this.writeFile(this.stringsPath, content);
  }

  configureStylesXml(): void {
    let content = this.readFile(this.stylesPath);

    // Set splash screen background
    const splashBackground = AssetManager.getSplashBackgroundColor();

    //@ts-ignore
    content = content.replace(
      /<item name="android:windowBackground">[^<]+<\/item>/,
      `<item name="android:windowBackground">${splashBackground}</item>`,
    );

    this.writeFile(this.stylesPath, content);
  }

  async copyAssets(): Promise<void> {
    const assets = AssetManager.getAllAssets();

    for (const asset of assets) {
      if (asset.platform === 'android' || !asset.platform) {
        const sourcePath = path.join(__dirname, '..', asset.path);
        const destDir = path.join(__dirname, '../android/app/src/main/res');

        if (fs.existsSync(sourcePath)) {
          // Copy to appropriate Android drawable folders
          const fileName = path.basename(sourcePath);
          const destPath = path.join(destDir, 'drawable', fileName);

          fs.copyFileSync(sourcePath, destPath);
          console.log(`✅ Copied ${asset.type} to Android resources`);
        }
      }
    }
  }

  async configure(): Promise<void> {
    try {
      this.configureBuildGradle();
      this.configureAndroidManifest();
      this.configureStringsXml();
      this.configureStylesXml();
      await this.copyAssets();

      console.log('✅ Android configuration updated successfully');
    } catch (error) {
      console.error('❌ Error configuring Android:', error);
      throw error;
    }
  }
}
