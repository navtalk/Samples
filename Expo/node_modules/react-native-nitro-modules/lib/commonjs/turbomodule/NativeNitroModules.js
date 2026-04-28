"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NitroModules = void 0;
exports.isRuntimeAlive = isRuntimeAlive;
var _reactNative = require("react-native");
var _ModuleNotFoundError = require("../ModuleNotFoundError");
const jsVersion = require('react-native-nitro-modules/package.json').version;
function getInstalledNitro() {
  // @ts-expect-error
  return global.NitroModulesProxy;
}
let nitroModules = getInstalledNitro();

// Reuse the existing proxy when the same JS runtime evaluates Nitro again,
// such as when react-native-harness loads a dedicated test bundle.
if (nitroModules != null) {
  if (nitroModules.version !== jsVersion) {
    throw new Error(`Nitro was installed twice: once with native version ${nitroModules.version} and once with JS version ${jsVersion}. ` + 'This usually means react-native-nitro-modules exists multiple times in node_modules (e.g. in monorepos or double-linked setups).');
  }
} else {
  // 1. Get (and initialize) the TurboModule
  let turboModule;
  try {
    turboModule = _reactNative.TurboModuleRegistry.getEnforcing('NitroModules');
  } catch (e) {
    throw new _ModuleNotFoundError.ModuleNotFoundError(e);
  }

  // 2. Install Dispatcher and install `NitroModulesProxy` into the Runtime's `global`
  const errorMessage = turboModule.install();
  if (errorMessage != null) {
    throw new Error(`Failed to install Nitro: ${errorMessage}`);
  }

  // 3. Find `NitroModulesProxy` in `global`
  nitroModules = getInstalledNitro();
  if (nitroModules == null) {
    const cause = new Error('NitroModules was installed, but `global.NitroModulesProxy` was null!');
    throw new _ModuleNotFoundError.ModuleNotFoundError(cause);
  }
}
const NitroModules = exports.NitroModules = nitroModules;

// Double-check native version
if (__DEV__) {
  if (jsVersion !== NitroModules.version) {
    console.warn(`The native Nitro Modules core runtime version is ${NitroModules.version}, but the JS code is using version ${jsVersion}. ` + `This could lead to undefined behaviour! Make sure to keep your Nitro versions in sync.`);
  }
}
function isRuntimeAlive() {
  const cache = globalThis.__nitroJsiCache;
  const dispatcher = globalThis.__nitroDispatcher;
  return cache != null && dispatcher != null;
}
//# sourceMappingURL=NativeNitroModules.js.map