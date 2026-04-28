"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.methods = void 0;
var _reactNative = require("react-native");
var _NativeRNPermissions = _interopRequireDefault(require("./specs/NativeRNPermissions.js"));
var _unsupportedMethods = require("./unsupportedMethods.js");
var _utils = require("./utils.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const POST_NOTIFICATIONS = 'android.permission.POST_NOTIFICATIONS';
const USES_LEGACY_NOTIFICATIONS = (_reactNative.Platform.OS === 'android' ? _reactNative.Platform.Version : 0) < 33;
const shouldRequestPermission = async (permission, rationale) => {
  if (rationale == null || !(await _NativeRNPermissions.default.shouldShowRequestRationale(permission))) {
    return true;
  }
  if (typeof rationale === 'function') {
    return rationale();
  }
  return new Promise(resolve => {
    const {
      buttonNegative
    } = rationale;
    _reactNative.Alert.alert(rationale.title, rationale.message, [...(buttonNegative ? [{
      text: buttonNegative,
      onPress: () => resolve(false)
    }] : []), {
      text: rationale.buttonPositive,
      onPress: () => resolve(true)
    }], {
      cancelable: false
    });
  });
};
const openSettings = async (type = 'application') => {
  await _NativeRNPermissions.default.openSettings(type);
};
const canScheduleExactAlarms = () => _NativeRNPermissions.default.canScheduleExactAlarms();
const canUseFullScreenIntent = () => _NativeRNPermissions.default.canUseFullScreenIntent();
const check = async permission => {
  const status = await _NativeRNPermissions.default.check(permission);
  return status;
};
const request = async (permission, rationale) => {
  const fn = (await shouldRequestPermission(permission, rationale)) ? _NativeRNPermissions.default.request : _NativeRNPermissions.default.check;
  const status = await fn(permission);
  return status;
};
const checkNotifications = async () => {
  if (USES_LEGACY_NOTIFICATIONS) {
    const response = await _NativeRNPermissions.default.checkNotifications();
    return response;
  } else {
    const status = await check(POST_NOTIFICATIONS);
    return {
      status,
      settings: {}
    };
  }
};
const requestNotifications = async (options = [], rationale) => {
  if (USES_LEGACY_NOTIFICATIONS) {
    const response = await _NativeRNPermissions.default.requestNotifications(options);
    return response;
  } else {
    const status = await request(POST_NOTIFICATIONS, rationale);
    return {
      status,
      settings: {}
    };
  }
};
const checkMultiple = permissions => {
  return _NativeRNPermissions.default.checkMultiple((0, _utils.uniq)(permissions));
};
const requestMultiple = permissions => {
  return _NativeRNPermissions.default.requestMultiple((0, _utils.uniq)(permissions));
};
const methods = exports.methods = {
  canScheduleExactAlarms,
  canUseFullScreenIntent,
  check,
  checkLocationAccuracy: _unsupportedMethods.checkLocationAccuracy,
  checkMultiple,
  checkNotifications,
  openPhotoPicker: _unsupportedMethods.openPhotoPicker,
  openSettings,
  request,
  requestLocationAccuracy: _unsupportedMethods.requestLocationAccuracy,
  requestMultiple,
  requestNotifications
};
//# sourceMappingURL=methods.android.js.map