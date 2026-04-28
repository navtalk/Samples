import { Host, throwNotImplementedOnRNWeb, getEnum } from "./Host";
import { JsiSkImageFilter } from "./JsiSkImageFilter";
import { JsiSkColorFilter } from "./JsiSkColorFilter";
export class JsiSkImageFilterFactory extends Host {
  constructor(CanvasKit) {
    super(CanvasKit);
  }
  MakeRuntimeShaderWithChildren(_builder, _sampleRadius, _childShaderNames, _inputs) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeArithmetic(_k1, _k2, _k3, _k4, _enforcePMColor, _background, _foreground, _cropRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeCrop(_rect, _tileMode, _input) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeEmpty() {
    throw throwNotImplementedOnRNWeb();
  }
  MakeImage(_image, _srcRect, _dstRect, _filterMode, _mipmap) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeMagnifier(_lensBounds, _zoomAmount, _inset, _filterMode, _mipmap, _input, _cropRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeMatrixConvolution(_kernelSizeX, _kernelSizeY, _kernel, _gain, _bias, _kernelOffsetX, _kernelOffsetY, _tileMode, _convolveAlpha, _input, _cropRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeMatrixTransform(_matrix, _filterMode, _mipmap, _input) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeMerge(_filters, _cropRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakePicture(_picture, _targetRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeTile(_src, _dst, _input) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeDistantLitDiffuse(_direction, _lightColor, _surfaceScale, _kd, _input, _cropRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakePointLitDiffuse(_location, _lightColor, _surfaceScale, _kd, _input, _cropRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeSpotLitDiffuse(_location, _target, _falloffExponent, _cutoffAngle, _lightColor, _surfaceScale, _kd, _input, _cropRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeDistantLitSpecular(_direction, _lightColor, _surfaceScale, _ks, _shininess, _input, _cropRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakePointLitSpecular(_location, _lightColor, _surfaceScale, _ks, _shininess, _input, _cropRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeSpotLitSpecular(_location, _target, _falloffExponent, _cutoffAngle, _lightColor, _surfaceScale, _ks, _shininess, _input, _cropRect) {
    throw throwNotImplementedOnRNWeb();
  }
  MakeOffset(dx, dy, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeOffset");
    }
    const filter = this.CanvasKit.ImageFilter.MakeOffset(dx, dy, inputFilter);
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeDisplacementMap(channelX, channelY, scale, in1, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeDisplacementMap");
    }
    const filter = this.CanvasKit.ImageFilter.MakeDisplacementMap(getEnum(this.CanvasKit, "ColorChannel", channelX), getEnum(this.CanvasKit, "ColorChannel", channelY), scale, JsiSkImageFilter.fromValue(in1), inputFilter);
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeShader(shader, dither, cropRect) {
    if (dither !== undefined) {
      console.warn("dither parameter is not supported on React Native Web for MakeShader");
    }
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeShader");
    }
    const filter = this.CanvasKit.ImageFilter.MakeShader(JsiSkImageFilter.fromValue(shader));
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeBlur(sigmaX, sigmaY, mode, input, cropRect) {
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeBlur");
    }
    return new JsiSkImageFilter(this.CanvasKit, this.CanvasKit.ImageFilter.MakeBlur(sigmaX, sigmaY, getEnum(this.CanvasKit, "TileMode", mode), input === null || input === undefined ? null : JsiSkImageFilter.fromValue(input)));
  }
  MakeColorFilter(colorFilter, input, cropRect) {
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeColorFilter");
    }
    return new JsiSkImageFilter(this.CanvasKit, this.CanvasKit.ImageFilter.MakeColorFilter(JsiSkColorFilter.fromValue(colorFilter), input === null || input === undefined ? null : JsiSkImageFilter.fromValue(input)));
  }
  MakeCompose(outer, inner) {
    return new JsiSkImageFilter(this.CanvasKit, this.CanvasKit.ImageFilter.MakeCompose(outer === null ? null : JsiSkImageFilter.fromValue(outer), inner === null ? null : JsiSkImageFilter.fromValue(inner)));
  }
  MakeDropShadow(dx, dy, sigmaX, sigmaY, color, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeDropShadow");
    }
    const filter = this.CanvasKit.ImageFilter.MakeDropShadow(dx, dy, sigmaX, sigmaY, color, inputFilter);
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeDropShadowOnly(dx, dy, sigmaX, sigmaY, color, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeDropShadowOnly");
    }
    const filter = this.CanvasKit.ImageFilter.MakeDropShadowOnly(dx, dy, sigmaX, sigmaY, color, inputFilter);
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeErode(rx, ry, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeErode");
    }
    const filter = this.CanvasKit.ImageFilter.MakeErode(rx, ry, inputFilter);
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeDilate(rx, ry, input, cropRect) {
    const inputFilter = input === null || input === undefined ? null : JsiSkImageFilter.fromValue(input);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeDilate");
    }
    const filter = this.CanvasKit.ImageFilter.MakeDilate(rx, ry, inputFilter);
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeBlend(mode, background, foreground, cropRect) {
    const inputFilter = foreground === null || foreground === undefined ? null : JsiSkImageFilter.fromValue(foreground);
    if (cropRect) {
      console.warn("cropRect is not supported on React Native Web for MakeBlend");
    }
    const filter = this.CanvasKit.ImageFilter.MakeBlend(getEnum(this.CanvasKit, "BlendMode", mode), JsiSkImageFilter.fromValue(background), inputFilter);
    return new JsiSkImageFilter(this.CanvasKit, filter);
  }
  MakeRuntimeShader(_builder, _childShaderName, _input) {
    return throwNotImplementedOnRNWeb();
  }
}
//# sourceMappingURL=JsiSkImageFilterFactory.js.map