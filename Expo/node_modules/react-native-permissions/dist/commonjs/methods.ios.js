"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.methods = void 0;
var _NativeRNPermissions = _interopRequireDefault(require("./specs/NativeRNPermissions.js"));
var _unsupportedMethods = require("./unsupportedMethods.js");
var _utils = require("./utils.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const openPhotoPicker = async () => {
  await _NativeRNPermissions.default.openPhotoPicker();
};
const openSettings = async (type = 'application') => {
  await _NativeRNPermissions.default.openSettings(type);
};
const check = async permission => {
  const status = await _NativeRNPermissions.default.check(permission);
  return status;
};
const request = async permission => {
  const status = await _NativeRNPermissions.default.request(permission);
  return status;
};
const checkLocationAccuracy = async () => {
  const accuracy = await _NativeRNPermissions.default.checkLocationAccuracy();
  return accuracy;
};
const requestLocationAccuracy = async ({
  purposeKey
}) => {
  const accuracy = await _NativeRNPermissions.default.requestLocationAccuracy(purposeKey);
  return accuracy;
};
const checkNotifications = async () => {
  const response = await _NativeRNPermissions.default.checkNotifications();
  return response;
};
const requestNotifications = async (options = ['alert', 'badge', 'sound']) => {
  const response = await _NativeRNPermissions.default.requestNotifications(options);
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
  checkLocationAccuracy,
  checkMultiple,
  checkNotifications,
  openPhotoPicker,
  openSettings,
  request,
  requestLocationAccuracy,
  requestMultiple,
  requestNotifications
};
//# sourceMappingURL=methods.ios.js.map