class CameraManager{
    static instance;
    static getInstance() {
      if (!CameraManager.instance) {
        CameraManager.instance = new CameraManager();
      }
      return CameraManager.instance;
    }
    camera_capture_status = false; // true/fasle
}
//Export class
export default CameraManager.getInstance();