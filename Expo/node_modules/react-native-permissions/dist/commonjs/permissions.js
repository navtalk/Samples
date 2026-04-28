"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PERMISSIONS = void 0;
var _utils = require("./utils.js");
const PERMISSIONS = exports.PERMISSIONS = Object.freeze({
  ANDROID: (0, _utils.proxifyPermissions)('android'),
  IOS: (0, _utils.proxifyPermissions)('ios'),
  WINDOWS: (0, _utils.proxifyPermissions)('windows')
});
//# sourceMappingURL=permissions.js.map