import type { CanvasKit } from "canvaskit-wasm";
import type { SkottieFactory } from "../types";
import { Host } from "./Host";
import { JsiSkottieAnimation } from "./JsiSkottieAnimation";
import type { JsiSkData } from "./JsiSkData";
export declare class JsiSkottieFactory extends Host implements SkottieFactory {
    constructor(CanvasKit: CanvasKit);
    Make(json: string, assets?: Record<string, JsiSkData>): JsiSkottieAnimation;
}
