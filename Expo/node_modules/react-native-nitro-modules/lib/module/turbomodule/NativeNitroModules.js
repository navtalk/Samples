"use strict";

import { TurboModuleRegistry } from 'react-native';
import { ModuleNotFoundError } from '../ModuleNotFoundError';
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
    turboModule = TurboModuleRegistry.getEnforcing('NitroModules');
  } catch (e) {
    throw new ModuleNotFoundError(e);
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
    throw new ModuleNotFoundError(cause);
  }
}
export const NitroModules = nitroModules;

// Double-check native version
if (__DEV__) {
  if (jsVersion !== NitroModules.version) {
    console.warn(`The native Nitro Modules core runtime version is ${NitroModules.version}, but the JS code is using version ${jsVersion}. ` + `This could lead to undefined behaviour! Make sure to keep your Nitro versions in sync.`);
  }
}
export function isRuntimeAlive() {
  const cache = globalThis.__nitroJsiCache;
  const dispatcher = globalThis.__nitroDispatcher;
  return cache != null && dispatcher != null;
}
//# sourceMappingURL=NativeNitroModules.js.map