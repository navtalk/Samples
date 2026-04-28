import { Host } from "./Host";
import { JsiSkottieAnimation } from "./JsiSkottieAnimation";
export class JsiSkottieFactory extends Host {
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
    return new JsiSkottieAnimation(this.CanvasKit, animation);
  }
}
//# sourceMappingURL=JsiSkottieFactory.js.map