import React from "react";
import type { SkRect, SkPicture, SkImage } from "../skia/types";
import type { SkiaPictureViewNativeProps } from "./types";
export interface SkiaPictureViewHandle {
    setPicture(picture: SkPicture): void;
    getSize(): {
        width: number;
        height: number;
    };
    redraw(): void;
    makeImageSnapshot(rect?: SkRect): SkImage | null;
}
export declare const SkiaPictureView: React.ForwardRefExoticComponent<SkiaPictureViewNativeProps & React.RefAttributes<SkiaPictureViewHandle>>;
