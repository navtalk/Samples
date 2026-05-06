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
            return ['_error' => __('License not configured', 'digital-human-for-navtalk')];
        }
        
        $api = new NavTalk_API();
        $url = NavTalk_Config::get_api_endpoint('/api/open/v1/avatar/list');
        
        $response = wp_remote_get($url, [
            'headers' => ['license' => $license],
            'timeout' => 15
        ]);
        
        if (is_wp_error($response)) {
            return ['_error' => __('Failed to fetch avatars', 'digital-human-for-navtalk')];
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!isset($data['data']) || empty($data['data'])) {
            return ['_error' => __('No avatars found', 'digital-human-for-navtalk')];
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
                'label' => __('Modal Settings', 'digital-human-for-navtalk'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'modal_width',
            [
                'label' => __('Modal Width', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => NavTalk_Config::DEFAULT_MODAL_WIDTH,
                'description' => __('e.g., 80vw, 600px', 'digital-human-for-navtalk'),
            ]
        );
        
        $this->add_control(
            'modal_height',
            [
                'label' => __('Modal Height', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => NavTalk_Config::DEFAULT_MODAL_HEIGHT,
                'description' => __('e.g., 80vh, 800px', 'digital-human-for-navtalk'),
            ]
        );
        
        $this->add_control(
            'modal_max_width',
            [
                'label' => __('Modal Max Width', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => NavTalk_Config::DEFAULT_MODAL_MAX_WIDTH,
                'description' => __('e.g., 1400px, 90vw', 'digital-human-for-navtalk'),
            ]
        );
        
        $this->add_control(
            'modal_max_height',
            [
                'label' => __('Modal Max Height', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => NavTalk_Config::DEFAULT_MODAL_MAX_HEIGHT,
                'description' => __('e.g., 900px, 90vh', 'digital-human-for-navtalk'),
            ]
        );
        
        $this->add_control(
            'modal_overlay_color',
            [
                'label' => __('Modal Overlay Color', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => NavTalk_Config::DEFAULT_MODAL_OVERLAY_COLOR,
            ]
        );

        $this->add_control(
            'title_tag',
            [
                'label' => __('Title HTML Tag', 'digital-human-for-navtalk'),
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
                'label' => __('Global Download URL', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Leave empty to use individual avatar download links.', 'digital-human-for-navtalk'),
                'label_block' => true,
            ]
        );
        
        $this->add_control(
            'call_button_position',
            [
                'label' => __('Call Button Position', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'center-bottom' => __('Center Bottom', 'digital-human-for-navtalk'),
                    'bottom-left' => __('Bottom Left', 'digital-human-for-navtalk'),
                    'bottom-right' => __('Bottom Right', 'digital-human-for-navtalk'),
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
                'label' => __('Button Icons', 'digital-human-for-navtalk'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'call_icon',
            [
                'label' => __('Call Button Icon URL', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Leave empty to use default phone icon. Enter full URL to custom SVG/PNG image.', 'digital-human-for-navtalk'),
                'label_block' => true,
            ]
        );
        
        $this->add_control(
            'download_icon',
            [
                'label' => __('Download Button Icon URL', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Leave empty to use default download icon. Enter full URL to custom SVG/PNG image.', 'digital-human-for-navtalk'),
                'label_block' => true,
            ]
        );
        
        $this->end_controls_section();
    }
    
    /**
     * Add button style configuration controls
     * 
     * @param string $section_id Section ID for controls
     */
    protected function add_button_style_controls($section_id = 'button_style_settings') {
        $this->start_controls_section(
            $section_id,
            [
                'label' => __('Call Button Style', 'digital-human-for-navtalk'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'button_preset',
            [
                'label' => __('Button Style Preset', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'default' => __('Default (Transparent)', 'digital-human-for-navtalk'),
                    'gradient' => __('Gradient (Purple)', 'digital-human-for-navtalk'),
                    'solid' => __('Solid Color', 'digital-human-for-navtalk'),
                    'outline' => __('Outline', 'digital-human-for-navtalk'),
                ],
                'default' => 'default',
            ]
        );
        
        $this->add_control(
            'button_bg_color',
            [
                'label' => __('Background Color', 'digital-human-for-navtalk'),
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
                'label' => __('Icon/Text Color', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '',
            ]
        );
        
        $this->add_control(
            'button_size',
            [
                'label' => __('Button Size (px)', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 36,
                'min' => 20,
                'max' => 100,
            ]
        );
        
        $this->add_control(
            'button_border_width',
            [
                'label' => __('Border Width (px)', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 0,
                'min' => 0,
                'max' => 10,
            ]
        );
        
        $this->add_control(
            'button_border_color',
            [
                'label' => __('Border Color', 'digital-human-for-navtalk'),
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
                'label' => __('Box Shadow', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'placeholder' => '0 4px 8px rgba(0,0,0,0.2)',
                'description' => __('CSS box-shadow value', 'digital-human-for-navtalk'),
            ]
        );
        
        $this->add_control(
            'button_hover_bg',
            [
                'label' => __('Hover Background Color', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '',
            ]
        );
        
        $this->add_control(
            'button_animation',
            [
                'label' => __('Animation Effect', 'digital-human-for-navtalk'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'none' => __('None', 'digital-human-for-navtalk'),
                    'pulse' => __('Pulse', 'digital-human-for-navtalk'),
                    'bounce' => __('Bounce', 'digital-human-for-navtalk'),
                ],
                'default' => 'none',
            ]
        );
        
        $this->end_controls_section();
    }
    
    /**
     * Generate CSS string from button style settings
     * 
     * @param array $settings Elementor settings
     * @return string CSS string
     */
    protected function generate_button_style_css($settings) {
        $css_parts = [];
        
        // Apply preset styles first
        if (isset($settings['button_preset'])) {
            switch ($settings['button_preset']) {
                case 'gradient':
                    $css_parts[] = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    $css_parts[] = 'color: #fff';
                    break;
                case 'solid':
                    if (!empty($settings['button_bg_color'])) {
                        $css_parts[] = 'background: ' . $settings['button_bg_color'];
                    }
                    break;
                case 'outline':
                    $css_parts[] = 'background: transparent';
                    if (!empty($settings['button_bg_color'])) {
                        $css_parts[] = 'border: 2px solid ' . $settings['button_bg_color'];
                    }
                    break;
                case 'default':
                default:
                    // Keep default transparent style
                    break;
            }
        }
        
        // Override with custom colors
        if (!empty($settings['button_text_color'])) {
            $css_parts[] = 'color: ' . $settings['button_text_color'];
        }
        
        // Size
        if (!empty($settings['button_size'])) {
            $size = intval($settings['button_size']);
            $css_parts[] = "min-width: {$size}px";
            $css_parts[] = "min-height: {$size}px";
            $css_parts[] = "width: {$size}px";
            $css_parts[] = "height: {$size}px";
        }
        
        // Border
        if (!empty($settings['button_border_width']) && $settings['button_border_width'] > 0) {
            $width = intval($settings['button_border_width']);
            $color = !empty($settings['button_border_color']) ? $settings['button_border_color'] : '#ccc';
            $css_parts[] = "border: {$width}px solid {$color}";
        }
        
        // Shadow
        if (!empty($settings['button_shadow'])) {
            $css_parts[] = 'box-shadow: ' . $settings['button_shadow'];
        }
        
        // Animation
        if (!empty($settings['button_animation']) && $settings['button_animation'] !== 'none') {
            $animation = $settings['button_animation'];
            $css_parts[] = "animation: navtalk-{$animation} 2s infinite";
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
            <strong><?php echo esc_html(__('Error:', 'digital-human-for-navtalk')); ?></strong> <?php echo esc_html($message); ?>
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
        
        // Generate button style CSS from Elementor settings
        $button_style = $this->generate_button_style_css($settings);
        
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
            'button_style' => $button_style,
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
        
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Output is escaped in render_avatar_card method
        echo $method->invoke($shortcode, $avatar_info, $atts);
    }
}
