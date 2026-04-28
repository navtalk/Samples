export const __esModule: boolean;
export class Container {
    constructor(Skia: any);
    Skia: any;
    set root(value: any);
    get root(): any;
    _root: any;
    mount(): void;
    unmounted: boolean | undefined;
    unmount(): void;
    drawOnCanvas(canvas: any): void;
}
export class StaticContainer extends Container {
    constructor(Skia: any, nativeId: any);
    nativeId: any;
    redraw(): void;
    recording: {
        commands: any;
        paintPool: never[];
        animationValues: any;
    } | undefined;
}
