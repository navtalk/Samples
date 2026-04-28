import type { Skia, SkCanvas } from "../skia/types";
import type { Node } from "./Node";
import type { Recording } from "./Recorder/Recorder";
import "../views/api";
export declare abstract class Container {
    protected Skia: Skia;
    private _root;
    protected recording: Recording | null;
    protected unmounted: boolean;
    constructor(Skia: Skia);
    get root(): Node[];
    set root(value: Node[]);
    mount(): void;
    unmount(): void;
    drawOnCanvas(canvas: SkCanvas): void;
    abstract redraw(): void;
}
export declare class StaticContainer extends Container {
    private nativeId;
    constructor(Skia: Skia, nativeId: number);
    redraw(): void;
}
