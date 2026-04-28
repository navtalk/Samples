import type { ViewProps } from "react-native";
export interface NativeProps extends ViewProps {
    debug?: boolean;
    opaque?: boolean;
    nativeID: string;
}
declare const SkiaPictureViewNativeComponent: ({ nativeID, debug, opaque, onLayout, ...viewProps }: NativeProps) => import("react").FunctionComponentElement<import("..").SkiaPictureViewNativeProps & import("react").RefAttributes<import("../views/SkiaPictureView.web").SkiaPictureViewHandle>>;
export default SkiaPictureViewNativeComponent;
