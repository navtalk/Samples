"use strict";

const getUnsupportedError = (os, version) => new Error(`Only supported by ${os} ${version} and above`);
export const canScheduleExactAlarms = async () => {
  throw getUnsupportedError('Android', 12);
};
export const canUseFullScreenIntent = async () => {
  throw getUnsupportedError('Android', 14);
};
export const openPhotoPicker = async () => {
  throw getUnsupportedError('iOS', 14);
};
export const requestLocationAccuracy = async () => {
  throw getUnsupportedError('iOS', 14);
};
export const checkLocationAccuracy = async () => {
  throw getUnsupportedError('iOS', 14);
};
//# sourceMappingURL=unsupportedMethods.js.map