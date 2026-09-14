const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the workspace and resolve hoisted packages.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

/*
 * These three keep native state — a UI runtime, a shared-value registry, a
 * table of attached gesture handlers — behind one native module each. A second
 * copy in the bundle initialises that state twice against the one native side,
 * and the app dies natively the first time a gesture crosses the boundary,
 * with no JavaScript frames to read.
 *
 * A second copy is easy to get here without meaning to: `nodeModulesPaths` is
 * only a fallback list, so Metro still walks up from a module's real path
 * first, and library code under `packages/` therefore binds to whatever sits
 * beside it rather than to the app's copy. Pinning the resolution is what makes
 * that unable to happen, whatever an install leaves on disk.
 */
const SINGLETONS = [
  'react-native-gesture-handler',
  'react-native-reanimated',
  'react-native-worklets',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const singleton = SINGLETONS.find(
    (name) => moduleName === name || moduleName.startsWith(`${name}/`)
  );

  if (singleton) {
    return context.resolveRequest(
      { ...context, originModulePath: path.resolve(projectRoot, 'package.json') },
      moduleName,
      platform
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
  // Named themes must be registered here or setTheme() throws. Keep in sync
  // with PANEL_EXTRA_THEMES in panelui-native.
  extraThemes: ['moon', 'moon-dark', 'grass', 'grass-dark'],
});
