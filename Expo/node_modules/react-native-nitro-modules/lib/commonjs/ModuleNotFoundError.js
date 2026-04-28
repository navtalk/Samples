"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ModuleNotFoundError = void 0;
var _reactNative = require("react-native");
const BULLET_POINT = '\n* ';
function messageWithSuggestions(message, suggestions) {
  return message + BULLET_POINT + suggestions.join(BULLET_POINT);
}
function getFrameworkType() {
  // check if Expo
  const ExpoConstants = _reactNative.NativeModules.NativeUnimoduleProxy?.modulesConstants?.ExponentConstants;
  if (ExpoConstants != null) {
    if (ExpoConstants.appOwnership === 'expo') {
      // We're running Expo Go
      return 'expo-go';
    } else {
      // We're running Expo bare / standalone
      return 'expo';
    }
  }
  return 'react-native';
}
class ModuleNotFoundError extends Error {
  constructor(cause) {
    const framework = getFrameworkType();
    if (framework === 'expo-go') {
      super('NitroModules are not supported in Expo Go! Use EAS (`expo prebuild`) or eject to a bare workflow instead.');
      return;
    }
    const message = 'Failed to get NitroModules: The native "NitroModules" Turbo/Native-Module could not be found.';
    const suggestions = [];
    suggestions.push('Make sure react-native-nitro-modules/NitroModules is correctly autolinked (run `npx react-native config` to verify)');
    suggestions.push('Make sure you enabled the new architecture (TurboModules) and CodeGen properly generated the "NativeNitroModules"/NitroModules specs. See https://github.com/reactwg/react-native-new-architecture/blob/main/docs/enable-apps.md');
    suggestions.push('Make sure you are using react-native 0.75.0 or higher.');
    suggestions.push('Make sure you rebuilt the app.');
    if (framework === 'expo') {
      suggestions.push('Make sure you ran `expo prebuild`.');
    }
    switch (_reactNative.Platform.OS) {
      case 'ios':
      case 'macos':
        suggestions.push('Make sure you ran `pod install` in the ios/ directory.');
        break;
      case 'android':
        suggestions.push('Make sure gradle is synced.');
        break;
      default:
        throw new Error(`NitroModules are not yet supported on ${_reactNative.Platform.OS}!`);
    }
    const error = messageWithSuggestions(message, suggestions);
    super(error, {
      cause: cause
    });
  }
}
exports.ModuleNotFoundError = ModuleNotFoundError;
//# sourceMappingURL=ModuleNotFoundError.js.map