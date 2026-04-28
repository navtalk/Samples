"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _NativeNitroModules = require("./turbomodule/NativeNitroModules");
Object.keys(_NativeNitroModules).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _NativeNitroModules[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _NativeNitroModules[key];
    }
  });
});
//# sourceMappingURL=NitroModules.js.map