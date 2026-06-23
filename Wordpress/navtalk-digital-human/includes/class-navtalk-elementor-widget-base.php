<?php
/**
 * NavTalk Elementor Widget Base Class
 * 
 * Provides shared functionality for all NavTalk Elementor widgets
 */

if (!defined('ABSPATH')) {
    exit;
}

abstract class NavTalk_Elementor_Widget_Base extends \Elementor\Widget_Base {
    
    /**
     * Get widget categories
     * 
     * @return array
     */
    public function get_categories() {
        return ['navtalk'];
    }
    
    /**
     * Get available avatars as options array
     * 
     * @return array
     */
    protected function get_avatar_options() {
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return ['_error' => __('License not configured', 'navtalk-digital-human')];
        }
        
        $api = new NavTalk_API();
        $url = NavTalk_Config::get_api_endpoint('/api/open/v1/avatar/list');
        
        $response = wp_remote_get($url, [
            'headers' => ['license' => $license],
            'timeout' => 15
        ]);
        
        if (is_wp_error($response)) {
            return ['_error' => __('Failed to fetch avatars', 'navtalk-digital-human')];
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!isset($data['data']) || empty($data['data'])) {
            return ['_error' => __('No avatars found', 'navtalk-digital-human')];
        }
        
        $options = [];
        foreach ($data['data'] as $avatar) {
            $avatar_id = isset($avatar['avatarId']) ? $avatar['avatarId'] : (isset($avatar['id']) ? $avatar['id'] : '');
            $name = isset($avatar['name']) ? $avatar['name'] : '';
            if ('' === (string) $avatar_id) {
                continue;
            }
            $display_name = $this->get_display_name($name);
            $options[(string) $avatar_id] = $display_name;
        }

