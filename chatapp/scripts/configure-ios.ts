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

interface IOSConfigurationOptions {
  infoPlistPath?: string;
  projectPath?: string;
  assetsPath?: string;
}

export class IOSConfigurator {
  private infoPlistPath: string;
  private projectPath: string;
  private assetsPath: string;

  constructor(options?: IOSConfigurationOptions) {
    this.infoPlistPath =
      options?.infoPlistPath ||
      path.join(__dirname, '../ios/YourApp/Info.plist');
    this.projectPath =
      options?.projectPath ||
      path.join(__dirname, '../ios/YourApp.xcodeproj/project.pbxproj');
    this.assetsPath =
      options?.assetsPath ||
      path.join(__dirname, '../ios/YourApp/Assets.xcassets');
  }

  private readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  private writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content);
  }

  configureInfoPlist(): void {
    let content = this.readFile(this.infoPlistPath);

    try {
      //@ts-ignore
      const plistData = parse(content) as Record<string, any>;

      // Add permissions
      Object.entries(appConfig.ios.permissions).forEach(([key, value]) => {
        const permissionKey = `NS${key.charAt(0).toUpperCase() + key.slice(1)}UsageDescription`;
        plistData[permissionKey] = value;
      });

      // Update build number and version
      plistData.CFBundleVersion = appConfig.ios.buildNumber;
      plistData.CFBundleShortVersionString = appConfig.version;

      // Set orientation
      const orientation =
        appConfig.orientation === 'portrait'
          ? ['UIInterfaceOrientationPortrait']
          : [
              'UIInterfaceOrientationLandscapeLeft',
              'UIInterfaceOrientationLandscapeRight',
            ];

      plistData.UISupportedInterfaceOrientations = orientation;

      //@ts-ignore
      plistData['UISupportedInterfaceOrientations~ipad'] = orientation;

      // Set interface style
      if (appConfig.userInterfaceStyle !== 'automatic') {
        plistData.UIUserInterfaceStyle = appConfig.userInterfaceStyle;
      }

      //@ts-ignore
      const updatedPlist = build(plistData);
      this.writeFile(this.infoPlistPath, updatedPlist);
    } catch (error) {
      console.error('❌ Error parsing PLIST:', error);
      throw error;
    }
  }

  configureXcodeProject(): void {
    let content = this.readFile(this.projectPath);

    // Update display name
    content = content.replace(
      /PRODUCT_NAME = [^;]+;/,
      `PRODUCT_NAME = ${appConfig.name};`,
    );

    this.writeFile(this.projectPath, content);
  }

  async copyAssets(): Promise<void> {
    const assets = AssetManager.getAllAssets();

    for (const asset of assets) {
      if (asset.platform === 'ios' || !asset.platform) {
        const sourcePath = path.join(__dirname, '..', asset.path);

        if (fs.existsSync(sourcePath)) {
          // Copy to iOS assets directory
          const fileName = path.basename(sourcePath);
          const destPath = path.join(this.assetsPath, fileName);

          fs.copyFileSync(sourcePath, destPath);
          console.log(`✅ Copied ${asset.type} to iOS assets`);
        }
      }
    }
  }

  async configure(): Promise<void> {
    try {
      this.configureInfoPlist();
      this.configureXcodeProject();
      await this.copyAssets();

      console.log('✅ iOS configuration updated successfully');
    } catch (error) {
      console.error('❌ Error configuring iOS:', error);
      throw error;
    }
  }
}
