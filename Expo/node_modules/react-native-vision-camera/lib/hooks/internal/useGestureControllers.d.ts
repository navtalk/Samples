import type { CameraController } from '../../specs/CameraController.nitro';
import type { GestureController } from '../../specs/gestures/GestureController.nitro';
interface Props {
    controller: CameraController | undefined;
    enableNativeTapToFocusGesture: boolean;
    enableNativeZoomGesture: boolean;
}
export declare function useGestureControllers({ controller, enableNativeTapToFocusGesture, enableNativeZoomGesture, }: Props): GestureController[];
export {};
