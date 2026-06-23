<?php
/**
 * NavTalk Single Avatar Widget for Elementor
 * 
 * Displays a single selected avatar
 */

if (!defined('ABSPATH')) {
    exit;
}

class NavTalk_Elementor_Avatar_Single extends NavTalk_Elementor_Widget_Base {
    
    /**
     * Get widget name
     * 
     * @return string
     */
    public function get_name() {
        return 'navtalk-avatar';
    }
    
    /**
     * Get widget title
     * 
     * @return string
     */
    public function get_title() {
        return __('Avatar for NavTalk', 'navtalk-digital-human');
    }
    
    /**
     * Get widget icon
     * 
     * @return string
     */
    public function get_icon() {
        return 'eicon-person';
    }
    
    /**
     * Register widget controls
     */
    protected function register_controls() {
        // Content Section
        $this->start_controls_section(
            'content_section',
            [
                'label' => __('Content', 'navtalk-digital-human'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $avatar_options = $this->get_avatar_options();
        
        if (isset($avatar_options['_error'])) {
            $this->add_control(
                'error_notice',
                [
                    'type' => \Elementor\Controls_Manager::RAW_HTML,
                    'raw' => '<div style="padding: 10px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c33;">' . esc_html($avatar_options['_error']) . '</div>',
                ]
            );
        } else {
            $this->add_control(
                'avatar_id',
                [
                    'label' => __('Select Avatar', 'navtalk-digital-human'),
                    'type' => \Elementor\Controls_Manager::SELECT,
                    'options' => $avatar_options,
                    'default' => !empty($avatar_options) ? key($avatar_options) : '',
                ]
            );
        }
        
        $this->end_controls_section();
        
        // Display Section
        $this->start_controls_section(
            'display_section',
            [
                'label' => __('Display Options', 'navtalk-digital-human'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'layout',
            [
                'label' => __('Layout', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'overlay' => __('Overlay', 'navtalk-digital-human'),
                    'bottom' => __('Bottom', 'navtalk-digital-human'),
                ],
                'default' => 'bottom',
            ]
        );
        
        $this->add_control(
            'show_title',
            [
                'label' => __('Show Title', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'navtalk-digital-human'),
                'label_off' => __('No', 'navtalk-digital-human'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_status',
            [
                'label' => __('Show Status', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'navtalk-digital-human'),
                'label_off' => __('No', 'navtalk-digital-human'),
                'return_value' => 'yes',
                'default' => '',
            ]
        );
        
        $this->add_control(
            'show_call_button',
            [
                'label' => __('Show Call Button', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'navtalk-digital-human'),
                'label_off' => __('No', 'navtalk-digital-human'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_download_button',
            [
                'label' => __('Show Download Button', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'navtalk-digital-human'),
                'label_off' => __('No', 'navtalk-digital-human'),
                'return_value' => 'yes',
                'default' => '',
            ]
        );
        
        $this->add_control(
            'inline_mode',
            [
                'label' => __('Inline Video Mode', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'navtalk-digital-human'),
                'label_off' => __('No', 'navtalk-digital-human'),
                'return_value' => 'yes',
                'default' => 'yes',
                'description' => __('Enable to show video directly in card. Disable to use popup modal.', 'navtalk-digital-human'),
            ]
        );
        
        $this->add_control(
            'status_position',
            [
                'label' => __('Status Position', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'corner' => __('Corner', 'navtalk-digital-human'),
                    'info' => __('Info Section', 'navtalk-digital-human'),
                ],
                'default' => 'corner',
                'condition' => [
                    'show_status' => 'yes',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Add session configuration controls
        $this->start_controls_section(
            'session_config_section',
            [
                'label' => __('Session Configuration', 'navtalk-digital-human'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'config_voice',
            [
                'label' => __('Voice', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Voice configuration for the avatar', 'navtalk-digital-human'),
            ]
        );
        
        $this->add_control(
            'config_tools',
            [
                'label' => __('Tools', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXTAREA,
                'default' => '',
                'description' => __('Tools configuration (JSON array format)', 'navtalk-digital-human'),
                'placeholder' => '[{"name":"weather","type":"function"}]',
            ]
        );
        
        $this->end_controls_section();
        
        // Add audio settings controls
        $this->start_controls_section(
            'audio_settings_section',
            [
                'label' => __('Call Audio Settings', 'navtalk-digital-human'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'call_start_audio',
            [
                'label' => __('Call Start Audio URL', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Custom audio URL for call start (leave empty for default)', 'navtalk-digital-human'),
            ]
        );
        
        $this->add_control(
            'call_end_audio',
            [
                'label' => __('Call End Audio URL', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Custom audio URL for call end (leave empty for default)', 'navtalk-digital-human'),
            ]
        );
        
        $this->end_controls_section();
        
        // Add modal controls
        $this->add_modal_controls();
        
        // Add icon controls
        $this->add_icon_controls();
        
        // Add call button appearance controls
        $this->add_call_button_controls();
    }
    
    /**
     * Render widget output
     */
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        // Check for avatar ID
        if (empty($settings['avatar_id'])) {
            $this->render_error(__('Please select an avatar from the widget settings.', 'navtalk-digital-human'));
            return;
        }

        // Get license
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            $this->render_error(__('NavTalk license key is not configured. Please configure it in Settings > NavTalk Digital Human.', 'navtalk-digital-human'));
            return;
        }

        // Get avatar information
        $avatar_info = $this->get_avatar_info($settings['avatar_id']);

        if (!$avatar_info) {
            /* translators: %s: Avatar ID */
            $this->render_error(sprintf(__('Failed to load avatar: %s', 'navtalk-digital-human'), $settings['avatar_id']));
            return;
        }
        
        // Render avatar card
        $this->render_avatar_card($avatar_info, $settings);
    }
    
    /**
     * Render widget output in the editor
     */
    protected function content_template() {
        ?>
        <#
        if (!settings.avatar_id) {
            #>
            <div class="navtalk-error" style="padding: 15px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c33; margin: 10px 0;">
                <strong><?php echo esc_html(__('Error:', 'navtalk-digital-human')); ?></strong> <?php echo esc_html(__('Please select an avatar', 'navtalk-digital-human')); ?>
            </div>
            <#
        } else {
            #>
            <div class="navtalk-avatar-card" style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px;">
                <p><?php echo esc_html(__('Avatar:', 'navtalk-digital-human')); ?> <strong>{{ settings.avatar_id }}</strong></p>
                <small><?php echo esc_html(__('Preview is not available in editor', 'navtalk-digital-human')); ?></small>
            </div>
            <#
        }
        #>
        <?php
    }
}
