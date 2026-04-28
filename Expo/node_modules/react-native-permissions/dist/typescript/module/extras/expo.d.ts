import { type ConfigPlugin } from '@expo/config-plugins';
type PermissionsPluginConfig = {
    /**
     * List of iOS permissions to add in the Podfile via `setup_permissions`
     */
    iosPermissions?: ('AppTrackingTransparency' | 'Bluetooth' | 'Calendars' | 'CalendarsWriteOnly' | 'Camera' | 'Contacts' | 'FaceID' | 'LocationAccuracy' | 'LocationAlways' | 'LocationWhenInUse' | 'MediaLibrary' | 'Microphone' | 'Motion' | 'Notifications' | 'PhotoLibrary' | 'PhotoLibraryAddOnly' | 'Reminders' | 'Siri' | 'SpeechRecognition' | 'StoreKit')[];
};
declare const PACKAGE_NAME = "react-native-permissions";
export declare const withPermissions: ConfigPlugin<Partial<PermissionsPluginConfig> | undefined>;
declare const _default: (config: PermissionsPluginConfig) => [typeof PACKAGE_NAME, PermissionsPluginConfig];
export default _default;
//# sourceMappingURL=expo.d.ts.map