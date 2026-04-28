import type { DependencyList, ReactElement } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { DataSourceParam, SkImage, SkPicture, SkSize } from "../../skia/types";
export declare const useTexture: (element: ReactElement, size: SkSize, deps?: DependencyList) => SharedValue<SkImage | null>;
export declare const usePictureAsTexture: (picture: SkPicture | null, size: SkSize) => SharedValue<SkImage | null>;
export declare const useImageAsTexture: (source: DataSourceParam) => SharedValue<SkImage | null>;
