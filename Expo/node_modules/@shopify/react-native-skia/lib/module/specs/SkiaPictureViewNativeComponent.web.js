import { createElement } from "react";
import { SkiaPictureView } from "../views/SkiaPictureView.web";
const SkiaPictureViewNativeComponent = ({
  nativeID,
  debug,
  opaque,
  onLayout,
  ...viewProps
}) => {
  return /*#__PURE__*/createElement(SkiaPictureView, {
    nativeID,
    debug,
    opaque,
    onLayout,
    ...viewProps
  });
};
// eslint-disable-next-line import/no-default-export
export default SkiaPictureViewNativeComponent;
//# sourceMappingURL=SkiaPictureViewNativeComponent.web.js.map