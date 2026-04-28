import type { SkPicture } from "../skia/types";
import type { ISkiaViewApi } from "../views/types";
import type { SkiaPictureViewHandle } from "../views/SkiaPictureView.web";
export type ISkiaViewApiWeb = ISkiaViewApi & {
    views: Record<string, SkiaPictureViewHandle>;
    deferedPictures: Record<string, SkPicture>;
    registerView(nativeId: string, view: SkiaPictureViewHandle): void;
};
declare const _default: {};
export default _default;
