<?php
/**
 * NavTalk Configuration Class
 * 
 * Contains hardcoded API URLs and other configuration constants.
 * Modify these values according to your environment.
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class NavTalk_Config {
    /**
     * NavTalk API Base URL
     * 
     * @var string
     */
    const API_URL = 'https://api.navtalk.ai';
    
    /**
     * NavTalk WebSocket URL for real-time communication
     * Full path including endpoint
     * 
     * @var string
     */
    const WEBSOCKET_URL = 'wss://transfer.navtalk.ai/wss/v2/realtime-chat';
    
    /**
     * Available avatar names (legacy / display reference)
     * Real-time calls use avatar ID (avatarId) from API; this list is for reference only.
     *
     * @var array
     */
    const AVAILABLE_AVATARS = [
        'navtalk.Ethan',
        'navtalk.Leo',
        'navtalk.Emma',
        'navtalk.Sophia',
        'navtalk.Mia',
        'navtalk.Chloe',
        'navtalk.Zoe',
        'navtalk.Ava'
    ];
    
    /**
     * Default avatar dimensions
     * 
     * @var array
     */
    const DEFAULT_WIDTH = '300px';
    const DEFAULT_HEIGHT = '400px';
    
    /**
     * Default button text
     * 
     * @var string
     */
    const DEFAULT_BUTTON_TEXT = 'Start Chat';
    
    /**
     * Default modal dimensions
     * 
     * @var string
     */
    const DEFAULT_MODAL_WIDTH = '600px';
    const DEFAULT_MODAL_HEIGHT = '800px';
    const DEFAULT_MODAL_MAX_WIDTH = '90vw';
    const DEFAULT_MODAL_MAX_HEIGHT = '90vh';
    
    /**
     * Modal overlay background color
     * 
     * @var string
     */
    const DEFAULT_MODAL_OVERLAY_COLOR = 'transparent';

    /**
     * Default call button background.
     *
     * @var string
     */
    const DEFAULT_BUTTON_BACKGROUND = 'linear-gradient(145deg, #38bdf8 0%, #6366f1 60%, #a855f7 100%)';

    /**
     * Predefined backgrounds allowed in stored settings.
     *
     * @var array
     */
    const BUTTON_BACKGROUND_PRESETS = [
        'linear-gradient(145deg, #38bdf8 0%, #6366f1 60%, #a855f7 100%)',
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    ];
    
    /**
     * Call button position in modal
     * Options: center-bottom, bottom-left, bottom-right
     * 
     * @var string
     */
    const DEFAULT_CALL_BUTTON_POSITION = 'center-bottom';
    
    /**
     * Session timeout (milliseconds)
     * 
     * @var int
     */
    const SESSION_TIMEOUT = 60000; // 60 seconds
    
    /**
     * Get API endpoint URL
     * 
     * @param string $endpoint
     * @return string
     */
    public static function get_api_endpoint($endpoint) {
        return self::API_URL . $endpoint;
    }
    
    /**
     * Get WebSocket URL
     * 
     * @return string
     */
    public static function get_websocket_url() {
        return self::WEBSOCKET_URL;
    }
    
    /**
     * Check if avatar name is valid (legacy; real-time calls use avatar ID from API)
     *
     * @param string $avatar_name
     * @return bool
     */
    public static function is_valid_avatar($avatar_name) {
        return in_array($avatar_name, self::AVAILABLE_AVATARS);
    }

    /**
     * Return only supported button background values.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_button_background($value) {
        $value = is_string($value) ? trim(wp_unslash($value)) : '';
        $color = sanitize_hex_color($value);

        if ($color) {
            return $color;
        }

        if (in_array($value, self::BUTTON_BACKGROUND_PRESETS, true)) {
            return $value;
        }

        return self::DEFAULT_BUTTON_BACKGROUND;
    }

    /**
     * Return a safe CSS background from settings.
     *
     * @param string $bg_type
     * @param string $background
     * @param string $image_url
     * @return string
     */
    public static function get_safe_button_background($bg_type, $background, $image_url = '') {
        $bg_type = self::sanitize_button_background_type($bg_type);

        if ('image' === $bg_type) {
            $image_url = esc_url_raw($image_url);
            return $image_url ? 'url(' . esc_url($image_url) . ') center/cover' : self::DEFAULT_BUTTON_BACKGROUND;
        }

        return self::sanitize_button_background($background);
    }

    /**
     * Sanitize the saved background mode.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_button_background_type($value) {
        $value = sanitize_key((string) $value);

        if ('solid' === $value) {
            $value = 'color';
        }

        return in_array($value, ['gradient', 'color', 'image'], true) ? $value : 'gradient';
    }

    /**
     * Sanitize a hex color with a fallback.
     *
     * @param mixed  $value
     * @param string $default
     * @return string
     */
    public static function sanitize_hex_color_with_default($value, $default = '#667eea') {
        $color = sanitize_hex_color(is_string($value) ? trim(wp_unslash($value)) : '');
        return $color ? $color : $default;
    }

    /**
     * Sanitize a px-only size and clamp it to a practical range.
     *
     * @param mixed  $value
     * @param string $default
     * @param int    $min
     * @param int    $max
     * @return string
     */
    public static function sanitize_px_size($value, $default = '60px', $min = 32, $max = 120) {
        $value = is_string($value) ? trim(wp_unslash($value)) : $value;

        if (is_numeric($value)) {
            $number = (int) $value;
        } elseif (is_string($value) && preg_match('/^([0-9]{1,3})px$/', $value, $matches)) {
            $number = (int) $matches[1];
        } else {
            return $default;
        }

        $number = max($min, min($max, $number));
        return $number . 'px';
    }

    /**
     * Sanitize dimensions used in shortcode data attributes.
     *
     * @param mixed  $value
     * @param string $default
     * @return string
     */
    public static function sanitize_dimension($value, $default) {
        $value = is_string($value) ? trim(wp_unslash($value)) : '';
        return preg_match('/^[0-9]{1,4}(\.[0-9]{1,2})?(px|%|vw|vh|rem|em)$/', $value) ? $value : $default;
    }

    /**
     * Sanitize front-end true/false shortcode flags.
     *
     * @param mixed  $value
     * @param string $default
     * @return string
     */
    public static function sanitize_bool_string($value, $default = 'false') {
        $value = strtolower(sanitize_text_field((string) $value));

        if (in_array($value, ['1', 'true', 'yes', 'on'], true)) {
            return 'true';
        }

        if (in_array($value, ['0', 'false', 'no', 'off'], true)) {
            return 'false';
        }

        return 'true' === $default ? 'true' : 'false';
    }

    /**
     * Sanitize avatar card layout.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_layout($value) {
        $value = sanitize_key((string) $value);
        return in_array($value, ['overlay', 'bottom'], true) ? $value : 'overlay';
    }

    /**
     * Sanitize status placement.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_status_position($value) {
        $value = sanitize_key((string) $value);
        return in_array($value, ['corner', 'info'], true) ? $value : 'corner';
    }

    /**
     * Sanitize heading tags used for avatar titles.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_title_tag($value) {
        $value = strtolower(sanitize_key((string) $value));
        return in_array($value, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'p'], true) ? $value : 'h6';
    }

    /**
     * Sanitize modal call button position.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_call_button_position($value) {
        $value = sanitize_key((string) $value);
        return in_array($value, ['center-bottom', 'bottom-left', 'bottom-right'], true) ? $value : self::DEFAULT_CALL_BUTTON_POSITION;
    }

    /**
     * Sanitize floating button position.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_floating_position($value) {
        $value = sanitize_key((string) $value);
        return in_array($value, ['bottom-right', 'bottom-left', 'top-right', 'top-left'], true) ? $value : 'bottom-right';
    }

    /**
     * Sanitize CSS class lists without accepting arbitrary CSS.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_class_list($value) {
        $classes = preg_split('/\s+/', (string) $value);
        $classes = array_filter(array_map('sanitize_html_class', $classes));

        return implode(' ', array_unique($classes));
    }

    /**
     * Keep internally generated button declarations constrained to known values.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_call_button_css($value) {
        $value = is_string($value) ? trim(wp_unslash($value)) : '';
        if ('' === $value) {
            return '';
        }

        $safe = [];
        $shadow_presets = [
            '0 4px 8px rgba(0,0,0,0.18)',
            '0 8px 16px rgba(0,0,0,0.22)',
        ];
        $animations = [
            'navtalk-pulse 2s infinite',
            'navtalk-bounce 2s infinite',
        ];

        foreach (array_filter(array_map('trim', explode(';', $value))) as $declaration) {
            if (false === strpos($declaration, ':')) {
                continue;
            }

            list($property, $raw_value) = array_map('trim', explode(':', $declaration, 2));
            $property = sanitize_key($property);
            $raw_value = preg_replace('/\s+/', ' ', $raw_value);

            switch ($property) {
                case 'background':
                    if ('transparent' === $raw_value || sanitize_hex_color($raw_value) || in_array($raw_value, self::BUTTON_BACKGROUND_PRESETS, true)) {
                        $safe[] = 'background: ' . $raw_value;
                    }
                    break;
                case 'color':
                    $color = sanitize_hex_color($raw_value);
                    if ($color) {
                        $safe[] = 'color: ' . $color;
                    }
                    break;
                case 'border':
                    if (preg_match('/^([0-9]|10)px solid (#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})$/', $raw_value)) {
                        $safe[] = 'border: ' . $raw_value;
                    }
                    break;
                case 'min-width':
                case 'min-height':
                case 'width':
                case 'height':
                    $safe_size = self::sanitize_px_size($raw_value, '', 20, 100);
                    if ('' !== $safe_size) {
                        $safe[] = $property . ': ' . $safe_size;
                    }
                    break;
                case 'box-shadow':
                    if (in_array($raw_value, $shadow_presets, true)) {
                        $safe[] = 'box-shadow: ' . $raw_value;
                    }
                    break;
                case 'animation':
                    if (in_array($raw_value, $animations, true)) {
                        $safe[] = 'animation: ' . $raw_value;
                    }
                    break;
            }
        }

        return implode('; ', $safe);
    }

    /**
     * Sanitize modal overlay colors.
     *
     * @param mixed $value
     * @return string
     */
    public static function sanitize_overlay_color($value) {
        $value = is_string($value) ? trim(wp_unslash($value)) : '';

        if ('transparent' === strtolower($value)) {
            return 'transparent';
        }

        return self::sanitize_hex_color_with_default($value, self::DEFAULT_MODAL_OVERLAY_COLOR);
    }
}
