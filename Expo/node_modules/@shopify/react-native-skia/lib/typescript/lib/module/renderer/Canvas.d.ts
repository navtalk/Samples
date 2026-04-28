export function useCanvasRef(): React.RefObject<null>;
export function useCanvasSize(userRef: any): {
    ref: any;
    size: {
        width: number;
        height: number;
    };
};
export const isFabric: boolean;
export function Canvas({ debug, opaque, children, onSize, colorSpace, ref, onLayout, ...viewProps }: {
    [x: string]: any;
    debug: any;
    opaque: any;
    children: any;
    onSize: any;
    colorSpace?: string | undefined;
    ref: any;
    onLayout: any;
}): React.CElement<object, React.Component<object, {}, any> & import("react-native").NativeMethods>;
import React from "react";
