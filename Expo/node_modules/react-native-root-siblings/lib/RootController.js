export var RootControllerChanges;
(function (RootControllerChanges) {
    RootControllerChanges[RootControllerChanges["Insert"] = 0] = "Insert";
    RootControllerChanges[RootControllerChanges["Update"] = 1] = "Update";
    RootControllerChanges[RootControllerChanges["Remove"] = 2] = "Remove";
})(RootControllerChanges || (RootControllerChanges = {}));
export default class RootController {
    constructor() {
        this.siblings = new Set();
        this.pendingActions = [];
        this.callback = null;
    }
    update(id, element, callback) {
        if (!this.siblings.has(id)) {
            this.emit(id, {
                change: RootControllerChanges.Insert,
                element,
                updateCallback: callback
            });
            this.siblings.add(id);
        }
        else {
            this.emit(id, {
                change: RootControllerChanges.Update,
                element,
                updateCallback: callback
            });
        }
    }
    destroy(id, callback) {
        if (this.siblings.has(id)) {
            this.emit(id, {
                change: RootControllerChanges.Remove,
                element: null,
                updateCallback: callback
            });
            this.siblings.delete(id);
        }
        else if (callback) {
            callback();
        }
    }
    setCallback(callback) {
        this.callback = callback;
        this.pendingActions.forEach(({ id, action }) => {
            callback(id, action);
        });
    }
    emit(id, action) {
        if (this.callback) {
            this.callback(id, action);
        }
        else {
            this.pendingActions.push({
                action,
                id
            });
        }
    }
}
//# sourceMappingURL=RootController.js.map