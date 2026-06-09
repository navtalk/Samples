<?php
/**
 * NavTalk Shortcode Class
 * 
 * Handles [navtalk_avatar] shortcode rendering
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class NavTalk_Shortcode {
    /**
     * Initialize shortcodes
     */
    public function init() {
        add_shortcode('navtalk_avatar', [$this, 'render_avatar']);
        add_shortcode('navtalk_floating', [$this, 'render_floating']);
        add_shortcode('navtalk_list', [$this, 'render_avatar_list']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_floating_inline_assets'], 25);
        add_action('wp_footer', [$this, 'output_global_floating'], 998);
    }

    /**
     * Enqueue inline CSS/JS for the global floating widget via WordPress asset APIs.
     */
    public function enqueue_floating_inline_assets() {
        if (get_option('navtalk_floating_enabled', '0') !== '1') {
            return;
        }
        if ('' === (string) get_option('navtalk_floating_avatar', '') || '' === (string) get_option('navtalk_license', '')) {
            return;
        }
        if (is_singular()) {
            $post_id = get_queried_object_id();
            if ($post_id && get_post_meta($post_id, '_navtalk_show_floating', true) === 'hide') {
                return;
            }
        }
    }

    /**
     * Output global digital human assistant in footer (floating widget)
     * Controlled by global settings and per-page display options
     */
    public function output_global_floating() {
        // Check global enable switch
        if (get_option('navtalk_floating_enabled', '0') !== '1') {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                echo '<!-- NavTalk: Global floating widget not displayed - Global digital human assistant not enabled -->';
            }
            return;
        }

        $avatar_id = get_option('navtalk_floating_avatar', '');
        if (empty($avatar_id)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                echo '<!-- NavTalk: Global floating widget not displayed - No avatar selected -->';
            }
            return;
        }

        // Check per-page/post level display option
        if (is_singular()) {
            $post_id = get_queried_object_id();
            $show = get_post_meta($post_id, '_navtalk_show_floating', true);
            if ($show === 'hide') {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    echo '<!-- NavTalk: Global floating widget not displayed - Disabled on this page -->';
                }
                return;
            }
        }

        // License key is required
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                echo '<!-- NavTalk: Global floating widget not displayed - License key not configured -->';
            }
            return;
        }

        // Get avatar information from API
        $api = new NavTalk_API();
        $avatar_info = $api->get_avatar_info($avatar_id);
        
        if (isset($avatar_info['error']) && $avatar_info['error']) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                echo '<!-- NavTalk: Global floating widget not displayed - Failed to fetch avatar info: ' . esc_html($avatar_info['message']) . ' -->';
            }
            return;
        }
        
        $status = isset($avatar_info['status']) ? $avatar_info['status'] : 'Unknown';
        if (strtoupper($status) !== 'SUCCESS') {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                echo '<!-- NavTalk: Global floating widget not displayed - Selected avatar unavailable (status: ' . esc_html($status) . ') -->';
            }
            return;
        }

        // Get configuration options
        $position = get_option('navtalk_floating_position', 'bottom-right');
        $show_toggle = get_option('navtalk_show_toggle_button', '1') === '1';
        $button_size = get_option('navtalk_floating_button_size', '60px');
        
        // Get button background (gradient, solid color, or image)
        $bg_type = get_option('navtalk_floating_button_bg_type', 'gradient');
        if ($bg_type === 'image') {
            $bg_image = get_option('navtalk_floating_button_bg_image', '');
            $button_background = $bg_image ? 'url(' . esc_url($bg_image) . ') center/cover' : 'linear-gradient(145deg, #38bdf8 0%, #6366f1 60%, #a855f7 100%)';
        } else {
            $button_background = get_option('navtalk_floating_button_background', 'linear-gradient(145deg, #38bdf8 0%, #6366f1 60%, #a855f7 100%)');
            // Backward compatibility with legacy color option
            if (empty($button_background)) {
                $button_background = get_option('navtalk_floating_button_color', '#667eea');
            }
        }
        
        // Get icon color
        $icon_color = get_option('navtalk_floating_button_icon_color', '#ffffff');
        
        $voice = get_option('navtalk_floating_voice', '');
        $model = get_option('navtalk_floating_model', '');

        // Get image/video URLs
        $thumbnail_url = isset($avatar_info['thumbnailUrl']) ? $avatar_info['thumbnailUrl'] : (isset($avatar_info['url']) ? $avatar_info['url'] : '');
        $image_url = $api->get_full_image_url($thumbnail_url);
        
        // Check if avatar has video preview
        $has_video = (bool)(isset($avatar_info['videoFile']) ? $avatar_info['videoFile'] : false);
        if ($has_video) {
            $video_url = $api->get_full_image_url($avatar_info['url']);
        }
        
        // Generate unique container ID
        $unique_id = 'ntw-widget-root';

        $avatar_id_value = isset($avatar_info['avatarId']) ? $avatar_info['avatarId'] : (isset($avatar_info['id']) ? $avatar_info['id'] : $avatar_id);
        ?>
        <!-- NavTalk Global Floating Widget -->
        <div id="<?php echo esc_attr($unique_id); ?>"
             class="ntw-container <?php echo esc_attr($position); ?> navtalk-inline-mode"
             data-avatar-id="<?php echo esc_attr($avatar_id_value); ?>"
             data-avatar-img="<?php echo esc_url($image_url); ?>"
             data-voice="<?php echo esc_attr($voice); ?>"
             data-model="<?php echo esc_attr($model); ?>">
            
            <div class="ntw-panel-body">
                <div class="ntw-character-box">
                    <div class="ntw-character-avatar">
                        <?php if ($has_video): ?>
                            <!-- Avatar preview video (auto-loop) -->
                            <video class="navtalk-avatar-preview-video ntw-preview-video"
                                   src="<?php echo esc_url($video_url); ?>"
                                   poster="<?php echo esc_url($image_url); ?>"
                                   autoplay
                                   loop
                                   muted
                                   playsinline></video>
                        <?php else: ?>
                            <!-- Static image if no video available -->
                            <img class="navtalk-avatar-static-img" 
                                 src="<?php echo esc_url($image_url); ?>" 
                                 alt="Digital Human">
                        <?php endif; ?>
                        
                        <!-- Inline realtime call video element (hidden by default) -->
                        <video class="navtalk-avatar-inline-video"
                               id="ntw-avatar-video"
                               poster="<?php echo esc_url($image_url); ?>"
                               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: none;"></video>
                        
                        <!-- Loading overlay for inline mode -->
                        <div class="navtalk-connection-loading-overlay navtalk-inline-loading-overlay"
                             data-avatar-id="<?php echo esc_attr($avatar_id_value); ?>"
                             style="display: none;">
                            <div class="navtalk-loading-spinner">
                                <div class="navtalk-spinner-ring"></div>
                                <div class="navtalk-spinner-ring"></div>
                                <div class="navtalk-spinner-ring"></div>
                            </div>
                            <div class="navtalk-loading-pulse"></div>
                        </div>
                        
                        <!-- Call button overlay -->
                        <button class="navtalk-icon-button navtalk-call-btn navtalk-inline-call ntw-call-button"
                                data-avatar-id="<?php echo esc_attr($avatar_id_value); ?>"
                                data-avatar-img="<?php echo esc_url($image_url); ?>"
                                data-inline-mode="true"
                                data-container-id="<?php echo esc_attr($unique_id); ?>"
                                data-config-voice="<?php echo esc_attr($voice); ?>"
                                data-config-tools=""
                                style="width: <?php echo esc_attr($button_size); ?>; height: <?php echo esc_attr($button_size); ?>; background: <?php echo esc_attr($button_background); ?>; color: <?php echo esc_attr($icon_color); ?>;">
                            <?php echo wp_kses($this->get_phone_icon(), self::allowed_icon_html()); ?>
                        </button>
                    </div>
                </div>
            </div>
            
            <?php if ($show_toggle): ?>
            <!-- Toggle button to show/hide widget -->
            <button class="ntw-toggle-btn" 
                    id="ntw-toggle-widget" 
                    aria-expanded="true" 
                    aria-label="<?php esc_attr_e('Hide Digital Human Panel', 'navtalk-digital-human'); ?>">
                <span class="ntw-toggle-icon"></span>
                <span class="ntw-toggle-text"></span>
            </button>
            <?php endif; ?>
        </div>
        <?php
        wp_enqueue_script(
            'navtalk-floating-collapse',
            NAVTALK_PLUGIN_URL . 'public/js/navtalk-floating-collapse.js',
            [],
            NAVTALK_VERSION,
            true
        );
        wp_print_scripts('navtalk-floating-collapse');
    }

    /**
     * Render avatar shortcode
     * 
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render_avatar($atts) {
        // Parse shortcode attributes
        $atts = shortcode_atts([
            'avatarid' => '', // WordPress lowercases shortcode attribute names
            'width' => NavTalk_Config::DEFAULT_WIDTH,
            'height' => NavTalk_Config::DEFAULT_HEIGHT,
            'button_text' => NavTalk_Config::DEFAULT_BUTTON_TEXT,
            'modal_width' => NavTalk_Config::DEFAULT_MODAL_WIDTH,
            'modal_height' => NavTalk_Config::DEFAULT_MODAL_HEIGHT,
            'modal_max_width' => NavTalk_Config::DEFAULT_MODAL_MAX_WIDTH,
            'modal_max_height' => NavTalk_Config::DEFAULT_MODAL_MAX_HEIGHT,
            'modal_overlay_color' => NavTalk_Config::DEFAULT_MODAL_OVERLAY_COLOR,
            'call_button_position' => NavTalk_Config::DEFAULT_CALL_BUTTON_POSITION,
            // New avatar card layout parameters
            'layout' => 'overlay', // overlay or bottom
            'show_title' => 'false',
            'show_status' => 'false',
            'status_position' => 'corner', // corner or info
            'show_call_button' => 'true',
            'show_download_button' => 'false',
            'download_url' => '',
            'title_tag' => 'h6',
            'call_icon' => '', // Custom call button icon URL
            'download_icon' => '', // Custom download button icon URL
            'inline_mode' => 'true', // true = inline video in card, false = modal popup
            'button_style' => '', // Custom CSS styles for call button
            // Session configuration parameters
            'voice' => '', // Voice configuration
            'tools' => '', // Tools configuration (JSON string)
            // Custom CSS class
            'class' => '', // Custom CSS class name
            // Call audio configuration
            'call_start_audio' => '', // Call start audio URL
            'call_end_audio' => '', // Call end audio URL
        ], $atts, 'navtalk_avatar');

        // Normalize avatarId (WordPress lowercases shortcode attribute names to 'avatarid')
        $atts['avatarId'] =  $atts['avatarid'];

        // Convert angle brackets to square brackets in tools parameter
        if (!empty($atts['tools'])) {
            $atts['tools'] = str_replace('<', '[', $atts['tools']);
            $atts['tools'] = str_replace('>', ']', $atts['tools']);
        }


        // Validate required attribute
        if (empty($atts['avatarId'])) {
            return $this->render_error('Avatar ID is required. Usage: [navtalk_avatar avatarId="your-avatar-id"]');
        }

        // Get license
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return $this->render_error('NavTalk license key is not configured. Please configure it in Settings > NavTalk Digital Human.');
        }

        // Get avatar information from API
        $api = new NavTalk_API();
        $avatar_info = $api->get_avatar_info($atts['avatarId']);
        
        // Check for API errors
        if (isset($avatar_info['error']) && $avatar_info['error']) {
            return $this->render_error($avatar_info['message']);
        }
        
        // Render avatar card
        return $this->render_avatar_card($avatar_info, $atts);
    }
    
    /**
     * Render avatar card HTML
     * 
     * @param array $avatar_info Avatar data from API
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    private function render_avatar_card($avatar_info, $atts) {
        // Choose layout based on 'layout' parameter
        $layout = $atts['layout'];
        
        if ($layout === 'overlay') {
            return $this->render_overlay_layout($avatar_info, $atts);
        } else {
            return $this->render_bottom_layout($avatar_info, $atts);
        }
    }
    
    /**
     * Render error message
     * 
     * @param string $message Error message
     * @return string HTML output
     */
    private function render_error($message) {
        return sprintf(
            '<div class="navtalk-error" style="padding: 15px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c33; margin: 10px 0;">
                <strong>%s</strong> %s
            </div>',
            esc_html(__('Error:', 'navtalk-digital-human')),
            esc_html($message)
        );
    }
    
    /**
     * Render floating button - Fixed position button at bottom right
     * 
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render_floating($atts) {
        $atts = shortcode_atts([
            'avatarid' => '', // WordPress lowercases shortcode attribute names
            'position' => 'bottom-right', // bottom-right, bottom-left, top-right, top-left
            'color' => '#667eea',
            'size' => '60px',
            'modal_width' => NavTalk_Config::DEFAULT_MODAL_WIDTH,
            'modal_height' => NavTalk_Config::DEFAULT_MODAL_HEIGHT,
            'modal_max_width' => NavTalk_Config::DEFAULT_MODAL_MAX_WIDTH,
            'modal_max_height' => NavTalk_Config::DEFAULT_MODAL_MAX_HEIGHT,
            'modal_overlay_color' => NavTalk_Config::DEFAULT_MODAL_OVERLAY_COLOR,
            'call_button_position' => NavTalk_Config::DEFAULT_CALL_BUTTON_POSITION,
            // Session configuration parameters
            'voice' => '',
            'tools' => '',
            // Custom CSS class
            'class' => '',
            // Call audio configuration
            'call_start_audio' => '',
            'call_end_audio' => '',
        ], $atts, 'navtalk_floating');

        // Normalize avatarId
        $atts['avatarId'] =  $atts['avatarid'];

        // Convert angle brackets to square brackets in tools parameter
        if (!empty($atts['tools'])) {
            $atts['tools'] = str_replace('<', '[', $atts['tools']);
            $atts['tools'] = str_replace('>', ']', $atts['tools']);
        }
        
        if (empty($atts['avatarId'])) {
            return $this->render_error('Avatar ID is required. Usage: [navtalk_floating avatarId="your-avatar-id"]');
        }

        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return '';
        }

        // Get avatar info
        $api = new NavTalk_API();
        $avatar_info = $api->get_avatar_info($atts['avatarId']);

        if (isset($avatar_info['error']) && $avatar_info['error']) {
            return '';
        }

        $avatar_id_value = isset($avatar_info['avatarId']) ? $avatar_info['avatarId'] : (isset($avatar_info['id']) ? $avatar_info['id'] : '');
        // Backward compatibility: Use thumbnailUrl if available, otherwise use url
        $thumbnail_url = isset($avatar_info['thumbnailUrl']) ? $avatar_info['thumbnailUrl'] : (isset($avatar_info['url']) ? $avatar_info['url'] : '');
        $image_url = esc_url($api->get_full_image_url($thumbnail_url));
        $position_class = 'navtalk-floating-' . esc_attr($atts['position']);
        $size = esc_attr($atts['size']);
        $color = esc_attr($atts['color']);
        
        $status = isset($avatar_info['status']) ? $avatar_info['status'] : 'Unknown';
        $is_available = (strtoupper($status) === 'SUCCESS');
        
        if (!$is_available) {
            return '';
        }
        
        ob_start();
        ?>
        <div class="navtalk-floating-button <?php echo esc_attr($position_class); ?> <?php echo esc_attr($atts['class']); ?>"
             style="width: <?php echo esc_attr($size); ?>; height: <?php echo esc_attr($size); ?>;">
            <button class="navtalk-trigger-button navtalk-floating-btn"
                    data-avatar-id="<?php echo esc_attr($avatar_id_value); ?>"
                    data-avatar-img="<?php echo esc_url($image_url); ?>"
                    data-connect-immediately="true"
                    data-modal-width="<?php echo esc_attr($atts['modal_width']); ?>"
                    data-modal-height="<?php echo esc_attr($atts['modal_height']); ?>"
                    data-modal-max-width="<?php echo esc_attr($atts['modal_max_width']); ?>"
                    data-modal-max-height="<?php echo esc_attr($atts['modal_max_height']); ?>"
                    data-modal-overlay-color="<?php echo esc_attr($atts['modal_overlay_color']); ?>"
                    data-call-button-position="<?php echo esc_attr($atts['call_button_position']); ?>"
                    data-config-voice="<?php echo esc_attr($atts['voice']); ?>"
                    data-config-tools="<?php echo esc_attr($atts['tools']); ?>"
                    data-call-start-audio="<?php echo esc_attr($atts['call_start_audio']); ?>"
                    data-call-end-audio="<?php echo esc_attr($atts['call_end_audio']); ?>"
                    style="background: <?php echo esc_attr($color); ?>;">
                <svg width="24" height="24" viewBox="0 0 22 22" fill="#fff">
                    <path d="M20.0001 15.58C17.0001 13.176 16.1281 14.378 14.8186 15.689C13.8371 16.672 11.4371 14.651 9.41862 12.575C7.34612 10.4995 5.32862 8.04101 6.31012 7.16701C7.67362 5.80201 8.81912 4.98201 6.41912 1.97751C4.01912 -1.02649 2.38262 1.26751 1.07412 2.57851C-0.453385 4.10851 0.964616 9.78901 6.58262 15.4155C12.2006 20.9875 17.8731 22.4625 19.4006 20.933C20.7096 19.622 23.0551 17.983 20.0006 15.5795L20.0001 15.58Z" />
                </svg>
            </button>
        </div>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Render avatar list - Grid of multiple avatars
     * 
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render_avatar_list($atts) {
        $atts = shortcode_atts([
            'columns' => '3',
            'style' => 'grid', // grid, list, carousel
            'filter' => 'all', // all, available, custom
            'avatarIds' => '', // comma-separated avatar IDs
            'avatarids' => '', // WordPress lowercases shortcode attribute names
            'limit' => '20',
            'modal_width' => NavTalk_Config::DEFAULT_MODAL_WIDTH,
            'modal_height' => NavTalk_Config::DEFAULT_MODAL_HEIGHT,
            'modal_max_width' => NavTalk_Config::DEFAULT_MODAL_MAX_WIDTH,
            'modal_max_height' => NavTalk_Config::DEFAULT_MODAL_MAX_HEIGHT,
            'modal_overlay_color' => NavTalk_Config::DEFAULT_MODAL_OVERLAY_COLOR,
            'call_button_position' => NavTalk_Config::DEFAULT_CALL_BUTTON_POSITION,
            // New avatar card layout parameters for list items
            'layout' => 'overlay',
            'show_title' => 'true',
            'show_status' => 'false',
            'status_position' => 'corner',
            'show_call_button' => 'true',
            'show_download_button' => 'true',
            'download_url' => '',
            'title_tag' => 'h6',
            'call_icon' => '', // Custom call button icon URL
            'download_icon' => '', // Custom download button icon URL
            'inline_mode' => 'false', // false = modal popup for list items
            'button_style' => '', // Custom CSS styles for call button
            'width' => NavTalk_Config::DEFAULT_WIDTH,
            // Session configuration parameters
            'voice' => '',
            'tools' => '',
            // Custom CSS class
            'class' => '',
            // Call audio configuration
            'call_start_audio' => '',
            'call_end_audio' => '',
        ], $atts, 'navtalk_list');
        
        // Normalize avatarIds
        $atts['avatarIds'] = isset($atts['avatarIds']) && $atts['avatarIds'] !== '' 
            ? $atts['avatarIds'] 
            : (isset($atts['avatarids']) ? $atts['avatarids'] : '');
        
        // Convert angle brackets to square brackets in tools parameter
        if (!empty($atts['tools'])) {
            $atts['tools'] = str_replace('<', '[', $atts['tools']);
            $atts['tools'] = str_replace('>', ']', $atts['tools']);
        }
        
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return $this->render_error('NavTalk license key is not configured. Please configure it in Settings > NavTalk Digital Human.');
        }
        
        // Get all avatars from API
        $api = new NavTalk_API();
        $url = NavTalk_Config::get_api_endpoint('/api/open/v1/avatar/list');
        
        $response = wp_remote_get($url, [
            'headers' => ['license' => $license],
            'timeout' => 15
        ]);
        
        if (is_wp_error($response)) {
            return $this->render_error('Failed to fetch avatars: ' . $response->get_error_message());
        }
        
        $body_content = wp_remote_retrieve_body($response);
        $body = json_decode($body_content, true);
        
        if (!is_array($body) || !isset($body['code']) || $body['code'] !== 200 || empty($body['data'])) {
            return $this->render_error('No avatars found in your account.');
        }
        
        $avatars = $body['data'];
        
        // Filter avatars based on parameters
        if ($atts['filter'] === 'available') {
            $avatars = array_filter($avatars, function($avatar) {
                return isset($avatar['status']) && $avatar['status'] === 'SUCCESS';
            });
        } elseif ($atts['filter'] === 'custom' && !empty($atts['avatarIds'])) {
            $custom_ids = array_map('trim', explode(',', $atts['avatarIds']));
            $avatars = array_filter($avatars, function($avatar) use ($custom_ids) {
                $aid = isset($avatar['avatarId']) ? $avatar['avatarId'] : (isset($avatar['id']) ? $avatar['id'] : '');
                return '' !== $aid && in_array((string) $aid, $custom_ids, true);
            });
        }
        
        // Limit number of avatars
        $limit = intval($atts['limit']);
        if ($limit > 0) {
            $avatars = array_slice($avatars, 0, $limit);
        }
        
        if (empty($avatars)) {
            return '<p>' . esc_html__('No avatars available.', 'navtalk-digital-human') . '</p>';
        }
        
        $columns = intval($atts['columns']);
        $style_class = 'navtalk-list-' . esc_attr($atts['style']);
        $layout = $atts['layout'];
        
        ob_start();
        ?>
        <div class="navtalk-avatar-list <?php echo esc_attr($style_class); ?> <?php echo esc_attr($atts['class']); ?>" data-columns="<?php echo esc_attr($columns); ?>">
            <?php foreach ($avatars as $avatar): ?>
                <?php
                // Late escaping: render_*_layout() builds HTML with esc_attr/esc_url/esc_html
                // inside; wp_kses() at the echo site enforces a strict tag/attribute whitelist.
                if ($layout === 'overlay') {
                    echo wp_kses($this->render_overlay_layout($avatar, $atts), self::allowed_avatar_card_html());
                } else {
                    echo wp_kses($this->render_bottom_layout($avatar, $atts), self::allowed_avatar_card_html());
                }
                ?>
            <?php endforeach; ?>
        </div>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Get display name from avatar name
     * 
     * @param string $avatar_name Full avatar name (e.g., "navtalk.Ethan")
     * @return string Display name (e.g., "Ethan")
     */
    private function get_display_name($avatar_name) {
        $parts = explode('.', $avatar_name);
        return isset($parts[1]) ? $parts[1] : $avatar_name;
    }
    
    /**
     * Get SVG icon for phone
     * 
     * @param string $custom_icon Custom icon URL or empty for default
     * @return string SVG HTML
     */
    private function get_phone_icon($custom_icon = '') {
        // If custom icon URL provided via parameter
        if (!empty($custom_icon)) {
            if (filter_var($custom_icon, FILTER_VALIDATE_URL)) {
                return '<img class="navtalk-phone-icon" src="' . esc_url($custom_icon) . '" alt="" width="24" height="24" aria-hidden="true">';
            }
            return $custom_icon; // Direct SVG code
        }
        
        // Check global icon settings
        $icon_type = get_option('navtalk_floating_button_icon_type', 'default');
        
        if ($icon_type === 'svg') {
            $custom_svg = get_option('navtalk_floating_button_icon_svg', '');
            if (!empty($custom_svg)) {
                return $custom_svg;
            }
        } elseif ($icon_type === 'image') {
            $icon_image = get_option('navtalk_floating_button_icon_image', '');
            if (!empty($icon_image)) {
                return '<img class="navtalk-phone-icon" src="' . esc_url($icon_image) . '" alt="" width="24" height="24" aria-hidden="true">';
            }
        }
        
        // Default: inline SVG (WordPress should allow this in content context)
        return '<svg class="navtalk-phone-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor" aria-hidden="true">
            <path d="M718.684 455.362c0 20.499 13.639 33.48 33.48 33.48s33.48-13.639 33.48-33.48c-0.658-111.727-90.66-201.819-202.387-202.387-20.499 0-33.48 13.639-33.48 33.48 0 20.499 13.639 33.48 33.48 33.48 74.578 0.658 134.768 60.848 135.426 135.426z m134.678 0c0 20.499 13.639 33.48 33.48 33.48s33.48-13.639 33.48-33.48c0-185.647-152.07-337.155-337.155-337.155-20.499 0-33.48 13.639-33.48 33.48 0 20.499 13.639 33.48 33.48 33.48 148.59 0.091 270.195 121.787 270.195 270.195zM397.71 337.334c37.24-37.24 40.349-94.329 6.869-134.768L300.19 70.43c-33.48-44.108-98.088-50.971-141.538-16.831-3.101 3.101-6.869 3.101-6.869 6.869l-91.227 91.227c-87.559 87.559 37.24 324.084 263.235 550.17S782.642 1049.549 870.103 965.1l91.227-91.227c40.349-40.349 40.349-104.299 0-141.538l-6.869-6.869-131.478-104.389c-40.349-33.48-97.43-30.379-134.768 6.869l-57.089 57.089c-60.848-37.24-114.828-77.589-162.038-124.798s-87.559-101.19-124.798-162.038l53.42-60.848z m-47.21-91.225c9.97 13.639 9.97 33.48-3.101 44.108l-74.487 77.589c-10.531 10.531-13.071 26.71-6.869 40.349 39.781 73.262 90.002 140.313 148.407 199.286 58.965 58.965 126.024 108.626 199.286 148.407 13.639 6.211 29.811 3.759 40.349-6.869l77.589-77.589c13.639-13.639 30.379-13.639 44.108-3.101l131.667 108.058s3.101 0 3.101 3.101c13.071 12.413 13.639 32.913 1.226 45.991l-92.445 92.445c-44.108 44.108-252.698-67.71-451.983-263.235C168.63 458.473 60.572 246.116 104.68 202.008l94.329-94.329c13.639-9.97 37.24-9.97 47.21 6.869l104.299 131.568z"/>
        </svg>';
    }
    
    /**
     * Get SVG icon for download
     * 
     * @param string $custom_icon Custom icon URL or empty for default
     * @return string SVG HTML
     */
    private function get_download_icon($custom_icon = '') {
        // If custom icon URL provided
        if (!empty($custom_icon) && filter_var($custom_icon, FILTER_VALIDATE_URL)) {
            return '<img class="navtalk-download-icon" src="' . esc_url($custom_icon) . '" alt="" width="20" height="20" aria-hidden="true">';
        }
        
        // Default: inline SVG with feather download icon
        return '<svg class="navtalk-download-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>';
    }
    
    /**
     * Render overlay layout for avatar card
     * 
     * @param array $avatar_info Avatar data
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    private function render_overlay_layout($avatar_info, $atts) {
        $avatar_id_value = isset($avatar_info['avatarId']) ? $avatar_info['avatarId'] : (isset($avatar_info['id']) ? $avatar_info['id'] : '');
        $avatar_name_for_display = isset($avatar_info['name']) ? $avatar_info['name'] : '';
        $display_name = esc_html($this->get_display_name($avatar_name_for_display));
        
        $api = new NavTalk_API();
        $thumbnail_url = isset($avatar_info['thumbnailUrl']) ? $avatar_info['thumbnailUrl'] : (isset($avatar_info['url']) ? $avatar_info['url'] : '');
        $image_url = $api->get_full_image_url($thumbnail_url);

        // Check for video URL
        $has_video = (bool)(isset($avatar_info['videoFile']) ? $avatar_info['videoFile'] : false);
        if ($has_video) {
            $video_url = $api->get_full_image_url($avatar_info['url']);
        }

        $status = isset($avatar_info['status']) ? $avatar_info['status'] : 'Unknown';
        $is_available = (strtoupper($status) === 'SUCCESS');

        // Parse boolean parameters
        $show_title = ($atts['show_title'] === 'true');
        $show_status = ($atts['show_status'] === 'true');
        $show_call_button = ($atts['show_call_button'] === 'true') && $is_available;
        $show_download_button = ($atts['show_download_button'] === 'true');
        $status_position = $atts['status_position'];
        $allowed_title_tags = ['h2', 'h3', 'h4', 'h5', 'h6'];
        $title_tag = in_array(strtolower((string) $atts['title_tag']), $allowed_title_tags, true) ? strtolower((string) $atts['title_tag']) : 'h6';
        $download_url = !empty($atts['download_url']) ? esc_url($atts['download_url']) : esc_url($image_url);
        $inline_mode = ($atts['inline_mode'] === 'true');

        $width = esc_attr(isset($atts['width']) ? $atts['width'] : NavTalk_Config::DEFAULT_WIDTH);

        // Generate unique ID for this avatar instance
        $unique_id = 'navtalk-' . uniqid();

        ob_start();
        ?>
        <div class="navtalk-avatar-container navtalk-layout-overlay <?php echo esc_attr($inline_mode ? 'navtalk-inline-mode' : ''); ?> <?php echo esc_attr($atts['class']); ?>" id="<?php echo esc_attr($unique_id); ?>">
            <div class="navtalk-avatar-card">
                <!-- Avatar Image/Video -->
                <div class="navtalk-avatar-image">
                    <?php if ($has_video): ?>
                        <!-- Avatar has video: render video element -->
                        <video class="navtalk-avatar-preview-video"
                               src="<?php echo esc_url($video_url); ?>"
                               poster="<?php echo esc_url($image_url); ?>"
                               muted
                               playsinline
                               <?php if ($inline_mode): ?>
                               autoplay
                               loop
                               <?php else: ?>
                               data-hover-play="true"
                               <?php endif; ?>>
                        </video>
                    <?php elseif (!empty($image_url)): ?>
                        <!-- No video: render static image -->
                        <img class="navtalk-avatar-static-img"
                             src="<?php echo esc_url($image_url); ?>"
                             alt="<?php echo esc_attr($display_name); ?>">
                    <?php else: ?>
                        <div class="navtalk-avatar-placeholder">
                            <span>🎭</span>
                            <p><?php echo esc_html($display_name); ?></p>
                        </div>
                    <?php endif; ?>


                    <?php if ($inline_mode): ?>
                        <!-- Inline realtime call video element (hidden by default) -->
                        <video class="navtalk-avatar-inline-video"
                               poster="<?php echo esc_url($image_url); ?>"
                               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: none;"></video>

                        <!-- Loading overlay for inline mode -->
                        <div class="navtalk-connection-loading-overlay navtalk-inline-loading-overlay" data-avatar-id="<?php echo esc_attr($avatar_id_value); ?>" style="display: none;">
                            <div class="navtalk-loading-spinner">
                                <div class="navtalk-spinner-ring"></div>
                                <div class="navtalk-spinner-ring"></div>
                                <div class="navtalk-spinner-ring"></div>
                            </div>
                            <div class="navtalk-loading-pulse"></div>
                        </div>
                    <?php endif; ?>

                    <!-- Status Badge (corner) -->
                    <?php if ($show_status && $status_position === 'corner'): ?>
                        <span class="navtalk-status-badge <?php echo esc_attr($is_available ? 'status-available' : 'status-unavailable'); ?>"></span>
                    <?php endif; ?>
                </div>

                <!-- Overlay Info -->
                <div class="navtalk-avatar-overlay">
                    <?php if ($show_title): ?>
                        <<?php echo esc_attr($title_tag); ?> class="navtalk-avatar-title"><?php echo esc_html($display_name); ?></<?php echo esc_attr($title_tag); ?>>
                    <?php endif; ?>

                    <!-- Button Group -->
                    <div class="navtalk-button-group">
                        <?php if ($show_call_button): ?>
                            <button class="navtalk-icon-button navtalk-call-btn <?php echo esc_attr($inline_mode ? 'navtalk-inline-call' : 'navtalk-start-chat'); ?>"
                                    data-avatar-id="<?php echo esc_attr($avatar_id_value); ?>"
                                    data-avatar-img="<?php echo esc_url($image_url); ?>"
                                    data-inline-mode="<?php echo esc_attr($inline_mode ? 'true' : 'false'); ?>"
                                    data-container-id="<?php echo esc_attr($unique_id); ?>"
                                    data-config-voice="<?php echo esc_attr($atts['voice']); ?>"
                                    data-config-tools="<?php echo esc_attr($atts['tools']); ?>"
                                    data-call-start-audio="<?php echo esc_attr($atts['call_start_audio']); ?>"
                                    data-call-end-audio="<?php echo esc_attr($atts['call_end_audio']); ?>"
                                    <?php if (!empty($atts['button_style'])): ?>
                                    style="<?php echo esc_attr($atts['button_style']); ?>"
                                    <?php endif; ?>
                                    <?php if (!$inline_mode): ?>
                                    data-connect-immediately="true"
                                    data-modal-width="<?php echo esc_attr($atts['modal_width']); ?>"
                                    data-modal-height="<?php echo esc_attr($atts['modal_height']); ?>"
                                    data-modal-max-width="<?php echo esc_attr($atts['modal_max_width']); ?>"
                                    data-modal-max-height="<?php echo esc_attr($atts['modal_max_height']); ?>"
                                    data-modal-overlay-color="<?php echo esc_attr($atts['modal_overlay_color']); ?>"
                                    data-call-button-position="<?php echo esc_attr($atts['call_button_position']); ?>"
                                    <?php endif; ?>>
                                <?php echo wp_kses($this->get_phone_icon(isset($atts['call_icon']) ? $atts['call_icon'] : ''), self::allowed_icon_html()); ?>
                            </button>
                        <?php endif; ?>

                        <?php if ($show_download_button): ?>
                            <a class="navtalk-icon-button navtalk-download-btn"
                               href="<?php echo esc_url($download_url); ?>"
                               download>
                                 <?php echo wp_kses($this->get_download_icon(isset($atts['download_icon']) ? $atts['download_icon'] : ''), self::allowed_icon_html()); ?>
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        <?php

        return ob_get_clean();
    }

    /**
     * Allowed HTML for icon output (SVG/img) for wp_kses
     */
    public static function allowed_icon_html() {
        return [
            'svg'   => [
                'class' => true, 'xmlns' => true, 'xmlns:xlink' => true, 'xml:space' => true,
                'viewBox' => true, 'viewbox' => true, 'width' => true, 'height' => true, 
                'fill' => true, 'stroke' => true, 'stroke-width' => true, 'stroke-linecap' => true, 
                'stroke-linejoin' => true, 'stroke-dasharray' => true, 'stroke-dashoffset' => true,
                'aria-hidden' => true, 'aria-label' => true, 'role' => true, 'style' => true,
                'preserveAspectRatio' => true, 'version' => true, 'baseProfile' => true, 'id' => true,
                'x' => true, 'y' => true, 'opacity' => true, 'fill-opacity' => true, 'stroke-opacity' => true
            ],
            'path'  => [
                'd' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 
                'stroke-linecap' => true, 'stroke-linejoin' => true, 'stroke-dasharray' => true,
                'stroke-dashoffset' => true, 'transform' => true, 'fill-rule' => true, 
                'clip-rule' => true, 'clip-path' => true, 'id' => true, 'class' => true,
                'opacity' => true, 'fill-opacity' => true, 'stroke-opacity' => true, 'style' => true
            ],
            'g'     => [
                'fill' => true, 'stroke' => true, 'stroke-width' => true, 'stroke-dasharray' => true,
                'transform' => true, 'id' => true, 'class' => true, 'opacity' => true, 
                'fill-opacity' => true, 'stroke-opacity' => true, 'style' => true, 'clip-path' => true
            ],
            'circle' => [
                'cx' => true, 'cy' => true, 'r' => true, 'fill' => true, 'stroke' => true,
                'stroke-width' => true, 'stroke-dasharray' => true, 'transform' => true, 
                'id' => true, 'class' => true, 'opacity' => true, 'fill-opacity' => true, 
                'stroke-opacity' => true, 'style' => true
            ],
            'rect'   => [
                'x' => true, 'y' => true, 'width' => true, 'height' => true, 'rx' => true, 'ry' => true,
                'fill' => true, 'stroke' => true, 'stroke-width' => true, 'stroke-dasharray' => true,
                'transform' => true, 'id' => true, 'class' => true, 'opacity' => true, 
                'fill-opacity' => true, 'stroke-opacity' => true, 'style' => true
            ],
            'line'   => [
                'x1' => true, 'y1' => true, 'x2' => true, 'y2' => true, 'stroke' => true,
                'stroke-width' => true, 'stroke-linecap' => true, 'stroke-dasharray' => true,
                'transform' => true, 'id' => true, 'class' => true, 'opacity' => true, 
                'stroke-opacity' => true, 'style' => true
            ],
            'ellipse' => [
                'cx' => true, 'cy' => true, 'rx' => true, 'ry' => true, 'fill' => true,
                'stroke' => true, 'stroke-width' => true, 'stroke-dasharray' => true,
                'transform' => true, 'id' => true, 'class' => true, 'opacity' => true, 
                'fill-opacity' => true, 'stroke-opacity' => true, 'style' => true
            ],
            'polygon' => [
                'points' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true,
                'stroke-dasharray' => true, 'transform' => true, 'id' => true, 'class' => true, 
                'opacity' => true, 'fill-opacity' => true, 'stroke-opacity' => true, 'style' => true
            ],
            'polyline' => [
                'points' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true,
                'stroke-linecap' => true, 'stroke-linejoin' => true, 'stroke-dasharray' => true,
                'transform' => true, 'id' => true, 'class' => true, 'opacity' => true, 
                'stroke-opacity' => true, 'style' => true
            ],
            'defs'   => ['id' => true, 'class' => true],
            'use'    => [
                'href' => true, 'xlink:href' => true, 'x' => true, 'y' => true, 
                'transform' => true, 'id' => true, 'class' => true, 'fill' => true, 
                'stroke' => true, 'opacity' => true
            ],
            'clipPath' => ['id' => true, 'class' => true, 'clipPathUnits' => true],
            'mask' => ['id' => true, 'class' => true, 'maskUnits' => true, 'maskContentUnits' => true],
            'pattern' => [
                'id' => true, 'class' => true, 'x' => true, 'y' => true, 'width' => true, 
                'height' => true, 'patternUnits' => true, 'patternContentUnits' => true, 
                'patternTransform' => true, 'viewBox' => true
            ],
            'linearGradient' => [
                'id' => true, 'class' => true, 'x1' => true, 'y1' => true, 'x2' => true, 
                'y2' => true, 'gradientUnits' => true, 'gradientTransform' => true, 
                'spreadMethod' => true
            ],
            'radialGradient' => [
                'id' => true, 'class' => true, 'cx' => true, 'cy' => true, 'r' => true, 
                'fx' => true, 'fy' => true, 'gradientUnits' => true, 'gradientTransform' => true, 
                'spreadMethod' => true
            ],
            'stop' => [
                'offset' => true, 'stop-color' => true, 'stop-opacity' => true, 'style' => true, 
                'id' => true, 'class' => true
            ],
            'text' => [
                'x' => true, 'y' => true, 'dx' => true, 'dy' => true, 'text-anchor' => true, 
                'font-size' => true, 'font-family' => true, 'font-weight' => true, 'fill' => true, 
                'stroke' => true, 'transform' => true, 'id' => true, 'class' => true, 'style' => true
            ],
            'tspan' => [
                'x' => true, 'y' => true, 'dx' => true, 'dy' => true, 'text-anchor' => true, 
                'font-size' => true, 'font-family' => true, 'font-weight' => true, 'fill' => true, 
                'stroke' => true, 'id' => true, 'class' => true, 'style' => true
            ],
            'title' => ['id' => true],
            'desc' => ['id' => true],
            'img'   => [
                'src' => true, 'alt' => true, 'class' => true, 'width' => true, 
                'height' => true, 'aria-hidden' => true, 'aria-label' => true
            ],
        ];
    }

    /**
     * Allowed HTML for the rendered avatar card output (used with wp_kses for late escaping).
     *
     * Merges SVG/icon whitelist with the structural HTML produced by render_overlay_layout()
     * and render_bottom_layout(). All dynamic values inside these renderers are already
     * escaped at build-time with esc_attr/esc_url/esc_html; wp_kses() at the echo site
     * provides late escaping for Plugin Check compliance.
     *
     * @return array
     */
    public static function allowed_avatar_card_html() {
        $common_attrs = [
            'class'       => true,
            'id'          => true,
            'style'       => true,
            'title'       => true,
            'aria-hidden' => true,
            'aria-label'  => true,
            'role'        => true,
        ];

        $data_attrs = [
            'data-avatar-id'             => true,
            'data-avatar-img'            => true,
            'data-inline-mode'           => true,
            'data-container-id'          => true,
            'data-config-voice'          => true,
            'data-config-tools'          => true,
            'data-call-start-audio'      => true,
            'data-call-end-audio'        => true,
            'data-connect-immediately'   => true,
            'data-modal-width'           => true,
            'data-modal-height'          => true,
            'data-modal-max-width'       => true,
            'data-modal-max-height'      => true,
            'data-modal-overlay-color'   => true,
            'data-call-button-position'  => true,
            'data-columns'               => true,
            'data-hover-play'            => true,
        ];

        $card_html = [
            'div'    => array_merge($common_attrs, $data_attrs),
            'span'   => $common_attrs,
            'p'      => $common_attrs,
            'h1'     => $common_attrs,
            'h2'     => $common_attrs,
            'h3'     => $common_attrs,
            'h4'     => $common_attrs,
            'h5'     => $common_attrs,
            'h6'     => $common_attrs,
            'small'  => $common_attrs,
            'strong' => $common_attrs,
            'em'     => $common_attrs,
            'br'     => [],
            'a'      => array_merge($common_attrs, [
                'href'     => true,
                'download' => true,
                'rel'      => true,
                'target'   => true,
            ]),
            'button' => array_merge($common_attrs, $data_attrs, [
                'type'          => true,
                'disabled'      => true,
                'aria-expanded' => true,
            ]),
            'img'    => array_merge($common_attrs, [
                'src'    => true,
                'alt'    => true,
                'width'  => true,
                'height' => true,
                'srcset' => true,
                'sizes'  => true,
                'loading' => true,
            ]),
            'video'  => array_merge($common_attrs, $data_attrs, [
                'src'         => true,
                'poster'      => true,
                'muted'       => true,
                'autoplay'    => true,
                'loop'        => true,
                'playsinline' => true,
                'controls'    => true,
                'preload'     => true,
                'width'       => true,
                'height'      => true,
            ]),
            'source' => [
                'src'  => true,
                'type' => true,
            ],
        ];

        return array_merge(self::allowed_icon_html(), $card_html);
    }

    /**
     * Render bottom layout for avatar card
     * 
     * @param array $avatar_info Avatar data
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    private function render_bottom_layout($avatar_info, $atts) {
        $avatar_id_value = isset($avatar_info['avatarId']) ? $avatar_info['avatarId'] : (isset($avatar_info['id']) ? $avatar_info['id'] : '');
        $avatar_name_for_display = isset($avatar_info['name']) ? $avatar_info['name'] : '';
        $display_name = esc_html($this->get_display_name($avatar_name_for_display));

        $api = new NavTalk_API();
        $thumbnail_url = isset($avatar_info['thumbnailUrl']) ? $avatar_info['thumbnailUrl'] : (isset($avatar_info['url']) ? $avatar_info['url'] : '');
        $image_url = $api->get_full_image_url($thumbnail_url);

        // Check for video URL
        $has_video = (bool)(isset($avatar_info['videoFile']) ? $avatar_info['videoFile'] : false);
        if ($has_video) {
            $video_url = $api->get_full_image_url($avatar_info['url']);
        }

        $status = isset($avatar_info['status']) ? $avatar_info['status'] : 'Unknown';
        $is_available = (strtoupper($status) === 'SUCCESS');

        // Parse boolean parameters
        $show_title = ($atts['show_title'] === 'true');
        $show_status = ($atts['show_status'] === 'true');
        $show_call_button = ($atts['show_call_button'] === 'true') && $is_available;
        $show_download_button = ($atts['show_download_button'] === 'true');
        $status_position = $atts['status_position'];
        $allowed_title_tags = ['h2', 'h3', 'h4', 'h5', 'h6'];
        $title_tag = in_array(strtolower((string) $atts['title_tag']), $allowed_title_tags, true) ? strtolower((string) $atts['title_tag']) : 'h6';
        $download_url = !empty($atts['download_url']) ? esc_url($atts['download_url']) : esc_url($image_url);
        $inline_mode = ($atts['inline_mode'] === 'true');

        $width = esc_attr(isset($atts['width']) ? $atts['width'] : NavTalk_Config::DEFAULT_WIDTH);

        // Generate unique ID for this avatar instance
        $unique_id = 'navtalk-' . uniqid();

        ob_start();
        ?>
        <div class="navtalk-avatar-container navtalk-layout-bottom <?php echo esc_attr($inline_mode ? 'navtalk-inline-mode' : ''); ?> <?php echo esc_attr($atts['class']); ?>" id="<?php echo esc_attr($unique_id); ?>">
            <div class="navtalk-avatar-card">
                <!-- Avatar Image/Video -->
                <div class="navtalk-avatar-image">
                    <?php if ($has_video): ?>
                        <!-- Avatar has video: render video element -->
                        <video class="navtalk-avatar-preview-video"
                               src="<?php echo esc_url($video_url); ?>"
                               poster="<?php echo esc_url($image_url); ?>"
                               muted
                               playsinline
                               <?php if ($inline_mode): ?>
                               autoplay
                               loop
                               <?php else: ?>
                               data-hover-play="true"
                               <?php endif; ?>>
                        </video>
                    <?php elseif (!empty($image_url)): ?>
                        <!-- No video: render static image -->
                        <img class="navtalk-avatar-static-img"
                             src="<?php echo esc_url($image_url); ?>"
                             alt="<?php echo esc_attr($display_name); ?>">
                    <?php else: ?>
                        <div class="navtalk-avatar-placeholder">
                            <span>🎭</span>
                            <p><?php echo esc_html($display_name); ?></p>
                        </div>
                    <?php endif; ?>

                    <?php if ($inline_mode): ?>
                        <!-- Inline realtime call video element (hidden by default) -->
                        <video class="navtalk-avatar-inline-video"
                               poster="<?php echo esc_url($image_url); ?>"
                               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: none;"></video>

                        <!-- Loading overlay for inline mode -->
                        <div class="navtalk-connection-loading-overlay navtalk-inline-loading-overlay" data-avatar-id="<?php echo esc_attr($avatar_id_value); ?>" style="display: none;">
                            <div class="navtalk-loading-spinner">
                                <div class="navtalk-spinner-ring"></div>
                                <div class="navtalk-spinner-ring"></div>
                                <div class="navtalk-spinner-ring"></div>
                            </div>
                            <div class="navtalk-loading-pulse"></div>
                        </div>
                    <?php endif; ?>

                    <!-- Status Badge (corner) -->
                    <?php if ($show_status && $status_position === 'corner'): ?>
                        <span class="navtalk-status-badge <?php echo esc_attr($is_available ? 'status-available' : 'status-unavailable'); ?>"></span>
                    <?php endif; ?>
                </div>

                <!-- Info Section (below image) -->
                <div class="navtalk-avatar-info">
                    <?php if ($show_title): ?>
                        <<?php echo esc_attr($title_tag); ?> class="navtalk-avatar-title"><?php echo esc_html($display_name); ?></<?php echo esc_attr($title_tag); ?>>
                    <?php endif; ?>

                    <?php if ($show_status && $status_position === 'info'): ?>
                        <p class="navtalk-avatar-status <?php echo esc_attr($is_available ? 'status-available' : 'status-unavailable'); ?>">
                            <span class="status-indicator"></span>
                            <?php echo esc_html($is_available ? __('Available', 'navtalk-digital-human') : __('Unavailable', 'navtalk-digital-human')); ?>
                        </p>
                    <?php endif; ?>

                    <!-- Button Group -->
                    <div class="navtalk-button-group">
                        <?php if ($show_call_button): ?>
                            <button class="navtalk-icon-button navtalk-call-btn <?php echo esc_attr($inline_mode ? 'navtalk-inline-call' : 'navtalk-start-chat'); ?>"
                                    data-avatar-id="<?php echo esc_attr($avatar_id_value); ?>"
                                    data-avatar-img="<?php echo esc_url($image_url); ?>"
                                    data-inline-mode="<?php echo esc_attr($inline_mode ? 'true' : 'false'); ?>"
                                    data-container-id="<?php echo esc_attr($unique_id); ?>"
                                    data-config-voice="<?php echo esc_attr($atts['voice']); ?>"
                                    data-config-tools="<?php echo esc_attr($atts['tools']); ?>"
                                    data-call-start-audio="<?php echo esc_attr($atts['call_start_audio']); ?>"
                                    data-call-end-audio="<?php echo esc_attr($atts['call_end_audio']); ?>"
                                    <?php if (!empty($atts['button_style'])): ?>
                                    style="<?php echo esc_attr($atts['button_style']); ?>"
                                    <?php endif; ?>
                                    <?php if (!$inline_mode): ?>
                                    data-connect-immediately="true"
                                    data-modal-width="<?php echo esc_attr($atts['modal_width']); ?>"
                                    data-modal-height="<?php echo esc_attr($atts['modal_height']); ?>"
                                    data-modal-max-width="<?php echo esc_attr($atts['modal_max_width']); ?>"
                                    data-modal-max-height="<?php echo esc_attr($atts['modal_max_height']); ?>"
                                    data-modal-overlay-color="<?php echo esc_attr($atts['modal_overlay_color']); ?>"
                                    data-call-button-position="<?php echo esc_attr($atts['call_button_position']); ?>"
                                    <?php endif; ?>>
                                <?php echo wp_kses($this->get_phone_icon(isset($atts['call_icon']) ? $atts['call_icon'] : ''), self::allowed_icon_html()); ?>
                            </button>
                        <?php endif; ?>

                        <?php if ($show_download_button): ?>
                            <a class="navtalk-icon-button navtalk-download-btn"
                               href="<?php echo esc_url($download_url); ?>"
                               download>
                                 <?php echo wp_kses($this->get_download_icon(isset($atts['download_icon']) ? $atts['download_icon'] : ''), self::allowed_icon_html()); ?>
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        <?php

        return ob_get_clean();
    }
}

