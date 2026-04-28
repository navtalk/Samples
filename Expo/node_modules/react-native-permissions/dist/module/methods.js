"use strict";

import { RESULTS } from "./results.js";
import { checkLocationAccuracy, openPhotoPicker, requestLocationAccuracy } from "./unsupportedMethods.js";
const check = async () => {
  return RESULTS.UNAVAILABLE;
};
const checkNotifications = async () => {
  return {
    status: RESULTS.UNAVAILABLE,
    settings: {}
  };
};
const checkMultiple = async permissions => {
  const output = {};
  for (const permission of permissions) {
    output[permission] = RESULTS.UNAVAILABLE;
  }
  return output;
};
export const methods = {
  canScheduleExactAlarms: Promise.reject,
  canUseFullScreenIntent: Promise.reject,
  check,
  checkLocationAccuracy,
  checkMultiple,
  checkNotifications,
  openPhotoPicker,
  openSettings: Promise.reject,
  request: check,
  requestLocationAccuracy,
  requestMultiple: checkMultiple,
  requestNotifications: checkNotifications
};
//# sourceMappingURL=methods.js.map