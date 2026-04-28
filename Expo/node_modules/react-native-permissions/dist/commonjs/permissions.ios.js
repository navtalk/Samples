"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PERMISSIONS = void 0;
var _utils = require("./utils.js");
const IOS = Object.freeze({
  APP_TRACKING_TRANSPARENCY: 'ios.permission.APP_TRACKING_TRANSPARENCY',
  BLUETOOTH: 'ios.permission.BLUETOOTH',
  CALENDARS: 'ios.permission.CALENDARS',
  CALENDARS_WRITE_ONLY: 'ios.permission.CALENDARS_WRITE_ONLY',
  CAMERA: 'ios.permission.CAMERA',
  CONTACTS: 'ios.permission.CONTACTS',
  FACE_ID: 'ios.permission.FACE_ID',
  LOCATION_ALWAYS: 'ios.permission.LOCATION_ALWAYS',
  LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
  MEDIA_LIBRARY: 'ios.permission.MEDIA_LIBRARY',
  MICROPHONE: 'ios.permission.MICROPHONE',
  MOTION: 'ios.permission.MOTION',
  PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
  PHOTO_LIBRARY_ADD_ONLY: 'ios.permission.PHOTO_LIBRARY_ADD_ONLY',
  REMINDERS: 'ios.permission.REMINDERS',
  SIRI: 'ios.permission.SIRI',
  SPEECH_RECOGNITION: 'ios.permission.SPEECH_RECOGNITION',
  STOREKIT: 'ios.permission.STOREKIT'
});
const PERMISSIONS = exports.PERMISSIONS = Object.freeze({
  ANDROID: (0, _utils.proxifyPermissions)('android'),
  IOS,
  WINDOWS: (0, _utils.proxifyPermissions)('windows')
});
//# sourceMappingURL=permissions.ios.js.map