import { AndroidConfigurator } from './configure-android';
import { IOSConfigurator } from './configure-ios';
import { AssetManager } from '../src/utils/AssetManager';

class ConfigurationRunner {
  static async run(): Promise<void> {
    //@ts-ignore
    const platform = process.argv[2] || 'all';

    try {
      console.log('🎨 Checking assets...');
      const assets = AssetManager.getAllAssets();

      for (const asset of assets) {
        //@ts-ignore
        const assetPath = path.join(__dirname, '..', asset.path);
        //@ts-ignore
        if (!fs.existsSync(assetPath)) {
          console.warn(`⚠️  Missing asset: ${asset.path}`);
        }
      }

      switch (platform) {
        case 'android':
          await new AndroidConfigurator().configure();
          break;
        case 'ios':
          await new IOSConfigurator().configure();
          break;
        case 'all':
          await new AndroidConfigurator().configure();
          await new IOSConfigurator().configure();
          break;
        default:
          console.log('Usage: ts-node configure.ts [android|ios|all]');
      }

      console.log('✅ All configurations completed successfully!');
    } catch (error) {
      console.error('❌ Configuration failed:', error);
      //@ts-ignore
      process.exit(1);
    }
  }
}

// Run if called directly
//@ts-ignore
if (require.main === module) {
  ConfigurationRunner.run();
}

export { ConfigurationRunner };
