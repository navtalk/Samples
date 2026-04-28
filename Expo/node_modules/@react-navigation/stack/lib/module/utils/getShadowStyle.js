"use strict";

import Color from 'color';
import { Platform } from 'react-native';
export function getShadowStyle({
  offset,
  radius,
  opacity,
  color = '#000'
}) {
  const result = Platform.select({
    web: {
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px ${Color(color).alpha(opacity).toString()}`
    },
    default: {
      shadowOffset: offset,
      shadowRadius: radius,
      shadowColor: color,
      shadowOpacity: opacity
    }
  });
  return result;
}
//# sourceMappingURL=getShadowStyle.js.map