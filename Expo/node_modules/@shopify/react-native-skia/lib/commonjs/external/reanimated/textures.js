"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useTexture = exports.usePictureAsTexture = exports.useImageAsTexture = void 0;
var _react = require("react");
var _Offscreen = require("../../renderer/Offscreen");
var _skia = require("../../skia");
var _ReanimatedProxy = _interopRequireDefault(require("./ReanimatedProxy"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const createTexture = (texture, picture, size) => {
  "worklet";

  texture.value = (0, _Offscreen.drawAsImageFromPicture)(picture, size);
};
const useTexture = (element, size, deps) => {
  const {
    width,
    height
  } = size;
  const [picture, setPicture] = (0, _react.useState)(null);
  (0, _react.useEffect)(() => {
    (0, _Offscreen.drawAsPicture)(element, {
      x: 0,
      y: 0,
      width,
      height
    }).then(pic => {
      setPicture(pic);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps !== null && deps !== void 0 ? deps : []);
  return usePictureAsTexture(picture, size);
};
exports.useTexture = useTexture;
const usePictureAsTexture = (picture, size) => {
  const texture = _ReanimatedProxy.default.useSharedValue(null);
  (0, _react.useEffect)(() => {
    if (picture !== null) {
      _ReanimatedProxy.default.runOnUI(createTexture)(texture, picture, size);
    }
  }, [picture, size, texture]);
  return texture;
};
exports.usePictureAsTexture = usePictureAsTexture;
const useImageAsTexture = source => {
  const image = (0, _skia.useImage)(source);
  const size = (0, _react.useMemo)(() => {
    if (image) {
      return {
        width: image.width(),
        height: image.height()
      };
    }
    return {
      width: 0,
      height: 0
    };
  }, [image]);
  const picture = (0, _react.useMemo)(() => {
    if (image) {
      const recorder = _skia.Skia.PictureRecorder();
      const canvas = recorder.beginRecording({
        x: 0,
        y: 0,
        width: size.width,
        height: size.height
      });
      canvas.drawImage(image, 0, 0);
      return recorder.finishRecordingAsPicture();
    } else {
      return null;
    }
  }, [size, image]);
  return usePictureAsTexture(picture, size);
};
exports.useImageAsTexture = useImageAsTexture;
//# sourceMappingURL=textures.js.map