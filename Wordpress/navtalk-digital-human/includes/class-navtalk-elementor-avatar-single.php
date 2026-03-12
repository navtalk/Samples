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
        return __('NavTalk Avatar', 'navtalk-dh');
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
                'label' => __('Content', 'navtalk-dh'),
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
                'avatar_name',
                [
                    'label' => __('Select Avatar', 'navtalk-dh'),
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
                'label' => __('Display Options', 'navtalk-dh'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'layout',
            [
                'label' => __('Layout', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'overlay' => __('Overlay', 'navtalk-dh'),
                    'bottom' => __('Bottom', 'navtalk-dh'),
                ],
                'default' => 'bottom',
            ]
        );
        
        $this->add_control(
            'show_title',
            [
                'label' => __('Show Title', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'navtalk-dh'),
                'label_off' => __('No', 'navtalk-dh'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_status',
            [
                'label' => __('Show Status', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'navtalk-dh'),
                'label_off' => __('No', 'navtalk-dh'),
                'return_value' => 'yes',
                'default' => '',
            ]
        );
        
        $this->add_control(
            'show_call_button',
            [
                'label' => __('Show Call Button', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'navtalk-dh'),
                'label_off' => __('No', 'navtalk-dh'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_download_button',
            [
                'label' => __('Show Download Button', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'navtalk-dh'),
                'label_off' => __('No', 'navtalk-dh'),
                'return_value' => 'yes',
                'default' => '',
            ]
        );
        
        $this->add_control(
            'inline_mode',
            [
                'label' => __('Inline Video Mode', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'navtalk-dh'),
                'label_off' => __('No', 'navtalk-dh'),
                'return_value' => 'yes',
                'default' => 'yes',
                'description' => __('Enable to show video directly in card. Disable to use popup modal.', 'navtalk-dh'),
            ]
        );
        
        $this->add_control(
            'status_position',
            [
                'label' => __('Status Position', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'corner' => __('Corner', 'navtalk-dh'),
                    'info' => __('Info Section', 'navtalk-dh'),
                ],
                'default' => 'corner',
                'condition' => [
                    'show_status' => 'yes',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Add modal controls
        $this->add_modal_controls();
        
        // Add icon controls
        $this->add_icon_controls();
        
        // Add button style controls
        $this->add_button_style_controls();
    }
    
    /**
     * Render widget output
     */
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        // Check for avatar name
        if (empty($settings['avatar_name'])) {
            $this->render_error(__('Please select an avatar from the widget settings.', 'navtalk-dh'));
            return;
        }
        
        // Get license
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            $this->render_error(__('NavTalk license key is not configured. Please configure it in Settings > NavTalk Digital Human.', 'navtalk-dh'));
            return;
        }
        
        // Get avatar information
        $avatar_info = $this->get_avatar_info($settings['avatar_name']);
        
        if (!$avatar_info) {
            $this->render_error(sprintf(__('Failed to load avatar: %s', 'navtalk-dh'), $settings['avatar_name']));
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
        if (!settings.avatar_name) {
            #>
            <div class="navtalk-error" style="padding: 15px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c33; margin: 10px 0;">
                <strong><?php echo __('NavTalk Error:', 'navtalk-dh'); ?></strong> <?php echo __('Please select an avatar', 'navtalk-dh'); ?>
            </div>
            <#
        } else {
            #>
            <div class="navtalk-avatar-card" style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px;">
                <p><?php echo __('Avatar:', 'navtalk-dh'); ?> <strong>{{ settings.avatar_name }}</strong></p>
                <small><?php echo __('Preview is not available in editor', 'navtalk-dh'); ?></small>
            </div>
            <#
        }
        #>
        <?php
    }
}
