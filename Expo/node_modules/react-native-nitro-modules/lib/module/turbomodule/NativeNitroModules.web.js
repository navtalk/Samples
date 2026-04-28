"use strict";

import { Platform } from 'react-native';
export const NitroModules = new Proxy({}, {
  get: () => {
    throw new Error(`Native NitroModules are not available on ${Platform.OS}! Make sure you're not calling getNativeNitroModules() in a ${Platform.OS} (.${Platform.OS}.ts) environment.`);
  }
});
export function isRuntimeAlive() {
  return false;
}
//# sourceMappingURL=NativeNitroModules.web.js.map