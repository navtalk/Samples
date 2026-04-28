"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.methods = void 0;
var _NativeRNPermissions = _interopRequireDefault(require("./specs/NativeRNPermissions.js"));
var _unsupportedMethods = require("./unsupportedMethods.js");
var _utils = require("./utils.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const openSettings = async () => {
  await _NativeRNPermissions.default.openSettings('N/A');
};
const check = async permission => {
  const response = await _NativeRNPermissions.default.check(permission);
  return response;
};
const request = async permission => {
  const response = await _NativeRNPermissions.default.request(permission);
  return response;
};
const checkNotifications = async () => {
  const response = await _NativeRNPermissions.default.checkNotifications();
  return response;
};
const checkMultiple = async permissions => {
  const output = {};
  for (const permission of (0, _utils.uniq)(permissions)) {
    output[permission] = await check(permission);
  }
  return output;
};
const requestMultiple = async permissions => {
  const output = {};
  for (const permission of (0, _utils.uniq)(permissions)) {
    output[permission] = await request(permission);
  }
  return output;
};
const methods = exports.methods = {
  canScheduleExactAlarms: _unsupportedMethods.canScheduleExactAlarms,
  canUseFullScreenIntent: _unsupportedMethods.canUseFullScreenIntent,
  check,
  checkLocationAccuracy: _unsupportedMethods.checkLocationAccuracy,
  checkMultiple,
  checkNotifications,
  openPhotoPicker: _unsupportedMethods.openPhotoPicker,
  openSettings,
  request,
  requestLocationAccuracy: _unsupportedMethods.requestLocationAccuracy,
  requestMultiple,
  requestNotifications: checkNotifications
};
//# sourceMappingURL=methods.windows.js.map