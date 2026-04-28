import type { PaintProps } from "../../../dom/types";
import type { Skia } from "../../../skia/types";
import type { DrawingContext } from "../DrawingContext";
export declare const setPaintProperties: (Skia: Skia, ctx: DrawingContext, { opacity, color, blendMode, strokeWidth, style, strokeJoin, strokeCap, strokeMiter, antiAlias, dither, }: PaintProps, standalone: boolean) => void;
