"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.installWorkletsSupport = installWorkletsSupport;
var _NitroModules = require("../NitroModules");
function installWorkletsSupport() {
  try {
    const {
      registerCustomSerializable
    } = require('react-native-worklets');
    const boxedNitroProxy = _NitroModules.NitroModules.box(_NitroModules.NitroModules);
    registerCustomSerializable({
      name: 'nitro.HybridObject',
      determine(value) {
        'worklet';

        const nitroProxy = boxedNitroProxy.unbox();
        return nitroProxy.isHybridObject(value);
      },
      pack(value) {
        'worklet';

        const nitroProxy = boxedNitroProxy.unbox();
        return nitroProxy.box(value);
      },
      unpack(value) {
        'worklet';

        return value.unbox();
      }
    });
  } catch {
    // react-native-worklets not installed.
  }
}
//# sourceMappingURL=installWorkletsSupport.js.map