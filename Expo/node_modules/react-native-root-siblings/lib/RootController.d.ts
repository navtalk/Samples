import { ReactNode } from 'react';
export declare enum RootControllerChanges {
    Insert = 0,
    Update = 1,
    Remove = 2
}
export interface RootControllerAction {
    change: RootControllerChanges;
    element: ReactNode;
    updateCallback?: () => void;
}
export default class RootController {
    private siblings;
    private pendingActions;
    private callback;
    update(id: string, element: ReactNode, callback?: () => void): void;
    destroy(id: string, callback?: () => void): void;
    setCallback(callback: (id: string, action: RootControllerAction) => void): void;
    private emit;
}
