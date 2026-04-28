"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NitroModules = void 0;
exports.isRuntimeAlive = isRuntimeAlive;
var _reactNative = require("react-native");
const NitroModules = exports.NitroModules = new Proxy({}, {
  get: () => {
    throw new Error(`Native NitroModules are not available on ${_reactNative.Platform.OS}! Make sure you're not calling getNativeNitroModules() in a ${_reactNative.Platform.OS} (.${_reactNative.Platform.OS}.ts) environment.`);
  }
});
function isRuntimeAlive() {
  return false;
}
//# sourceMappingURL=NativeNitroModules.web.js.map