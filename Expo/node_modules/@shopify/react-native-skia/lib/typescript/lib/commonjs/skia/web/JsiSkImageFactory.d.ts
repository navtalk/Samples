export const __esModule: boolean;
export class JsiSkImageFactory extends _Host.Host {
    MakeNull(): _JsiSkImage.JsiSkImage;
    MakeImageFromViewTag(viewTag: any): Promise<null>;
    MakeImageFromNativeBuffer(buffer: any, surface: any, image: any): _JsiSkImage.JsiSkImage;
    MakeImageFromEncoded(encoded: any): _JsiSkImage.JsiSkImage | null;
    MakeImageFromNativeTextureUnstable(): jest.Mock<any, any, any>;
    MakeImage(info: any, data: any, bytesPerRow: any): _JsiSkImage.JsiSkImage | null;
}
import _Host = require("./Host");
import _JsiSkImage = require("./JsiSkImage");