        return $options;
    }
    
    /**
     * Get avatar information
     *
     * @param string|int $avatar_id Avatar ID (avatarId or id from API)
     * @return array|null
     */
    protected function get_avatar_info($avatar_id) {
        if ('' === (string) $avatar_id) {
            return null;
        }

        $api = new NavTalk_API();
        $avatar_info = $api->get_avatar_info($avatar_id);

        if (isset($avatar_info['error']) && $avatar_info['error']) {
            return null;
        }

        return $avatar_info;
    }
    
    /**
     * Get display name from full avatar name
     * 
     * @param string $name
     * @return string
     */
    protected function get_display_name($name) {
        $parts = explode('.', $name);
        return isset($parts[1]) ? $parts[1] : $name;
    }
    
    /**
     * Add modal configuration controls
     * 
     * @param string $section_id Section ID for controls
     */
    protected function add_modal_controls($section_id = 'modal_settings') {
        $this->start_controls_section(
            $section_id,
            [
                'label' => __('Modal Settings', 'navtalk-digital-human'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'modal_width',
            [
                'label' => __('Modal Width', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => NavTalk_Config::DEFAULT_MODAL_WIDTH,
                'description' => __('e.g., 80vw, 600px', 'navtalk-digital-human'),
            ]
        );
        
        $this->add_control(
            'modal_height',
            [
                'label' => __('Modal Height', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => NavTalk_Config::DEFAULT_MODAL_HEIGHT,
                'description' => __('e.g., 80vh, 800px', 'navtalk-digital-human'),
            ]
        );
        
        $this->add_control(
            'modal_max_width',
            [
                'label' => __('Modal Max Width', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => NavTalk_Config::DEFAULT_MODAL_MAX_WIDTH,
                'description' => __('e.g., 1400px, 90vw', 'navtalk-digital-human'),
            ]
        );
        
        $this->add_control(
            'modal_max_height',
            [
                'label' => __('Modal Max Height', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => NavTalk_Config::DEFAULT_MODAL_MAX_HEIGHT,
                'description' => __('e.g., 900px, 90vh', 'navtalk-digital-human'),
            ]
        );
        
        $this->add_control(
            'modal_overlay_color',
            [
                'label' => __('Modal Overlay Color', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => NavTalk_Config::DEFAULT_MODAL_OVERLAY_COLOR,
            ]
        );

        $this->add_control(
            'title_tag',
            [
                'label' => __('Title HTML Tag', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'h1' => 'H1',
                    'h2' => 'H2',
                    'h3' => 'H3',
                    'h4' => 'H4',
                    'h5' => 'H5',
                    'h6' => 'H6',
                    'div' => 'div',
                    'span' => 'span',
                    'p' => 'p',
                ],
                'default' => 'h6',
            ]
        );

        $this->add_control(
            'download_url',
            [
                'label' => __('Global Download URL', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Leave empty to use individual avatar download links.', 'navtalk-digital-human'),
                'label_block' => true,
            ]
        );
        
        $this->add_control(
            'call_button_position',
            [
                'label' => __('Call Button Position', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'center-bottom' => __('Center Bottom', 'navtalk-digital-human'),
                    'bottom-left' => __('Bottom Left', 'navtalk-digital-human'),
                    'bottom-right' => __('Bottom Right', 'navtalk-digital-human'),
                ],
                'default' => NavTalk_Config::DEFAULT_CALL_BUTTON_POSITION,
            ]
        );
        
        $this->end_controls_section();
    }
    
    /**
     * Add icon configuration controls
     * 
     * @param string $section_id Section ID for controls
     */
    protected function add_icon_controls($section_id = 'icon_settings') {
        $this->start_controls_section(
            $section_id,
            [
                'label' => __('Button Icons', 'navtalk-digital-human'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'call_icon',
            [
                'label' => __('Call Button Icon URL', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Leave empty to use the default phone icon. Enter a full URL to a custom icon image.', 'navtalk-digital-human'),
                'label_block' => true,
            ]
        );
        
        $this->add_control(
            'download_icon',
            [
                'label' => __('Download Button Icon URL', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Leave empty to use the default download icon. Enter a full URL to a custom icon image.', 'navtalk-digital-human'),
                'label_block' => true,
            ]
        );
        
        $this->end_controls_section();
    }
    
    /**
     * Add call button appearance controls
     * 
     * @param string $section_id Section ID for controls
     */
    protected function add_call_button_controls($section_id = 'call_button_settings') {
        $this->start_controls_section(
            $section_id,
            [
                'label' => __('Call Button Appearance', 'navtalk-digital-human'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'button_preset',
            [
                'label' => __('Button Preset', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'default' => __('Default (Transparent)', 'navtalk-digital-human'),
                    'gradient' => __('Gradient (Purple)', 'navtalk-digital-human'),
                    'solid' => __('Solid Color', 'navtalk-digital-human'),
                    'outline' => __('Outline', 'navtalk-digital-human'),
                ],
                'default' => 'default',
            ]
        );
        
        $this->add_control(
            'button_bg_color',
            [
                'label' => __('Background Color', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '',
                'condition' => [
                    'button_preset' => ['solid', 'outline'],
                ],
            ]
        );
        
        $this->add_control(
            'button_text_color',
            [
                'label' => __('Icon/Text Color', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '',
            ]
        );
        
        $this->add_control(
            'button_size',
            [
                'label' => __('Button Size (px)', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 36,
                'min' => 20,
                'max' => 100,
            ]
        );
        
        $this->add_control(
            'button_border_width',
            [
                'label' => __('Border Width (px)', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 0,
                'min' => 0,
                'max' => 10,
            ]
        );
        
        $this->add_control(
            'button_border_color',
            [
                'label' => __('Border Color', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '',
                'condition' => [
                    'button_border_width!' => 0,
                ],
            ]
        );
        
        $this->add_control(
            'button_shadow',
            [
                'label' => __('Box Shadow', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'none' => __('None', 'navtalk-digital-human'),
                    'soft' => __('Soft', 'navtalk-digital-human'),
                    'medium' => __('Medium', 'navtalk-digital-human'),
                ],
                'default' => 'none',
            ]
        );
        
        $this->add_control(
            'button_hover_bg',
            [
                'label' => __('Hover Background Color', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '',
            ]
        );
        
        $this->add_control(
            'button_animation',
            [
                'label' => __('Animation Effect', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'none' => __('None', 'navtalk-digital-human'),
                    'pulse' => __('Pulse', 'navtalk-digital-human'),
                    'bounce' => __('Bounce', 'navtalk-digital-human'),
                ],
                'default' => 'none',
            ]
        );
        
        $this->end_controls_section();
    }
    
    /**
     * Generate CSS string from controlled button appearance settings.
     * 
     * @param array $settings Elementor settings
     * @return string CSS string
     */
    protected function generate_call_button_css($settings) {
        $css_parts = [];
        $preset = isset($settings['button_preset']) ? sanitize_key($settings['button_preset']) : 'default';
        
        // Apply preset styles first
        switch ($preset) {
            case 'gradient':
                $css_parts[] = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                $css_parts[] = 'color: #fff';
                break;
            case 'solid':
                $bg_color = !empty($settings['button_bg_color']) ? sanitize_hex_color($settings['button_bg_color']) : '';
                if ($bg_color) {
                    $css_parts[] = 'background: ' . $bg_color;
                }
                break;
            case 'outline':
                $css_parts[] = 'background: transparent';
                $bg_color = !empty($settings['button_bg_color']) ? sanitize_hex_color($settings['button_bg_color']) : '';
                if ($bg_color) {
                    $css_parts[] = 'border: 2px solid ' . $bg_color;
                }
                break;
            case 'default':
            default:
                break;
        }
        
        // Override with custom colors
        if (!empty($settings['button_text_color'])) {
            $text_color = sanitize_hex_color($settings['button_text_color']);
            if ($text_color) {
                $css_parts[] = 'color: ' . $text_color;
            }
        }
        
        // Size
        if (!empty($settings['button_size'])) {
            $size = max(20, min(100, absint($settings['button_size'])));
            $css_parts[] = "min-width: {$size}px";
            $css_parts[] = "min-height: {$size}px";
            $css_parts[] = "width: {$size}px";
            $css_parts[] = "height: {$size}px";
        }
        
        // Border
        if (!empty($settings['button_border_width']) && $settings['button_border_width'] > 0) {
            $width = max(0, min(10, absint($settings['button_border_width'])));
            $color = !empty($settings['button_border_color']) ? sanitize_hex_color($settings['button_border_color']) : '#cccccc';
            $color = $color ?: '#cccccc';
            $css_parts[] = "border: {$width}px solid {$color}";
        }
        
        // Shadow
        $shadow = isset($settings['button_shadow']) ? sanitize_key($settings['button_shadow']) : 'none';
        $shadow_presets = [
            'soft' => '0 4px 8px rgba(0,0,0,0.18)',
            'medium' => '0 8px 16px rgba(0,0,0,0.22)',
        ];
        if (isset($shadow_presets[$shadow])) {
            $css_parts[] = 'box-shadow: ' . $shadow_presets[$shadow];
        }
        
        // Animation
        if (!empty($settings['button_animation']) && $settings['button_animation'] !== 'none') {
            $animation = sanitize_key($settings['button_animation']);
            if (in_array($animation, ['pulse', 'bounce'], true)) {
                $css_parts[] = "animation: navtalk-{$animation} 2s infinite";
            }
        }
        
        return implode('; ', $css_parts);
    }
    
    /**
     * Render error message
     * 
     * @param string $message
     */
    protected function render_error($message) {
        ?>
        <div class="navtalk-error" style="padding: 15px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c33; margin: 10px 0;">
            <strong><?php echo esc_html(__('Error:', 'navtalk-digital-human')); ?></strong> <?php echo esc_html($message); ?>
        </div>
        <?php
    }
    
    /**
     * Render avatar card using shortcode class
     * 
     * @param array $avatar_info
     * @param array $settings
     */
    protected function render_avatar_card($avatar_info, $settings) {
        // Create NavTalk_Shortcode instance
        $shortcode = new NavTalk_Shortcode();
        
        $call_button_css = $this->generate_call_button_css($settings);
        
        $avatar_id_value = isset($avatar_info['avatarId']) ? $avatar_info['avatarId'] : (isset($avatar_info['id']) ? $avatar_info['id'] : '');

        // Convert Elementor settings to shortcode attributes format
        $atts = [
            'avatarId' => $avatar_id_value,
            'layout' => isset($settings['layout']) ? $settings['layout'] : 'bottom',
            'show_title' => (isset($settings['show_title']) && $settings['show_title']) ? 'true' : 'false',
            'show_status' => (isset($settings['show_status']) && $settings['show_status']) ? 'true' : 'false',
            'status_position' => isset($settings['status_position']) ? $settings['status_position'] : 'corner',
            'show_call_button' => (isset($settings['show_call_button']) && $settings['show_call_button']) ? 'true' : 'false',
            'show_download_button' => (isset($settings['show_download_button']) && $settings['show_download_button']) ? 'true' : 'false',
            'download_url' => isset($settings['download_url']) ? $settings['download_url'] : '',
            'title_tag' => isset($settings['title_tag']) ? $settings['title_tag'] : 'h6',
            'call_icon' => isset($settings['call_icon']) ? $settings['call_icon'] : '',
            'download_icon' => isset($settings['download_icon']) ? $settings['download_icon'] : '',
            'inline_mode' => (isset($settings['inline_mode']) && $settings['inline_mode']) ? 'true' : 'false',
            'call_button_css' => $call_button_css,
            'modal_width' => isset($settings['modal_width']) ? $settings['modal_width'] : NavTalk_Config::DEFAULT_MODAL_WIDTH,
            'modal_height' => isset($settings['modal_height']) ? $settings['modal_height'] : NavTalk_Config::DEFAULT_MODAL_HEIGHT,
            'modal_max_width' => isset($settings['modal_max_width']) ? $settings['modal_max_width'] : NavTalk_Config::DEFAULT_MODAL_MAX_WIDTH,
            'modal_max_height' => isset($settings['modal_max_height']) ? $settings['modal_max_height'] : NavTalk_Config::DEFAULT_MODAL_MAX_HEIGHT,
            'modal_overlay_color' => isset($settings['modal_overlay_color']) ? $settings['modal_overlay_color'] : NavTalk_Config::DEFAULT_MODAL_OVERLAY_COLOR,
            'call_button_position' => isset($settings['call_button_position']) ? $settings['call_button_position'] : NavTalk_Config::DEFAULT_CALL_BUTTON_POSITION,
            'voice' => isset($settings['config_voice']) ? $settings['config_voice'] : '',
            'tools' => isset($settings['config_tools']) ? $settings['config_tools'] : '',
            'call_start_audio' => isset($settings['call_start_audio']) ? $settings['call_start_audio'] : '',
            'call_end_audio' => isset($settings['call_end_audio']) ? $settings['call_end_audio'] : '',
            'class' => isset($settings['_css_classes']) ? $settings['_css_classes'] : '',
        ];
        
        // Use reflection to call private method
        $reflection = new ReflectionClass($shortcode);
        $method = $reflection->getMethod('render_avatar_card');
        $method->setAccessible(true);
        
        // Late escaping: render_avatar_card() builds HTML with esc_attr/esc_url/esc_html
        // inside; wp_kses() at the echo site enforces a strict tag/attribute whitelist.
        echo wp_kses(
            (string) $method->invoke($shortcode, $avatar_info, $atts),
            NavTalk_Shortcode::allowed_avatar_card_html()
        );
    }
}
