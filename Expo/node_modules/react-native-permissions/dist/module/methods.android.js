"use strict";

import { Alert, Platform } from 'react-native';
import NativeModule from "./specs/NativeRNPermissions.js";
import { checkLocationAccuracy, openPhotoPicker, requestLocationAccuracy } from "./unsupportedMethods.js";
import { uniq } from "./utils.js";
const POST_NOTIFICATIONS = 'android.permission.POST_NOTIFICATIONS';
const USES_LEGACY_NOTIFICATIONS = (Platform.OS === 'android' ? Platform.Version : 0) < 33;
const shouldRequestPermission = async (permission, rationale) => {
  if (rationale == null || !(await NativeModule.shouldShowRequestRationale(permission))) {
    return true;
  }
  if (typeof rationale === 'function') {
    return rationale();
  }
  return new Promise(resolve => {
    const {
      buttonNegative
    } = rationale;
    Alert.alert(rationale.title, rationale.message, [...(buttonNegative ? [{
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
  await NativeModule.openSettings(type);
};
const canScheduleExactAlarms = () => NativeModule.canScheduleExactAlarms();
const canUseFullScreenIntent = () => NativeModule.canUseFullScreenIntent();
const check = async permission => {
  const status = await NativeModule.check(permission);
  return status;
};
const request = async (permission, rationale) => {
  const fn = (await shouldRequestPermission(permission, rationale)) ? NativeModule.request : NativeModule.check;
  const status = await fn(permission);
  return status;
};
const checkNotifications = async () => {
  if (USES_LEGACY_NOTIFICATIONS) {
    const response = await NativeModule.checkNotifications();
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
    const response = await NativeModule.requestNotifications(options);
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
  return NativeModule.checkMultiple(uniq(permissions));
};
const requestMultiple = permissions => {
  return NativeModule.requestMultiple(uniq(permissions));
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
//# sourceMappingURL=methods.android.js.map