import { useMemo } from 'react';
import { VisionCamera } from '../../VisionCamera';
export function useOrientationManager(source) {
    return useMemo(() => {
        if (source != null) {
            return VisionCamera.createOrientationManager(source);
        }
        else {
            return undefined;
        }
    }, [source]);
}
