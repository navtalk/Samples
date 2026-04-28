"use strict";

import * as React from 'react';
import { PanGestureHandler as PanGestureHandlerNative } from 'react-native-gesture-handler';
import { GestureHandlerRefContext } from "../utils/GestureHandlerRefContext.js";
import { jsx as _jsx } from "react/jsx-runtime";
export function PanGestureHandler(props) {
  const gestureRef = React.useRef(null);
  return /*#__PURE__*/_jsx(GestureHandlerRefContext.Provider, {
    value: gestureRef,
    children: /*#__PURE__*/_jsx(PanGestureHandlerNative, {
      ...props,
      ref: gestureRef
    })
  });
}
export { GestureHandlerRootView, State as GestureState } from 'react-native-gesture-handler';
//# sourceMappingURL=GestureHandlerNative.js.map