"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = require("react");
var _SkiaPictureView = require("../views/SkiaPictureView.web");
const SkiaPictureViewNativeComponent = ({
  nativeID,
  debug,
  opaque,
  onLayout,
  ...viewProps
}) => {
  return /*#__PURE__*/(0, _react.createElement)(_SkiaPictureView.SkiaPictureView, {
    nativeID,
    debug,
    opaque,
    onLayout,
    ...viewProps
  });
};
// eslint-disable-next-line import/no-default-export
var _default = exports.default = SkiaPictureViewNativeComponent;
//# sourceMappingURL=SkiaPictureViewNativeComponent.web.js.map