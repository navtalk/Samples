<?php
/**
 * NavTalk Avatar List Widget for Elementor
 * 
 * Displays a grid of all available avatars
 */

if (!defined('ABSPATH')) {
    exit;
}

class NavTalk_Elementor_Avatar_List extends NavTalk_Elementor_Widget_Base {
    
    /**
     * Get widget name
     * 
     * @return string
     */
    public function get_name() {
        return 'navtalk-avatar-list';
    }
    
    /**
     * Get widget title
     * 
     * @return string
     */
    public function get_title() {
        return __('NavTalk Avatar List', 'navtalk-dh');
    }
    
    /**
     * Get widget icon
     * 
     * @return string
     */
    public function get_icon() {
        return 'eicon-gallery-grid';
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
        
        $this->add_control(
            'columns',
            [
                'label' => __('Columns', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'min' => 1,
                'max' => 6,
                'step' => 1,
                'default' => 3,
            ]
        );
        
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
        
        // Add session configuration controls
        $this->start_controls_section(
            'session_config_section',
            [
                'label' => __('Session Configuration', 'navtalk-dh'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'config_voice',
            [
                'label' => __('Voice', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Voice configuration for the avatar', 'navtalk-dh'),
            ]
        );
        
        $this->add_control(
            'config_prompt',
            [
                'label' => __('Prompt', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::TEXTAREA,
                'default' => '',
                'description' => __('Custom prompt for the conversation', 'navtalk-dh'),
            ]
        );
        
        $this->add_control(
            'config_tools',
            [
                'label' => __('Tools', 'navtalk-dh'),
                'type' => \Elementor\Controls_Manager::TEXTAREA,
                'default' => '',
                'description' => __('Tools configuration (JSON array format)', 'navtalk-dh'),
                'placeholder' => '[{"name":"weather","type":"function"}]',
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
        
        // Get license
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            $this->render_error(__('NavTalk license key is not configured. Please configure it in Settings > NavTalk Digital Human.', 'navtalk-dh'));
            return;
        }
        
        // Get all avatars
        $api = new NavTalk_API();
        $url = NavTalk_Config::get_api_endpoint('/api/open/v1/avatar/list');
        
        $response = wp_remote_get($url, [
            'headers' => ['license' => $license],
            'timeout' => 15
        ]);
        
        if (is_wp_error($response)) {
            $this->render_error(__('Failed to fetch avatars from API.', 'navtalk-dh'));
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!isset($data['data']) || empty($data['data'])) {
            $this->render_error(__('No avatars found for this license.', 'navtalk-dh'));
            return;
        }
        
        $avatars = $data['data'];
        $columns = absint($settings['columns']);
        
        // Render avatar list
        ?>
        <div class="navtalk-avatar-list" data-columns="<?php echo esc_attr($columns); ?>">
            <?php foreach ($avatars as $avatar): ?>
                <?php
                $thumbnail_url = isset($avatar['thumbnailUrl']) ? $avatar['thumbnailUrl'] : ($avatar['url'] ?? '');
                $avatar_info = [
                    'name' => $avatar['name'],
                    'url' => $thumbnail_url,
                    'status' => isset($avatar['status']) ? $avatar['status'] : 'Unknown'
                ];
                
                $this->render_avatar_card($avatar_info, $settings);
                ?>
            <?php endforeach; ?>
        </div>
        <?php
    }
    
    /**
     * Render widget output in the editor
     */
    protected function content_template() {
        ?>
        <#
        var columns = settings.columns || 3;
        #>
        <div class="navtalk-avatar-list" data-columns="{{ columns }}">
            <div class="navtalk-avatar-card" style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px;">
                <p><?php echo __('Avatar List will be displayed here', 'navtalk-dh'); ?></p>
                <small><?php echo __('Preview is not available in editor', 'navtalk-dh'); ?></small>
            </div>
        </div>
        <?php
    }
}
