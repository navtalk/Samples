"use strict";

export const proxifyPermissions = platform => new Proxy({}, {
  get: (_, prop) => typeof prop === 'string' ? `${platform}.permission.${prop}` : prop
});
export const uniq = array => {
  return array.filter((item, index) => item != null && array.indexOf(item) === index);
};
//# sourceMappingURL=utils.js.map