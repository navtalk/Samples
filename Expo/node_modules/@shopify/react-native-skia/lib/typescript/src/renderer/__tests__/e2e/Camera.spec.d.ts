import type { SkPath, SkRect, Vec3 } from "../../../skia/types";
import { Matrix4 } from "../../../skia/types";
declare enum Path3Command {
    Move = 0,
    Line = 1,
    Quad = 2,
    Cubic = 3,
    Close = 4
}
export declare class Path3 {
    commands: [Path3Command, ...number[]][];
    constructor();
    moveTo(to: Vec3): this;
    lineTo(to: Vec3): this;
    quadTo(control: Vec3, to: Vec3): this;
    cubicTo(control1: Vec3, control2: Vec3, to: Vec3): this;
    close(): this;
    addHRect(rect: SkRect, z: number): this;
    project(output: SkPath, tr?: Matrix4): this;
}
export {};
