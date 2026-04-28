import { useEffect, useMemo, useState } from "react";
import { drawAsImageFromPicture, drawAsPicture } from "../../renderer/Offscreen";
import { Skia, useImage } from "../../skia";
import Rea from "./ReanimatedProxy";
const createTexture = (texture, picture, size) => {
  "worklet";

  texture.value = drawAsImageFromPicture(picture, size);
};
export const useTexture = (element, size, deps) => {
  const {
    width,
    height
  } = size;
  const [picture, setPicture] = useState(null);
  useEffect(() => {
    drawAsPicture(element, {
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
export const usePictureAsTexture = (picture, size) => {
  const texture = Rea.useSharedValue(null);
  useEffect(() => {
    if (picture !== null) {
      Rea.runOnUI(createTexture)(texture, picture, size);
    }
  }, [picture, size, texture]);
  return texture;
};
export const useImageAsTexture = source => {
  const image = useImage(source);
  const size = useMemo(() => {
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
  const picture = useMemo(() => {
    if (image) {
      const recorder = Skia.PictureRecorder();
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
//# sourceMappingURL=textures.js.map