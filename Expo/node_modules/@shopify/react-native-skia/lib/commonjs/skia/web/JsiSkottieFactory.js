"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JsiSkottieFactory = void 0;
var _Host = require("./Host");
var _JsiSkottieAnimation = require("./JsiSkottieAnimation");
class JsiSkottieFactory extends _Host.Host {
  constructor(CanvasKit) {
    super(CanvasKit);
  }
  Make(json, assets) {
    const rawAssets = {};
    for (const [key, value] of Object.entries(assets !== null && assets !== void 0 ? assets : {})) {
      rawAssets[key] = value.ref;
    }
    const animation = this.CanvasKit.MakeManagedAnimation(json, rawAssets);
    if (!animation) {
      throw new Error("Failed to create SkottieAnimation");
    }
    return new _JsiSkottieAnimation.JsiSkottieAnimation(this.CanvasKit, animation);
  }
}
exports.JsiSkottieFactory = JsiSkottieFactory;
//# sourceMappingURL=JsiSkottieFactory.js.map