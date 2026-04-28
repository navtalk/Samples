"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setPaintProperties = void 0;
var _nodes = require("../../../dom/nodes");
var _types = require("../../../skia/types");
const setPaintProperties = (Skia, ctx, {
  opacity,
  color,
  blendMode,
  strokeWidth,
  style,
  strokeJoin,
  strokeCap,
  strokeMiter,
  antiAlias,
  dither
}, standalone) => {
  "worklet";

  const {
    paint
  } = ctx;
  if (opacity !== undefined) {
    if (standalone) {
      paint.setAlphaf(paint.getAlphaf() * opacity);
    } else {
      ctx.setOpacity(ctx.getOpacity() * opacity);
    }
  }
  if (color !== undefined) {
    paint.setShader(null);
    paint.setColor((0, _nodes.processColor)(Skia, color));
  }
  if (blendMode !== undefined) {
    paint.setBlendMode(_types.BlendMode[(0, _nodes.enumKey)(blendMode)]);
  }
  if (strokeWidth !== undefined) {
    paint.setStrokeWidth(strokeWidth);
  }
  if (style !== undefined) {
    paint.setStyle(_types.PaintStyle[(0, _nodes.enumKey)(style)]);
  }
  if (strokeJoin !== undefined) {
    paint.setStrokeJoin(_types.StrokeJoin[(0, _nodes.enumKey)(strokeJoin)]);
  }
  if (strokeCap !== undefined) {
    paint.setStrokeCap(_types.StrokeCap[(0, _nodes.enumKey)(strokeCap)]);
  }
  if (strokeMiter !== undefined) {
    paint.setStrokeMiter(strokeMiter);
  }
  if (antiAlias !== undefined) {
    paint.setAntiAlias(antiAlias);
  }
  if (dither !== undefined) {
    paint.setDither(dither);
  }
};
exports.setPaintProperties = setPaintProperties;
//# sourceMappingURL=Paint.js.map