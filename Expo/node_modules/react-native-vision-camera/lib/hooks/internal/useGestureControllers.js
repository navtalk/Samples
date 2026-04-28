import { useEffect, useMemo } from 'react';
import { VisionCamera } from '../../VisionCamera';
export function useGestureControllers({ controller, enableNativeTapToFocusGesture, enableNativeZoomGesture, }) {
    // Build a memoized `GestureController` array of all enabled controllers
    const gestureControllers = useMemo(() => {
        const result = [];
        // Single tap gestures need to appear before any multi-tap gestures.
        if (enableNativeTapToFocusGesture) {
            result.push(VisionCamera.createTapToFocusGestureController());
        }
        if (enableNativeZoomGesture) {
            result.push(VisionCamera.createZoomGestureController());
        }
        return result;
    }, [enableNativeTapToFocusGesture, enableNativeZoomGesture]);
    // Update their `CameraController` individually
    useEffect(() => {
        for (const gestureController of gestureControllers) {
            gestureController.controller = controller;
        }
    }, [controller, gestureControllers]);
    // return it
    return gestureControllers;
}
