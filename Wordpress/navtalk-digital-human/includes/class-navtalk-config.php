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
    const DEFAULT_MODAL_WIDTH = '1200px';
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
}
