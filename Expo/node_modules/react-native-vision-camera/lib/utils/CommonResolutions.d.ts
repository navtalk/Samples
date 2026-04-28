/**
 * Common camera-centric resolution targets.
 *
 * 16:9 entries follow standard video tiers.
 * 4:3 entries intentionally use common photo/sensor output sizes
 * instead of mathematically scaling the 16:9 tiers, because actual
 * camera formats are usually exposed in sensor-native 4:3 steps.
 */
export declare const CommonResolutions: {
    /**
     * VGA (480p) Resolution in 16:9 aspect ratio.
     */
    readonly VGA_16_9: {
        readonly width: 480;
        readonly height: 854;
    };
    /**
     * VGA (480p) Resolution in 4:3 aspect ratio.
     */
    readonly VGA_4_3: {
        readonly width: 480;
        readonly height: 640;
    };
    /**
     * HD (720p) Resolution in 16:9 aspect ratio.
     */
    readonly HD_16_9: {
        readonly width: 720;
        readonly height: 1280;
    };
    /**
     * Common low-resolution 4:3 camera target.
     */
    readonly HD_4_3: {
        readonly width: 768;
        readonly height: 1024;
    };
    /**
     * Full-HD (1080p) Resolution in 16:9 aspect ratio.
     */
    readonly FHD_16_9: {
        readonly width: 1080;
        readonly height: 1920;
    };
    /**
     * Common 4:3 camera target around the Full-HD tier.
     */
    readonly FHD_4_3: {
        readonly width: 1440;
        readonly height: 1920;
    };
    /**
     * Quad-HD (1440p) Resolution in 16:9 aspect ratio.
     */
    readonly QHD_16_9: {
        readonly width: 1440;
        readonly height: 2560;
    };
    /**
     * Common 4:3 camera target around the Quad-HD tier.
     */
    readonly QHD_4_3: {
        readonly width: 1944;
        readonly height: 2592;
    };
    /**
     * Ultra-HD (4k) Resolution in 16:9 aspect ratio.
     */
    readonly UHD_16_9: {
        readonly width: 2160;
        readonly height: 3840;
    };
    /**
     * Common high-resolution 4:3 photo target.
     */
    readonly UHD_4_3: {
        readonly width: 3024;
        readonly height: 4032;
    };
    /**
     * 8k Resolution in 16:9 aspect ratio.
     */
    readonly '8k_16_9': {
        readonly width: 4536;
        readonly height: 8064;
    };
    /**
     * 8k Resolution in 4:3 aspect ratio.
     */
    readonly '8k_4_3': {
        readonly width: 6048;
        readonly height: 8064;
    };
    /**
     * The lowest possible resolution in 16:9 aspect ratio.
     * Useful when you want the smallest/fastest capture.
     */
    readonly LOWEST_16_9: {
        readonly width: 9;
        readonly height: 16;
    };
    /**
     * The lowest possible resolution in 4:3 aspect ratio.
     * Useful when you want the smallest/fastest capture.
     */
    readonly LOWEST_4_3: {
        readonly width: 3;
        readonly height: 4;
    };
    /**
     * The highest possible resolution in 16:9 aspect ratio.
     * Useful when you want the maximum available quality.
     */
    readonly HIGHEST_16_9: {
        readonly width: 9000;
        readonly height: 16000;
    };
    /**
     * The highest possible resolution in 4:3 aspect ratio.
     * Useful when you want the maximum available quality.
     */
    readonly HIGHEST_4_3: {
        readonly width: 30000;
        readonly height: 40000;
    };
};
