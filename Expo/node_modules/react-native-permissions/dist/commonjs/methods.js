"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.methods = void 0;
var _results = require("./results.js");
var _unsupportedMethods = require("./unsupportedMethods.js");
const check = async () => {
  return _results.RESULTS.UNAVAILABLE;
};
const checkNotifications = async () => {
  return {
    status: _results.RESULTS.UNAVAILABLE,
    settings: {}
  };
};
const checkMultiple = async permissions => {
  const output = {};
  for (const permission of permissions) {
    output[permission] = _results.RESULTS.UNAVAILABLE;
  }
  return output;
};
const methods = exports.methods = {
  canScheduleExactAlarms: Promise.reject,
  canUseFullScreenIntent: Promise.reject,
  check,
  checkLocationAccuracy: _unsupportedMethods.checkLocationAccuracy,
  checkMultiple,
  checkNotifications,
  openPhotoPicker: _unsupportedMethods.openPhotoPicker,
  openSettings: Promise.reject,
  request: check,
  requestLocationAccuracy: _unsupportedMethods.requestLocationAccuracy,
  requestMultiple: checkMultiple,
  requestNotifications: checkNotifications
};
//# sourceMappingURL=methods.js.map