"use strict";

import { NitroModules } from '../NitroModules';
export function installWorkletsSupport() {
  try {
    const {
      registerCustomSerializable
    } = require('react-native-worklets');
    const boxedNitroProxy = NitroModules.box(NitroModules);
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