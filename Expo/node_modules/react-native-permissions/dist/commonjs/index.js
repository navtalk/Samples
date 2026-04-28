"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  canScheduleExactAlarms: true,
  canUseFullScreenIntent: true,
  check: true,
  checkLocationAccuracy: true,
  checkMultiple: true,
  checkNotifications: true,
  openPhotoPicker: true,
  openSettings: true,
  request: true,
  requestLocationAccuracy: true,
  requestMultiple: true,
  requestNotifications: true,
  PERMISSIONS: true,
  RESULTS: true
};
Object.defineProperty(exports, "PERMISSIONS", {
  enumerable: true,
  get: function () {
    return _permissions.PERMISSIONS;
  }
});
Object.defineProperty(exports, "RESULTS", {
  enumerable: true,
  get: function () {
    return _results.RESULTS;
  }
});
exports.requestNotifications = exports.requestMultiple = exports.requestLocationAccuracy = exports.request = exports.openSettings = exports.openPhotoPicker = exports.default = exports.checkNotifications = exports.checkMultiple = exports.checkLocationAccuracy = exports.check = exports.canUseFullScreenIntent = exports.canScheduleExactAlarms = void 0;
var _methods = require("./methods");
var _permissions = require("./permissions");
var _results = require("./results.js");
var _types = require("./types.js");
Object.keys(_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _types[key];
    }
  });
});
const canScheduleExactAlarms = exports.canScheduleExactAlarms = _methods.methods.canScheduleExactAlarms;
const canUseFullScreenIntent = exports.canUseFullScreenIntent = _methods.methods.canUseFullScreenIntent;
const check = exports.check = _methods.methods.check;
const checkLocationAccuracy = exports.checkLocationAccuracy = _methods.methods.checkLocationAccuracy;
const checkMultiple = exports.checkMultiple = _methods.methods.checkMultiple;
const checkNotifications = exports.checkNotifications = _methods.methods.checkNotifications;
const openPhotoPicker = exports.openPhotoPicker = _methods.methods.openPhotoPicker;
const openSettings = exports.openSettings = _methods.methods.openSettings;
const request = exports.request = _methods.methods.request;
const requestLocationAccuracy = exports.requestLocationAccuracy = _methods.methods.requestLocationAccuracy;
const requestMultiple = exports.requestMultiple = _methods.methods.requestMultiple;
const requestNotifications = exports.requestNotifications = _methods.methods.requestNotifications;
var _default = exports.default = {
  PERMISSIONS: _permissions.PERMISSIONS,
  RESULTS: _results.RESULTS,
  canScheduleExactAlarms,
  canUseFullScreenIntent,
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
//# sourceMappingURL=index.js.map