"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JsiSkImageFilterFactory = void 0;
var _Host = require("./Host");
var _JsiSkImageFilter = require("./JsiSkImageFilter");
var _JsiSkColorFilter = require("./JsiSkColorFilter");
class JsiSkImageFilterFactory extends _Host.Host {
  constructor(CanvasKit) {
    super(CanvasKit);
  }
  MakeRuntimeShaderWithChildren(_builder, _sampleRadius, _childShaderNames, _inputs) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeArithmetic(_k1, _k2, _k3, _k4, _enforcePMColor, _background, _foreground, _cropRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeCrop(_rect, _tileMode, _input) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeEmpty() {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeImage(_image, _srcRect, _dstRect, _filterMode, _mipmap) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeMagnifier(_lensBounds, _zoomAmount, _inset, _filterMode, _mipmap, _input, _cropRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeMatrixConvolution(_kernelSizeX, _kernelSizeY, _kernel, _gain, _bias, _kernelOffsetX, _kernelOffsetY, _tileMode, _convolveAlpha, _input, _cropRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeMatrixTransform(_matrix, _filterMode, _mipmap, _input) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeMerge(_filters, _cropRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakePicture(_picture, _targetRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeTile(_src, _dst, _input) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeDistantLitDiffuse(_direction, _lightColor, _surfaceScale, _kd, _input, _cropRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakePointLitDiffuse(_location, _lightColor, _surfaceScale, _kd, _input, _cropRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeSpotLitDiffuse(_location, _target, _falloffExponent, _cutoffAngle, _lightColor, _surfaceScale, _kd, _input, _cropRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeDistantLitSpecular(_direction, _lightColor, _surfaceScale, _ks, _shininess, _input, _cropRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakePointLitSpecular(_location, _lightColor, _surfaceScale, _ks, _shininess, _input, _cropRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeSpotLitSpecular(_location, _target, _falloffExponent, _cutoffAngle, _lightColor, _surfaceScale, _ks, _shininess, _input, _cropRect) {
    throw (0, _Host.throwNotImplementedOnRNWeb)();
  }
  MakeOffset(dx, dy, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeOffset");
    }
    const filter = this.CanvasKit.ImageFilter.MakeOffset(dx, dy, inputFilter);
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeDisplacementMap(channelX, channelY, scale, in1, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeDisplacementMap");
    }
    const filter = this.CanvasKit.ImageFilter.MakeDisplacementMap((0, _Host.getEnum)(this.CanvasKit, "ColorChannel", channelX), (0, _Host.getEnum)(this.CanvasKit, "ColorChannel", channelY), scale, _JsiSkImageFilter.JsiSkImageFilter.fromValue(in1), inputFilter);
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeShader(shader, dither, cropRect) {
    if (dither !== undefined) {
      console.warn("dither parameter is not supported on React Native Web for MakeShader");
    }
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeShader");
    }
    const filter = this.CanvasKit.ImageFilter.MakeShader(_JsiSkImageFilter.JsiSkImageFilter.fromValue(shader));
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeBlur(sigmaX, sigmaY, mode, input, cropRect) {
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeBlur");
    }
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, this.CanvasKit.ImageFilter.MakeBlur(sigmaX, sigmaY, (0, _Host.getEnum)(this.CanvasKit, "TileMode", mode), input === null || input === undefined ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(input)));
  }
  MakeColorFilter(colorFilter, input, cropRect) {
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeColorFilter");
    }
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, this.CanvasKit.ImageFilter.MakeColorFilter(_JsiSkColorFilter.JsiSkColorFilter.fromValue(colorFilter), input === null || input === undefined ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(input)));
  }
  MakeCompose(outer, inner) {
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, this.CanvasKit.ImageFilter.MakeCompose(outer === null ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(outer), inner === null ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(inner)));
  }
  MakeDropShadow(dx, dy, sigmaX, sigmaY, color, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeDropShadow");
    }
    const filter = this.CanvasKit.ImageFilter.MakeDropShadow(dx, dy, sigmaX, sigmaY, color, inputFilter);
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeDropShadowOnly(dx, dy, sigmaX, sigmaY, color, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeDropShadowOnly");
    }
    const filter = this.CanvasKit.ImageFilter.MakeDropShadowOnly(dx, dy, sigmaX, sigmaY, color, inputFilter);
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeErode(rx, ry, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeErode");
    }
    const filter = this.CanvasKit.ImageFilter.MakeErode(rx, ry, inputFilter);
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeDilate(rx, ry, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeDilate");
    }
    const filter = this.CanvasKit.ImageFilter.MakeDilate(rx, ry, inputFilter);
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeBlend(mode, background, foreground, cropRect) {
    const inputFilter = foreground === null || foreground === undefined ? null : _JsiSkImageFilter.JsiSkImageFilter.fromValue(foreground);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeBlend");
    }
    const filter = this.CanvasKit.ImageFilter.MakeBlend((0, _Host.getEnum)(this.CanvasKit, "BlendMode", mode), _JsiSkImageFilter.JsiSkImageFilter.fromValue(background), inputFilter);
    return new _JsiSkImageFilter.JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeRuntimeShader(_builder, _childShaderName, _input) {
    return (0, _Host.throwNotImplementedOnRNWeb)();
  }
}
exports.JsiSkImageFilterFactory = JsiSkImageFilterFactory;
//# sourceMappingURL=JsiSkImageFilterFactory.js.map