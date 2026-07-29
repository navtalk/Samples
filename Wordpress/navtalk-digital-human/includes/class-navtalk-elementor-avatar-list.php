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
        $available_avatar_options = $this->get_avatar_options(true);
        $avatar_options_error = '';
        if (isset($available_avatar_options['_error'])) {
            $avatar_options_error = $available_avatar_options['_error'];
            unset($available_avatar_options['_error']);
        }

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
                'default' => 5,
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
            'include_avatar_ids',
            [
                'label' => __('Include Avatars', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'options' => $available_avatar_options,
                'multiple' => true,
                'label_block' => true,
                'description' => $avatar_options_error
                    ? $avatar_options_error
                    : __('Search and select avatars to include. Leave empty to include every avatar allowed by Filter.', 'navtalk-digital-human'),
            ]
        );

        $this->add_control(
            'exclude_avatar_ids',
            [
                'label' => __('Exclude Avatars', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'options' => $available_avatar_options,
                'multiple' => true,
                'label_block' => true,
                'description' => $avatar_options_error
                    ? $avatar_options_error
                    : __('Search and select avatars to exclude. Exclude takes priority over Include.', 'navtalk-digital-human'),
            ]
        );

        $this->add_control(
            'orderby',
            [
                'label' => __('Order By', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'default' => __('Default API Order', 'navtalk-digital-human'),
                    'name' => __('Name', 'navtalk-digital-human'),
                ],
                'default' => 'default',
            ]
        );

        $this->add_control(
            'order',
            [
                'label' => __('Order', 'navtalk-digital-human'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'asc' => __('Ascending', 'navtalk-digital-human'),
                    'desc' => __('Descending', 'navtalk-digital-human'),
                ],
                'default' => 'asc',
                'condition' => [
                    'orderby' => 'name',
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
        
        // Add call button appearance controls
        $this->add_call_button_controls();
    }
    
    /**
     * Normalize an Elementor multi-select or comma-separated avatar ID value.
     *
     * @param mixed $value Raw control value.
     * @return array
     */
    private function normalize_avatar_ids($value) {
        if (is_string($value)) {
            $value = explode(',', $value);
        }

        if (!is_array($value)) {
            return [];
        }

        $ids = array_map(function($id) {
            return sanitize_text_field(trim((string) $id));
        }, $value);

        $ids = array_filter($ids, function($id) {
            return '' !== $id;
        });

        return array_values(array_unique($ids));
    }

    /**
     * Get the API identifier from an avatar row.
     *
     * @param array $avatar Avatar API row.
     * @return string
     */
    private function get_avatar_row_id($avatar) {
        $avatar_id = isset($avatar['avatarId']) ? $avatar['avatarId'] : (isset($avatar['id']) ? $avatar['id'] : '');
        return (string) $avatar_id;
    }

    /**
     * Sort avatar rows by their display names while preserving API order for ties.
     *
     * @param array  $avatars Avatar API rows.
     * @param string $order   asc or desc.
     * @return array
     */
    private function sort_avatars_by_name($avatars, $order) {
        $decorated = [];
        foreach (array_values($avatars) as $index => $avatar) {
            $decorated[] = [
                'index' => $index,
                'avatar' => $avatar,
            ];
        }

        $direction = 'desc' === $order ? -1 : 1;
        usort($decorated, function($left, $right) use ($direction) {
            $left_name = isset($left['avatar']['name']) ? $this->get_display_name((string) $left['avatar']['name']) : '';
            $right_name = isset($right['avatar']['name']) ? $this->get_display_name((string) $right['avatar']['name']) : '';
            $comparison = strnatcasecmp($left_name, $right_name);

            if (0 === $comparison) {
                return $left['index'] <=> $right['index'];
            }

            return $comparison * $direction;
        });

        return array_map(function($item) {
            return $item['avatar'];
        }, $decorated);
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
        $custom_ids = $this->normalize_avatar_ids(isset($settings['avatar_ids']) ? $settings['avatar_ids'] : '');
        $include_ids = $this->normalize_avatar_ids(isset($settings['include_avatar_ids']) ? $settings['include_avatar_ids'] : []);
        $exclude_ids = $this->normalize_avatar_ids(isset($settings['exclude_avatar_ids']) ? $settings['exclude_avatar_ids'] : []);
        $orderby = isset($settings['orderby']) && 'name' === $settings['orderby'] ? 'name' : 'default';
        $order = isset($settings['order']) && 'desc' === $settings['order'] ? 'desc' : 'asc';
        $limit_val = isset($settings['limit']) ? intval($settings['limit']) : 20;

        // Keep legacy filter/custom-ID settings working before applying the new query controls.
        if ('available' === $filter) {
            $avatars = array_filter($avatars, function($avatar) {
                $status = isset($avatar['status']) ? strtoupper(trim((string) $avatar['status'])) : '';
                return 'SUCCESS' === $status;
            });
        } elseif ('custom' === $filter && !empty($custom_ids)) {
            $avatars = array_filter($avatars, function($avatar) use ($custom_ids) {
                return in_array($this->get_avatar_row_id($avatar), $custom_ids, true);
            });
        }

        if (!empty($include_ids)) {
            $avatars = array_filter($avatars, function($avatar) use ($include_ids) {
                return in_array($this->get_avatar_row_id($avatar), $include_ids, true);
            });
        }

        // Exclude deliberately runs after Include so it always wins when an ID is in both lists.
        if (!empty($exclude_ids)) {
            $avatars = array_filter($avatars, function($avatar) use ($exclude_ids) {
                return !in_array($this->get_avatar_row_id($avatar), $exclude_ids, true);
            });
        }

        if ('name' === $orderby) {
            $avatars = $this->sort_avatars_by_name($avatars, $order);
        }

        // Apply the limit after filters and sorting so the first visible items match the selected order.
        if ($limit_val > 0) {
            $avatars = array_slice(array_values($avatars), 0, $limit_val);
        }

        if (empty($avatars)) {
            $this->render_error(__('No avatars available.', 'navtalk-digital-human'));
            return;
        }

        $columns = isset($settings['columns']) ? absint($settings['columns']) : 5;
        
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
        var columns = settings.columns || 5;
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
