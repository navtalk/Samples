/* eslint-disable import/no-anonymous-default-export */

global.SkiaViewApi = {
  views: {},
  deferedPictures: {},
  deferedOnSize: {},
  web: true,
  registerView(nativeId, view) {
    // Maybe a picture for this view was already set
    if (this.deferedPictures[nativeId]) {
      view.setPicture(this.deferedPictures[nativeId]);
    }
    this.views[nativeId] = view;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setJsiProperty(nativeId, name, value) {
    if (name === "picture") {
      if (!this.views[`${nativeId}`]) {
        this.deferedPictures[`${nativeId}`] = value;
      } else {
        this.views[`${nativeId}`].setPicture(value);
      }
    }
  },
  size(nativeId) {
    if (this.views[`${nativeId}`]) {
      return this.views[`${nativeId}`].getSize();
    } else {
      return {
        width: 0,
        height: 0
      };
    }
  },
  requestRedraw(nativeId) {
    this.views[`${nativeId}`].redraw();
  },
  makeImageSnapshot(nativeId, rect) {
    return this.views[`${nativeId}`].makeImageSnapshot(rect);
  },
  makeImageSnapshotAsync(nativeId, rect) {
    return new Promise((resolve, reject) => {
      const result = this.views[`${nativeId}`].makeImageSnapshot(rect);
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Failed to make image snapshot"));
      }
    });
  }
};

// eslint-disable-next-line import/no-default-export
export default {};
//# sourceMappingURL=NativeSkiaModule.web.js.map