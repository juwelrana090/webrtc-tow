const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': 'react-native-get-random-values',
};

config.resolver.assetExts.push(
  // Adds support for `.db` files for SQLite databases
  'db'
);

// Enable symlinks (if needed)
config.resolver.unstable_enableSymlinks = true;

module.exports = withNativeWind(config, { input: "./app/globals.css" });