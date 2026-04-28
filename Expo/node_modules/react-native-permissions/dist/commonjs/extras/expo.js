"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withPermissions = exports.default = void 0;
var _configPlugins = require("@expo/config-plugins");
var _generateCode = require("@expo/config-plugins/build/utils/generateCode");
var _promises = require("fs/promises");
var _path = require("path");
const plugin = (expoConfig, {
  iosPermissions
} = {}) => (0, _configPlugins.withDangerousMod)(expoConfig, ['ios', async config => {
  if (iosPermissions == null || iosPermissions.length === 0) {
    return config;
  }
  const filePath = (0, _path.join)(config.modRequest.platformProjectRoot, 'Podfile');
  const contents = await (0, _promises.readFile)(filePath, 'utf8');
  const withRequire = (0, _generateCode.mergeContents)({
    tag: 'require',
    src: contents,
    anchor: /^require File\.join\(File\.dirname\(`node --print "require\.resolve\('react-native\/package\.json'\)"`\), "scripts\/react_native_pods"\)$/m,
    newSrc: `require File.join(File.dirname(\`node --print "require.resolve('react-native-permissions/package.json')"\`), "scripts/setup")`,
    offset: 1,
    comment: '#'
  });
  const withSetup = (0, _generateCode.mergeContents)({
    tag: 'setup',
    src: withRequire.contents,
    anchor: /^prepare_react_native_project!$/m,
    newSrc: `setup_permissions([
${iosPermissions.map(permission => `  '${permission}',`).join('\n')}
])`,
    offset: 1,
    comment: '#'
  });
  await (0, _promises.writeFile)(filePath, withSetup.contents, 'utf-8');
  return config;
}]);
const PACKAGE_NAME = 'react-native-permissions';
const withPermissions = exports.withPermissions = (0, _configPlugins.createRunOncePlugin)(plugin, PACKAGE_NAME);
var _default = config => [PACKAGE_NAME, config];
exports.default = _default;
//# sourceMappingURL=expo.js.map