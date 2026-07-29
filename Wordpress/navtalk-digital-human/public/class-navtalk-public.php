<?php
/**
 * NavTalk Public Class
 * 
 * Handles front-end functionality and asset loading
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class NavTalk_Public {
    /**
     * Initialize public functionality
     */
    public function init() {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('wp_footer', [$this, 'render_chat_modal'], 999);
        add_action('admin_post_navtalk_download_avatar', [$this, 'download_avatar']);
        add_action('admin_post_nopriv_navtalk_download_avatar', [$this, 'download_avatar']);
    }

    /**
     * Enqueue front-end styles and scripts
     */
    public function enqueue_scripts() {
        // Enqueue styles
        wp_enqueue_style(
            'navtalk-style',
            NAVTALK_PLUGIN_URL . 'public/css/navtalk-style.css',
            [],
            NAVTALK_VERSION
        );
        
        // Enqueue widget styles
        wp_enqueue_style(
            'navtalk-widget-style',
            NAVTALK_PLUGIN_URL . 'public/css/navtalk-widget.css',
            [],
            NAVTALK_VERSION
        );
        
        // Enqueue script
        wp_enqueue_script(
            'navtalk-realtime',
            NAVTALK_PLUGIN_URL . 'public/js/navtalk-realtime.js',
            ['jquery'],
            NAVTALK_VERSION,
            true
        );
        
        // Enqueue widget script
        wp_enqueue_script(
            'navtalk-widget',
            NAVTALK_PLUGIN_URL . 'public/js/navtalk-widget.js',
            ['jquery', 'navtalk-realtime'],
            NAVTALK_VERSION,
            true
        );

        
        // Pass PHP configuration to JavaScript
        $license = get_option('navtalk_license', '');
        
        wp_localize_script('navtalk-realtime', 'navtalkConfig', [
            'license' => $license,
            'websocketUrl' => NavTalk_Config::WEBSOCKET_URL,
            'apiUrl' => NavTalk_Config::API_URL,
            'sessionTimeout' => NavTalk_Config::SESSION_TIMEOUT,
            'hasLicense' => !empty($license),
            'pluginUrl' => NAVTALK_PLUGIN_URL,
            'modalWidth' => NavTalk_Config::DEFAULT_MODAL_WIDTH,
            'modalHeight' => NavTalk_Config::DEFAULT_MODAL_HEIGHT,
            'modalMaxWidth' => NavTalk_Config::DEFAULT_MODAL_MAX_WIDTH,
            'modalMaxHeight' => NavTalk_Config::DEFAULT_MODAL_MAX_HEIGHT,
            'modalOverlayColor' => NavTalk_Config::DEFAULT_MODAL_OVERLAY_COLOR,
            'callButtonPosition' => NavTalk_Config::DEFAULT_CALL_BUTTON_POSITION,
            'autoHangupEnabled' => get_option('navtalk_auto_hangup_enabled', '0') === '1',
            'autoHangupDescription' => get_option('navtalk_auto_hangup_description', 'Call this function when the user says goodbye')
        ]);
    }
    
    /**
     * Stream the generated avatar MP4 through WordPress as an attachment.
     */
    public function download_avatar() {
        $avatar_id = isset($_GET['avatar_id']) ? sanitize_text_field(wp_unslash($_GET['avatar_id'])) : '';
        $nonce = isset($_GET['_navtalk_nonce']) ? sanitize_text_field(wp_unslash($_GET['_navtalk_nonce'])) : '';

        if ('' === $avatar_id || !wp_verify_nonce($nonce, 'navtalk_download_avatar_' . $avatar_id)) {
            wp_die(
                esc_html__('This avatar download link is invalid or has expired.', 'navtalk-digital-human'),
                esc_html__('Avatar Download Error', 'navtalk-digital-human'),
                ['response' => 403]
            );
        }

        $api = new NavTalk_API();
        $avatar_info = $api->get_avatar_info($avatar_id);

        if (!empty($avatar_info['error']) || empty($avatar_info['videoFile']) || empty($avatar_info['url'])) {
            wp_die(
                esc_html__('The MP4 video for this avatar is not available.', 'navtalk-digital-human'),
                esc_html__('Avatar Download Error', 'navtalk-digital-human'),
                ['response' => 404]
            );
        }

        $remote_url = esc_url_raw($api->get_full_image_url($avatar_info['url']));
        if (empty($remote_url) || !wp_http_validate_url($remote_url)) {
            wp_die(
                esc_html__('The MP4 video URL is invalid.', 'navtalk-digital-human'),
                esc_html__('Avatar Download Error', 'navtalk-digital-human'),
                ['response' => 400]
            );
        }

        if (!function_exists('wp_tempnam')) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }

        $temporary_file = wp_tempnam($remote_url);
        if (!$temporary_file) {
            wp_die(
                esc_html__('WordPress could not create a temporary download file.', 'navtalk-digital-human'),
                esc_html__('Avatar Download Error', 'navtalk-digital-human'),
                ['response' => 500]
            );
        }

        $response = wp_safe_remote_get(
            $remote_url,
            [
                'timeout'     => 300,
                'redirection' => 5,
                'sslverify'   => true,
                'stream'      => true,
                'filename'    => $temporary_file,
                'headers'     => ['Accept' => 'video/mp4'],
            ]
        );
        $response_code = is_wp_error($response) ? 0 : wp_remote_retrieve_response_code($response);
        $file_size = file_exists($temporary_file) ? filesize($temporary_file) : 0;

        if (is_wp_error($response) || $response_code < 200 || $response_code >= 300 || !$file_size) {
            wp_delete_file($temporary_file);
            wp_die(
                esc_html__('The MP4 video could not be downloaded from NavTalk.', 'navtalk-digital-human'),
                esc_html__('Avatar Download Error', 'navtalk-digital-human'),
                ['response' => 502]
            );
        }

        $avatar_name = isset($avatar_info['name']) ? (string) $avatar_info['name'] : 'navtalk-avatar';
        $name_parts = explode('.', $avatar_name);
        $display_name = isset($name_parts[1]) ? $name_parts[1] : $avatar_name;
        $filename = sanitize_file_name(($display_name !== '' ? $display_name : 'navtalk-avatar') . '.mp4');

        while (ob_get_level()) {
            ob_end_clean();
        }

        nocache_headers();
        status_header(200);
        header('Content-Type: video/mp4');
        header('Content-Transfer-Encoding: binary');
        header('Content-Disposition: attachment; filename="' . $filename . '"; filename*=UTF-8\'\'' . rawurlencode($filename));
        header('Content-Length: ' . (string) $file_size);
        header('X-Content-Type-Options: nosniff');

        readfile($temporary_file);
        wp_delete_file($temporary_file);
        exit;
    }

    /**
     * Render chat modal in footer
     * This modal will be shown when user clicks "Start Chat" button
     */
    public function render_chat_modal() {
        // Only render if license is configured
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return;
        }
        
        ?>
        <!-- NavTalk Chat Modal -->
        <div id="navtalk-chat-modal" class="navtalk-modal" style="display: none;">
            <div class="navtalk-modal-content">
                <!-- Close button -->
                <button class="navtalk-modal-close" id="navtalk-close-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                
                <!-- Real-time container -->
                <div class="real-time-container">
                    <!-- Character container -->
                    <div class="ah-character-box">
                        <div class="ah-character-avatar">
                            <!-- Static image displayed by default -->
                            <img id="character-static-image" 
                                 src="" 
                                 alt="Avatar"
                                 style="position: absolute; top: 50%; left: 50%; width: 100%; height: 100%; object-fit: cover;object-position: 50% 5% !important; transform: translate(-50%, -50%); background: #000;">
                            
                            <!-- Video playback element (initially hidden) -->
                            <video id="character-avatar-video"
                                   poster=""
                                   style="position: absolute; top: 50%; left: 50%; width: 100%; height: 100%; object-fit: cover;object-position: 50% 5% !important;transform: translate(-50%, -50%); display: none; background: #000;"></video>
                            
                            <!-- Loading overlay - Transition animation during connection -->
                            <div id="navtalk-modal-loading-overlay" class="navtalk-connection-loading-overlay" style="display: none;">
                                <div class="navtalk-loading-spinner">
                                    <div class="navtalk-spinner-ring"></div>
                                    <div class="navtalk-spinner-ring"></div>
                                    <div class="navtalk-spinner-ring"></div>
                                </div>
                                <div class="navtalk-loading-pulse"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Call button -->
                    <button class="ah-btn ah-btn-icon btn-character-call" id="btnRealtime">
                        <svg class="ah-icon" width="22" height="22" viewBox="0 0 22 22" fill="#fff" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20.0001 15.58C17.0001 13.176 16.1281 14.378 14.8186 15.689C13.8371 16.672 11.4371 14.651 9.41862 12.575C7.34612 10.4995 5.32862 8.04101 6.31012 7.16701C7.67362 5.80201 8.81912 4.98201 6.41912 1.97751C4.01912 -1.02649 2.38262 1.26751 1.07412 2.57851C-0.453385 4.10851 0.964616 9.78901 6.58262 15.4155C12.2006 20.9875 17.8731 22.4625 19.4006 20.933C20.7096 19.622 23.0551 17.983 20.0006 15.5795L20.0001 15.58Z" />
                        </svg>
                    </button>
                    
                    <!-- Chat content -->
                    <div class="ah-character-chat"></div>
                </div>
            </div>
        </div>
        <?php
    }
}
