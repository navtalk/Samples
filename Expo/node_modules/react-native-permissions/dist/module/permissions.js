"use strict";

import { proxifyPermissions } from "./utils.js";
export const PERMISSIONS = Object.freeze({
  ANDROID: proxifyPermissions('android'),
  IOS: proxifyPermissions('ios'),
  WINDOWS: proxifyPermissions('windows')
});
//# sourceMappingURL=permissions.js.map