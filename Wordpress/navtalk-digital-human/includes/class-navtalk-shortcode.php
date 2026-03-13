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
        add_shortcode('navtalk_button', [$this, 'render_button']);
        add_shortcode('navtalk_floating', [$this, 'render_floating']);
        add_shortcode('navtalk_link', [$this, 'render_link']);
        add_shortcode('navtalk_list', [$this, 'render_avatar_list']);
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
            'name' => '',
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
            'prompt' => '', // Custom prompt
            'tools' => '', // Tools configuration (JSON string)
            // Custom CSS class
            'class' => '', // Custom CSS class name
        ], $atts, 'navtalk_avatar');
        
        // Validate required attribute
        if (empty($atts['name'])) {
            return $this->render_error('Avatar name is required. Usage: [navtalk_avatar name="navtalk.Ethan"]');
        }
        
        // Get license
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return $this->render_error('NavTalk license key is not configured. Please configure it in Settings > NavTalk Digital Human.');
        }
        
        // Get avatar information from API
        $api = new NavTalk_API();
        $avatar_info = $api->get_avatar_info($atts['name']);
        
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
                <strong>NavTalk Error:</strong> %s
            </div>',
            esc_html($message)
        );
    }
    
    /**
     * Render button shortcode - Only shows a button that opens chat directly
     * 
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render_button($atts) {
        $atts = shortcode_atts([
            'name' => '',
            'text' => 'Start Chat',
            'style' => 'primary', // primary, secondary, outline
            'size' => 'medium', // small, medium, large
            'icon' => 'true', // show icon
            'modal_width' => NavTalk_Config::DEFAULT_MODAL_WIDTH,
            'modal_height' => NavTalk_Config::DEFAULT_MODAL_HEIGHT,
            'modal_max_width' => NavTalk_Config::DEFAULT_MODAL_MAX_WIDTH,
            'modal_max_height' => NavTalk_Config::DEFAULT_MODAL_MAX_HEIGHT,
            'modal_overlay_color' => NavTalk_Config::DEFAULT_MODAL_OVERLAY_COLOR,
            'call_button_position' => NavTalk_Config::DEFAULT_CALL_BUTTON_POSITION,
            // Session configuration parameters
            'voice' => '',
            'prompt' => '',
            'tools' => '',
            // Custom CSS class
            'class' => '',
        ], $atts, 'navtalk_button');
        
        if (empty($atts['name'])) {
            return $this->render_error('Avatar name is required. Usage: [navtalk_button name="navtalk.Ethan"]');
        }
        
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return $this->render_error('NavTalk license key is not configured.');
        }
        
        // Get avatar info
        $api = new NavTalk_API();
        $avatar_info = $api->get_avatar_info($atts['name']);
        
        if (isset($avatar_info['error']) && $avatar_info['error']) {
            return $this->render_error($avatar_info['message']);
        }
        
        $avatar_name = esc_attr($avatar_info['name']);
        $thumbnail_url = isset($avatar_info['thumbnailUrl']) ? $avatar_info['thumbnailUrl'] : ($avatar_info['url'] ?? '');
        $image_url = esc_url($api->get_full_image_url($thumbnail_url));
        $button_text = esc_html($atts['text']);
        $style_class = 'navtalk-btn-' . esc_attr($atts['style']);
        $size_class = 'navtalk-btn-' . esc_attr($atts['size']);
        $show_icon = ($atts['icon'] === 'true');
        
        $status = isset($avatar_info['status']) ? $avatar_info['status'] : 'Unknown';
        $is_available = (strtoupper($status) === 'SUCCESS');
        
        ob_start();
        ?>
        <button class="navtalk-trigger-button <?php echo $style_class; ?> <?php echo $size_class; ?> <?php echo esc_attr($atts['class']); ?>" 
                <?php echo !$is_available ? 'disabled' : ''; ?>
                data-avatar-name="<?php echo $avatar_name; ?>"
                data-avatar-img="<?php echo $image_url; ?>"
                data-connect-immediately="true"
                data-modal-width="<?php echo esc_attr($atts['modal_width']); ?>"
                data-modal-height="<?php echo esc_attr($atts['modal_height']); ?>"
                data-modal-max-width="<?php echo esc_attr($atts['modal_max_width']); ?>"
                data-modal-max-height="<?php echo esc_attr($atts['modal_max_height']); ?>"
                data-modal-overlay-color="<?php echo esc_attr($atts['modal_overlay_color']); ?>"
                data-call-button-position="<?php echo esc_attr($atts['call_button_position']); ?>"
                data-config-voice="<?php echo esc_attr($atts['voice']); ?>"
                data-config-prompt="<?php echo esc_attr($atts['prompt']); ?>"
                data-config-tools="<?php echo esc_attr($atts['tools']); ?>">
            <?php if ($show_icon): ?>
                <svg class="navtalk-btn-icon" width="20" height="20" viewBox="0 0 22 22" fill="currentColor">
                    <path d="M20.0001 15.58C17.0001 13.176 16.1281 14.378 14.8186 15.689C13.8371 16.672 11.4371 14.651 9.41862 12.575C7.34612 10.4995 5.32862 8.04101 6.31012 7.16701C7.67362 5.80201 8.81912 4.98201 6.41912 1.97751C4.01912 -1.02649 2.38262 1.26751 1.07412 2.57851C-0.453385 4.10851 0.964616 9.78901 6.58262 15.4155C12.2006 20.9875 17.8731 22.4625 19.4006 20.933C20.7096 19.622 23.0551 17.983 20.0006 15.5795L20.0001 15.58Z" />
                </svg>
            <?php endif; ?>
            <span><?php echo $button_text; ?></span>
        </button>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Render floating button - Fixed position button at bottom right
     * 
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render_floating($atts) {
        $atts = shortcode_atts([
            'name' => '',
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
            'prompt' => '',
            'tools' => '',
            // Custom CSS class
            'class' => '',
        ], $atts, 'navtalk_floating');
        
        if (empty($atts['name'])) {
            return $this->render_error('Avatar name is required. Usage: [navtalk_floating name="navtalk.Ethan"]');
        }
        
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return '';
        }
        
        // Get avatar info
        $api = new NavTalk_API();
        $avatar_info = $api->get_avatar_info($atts['name']);
        
        if (isset($avatar_info['error']) && $avatar_info['error']) {
            return '';
        }
        
        $avatar_name = esc_attr($avatar_info['name']);
        // 向后兼容：优先使用 thumbnailUrl，如果不存在则使用 url
        $thumbnail_url = isset($avatar_info['thumbnailUrl']) ? $avatar_info['thumbnailUrl'] : ($avatar_info['url'] ?? '');
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
        <div class="navtalk-floating-button <?php echo $position_class; ?> <?php echo esc_attr($atts['class']); ?>" 
             style="width: <?php echo $size; ?>; height: <?php echo $size; ?>;">
            <button class="navtalk-trigger-button navtalk-floating-btn" 
                    data-avatar-name="<?php echo $avatar_name; ?>"
                    data-avatar-img="<?php echo $image_url; ?>"
                    data-connect-immediately="true"
                    data-modal-width="<?php echo esc_attr($atts['modal_width']); ?>"
                    data-modal-height="<?php echo esc_attr($atts['modal_height']); ?>"
                    data-modal-max-width="<?php echo esc_attr($atts['modal_max_width']); ?>"
                    data-modal-max-height="<?php echo esc_attr($atts['modal_max_height']); ?>"
                    data-modal-overlay-color="<?php echo esc_attr($atts['modal_overlay_color']); ?>"
                    data-call-button-position="<?php echo esc_attr($atts['call_button_position']); ?>"
                    data-config-voice="<?php echo esc_attr($atts['voice']); ?>"
                    data-config-prompt="<?php echo esc_attr($atts['prompt']); ?>"
                    data-config-tools="<?php echo esc_attr($atts['tools']); ?>"
                    style="background: <?php echo $color; ?>;">
                <svg width="24" height="24" viewBox="0 0 22 22" fill="#fff">
                    <path d="M20.0001 15.58C17.0001 13.176 16.1281 14.378 14.8186 15.689C13.8371 16.672 11.4371 14.651 9.41862 12.575C7.34612 10.4995 5.32862 8.04101 6.31012 7.16701C7.67362 5.80201 8.81912 4.98201 6.41912 1.97751C4.01912 -1.02649 2.38262 1.26751 1.07412 2.57851C-0.453385 4.10851 0.964616 9.78901 6.58262 15.4155C12.2006 20.9875 17.8731 22.4625 19.4006 20.933C20.7096 19.622 23.0551 17.983 20.0006 15.5795L20.0001 15.58Z" />
                </svg>
            </button>
        </div>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Render link shortcode - Text link that opens chat
     * 
     * @param array $atts Shortcode attributes
     * @param string $content Link text content
     * @return string HTML output
     */
    public function render_link($atts, $content = null) {
        $atts = shortcode_atts([
            'name' => '',
            'style' => 'default', // default, button, underline
            'modal_width' => NavTalk_Config::DEFAULT_MODAL_WIDTH,
            'modal_height' => NavTalk_Config::DEFAULT_MODAL_HEIGHT,
            'modal_max_width' => NavTalk_Config::DEFAULT_MODAL_MAX_WIDTH,
            'modal_max_height' => NavTalk_Config::DEFAULT_MODAL_MAX_HEIGHT,
            'modal_overlay_color' => NavTalk_Config::DEFAULT_MODAL_OVERLAY_COLOR,
            'call_button_position' => NavTalk_Config::DEFAULT_CALL_BUTTON_POSITION,
            // Session configuration parameters
            'voice' => '',
            'prompt' => '',
            'tools' => '',
            // Custom CSS class
            'class' => '',
        ], $atts, 'navtalk_link');
        
        if (empty($atts['name'])) {
            return $this->render_error('Avatar name is required.');
        }
        
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return $content;
        }
        
        // Get avatar info
        $api = new NavTalk_API();
        $avatar_info = $api->get_avatar_info($atts['name']);
        
        if (isset($avatar_info['error']) && $avatar_info['error']) {
            return $content;
        }
        
        $avatar_name = esc_attr($avatar_info['name']);
        $thumbnail_url = isset($avatar_info['thumbnailUrl']) ? $avatar_info['thumbnailUrl'] : ($avatar_info['url'] ?? '');
        $image_url = esc_url($api->get_full_image_url($thumbnail_url));
        $link_text = !empty($content) ? do_shortcode($content) : 'Start Chat';
        $style_class = 'navtalk-link-' . esc_attr($atts['style']);
        
        $status = isset($avatar_info['status']) ? $avatar_info['status'] : 'Unknown';
        $is_available = (strtoupper($status) === 'SUCCESS');
        
        if (!$is_available) {
            return '<span class="navtalk-link-disabled">' . $link_text . ' (Unavailable)</span>';
        }
        
        ob_start();
        ?>
        <a href="#" 
           class="navtalk-trigger-link <?php echo $style_class; ?> <?php echo esc_attr($atts['class']); ?>" 
           data-avatar-name="<?php echo $avatar_name; ?>"
           data-avatar-img="<?php echo $image_url; ?>"
           data-connect-immediately="true"
           data-modal-width="<?php echo esc_attr($atts['modal_width']); ?>"
           data-modal-height="<?php echo esc_attr($atts['modal_height']); ?>"
           data-modal-max-width="<?php echo esc_attr($atts['modal_max_width']); ?>"
           data-modal-max-height="<?php echo esc_attr($atts['modal_max_height']); ?>"
           data-modal-overlay-color="<?php echo esc_attr($atts['modal_overlay_color']); ?>"
           data-call-button-position="<?php echo esc_attr($atts['call_button_position']); ?>"
           data-config-voice="<?php echo esc_attr($atts['voice']); ?>"
           data-config-prompt="<?php echo esc_attr($atts['prompt']); ?>"
           data-config-tools="<?php echo esc_attr($atts['tools']); ?>">
            <?php echo $link_text; ?>
        </a>
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
            'names' => '', // comma-separated avatar names
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
            'prompt' => '',
            'tools' => '',
            // Custom CSS class
            'class' => '',
        ], $atts, 'navtalk_list');
        
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return $this->render_error('NavTalk license key is not configured.');
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
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (!isset($body['code']) || $body['code'] !== 200 || empty($body['data'])) {
            return $this->render_error('No avatars found in your account.');
        }
        
        $avatars = $body['data'];
        
        // Filter avatars based on parameters
        if ($atts['filter'] === 'available') {
            $avatars = array_filter($avatars, function($avatar) {
                return isset($avatar['status']) && $avatar['status'] === 'SUCCESS';
            });
        } elseif ($atts['filter'] === 'custom' && !empty($atts['names'])) {
            $custom_names = array_map('trim', explode(',', $atts['names']));
            $avatars = array_filter($avatars, function($avatar) use ($custom_names) {
                return in_array($avatar['name'], $custom_names);
            });
        }
        
        // Limit number of avatars
        $limit = intval($atts['limit']);
        if ($limit > 0) {
            $avatars = array_slice($avatars, 0, $limit);
        }
        
        if (empty($avatars)) {
            return '<p>No avatars available.</p>';
        }
        
        $columns = intval($atts['columns']);
        $style_class = 'navtalk-list-' . esc_attr($atts['style']);
        $layout = $atts['layout'];
        
        ob_start();
        ?>
        <div class="navtalk-avatar-list <?php echo $style_class; ?> <?php echo esc_attr($atts['class']); ?>" data-columns="<?php echo $columns; ?>">
            <?php foreach ($avatars as $avatar): ?>
                <?php
                // Use the layout rendering methods for each avatar in the list
                if ($layout === 'overlay') {
                    echo $this->render_overlay_layout($avatar, $atts);
                } else {
                    echo $this->render_bottom_layout($avatar, $atts);
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
        // If custom icon URL provided
        if (!empty($custom_icon) && filter_var($custom_icon, FILTER_VALIDATE_URL)) {
            return '<img class="navtalk-phone-icon" src="' . esc_url($custom_icon) . '" alt="" width="20" height="20" aria-hidden="true">';
        }
        
        // Default: inline SVG (WordPress should allow this in content context)
        return '<svg class="navtalk-phone-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="20" height="20" fill="currentColor" aria-hidden="true">
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
        $avatar_name = esc_attr($avatar_info['name']);
        $display_name = esc_html($this->get_display_name($avatar_name));
        
        $api = new NavTalk_API();
        $thumbnail_url = isset($avatar_info['thumbnailUrl']) ? $avatar_info['thumbnailUrl'] : ($avatar_info['url'] ?? '');
        $image_url = $api->get_full_image_url($thumbnail_url);
        $image_url_escaped = esc_url($image_url);
        
        // Check for video URL
        $has_video =  (bool)($avatar_info['videoFile'] ?? false);
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
        $title_tag = esc_attr($atts['title_tag']);
        $download_url = !empty($atts['download_url']) ? esc_url($atts['download_url']) : $image_url;
        $inline_mode = ($atts['inline_mode'] === 'true');
        
        $width = esc_attr($atts['width'] ?? NavTalk_Config::DEFAULT_WIDTH);
        
        // Generate unique ID for this avatar instance
        $unique_id = 'navtalk-' . uniqid();
        
        ob_start();
        ?>
        <div class="navtalk-avatar-container navtalk-layout-overlay <?php echo $inline_mode ? 'navtalk-inline-mode' : ''; ?> <?php echo esc_attr($atts['class']); ?>" id="<?php echo $unique_id; ?>">
            <div class="navtalk-avatar-card">
                <!-- Avatar Image/Video -->
                <div class="navtalk-avatar-image">
                    <?php if ($has_video): ?>
                        <!-- Avatar has video: render video element -->
                        <video class="navtalk-avatar-preview-video"
                               src="<?php echo esc_url($video_url); ?>"
                               poster="<?php echo $image_url_escaped; ?>"
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
                             src="<?php echo $image_url_escaped; ?>" 
                             alt="<?php echo $display_name; ?>">
                    <?php else: ?>
                        <div class="navtalk-avatar-placeholder">
                            <span>🎭</span>
                            <p><?php echo $display_name; ?></p>
                        </div>
                    <?php endif; ?>
                    
                    
                    <?php if ($inline_mode): ?>
                        <!-- Inline realtime call video element (hidden by default) -->
                        <video class="navtalk-avatar-inline-video"
                               poster="<?php echo $image_url_escaped; ?>"
                               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: none;"></video>
                    <?php endif; ?>
                    
                    <!-- Status Badge (corner) -->
                    <?php if ($show_status && $status_position === 'corner'): ?>
                        <span class="navtalk-status-badge <?php echo $is_available ? 'status-available' : 'status-unavailable'; ?>"></span>
                    <?php endif; ?>
                </div>
                
                <!-- Overlay Info -->
                <div class="navtalk-avatar-overlay">
                    <?php if ($show_title): ?>
                        <<?php echo $title_tag; ?> class="navtalk-avatar-title"><?php echo $display_name; ?></<?php echo $title_tag; ?>>
                    <?php endif; ?>
                    
                    <!-- Button Group -->
                    <div class="navtalk-button-group">
                        <?php if ($show_call_button): ?>
                            <button class="navtalk-icon-button navtalk-call-btn <?php echo $inline_mode ? 'navtalk-inline-call' : 'navtalk-start-chat'; ?>"
                                    data-avatar-name="<?php echo $avatar_name; ?>"
                                    data-avatar-img="<?php echo $image_url_escaped; ?>"
                                    data-inline-mode="<?php echo $inline_mode ? 'true' : 'false'; ?>"
                                    data-container-id="<?php echo $unique_id; ?>"
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
                                    data-config-voice="<?php echo esc_attr($atts['voice']); ?>"
                                    data-config-prompt="<?php echo esc_attr($atts['prompt']); ?>"
                                    data-config-tools="<?php echo esc_attr($atts['tools']); ?>"
                                    <?php endif; ?>>
                                <?php echo $this->get_phone_icon($atts['call_icon'] ?? ''); ?>
                            </button>
                        <?php endif; ?>
                        
                        <?php if ($show_download_button): ?>
                            <a class="navtalk-icon-button navtalk-download-btn" 
                               href="<?php echo $download_url; ?>" 
                               download>
                                <?php echo $this->get_download_icon($atts['download_icon'] ?? ''); ?>
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
     * Render bottom layout for avatar card
     * 
     * @param array $avatar_info Avatar data
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    private function render_bottom_layout($avatar_info, $atts) {
        $avatar_name = esc_attr($avatar_info['name']);
        $display_name = esc_html($this->get_display_name($avatar_name));
        
        $api = new NavTalk_API();
        $thumbnail_url = isset($avatar_info['thumbnailUrl']) ? $avatar_info['thumbnailUrl'] : ($avatar_info['url'] ?? '');
        $image_url = $api->get_full_image_url($thumbnail_url);
        $image_url_escaped = esc_url($image_url);
        
        // Check for video URL
        $has_video =  (bool)($avatar_info['videoFile'] ?? false);
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
        $title_tag = esc_attr($atts['title_tag']);
        $download_url = !empty($atts['download_url']) ? esc_url($atts['download_url']) : $image_url;
        $inline_mode = ($atts['inline_mode'] === 'true');
        
        $width = esc_attr($atts['width'] ?? NavTalk_Config::DEFAULT_WIDTH);
        
        // Generate unique ID for this avatar instance
        $unique_id = 'navtalk-' . uniqid();
        
        ob_start();
        ?>
        <div class="navtalk-avatar-container navtalk-layout-bottom <?php echo $inline_mode ? 'navtalk-inline-mode' : ''; ?> <?php echo esc_attr($atts['class']); ?>" id="<?php echo $unique_id; ?>">
            <div class="navtalk-avatar-card">
                <!-- Avatar Image/Video -->
                <div class="navtalk-avatar-image">
                    <?php if ($has_video): ?>
                        <!-- Avatar has video: render video element -->
                        <video class="navtalk-avatar-preview-video"
                               src="<?php echo esc_url($video_url); ?>"
                               poster="<?php echo $image_url_escaped; ?>"
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
                             src="<?php echo $image_url_escaped; ?>" 
                             alt="<?php echo $display_name; ?>">
                    <?php else: ?>
                        <div class="navtalk-avatar-placeholder">
                            <span>🎭</span>
                            <p><?php echo $display_name; ?></p>
                        </div>
                    <?php endif; ?>
                    
                    <?php if ($inline_mode): ?>
                        <!-- Inline realtime call video element (hidden by default) -->
                        <video class="navtalk-avatar-inline-video"
                               poster="<?php echo $image_url_escaped; ?>"
                               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: none;"></video>
                    <?php endif; ?>
                    
                    <!-- Status Badge (corner) -->
                    <?php if ($show_status && $status_position === 'corner'): ?>
                        <span class="navtalk-status-badge <?php echo $is_available ? 'status-available' : 'status-unavailable'; ?>"></span>
                    <?php endif; ?>
                </div>
                
                <!-- Info Section (below image) -->
                <div class="navtalk-avatar-info">
                    <?php if ($show_title): ?>
                        <<?php echo $title_tag; ?> class="navtalk-avatar-title"><?php echo $display_name; ?></<?php echo $title_tag; ?>>
                    <?php endif; ?>
                    
                    <?php if ($show_status && $status_position === 'info'): ?>
                        <p class="navtalk-avatar-status <?php echo $is_available ? 'status-available' : 'status-unavailable'; ?>">
                            <span class="status-indicator"></span>
                            <?php echo $is_available ? 'Available' : 'Unavailable'; ?>
                        </p>
                    <?php endif; ?>
                    
                    <!-- Button Group -->
                    <div class="navtalk-button-group">
                        <?php if ($show_call_button): ?>
                            <button class="navtalk-icon-button navtalk-call-btn <?php echo $inline_mode ? 'navtalk-inline-call' : 'navtalk-start-chat'; ?>"
                                    data-avatar-name="<?php echo $avatar_name; ?>"
                                    data-avatar-img="<?php echo $image_url_escaped; ?>"
                                    data-inline-mode="<?php echo $inline_mode ? 'true' : 'false'; ?>"
                                    data-container-id="<?php echo $unique_id; ?>"
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
                                    data-config-voice="<?php echo esc_attr($atts['voice']); ?>"
                                    data-config-prompt="<?php echo esc_attr($atts['prompt']); ?>"
                                    data-config-tools="<?php echo esc_attr($atts['tools']); ?>"
                                    <?php endif; ?>>
                                <?php echo $this->get_phone_icon($atts['call_icon'] ?? ''); ?>
                            </button>
                        <?php endif; ?>
                        
                        <?php if ($show_download_button): ?>
                            <a class="navtalk-icon-button navtalk-download-btn" 
                               href="<?php echo $download_url; ?>" 
                               download>
                                <?php echo $this->get_download_icon($atts['download_icon'] ?? ''); ?>
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
