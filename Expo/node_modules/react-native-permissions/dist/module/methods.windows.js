"use strict";

import NativeModule from "./specs/NativeRNPermissions.js";
import { canScheduleExactAlarms, canUseFullScreenIntent, checkLocationAccuracy, openPhotoPicker, requestLocationAccuracy } from "./unsupportedMethods.js";
import { uniq } from "./utils.js";
const openSettings = async () => {
  await NativeModule.openSettings('N/A');
};
const check = async permission => {
  const response = await NativeModule.check(permission);
  return response;
};
const request = async permission => {
  const response = await NativeModule.request(permission);
  return response;
};
const checkNotifications = async () => {
  const response = await NativeModule.checkNotifications();
  return response;
};
const checkMultiple = async permissions => {
  const output = {};
  for (const permission of uniq(permissions)) {
    output[permission] = await check(permission);
  }
  return output;
};
const requestMultiple = async permissions => {
  const output = {};
  for (const permission of uniq(permissions)) {
    output[permission] = await request(permission);
  }
  return output;
};
export const methods = {
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
  requestNotifications: checkNotifications
};
//# sourceMappingURL=methods.windows.js.map