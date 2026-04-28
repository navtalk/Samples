"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uniq = exports.proxifyPermissions = void 0;
const proxifyPermissions = platform => new Proxy({}, {
  get: (_, prop) => typeof prop === 'string' ? `${platform}.permission.${prop}` : prop
});
exports.proxifyPermissions = proxifyPermissions;
const uniq = array => {
  return array.filter((item, index) => item != null && array.indexOf(item) === index);
};
exports.uniq = uniq;
//# sourceMappingURL=utils.js.map