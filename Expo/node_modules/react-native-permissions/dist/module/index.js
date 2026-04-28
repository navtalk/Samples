"use strict";

import { methods } from './methods';
import { PERMISSIONS } from './permissions';
import { RESULTS } from "./results.js";
export { PERMISSIONS } from './permissions';
export { RESULTS } from "./results.js";
export * from "./types.js";
export const canScheduleExactAlarms = methods.canScheduleExactAlarms;
export const canUseFullScreenIntent = methods.canUseFullScreenIntent;
export const check = methods.check;
export const checkLocationAccuracy = methods.checkLocationAccuracy;
export const checkMultiple = methods.checkMultiple;
export const checkNotifications = methods.checkNotifications;
export const openPhotoPicker = methods.openPhotoPicker;
export const openSettings = methods.openSettings;
export const request = methods.request;
export const requestLocationAccuracy = methods.requestLocationAccuracy;
export const requestMultiple = methods.requestMultiple;
export const requestNotifications = methods.requestNotifications;
export default {
  PERMISSIONS,
  RESULTS,
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