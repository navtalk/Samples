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
        return __('Avatar List for NavTalk', 'navtalk-digital-human');
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
                'label' => __('Content', 'navtalk-digital-human'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'columns',
            [
                'label' => __('Columns', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'min' => 1,
                'max' => 6,
                'step' => 1,
                'default' => 3,
            ]
        );

        $this->add_control(
            'filter',
            [
                'label' => __('Filter', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'all' => __('All', 'navtalk-digital-human'),
                    'available' => __('Available Only', 'navtalk-digital-human'),
                    'custom' => __('Custom (Specify IDs)', 'navtalk-digital-human'),
                ],
                'default' => 'all',
            ]
        );

        $this->add_control(
            'avatar_ids',
            [
                'label' => __('Avatar IDs', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'placeholder' => __('e.g., id1, id2, id3', 'navtalk-digital-human'),
                'description' => __('Comma-separated list of avatar IDs to display.', 'navtalk-digital-human'),
                'condition' => [
                    'filter' => 'custom',
                ],
            ]
        );

        $this->add_control(
            'limit',
            [
                'label' => __('Limit', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'min' => 1,
                'default' => 20,
            ]
        );
        
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
            $this->render_error(__('NavTalk license key is not configured. Please configure it in Settings > NavTalk Digital Human.', 'navtalk-digital-human'));
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
            $this->render_error(__('Failed to fetch avatars from API.', 'navtalk-digital-human'));
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!isset($data['data']) || empty($data['data'])) {
            $this->render_error(__('No avatars found for this license.', 'navtalk-digital-human'));
            return;
        }
        
        $avatars = $data['data'];

        $filter = isset($settings['filter']) ? $settings['filter'] : 'all';
        $avatar_ids = isset($settings['avatar_ids']) ? $settings['avatar_ids'] : '';
        $limit_val = isset($settings['limit']) ? intval($settings['limit']) : 20;

        // Filter avatars based on parameters
        if ($filter === 'available') {
            $avatars = array_filter($avatars, function($avatar) {
                return isset($avatar['status']) && $avatar['status'] === 'SUCCESS';
            });
        } elseif ($filter === 'custom' && !empty($avatar_ids)) {
            $custom_ids = array_map('trim', explode(',', $avatar_ids));
            $avatars = array_filter($avatars, function($avatar) use ($custom_ids) {
                $aid = isset($avatar['avatarId']) ? $avatar['avatarId'] : (isset($avatar['id']) ? $avatar['id'] : '');
                return '' !== $aid && in_array((string) $aid, $custom_ids, true);
            });
        }
        
        // Limit number of avatars
        if ($limit_val > 0) {
            $avatars = array_slice($avatars, 0, $limit_val);
        }

        if (empty($avatars)) {
            $this->render_error(__('No avatars available.', 'navtalk-digital-human'));
            return;
        }

        $columns = isset($settings['columns']) ? absint($settings['columns']) : 3;
        
        // Render avatar list
        ?>
        <div class="navtalk-avatar-list" data-columns="<?php echo esc_attr($columns); ?>">
            <?php foreach ($avatars as $avatar): ?>
                <?php
                // Pass full API avatar row so avatarId/id, thumbnailUrl, videoFile, etc. match shortcode behavior.
                $this->render_avatar_card($avatar, $settings);
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
                <p><?php echo esc_html(__('Avatar List will be displayed here', 'navtalk-digital-human')); ?></p>
                <small><?php echo esc_html(__('Preview is not available in editor', 'navtalk-digital-human')); ?></small>
            </div>
        </div>
        <?php
    }
}
