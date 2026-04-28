import type { RuntimeThreadProvider } from '../threading/RuntimeThreadProvider';
/**
 * A lazily-loaded {@linkcode RuntimeThreadProvider} backed by
 * `react-native-vision-camera-worklets`.
 *
 * If react-native-vision-camera-worklets is not installed, accessing anything
 * on {@linkcode VisionCameraWorkletsProxy} will throw.
 */
export declare const VisionCameraWorkletsProxy: RuntimeThreadProvider;
