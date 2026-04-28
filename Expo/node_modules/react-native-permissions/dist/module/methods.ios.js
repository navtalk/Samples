"use strict";

import NativeModule from "./specs/NativeRNPermissions.js";
import { canScheduleExactAlarms, canUseFullScreenIntent } from "./unsupportedMethods.js";
import { uniq } from "./utils.js";
const openPhotoPicker = async () => {
  await NativeModule.openPhotoPicker();
};
const openSettings = async (type = 'application') => {
  await NativeModule.openSettings(type);
};
const check = async permission => {
  const status = await NativeModule.check(permission);
  return status;
};
const request = async permission => {
  const status = await NativeModule.request(permission);
  return status;
};
const checkLocationAccuracy = async () => {
  const accuracy = await NativeModule.checkLocationAccuracy();
  return accuracy;
};
const requestLocationAccuracy = async ({
  purposeKey
}) => {
  const accuracy = await NativeModule.requestLocationAccuracy(purposeKey);
  return accuracy;
};
const checkNotifications = async () => {
  const response = await NativeModule.checkNotifications();
  return response;
};
const requestNotifications = async (options = ['alert', 'badge', 'sound']) => {
  const response = await NativeModule.requestNotifications(options);
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
  requestNotifications
};
//# sourceMappingURL=methods.ios.js.map