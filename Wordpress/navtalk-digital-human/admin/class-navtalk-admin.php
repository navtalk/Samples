<?php
/**
 * NavTalk Admin Class
 * 
 * Handles admin settings page
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class NavTalk_Admin {
    /**
     * Initialize admin functionality
     */
    public function init() {
        if (is_admin()) {
            add_action('admin_menu', [$this, 'add_settings_page']);
            add_action('admin_init', [$this, 'register_settings']);
            add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
            add_action('add_meta_boxes', [$this, 'add_navtalk_meta_box']);
        }
        
        // Save post meta (standard post save)
        add_action('save_post', [$this, 'save_navtalk_meta'], 10, 2);
        
        // Always register post meta so it's available for REST API / Gutenberg
        add_action('init', [$this, 'register_navtalk_post_meta']);
    }

    /**
     * Register page/post "show digital human" metadata
     */
    public function register_navtalk_post_meta() {
        foreach (['post', 'page'] as $post_type) {
            register_post_meta($post_type, '_navtalk_show_floating', [
                'type'         => 'string',
                'single'       => true,
                'default'      => 'show',
                'show_in_rest' => true,
                'auth_callback' => function ($allowed, $meta_key, $post_id) {
                    return current_user_can('edit_post', $post_id);
                },
                'sanitize_callback' => function ($v) {
                    return ($v === 'hide') ? 'hide' : 'show';
                },
            ]);
        }
    }

    /**
     * Add "show digital human on this page" meta box
     */
    public function add_navtalk_meta_box() {
        add_meta_box(
            'navtalk_show_floating',
            __('Digital Human Assistant', 'navtalk-digital-human'),
            [$this, 'render_navtalk_meta_box'],
            ['post', 'page'],
            'side'
        );
    }

    public function render_navtalk_meta_box($post) {
        wp_nonce_field('navtalk_show_floating_nonce', 'navtalk_show_floating_nonce');
        $value = get_post_meta($post->ID, '_navtalk_show_floating', true);
        if ($value === '') {
            $value = 'show';
        }
        ?>
        <p>
            <label>
                <input type="checkbox" name="navtalk_show_floating" value="show" <?php checked($value, 'show'); ?>>
                <?php esc_html_e('Show Digital Human Assistant on This Page', 'navtalk-digital-human'); ?>
            </label>
        </p>
        <p class="description"><?php esc_html_e('Only takes effect when global digital human assistant is enabled in settings. Uncheck to hide floating digital human on this page.', 'navtalk-digital-human'); ?></p>
        <?php
    }

    public function save_navtalk_meta($post_id, $post) {
        if (!isset($_POST['navtalk_show_floating_nonce']) ||
            !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['navtalk_show_floating_nonce'])), 'navtalk_show_floating_nonce')) {
            return;
        }
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        $val = isset($_POST['navtalk_show_floating']) && sanitize_text_field(wp_unslash($_POST['navtalk_show_floating'])) === 'show' ? 'show' : 'hide';
        update_post_meta($post_id, '_navtalk_show_floating', $val);
    }
    
    /**
     * Add settings page to WordPress admin menu
     */
    public function add_settings_page() {
        add_options_page(
            __('NavTalk Digital Human Settings', 'navtalk-digital-human'),
            __('NavTalk Digital Human', 'navtalk-digital-human'),
            'manage_options',
            'navtalk-settings',
            [$this, 'render_settings_page']
        );
    }
    
    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting(
            'navtalk_options_group',
            'navtalk_license',
            [
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'default' => ''
            ]
        );

        register_setting('navtalk_options_group', 'navtalk_floating_enabled', [
            'type' => 'string',
            'sanitize_callback' => function ($v) { return $v ? '1' : '0'; },
            'default' => '0'
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_avatar', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => ''
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_title', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'NavTalk Assistant'
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_subtitle', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'Ask me about NavTalk'
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_position', [
            'type' => 'string',
            'sanitize_callback' => ['NavTalk_Config', 'sanitize_floating_position'],
            'default' => 'bottom-right'
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_button_size', [
            'type' => 'string',
            'sanitize_callback' => ['NavTalk_Config', 'sanitize_px_size'],
            'default' => '60px'
        ]);
        
        register_setting('navtalk_options_group', 'navtalk_floating_button_background', [
            'type' => 'string',
            'sanitize_callback' => ['NavTalk_Config', 'sanitize_button_background'],
            'default' => NavTalk_Config::DEFAULT_BUTTON_BACKGROUND
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_button_bg_image', [
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => ''
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_button_bg_type', [
            'type' => 'string',
            'sanitize_callback' => ['NavTalk_Config', 'sanitize_button_background_type'],
            'default' => 'gradient'
        ]);
        
        // Keep legacy option for backward compatibility
        register_setting('navtalk_options_group', 'navtalk_floating_button_color', [
            'type' => 'string',
            'sanitize_callback' => function ($v) { return NavTalk_Config::sanitize_hex_color_with_default($v, '#667eea'); },
            'default' => '#667eea'
        ]);

        register_setting('navtalk_options_group', 'navtalk_floating_button_icon_image', [
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => ''
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_button_icon_type', [
            'type' => 'string',
            'sanitize_callback' => function ($v) {
                $v = sanitize_key((string) $v);
                return in_array($v, ['default', 'image'], true) ? $v : 'default';
            },
            'default' => 'default'
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_button_icon_color', [
            'type' => 'string',
            'sanitize_callback' => function ($v) { return NavTalk_Config::sanitize_hex_color_with_default($v, '#ffffff'); },
            'default' => '#ffffff'
        ]);
        
        // New: Toggle button and advanced configuration
        register_setting('navtalk_options_group', 'navtalk_show_toggle_button', [
            'type' => 'string',
            'sanitize_callback' => function ($v) { return $v ? '1' : '0'; },
            'default' => '1'
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_voice', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => ''
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_model', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => ''
        ]);
        register_setting('navtalk_options_group', 'navtalk_auto_hangup_enabled', [
            'type' => 'string',
            'sanitize_callback' => function ($v) { return $v ? '1' : '0'; },
            'default' => '0'
        ]);
        register_setting('navtalk_options_group', 'navtalk_auto_hangup_description', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'Call this function when the user says goodbye'
        ]);

        add_settings_section(
            'navtalk_main_section',
            'API Configuration',
            [$this, 'render_section_callback'],
            'navtalk-settings'
        );
        
        add_settings_field(
            'navtalk_license',
            'License Key',
            [$this, 'render_license_field'],
            'navtalk-settings',
            'navtalk_main_section'
        );

        add_settings_section(
            'navtalk_floating_section',
            __('Digital Human Assistant', 'navtalk-digital-human'),
            [$this, 'render_floating_section_callback'],
            'navtalk-settings'
        );
        add_settings_field(
            'navtalk_floating_enabled',
            __('Enable Digital Human Assistant', 'navtalk-digital-human'),
            [$this, 'render_floating_enabled_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_avatar',
            __('Select Digital Human Avatar', 'navtalk-digital-human'),
            [$this, 'render_floating_avatar_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_title',
            __('Assistant Title', 'navtalk-digital-human'),
            [$this, 'render_floating_title_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_subtitle',
            __('Assistant Subtitle', 'navtalk-digital-human'),
            [$this, 'render_floating_subtitle_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_position',
            __('Floating Position', 'navtalk-digital-human'),
            [$this, 'render_floating_position_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_button_size',
            __('Call Button Size', 'navtalk-digital-human'),
            [$this, 'render_floating_button_size_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_button_background',
            __('Call Button Background', 'navtalk-digital-human'),
            [$this, 'render_floating_button_background_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_button_icon',
            __('Call Button Icon', 'navtalk-digital-human'),
            [$this, 'render_floating_button_icon_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_button_icon_color',
            __('Icon Color', 'navtalk-digital-human'),
            [$this, 'render_floating_button_icon_color_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_show_toggle_button',
            __('Show Floating Toggle Button', 'navtalk-digital-human'),
            [$this, 'render_show_toggle_button_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_voice',
            __('Voice Configuration', 'navtalk-digital-human'),
            [$this, 'render_floating_voice_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_model',
            __('Model Configuration', 'navtalk-digital-human'),
            [$this, 'render_floating_model_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_auto_hangup_enabled',
            __('Enable Auto Hangup', 'navtalk-digital-human'),
            [$this, 'render_auto_hangup_enabled_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_auto_hangup_description',
            __('Auto Hangup Description', 'navtalk-digital-human'),
            [$this, 'render_auto_hangup_description_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
    }

    public function render_floating_button_background_field() {
        $bg_type = NavTalk_Config::sanitize_button_background_type(get_option('navtalk_floating_button_bg_type', 'gradient'));
        $background = NavTalk_Config::sanitize_button_background(get_option('navtalk_floating_button_background', NavTalk_Config::DEFAULT_BUTTON_BACKGROUND));
        $bg_image = get_option('navtalk_floating_button_bg_image', '');
        $is_color_background = (bool) sanitize_hex_color($background);
        $gradient_value = $is_color_background ? NavTalk_Config::DEFAULT_BUTTON_BACKGROUND : $background;
        $color_value = $is_color_background ? $background : '#667eea';
        ?>
        <div class="navtalk-bg-field">
            <div style="margin-bottom: 15px;">
                <label><input type="radio" name="navtalk_floating_button_bg_type" value="gradient" <?php checked($bg_type, 'gradient'); ?>> <?php esc_html_e('Gradient preset', 'navtalk-digital-human'); ?></label>
                <label style="margin-left: 15px;"><input type="radio" name="navtalk_floating_button_bg_type" value="color" <?php checked($bg_type, 'color'); ?>> <?php esc_html_e('Solid color', 'navtalk-digital-human'); ?></label>
                <label style="margin-left: 15px;"><input type="radio" name="navtalk_floating_button_bg_type" value="image" <?php checked($bg_type, 'image'); ?>> <?php esc_html_e('Image', 'navtalk-digital-human'); ?></label>
            </div>
            
            <input type="hidden" name="navtalk_floating_button_background" id="navtalk_bg_input" value="<?php echo esc_attr($background); ?>">

            <div class="navtalk-bg-gradient-section" style="<?php echo esc_attr($bg_type !== 'gradient' ? 'display:none;' : ''); ?>">
                <select id="navtalk_bg_preset" style="width: 100%; margin-bottom: 10px;">
                    <option value="<?php echo esc_attr(NavTalk_Config::DEFAULT_BUTTON_BACKGROUND); ?>" <?php selected($gradient_value, NavTalk_Config::DEFAULT_BUTTON_BACKGROUND); ?>><?php esc_html_e('Blue purple gradient', 'navtalk-digital-human'); ?></option>
                    <option value="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" <?php selected($gradient_value, 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'); ?>><?php esc_html_e('Purple', 'navtalk-digital-human'); ?></option>
                    <option value="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" <?php selected($gradient_value, 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'); ?>><?php esc_html_e('Pink', 'navtalk-digital-human'); ?></option>
                    <option value="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" <?php selected($gradient_value, 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'); ?>><?php esc_html_e('Cyan', 'navtalk-digital-human'); ?></option>
                    <option value="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" <?php selected($gradient_value, 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'); ?>><?php esc_html_e('Green', 'navtalk-digital-human'); ?></option>
                </select>
            </div>

            <div class="navtalk-bg-color-section" style="<?php echo esc_attr($bg_type !== 'color' ? 'display:none;' : ''); ?>">
                <input type="color" id="navtalk_bg_color" value="<?php echo esc_attr($color_value); ?>">
                <p class="description"><?php esc_html_e('Choose a solid color for the call button background.', 'navtalk-digital-human'); ?></p>
            </div>
            
            <div class="navtalk-bg-image-section" style="<?php echo esc_attr($bg_type !== 'image' ? 'display:none;' : ''); ?>">
                <input type="hidden" name="navtalk_floating_button_bg_image" id="navtalk_bg_image_url" value="<?php echo esc_attr($bg_image); ?>">
                <button type="button" class="button" id="navtalk_upload_bg_image"><?php esc_html_e('Upload background image', 'navtalk-digital-human'); ?></button>
                <button type="button" class="button" id="navtalk_remove_bg_image" style="<?php echo esc_attr(empty($bg_image) ? 'display:none;' : ''); ?>"><?php esc_html_e('Remove image', 'navtalk-digital-human'); ?></button>
                <div id="navtalk_bg_image_preview" style="margin-top: 10px;">
                    <?php if (!empty($bg_image)): ?>
                        <img src="<?php echo esc_url($bg_image); ?>" style="max-width: 150px; border-radius: 8px; border: 2px solid #ddd;">
                    <?php endif; ?>
                </div>
            </div>
            
            <div class="navtalk-bg-preview" style="margin-top: 15px;">
                <strong><?php esc_html_e('Preview', 'navtalk-digital-human'); ?>:</strong>
                <div id="navtalk_bg_preview_box" style="width: 70px; height: 70px; border-radius: 50%; border: 2px solid #ddd; display: inline-block; vertical-align: middle; margin-left: 10px; <?php 
                    if ($bg_type === 'image' && !empty($bg_image)) {
                        echo 'background: url(' . esc_url($bg_image) . ') center/cover;';
                    } else {
                        echo 'background: ' . esc_attr($background) . ';';
                    }
                ?>"></div>
            </div>
            
            <p class="description"><?php esc_html_e('Choose a preset gradient, a solid hex color, or an uploaded background image.', 'navtalk-digital-human'); ?></p>
        </div>
        <?php
    }

    public function render_floating_button_icon_field() {
        $icon_type = get_option('navtalk_floating_button_icon_type', 'default');
        $icon_type = in_array($icon_type, ['default', 'image'], true) ? $icon_type : 'default';
        $icon_image = get_option('navtalk_floating_button_icon_image', '');
        ?>
        <div class="navtalk-icon-field">
            <div style="margin-bottom: 15px;">
                <label><input type="radio" name="navtalk_floating_button_icon_type" value="default" <?php checked($icon_type, 'default'); ?>> <?php esc_html_e('Default icon', 'navtalk-digital-human'); ?></label>
                <label style="margin-left: 15px;"><input type="radio" name="navtalk_floating_button_icon_type" value="image" <?php checked($icon_type, 'image'); ?>> <?php esc_html_e('Image', 'navtalk-digital-human'); ?></label>
            </div>

            <div class="navtalk-icon-image-section" style="<?php echo esc_attr($icon_type !== 'image' ? 'display:none;' : ''); ?>">
                <input type="hidden" name="navtalk_floating_button_icon_image" id="navtalk_icon_image_url" value="<?php echo esc_attr($icon_image); ?>">
                <button type="button" class="button" id="navtalk_upload_icon_image"><?php esc_html_e('Upload icon image', 'navtalk-digital-human'); ?></button>
                <button type="button" class="button" id="navtalk_remove_icon_image" style="<?php echo esc_attr(empty($icon_image) ? 'display:none;' : ''); ?>"><?php esc_html_e('Remove image', 'navtalk-digital-human'); ?></button>
                <div id="navtalk_icon_image_preview" style="margin-top: 10px;">
                    <?php if (!empty($icon_image)): ?>
                        <img src="<?php echo esc_url($icon_image); ?>" style="max-width: 80px; border-radius: 8px; border: 2px solid #ddd;">
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php
    }

    public function render_floating_button_icon_color_field() {
        $icon_color = NavTalk_Config::sanitize_hex_color_with_default(get_option('navtalk_floating_button_icon_color', '#ffffff'), '#ffffff');
        ?>
        <input type="color" name="navtalk_floating_button_icon_color" id="navtalk_icon_color_picker" value="<?php echo esc_attr($icon_color); ?>" style="width: 60px; height: 40px;">
        <input type="text" id="navtalk_icon_color_text" value="<?php echo esc_attr($icon_color); ?>" class="small-text" placeholder="#ffffff" style="margin-left: 10px;">
        <p class="description"><?php esc_html_e('Icon color applies to the default icon.', 'navtalk-digital-human'); ?></p>
        <?php
    }
    
    /**
     * Render settings section description
     */
    public function render_section_callback() {
        echo '<p>';
        esc_html_e('Configure your NavTalk API license key. Get your license key from ', 'navtalk-digital-human');
        echo '<a href="' . esc_url('https://console.navtalk.ai') . '" target="_blank" rel="noopener noreferrer">';
        esc_html_e('NavTalk Console', 'navtalk-digital-human');
        echo '</a>.</p>';
    }
    
    /**
     * Render license key field
     */
    public function render_license_field() {
        $license = get_option('navtalk_license', '');
        ?>
        <input type="text" 
               id="navtalk_license" 
               name="navtalk_license" 
               value="<?php echo esc_attr($license); ?>" 
               class="regular-text" 
               placeholder="Enter your NavTalk license key">
        <p class="description">
            Your NavTalk API license key (required for the plugin to work).
        </p>
        
        <div id="test-connection-wrapper" style="margin-top: 10px;<?php echo esc_attr(empty($license) ? ' display: none;' : ''); ?>">
            <button type="button" id="test-connection" class="button button-secondary">
                Test Connection
            </button>
            <span id="test-result" style="margin-left: 10px;"></span>
        </div>
        <?php
    }

    /**
     * Digital Human Assistant section description
     */
    public function render_floating_section_callback() {
        echo '<p>' . esc_html__('When enabled, a floating digital human assistant will appear on the front end. Each page/post can individually control whether to show the digital human.', 'navtalk-digital-human') . '</p>';
    }

    public function render_floating_enabled_field() {
        $enabled = get_option('navtalk_floating_enabled', '0');
        ?>
        <input type="hidden" name="navtalk_floating_enabled" value="0">
        <label>
            <input type="checkbox" name="navtalk_floating_enabled" value="1" <?php checked($enabled, '1'); ?>>
            <?php esc_html_e('Enable Global Digital Human Assistant (Floating)', 'navtalk-digital-human'); ?>
        </label>
        <?php
    }

    public function render_floating_avatar_field() {
        $current = get_option('navtalk_floating_avatar', '');
        $avatars = $this->get_avatars_list();
        ?>
        <select name="navtalk_floating_avatar" id="navtalk_floating_avatar" class="regular-text">
            <option value=""><?php esc_html_e('— Please Select —', 'navtalk-digital-human'); ?></option>
            <?php foreach ($avatars as $avatar) :
                $avatar_id = isset($avatar['avatarId']) ? $avatar['avatarId'] : (isset($avatar['id']) ? $avatar['id'] : '');
                $name = isset($avatar['name']) ? $avatar['name'] : '';
                $parts = explode('.', $name);
                $display = isset($parts[1]) ? $parts[1] : $name;
                if ('' === (string) $avatar_id || !self::is_success_avatar($avatar)) continue;
            ?>
                <option value="<?php echo esc_attr($avatar_id); ?>" <?php selected($current, $avatar_id); ?>>
                    <?php echo esc_html($display ?: $avatar_id); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <p class="description"><?php esc_html_e('Select an available digital human avatar from your Avatar list. Please save your License Key first and ensure avatars are available.', 'navtalk-digital-human'); ?></p>
        <?php
    }

    public function render_floating_title_field() {
        $title = get_option('navtalk_floating_title', 'NavTalk Assistant');
        ?>
        <input type="text" name="navtalk_floating_title" id="navtalk_floating_title"
               value="<?php echo esc_attr($title); ?>" class="regular-text" maxlength="80"
               placeholder="<?php esc_attr_e('NavTalk Assistant', 'navtalk-digital-human'); ?>">
        <p class="description"><?php esc_html_e('Displayed above the floating avatar. Leave empty to hide the title.', 'navtalk-digital-human'); ?></p>
        <?php
    }

    public function render_floating_subtitle_field() {
        $subtitle = get_option('navtalk_floating_subtitle', 'Ask me about NavTalk');
        ?>
        <input type="text" name="navtalk_floating_subtitle" id="navtalk_floating_subtitle"
               value="<?php echo esc_attr($subtitle); ?>" class="regular-text" maxlength="120"
               placeholder="<?php esc_attr_e('Ask me about NavTalk', 'navtalk-digital-human'); ?>">
        <p class="description"><?php esc_html_e('Displayed below the title. Leave empty to hide the subtitle.', 'navtalk-digital-human'); ?></p>
        <?php
    }

    public function render_floating_position_field() {
        $current = get_option('navtalk_floating_position', 'bottom-right');
        $positions = [
            'bottom-right' => __('Bottom Right', 'navtalk-digital-human'),
            'bottom-left'  => __('Bottom Left', 'navtalk-digital-human'),
            'top-right'   => __('Top Right', 'navtalk-digital-human'),
            'top-left'    => __('Top Left', 'navtalk-digital-human'),
        ];
        ?>
        <select name="navtalk_floating_position" id="navtalk_floating_position">
            <?php foreach ($positions as $value => $label) : ?>
                <option value="<?php echo esc_attr($value); ?>" <?php selected($current, $value); ?>><?php echo esc_html($label); ?></option>
            <?php endforeach; ?>
        </select>
        <?php
    }

    public function render_floating_button_size_field() {
        $size = get_option('navtalk_floating_button_size', '60px');
        ?>
        <input type="text" name="navtalk_floating_button_size" id="navtalk_floating_button_size"
               value="<?php echo esc_attr($size); ?>" class="small-text" placeholder="60px">
        <p class="description"><?php esc_html_e('Example: 50px, 60px, 70px', 'navtalk-digital-human'); ?></p>
        <?php
    }

    public function render_show_toggle_button_field() {
        $show_toggle = get_option('navtalk_show_toggle_button', '1');
        ?>
        <input type="hidden" name="navtalk_show_toggle_button" value="0">
        <label>
            <input type="checkbox" name="navtalk_show_toggle_button" value="1" <?php checked($show_toggle, '1'); ?>>
            <?php esc_html_e('Show Hide/Show Toggle Button', 'navtalk-digital-human'); ?>
        </label>
        <p class="description"><?php esc_html_e('When enabled, users can hide or show the digital human panel via button.', 'navtalk-digital-human'); ?></p>
        <?php
    }

    public function render_floating_voice_field() {
        $voice = get_option('navtalk_floating_voice', '');
        ?>
        <input type="text" name="navtalk_floating_voice" id="navtalk_floating_voice"
               value="<?php echo esc_attr($voice); ?>" class="regular-text" placeholder="<?php esc_attr_e('Leave empty to use default voice', 'navtalk-digital-human'); ?>">
        <p class="description"><?php esc_html_e('Configure the digital human voice. Leave empty to use default configuration.', 'navtalk-digital-human'); ?></p>
        <?php
    }

    public function render_floating_model_field() {
        $model = get_option('navtalk_floating_model', '');
        ?>
        <input type="text" name="navtalk_floating_model" id="navtalk_floating_model"
               value="<?php echo esc_attr($model); ?>" class="regular-text" placeholder="<?php esc_attr_e('Leave empty to use default model', 'navtalk-digital-human'); ?>">
        <p class="description"><?php esc_html_e('Configure the digital human model. Leave empty to use default configuration.', 'navtalk-digital-human'); ?></p>
        <?php
    }

    public function render_auto_hangup_enabled_field() {
        $enabled = get_option('navtalk_auto_hangup_enabled', '0');
        ?>
        <input type="hidden" name="navtalk_auto_hangup_enabled" value="0">
        <label>
            <input type="checkbox" name="navtalk_auto_hangup_enabled" value="1" <?php checked($enabled, '1'); ?>>
            <?php esc_html_e('Enable auto hangup when user says goodbye(only OpenAIRealtime provider)', 'navtalk-digital-human'); ?>
        </label>
        <p class="description"><?php esc_html_e('When enabled, the AI will automatically end the conversation when the user says goodbye. The end_conversation function will be added to tools.', 'navtalk-digital-human'); ?></p>
        <?php
    }

    public function render_auto_hangup_description_field() {
        $description = get_option('navtalk_auto_hangup_description', 'Call this function when the user says goodbye');
        ?>
        <input type="text" name="navtalk_auto_hangup_description" id="navtalk_auto_hangup_description"
               value="<?php echo esc_attr($description); ?>" class="large-text" placeholder="Call this function when the user says goodbye">
        <p class="description"><?php esc_html_e('Description for the end_conversation tool. Customize to define when the AI should trigger hangup (e.g. when the user says goodbye or thanks).', 'navtalk-digital-human'); ?></p>
        <?php
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Handle settings save
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- $_GET['settings-updated'] is added by WordPress Settings API after nonce verification
        if (isset($_GET['settings-updated']) && sanitize_text_field(wp_unslash($_GET['settings-updated']))) {
            add_settings_error(
                'navtalk_messages',
                'navtalk_message',
                __('Settings saved successfully.', 'navtalk-digital-human'),
                'updated'
            );
        }
        
        settings_errors('navtalk_messages');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <div class="navtalk-admin-header" style="margin: 20px 0; padding: 20px; background: #fff; border-left: 4px solid #667eea;">
                <h2 style="margin-top: 0;"><?php esc_html_e('Welcome to NavTalk Digital Human', 'navtalk-digital-human'); ?></h2>
                <p><?php esc_html_e('Integrate real-time AI avatar conversations into your WordPress site.', 'navtalk-digital-human'); ?></p>
            </div>
            
            <form action="options.php" method="post">
                <?php
                settings_fields('navtalk_options_group');
                do_settings_sections('navtalk-settings');
                submit_button('Save Settings');
                ?>
            </form>
            
            <div class="navtalk-usage-guide" style="margin-top: 30px; padding: 20px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
                <h2>Your Available Avatars</h2>
                <?php
                $license = get_option('navtalk_license', '');
                if (!empty($license)) {
                    $avatars = $this->get_avatars_list();
                    
                    if (!empty($avatars)) {
                        echo '<p style="margin-bottom: 10px; color: #666;">Click "Copy" to quickly use these avatars in your pages:</p>';
                        
                        echo '<div style="margin-bottom: 25px; padding: 15px; background: #fff; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">';
                        echo '<label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">Avatar List Shortcode:</label>';
                        echo '<div style="display: flex; gap: 10px; align-items: center;">';
                        echo '<code style="flex: 1; padding: 10px; background: #f9f9f9; border: 1px solid #eee; border-radius: 4px; font-size: 13px; color: #667eea;">[navtalk_list]</code>';
                        echo '<button type="button" class="button button-primary copy-shortcode" data-shortcode="[navtalk_list]" style="height: 38px; padding: 0 20px;">Copy with Config</button>';
                        echo '</div>';
                        echo '<p class="description" style="margin-top: 8px;">Use this shortcode to display all your available avatars in a grid.</p>';
                        echo '</div>';

                        echo '<div class="navtalk-avatars-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 15px;">';
                        foreach ($avatars as $avatar) {
                            $this->render_avatar_card_admin($avatar);
                        }
                        echo '</div>';
                    } else {
                        echo '<p style="color: #d32f2f; font-weight: 500;">⚠ No avatars found. Please verify your license key is correct.</p>';
                    }
                } else {
                    echo '<p style="color: #999;">💡 Save your license key above to see your available avatars.</p>';
                }
                ?>
            </div>
            
            <div class="navtalk-elementor-guide" style="margin-top: 30px; padding: 20px; background: #fff; border: 1px solid #ddd; border-left: 4px solid #667eea; border-radius: 8px;">
                <h2 style="margin-top: 0; color: #667eea;">Using with Elementor</h2>
                
                <p style="font-size: 14px; color: #555;">The plugin adds two Elementor widgets for NavTalk (third-party service):</p>
                
                <div style="margin: 20px 0;">
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Step 1: Find the widgets</h3>
                    <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 6px; text-align: center;">
                        <div style="width: 100%; height: 600px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; border: 2px dashed #fff;">
                           <img src="<?php echo esc_url(NAVTALK_PLUGIN_URL); ?>public/images/widget.png" alt="<?php echo esc_attr__('Elementor widgets for NavTalk', 'navtalk-digital-human'); ?>" style="max-width: 90%; max-height: 90%; object-fit: contain;">
                        </div>
                        <p style="margin-top: 10px; font-size: 12px; color: #666; font-style: italic;">Shows Elementor left sidebar with the &quot;NavTalk integration&quot; category and two widgets</p>
                    </div>
                    <ol style="font-size: 14px; line-height: 1.8;">
                        <li>Open any page in <strong>Elementor Editor</strong></li>
                        <li>In the left sidebar widget panel, find the <strong>&quot;NavTalk integration&quot;</strong> category</li>
                        <li>You'll see two widgets:
                            <ul style="margin-top: 8px;">
                                <li><strong>Avatar List for NavTalk</strong> &mdash; display all avatars in a responsive grid</li>
                                <li><strong>Avatar for NavTalk</strong> &mdash; display a single selected avatar</li>
                            </ul>
                        </li>
                    </ol>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Step 2: Drag Widget to Page</h3>
                    <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 6px; text-align: center;">
                        <div style="width: 100%; height: 600px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; border: 2px dashed #fff;">
                            <img src="<?php echo esc_url(NAVTALK_PLUGIN_URL); ?>public/images/avatar-setting.png" alt="Drag Widget" style="max-width: 90%; max-height: 90%; object-fit: contain;">
                        </div>
                        <p style="margin-top: 10px; font-size: 12px; color: #666; font-style: italic;">Shows dragging a NavTalk widget from the sidebar to the page canvas</p>
                    </div>
                    <p style="font-size: 14px;">Simply <strong>drag</strong> your desired widget to the page canvas where you want it to appear.</p>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Step 3: Configure Widget Settings</h3>
                    <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 6px; text-align: center;">
                        <div style="width: 100%; height: 600px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; border: 2px dashed #fff;">
                            <img src="<?php echo esc_url(NAVTALK_PLUGIN_URL); ?>public/images/avatar-list.png" alt="Widget Settings" style="max-width: 90%; max-height: 90%; object-fit: contain;">
                        </div>
                        <p style="margin-top: 10px; font-size: 12px; color: #666; font-style: italic;">Shows widget settings panel with available configuration options</p>
                    </div>
                    
                    <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; padding: 15px; margin-top: 15px;">
                        <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333;">Available Configuration Options:</h4>
                        <ul style="font-size: 13px; line-height: 1.8; color: #555; margin: 0; padding-left: 20px;">
                            <li><strong>Columns</strong> (List widget only): Set number of columns (1-6)</li>
                            <li><strong>Select Avatar</strong> (Single widget only): Choose which avatar to display</li>
                            <li><strong>Layout</strong>: Choose "Overlay" or "Bottom" layout style</li>
                            <li><strong>Show Title</strong>: Toggle avatar name display</li>
                            <li><strong>Show Status</strong>: Toggle online status indicator</li>
                            <li><strong>Show Call Button</strong>: Toggle call button visibility</li>
                            <li><strong>Status Position</strong>: Position of status indicator</li>
                            <li><strong>Modal Settings</strong>: Configure chat modal width, height, and appearance</li>
                        </ul>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Step 4: Preview and Publish</h3>
                    <p style="font-size: 14px;">Click the <strong>Preview</strong> button to see your changes, then click <strong>Update</strong> to publish.</p>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-left: 4px solid #2196f3; border-radius: 4px;">
                    <strong style="color: #1976d2;">💡 Pro Tip:</strong>
                    <span style="color: #555; font-size: 13px;"> Use the <strong>Avatar List for NavTalk</strong> widget in full-width sections for best results. Adjust columns based on your layout &mdash; try 3 columns for desktop, which automatically adapts to mobile screens.</span>
                </div>
            </div>
        </div>
        
        <!-- Shortcode Configuration Modal -->
        <div id="navtalk-shortcode-modal" class="navtalk-modal" style="display: none;">
            <div class="navtalk-modal-overlay"></div>
            <div class="navtalk-modal-content">
                <div class="navtalk-modal-header">
                    <h2>Configure Shortcode Parameters</h2>
                    <button type="button" class="navtalk-modal-close">&times;</button>
                </div>
                
                <div class="navtalk-modal-body">
                    <form id="navtalk-shortcode-config-form">
                        <input type="hidden" id="modal-avatar-id" name="avatarId">
                        <input type="hidden" id="modal-shortcode-type" name="shortcode_type">
                        
                        <div class="navtalk-config-section">
                            <h3>Basic Settings</h3>
                            
                            <div class="navtalk-form-row list-only" style="display: none;">
                                <label for="modal-columns">Columns:</label>
                                <input type="number" id="modal-columns" name="columns" min="1" max="6" placeholder="3">
                            </div>

                             <div class="navtalk-form-row list-only" style="display: none;">
                                 <label for="modal-filter">Filter:</label>
                                 <select id="modal-filter" name="filter">
                                     <option value="">All</option>
                                     <option value="available">Available Only</option>
                                     <option value="custom">Custom (Specify IDs)</option>
                                 </select>
                             </div>

                             <div class="navtalk-form-row list-only filter-custom-only" style="display: none;">
                                 <label for="modal-avatar-ids">Avatar IDs:</label>
                                 <input type="text" id="modal-avatar-ids" name="avatarIds" placeholder="e.g., id1, id2, id3">
                                 <p class="description">Comma-separated list of avatar IDs to display.</p>
                             </div>

                             <div class="navtalk-form-row list-only" style="display: none;">
                                 <label for="modal-limit">Limit:</label>
                                 <input type="number" id="modal-limit" name="limit" min="1" placeholder="20">
                             </div>
                             
                             <div class="navtalk-form-row">
                                <label for="modal-layout">Layout:</label>
                                <select id="modal-layout" name="layout">
                                    <option value="">Default</option>
                                    <option value="overlay">Overlay</option>
                                    <option value="bottom">Bottom</option>
                                </select>
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-show-title">Show Title:</label>
                                <select id="modal-show-title" name="show_title">
                                    <option value="">Default</option>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select>
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-show-status">Show Status:</label>
                                <select id="modal-show-status" name="show_status">
                                    <option value="">Default</option>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select>
                            </div>

                            <div class="navtalk-form-row" id="status-position-row">
                                <label for="modal-status-position">Status Position:</label>
                                <select id="modal-status-position" name="status_position">
                                    <option value="">Default</option>
                                    <option value="corner">Corner</option>
                                    <option value="info">Info Section</option>
                                </select>
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-show-call-button">Show Call Button:</label>
                                <select id="modal-show-call-button" name="show_call_button">
                                    <option value="">Default</option>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select>
                            </div>

                            <div class="navtalk-form-row">
                                <label for="modal-show-download-button">Show Download Button:</label>
                                <select id="modal-show-download-button" name="show_download_button">
                                    <option value="">Default</option>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select>
                            </div>

                            <div class="navtalk-form-row">
                                <label for="modal-download-url">Global Download URL:</label>
                                <input type="text" id="modal-download-url" name="download_url" placeholder="https://example.com/file.zip">
                            </div>

                            <div class="navtalk-form-row">
                                <label for="modal-title-tag">Title Tag:</label>
                                <select id="modal-title-tag" name="title_tag">
                                    <option value="">Default (H6)</option>
                                    <option value="h1">H1</option>
                                    <option value="h2">H2</option>
                                    <option value="h3">H3</option>
                                    <option value="h4">H4</option>
                                    <option value="h5">H5</option>
                                    <option value="h6">H6</option>
                                    <option value="span">Span</option>
                                    <option value="div">Div</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="navtalk-config-section">
                            <h3>Modal Settings</h3>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-inline-mode">Display Mode:</label>
                                <select id="modal-inline-mode" name="inline_mode">
                                    <option value="">Default (Inline)</option>
                                    <option value="true">Inline</option>
                                    <option value="false">Popup</option>
                                </select>
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-width">Modal Width:</label>
                                <input type="text" id="modal-width" name="modal_width" placeholder="e.g., 800px or 80%">
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-height">Modal Height:</label>
                                <input type="text" id="modal-height" name="modal_height" placeholder="e.g., 600px or 90vh">
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-max-width">Modal Max Width:</label>
                                <input type="text" id="modal-max-width" name="modal_max_width" placeholder="e.g., 600px">
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-max-height">Modal Max Height:</label>
                                <input type="text" id="modal-max-height" name="modal_max_height" placeholder="e.g., 90vh">
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-call-button-position">Call Button Position:</label>
                                <select id="modal-call-button-position" name="call_button_position">
                                    <option value="">Default</option>
                                    <option value="top-left">Top Left</option>
                                    <option value="top-right">Top Right</option>
                                    <option value="bottom-left">Bottom Left</option>
                                    <option value="bottom-right">Bottom Right</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="navtalk-config-section">
                            <h3>AI Configuration</h3>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-voice">Voice:</label>
                                <input type="text" id="modal-voice" name="voice" placeholder="Voice configuration">
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-model">Model:</label>
                                <input type="text" id="modal-model" name="model" placeholder="Model configuration">
                            </div>
                        </div>
                        
                        <div class="navtalk-config-section">
                            <h3>Advanced Settings</h3>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-class">Custom CSS Class:</label>
                                <input type="text" id="modal-class" name="class" placeholder="custom-class-name">
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-call-icon">Custom Call Icon URL:</label>
                                <input type="text" id="modal-call-icon" name="call_icon" placeholder="https://example.com/icon.svg">
                            </div>

                            <div class="navtalk-form-row">
                                <label for="modal-download-icon">Custom Download Icon URL:</label>
                                <input type="text" id="modal-download-icon" name="download_icon" placeholder="https://example.com/download.svg">
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-tools">Tools Configuration (JSON):</label>
                                <textarea id="modal-tools" name="tools" rows="3" placeholder='[{"type": "function", "name": "example"}]'></textarea>
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-call-start-audio">Call Start Audio URL:</label>
                                <input type="text" id="modal-call-start-audio" name="call_start_audio" placeholder="https://example.com/start.mp3">
                            </div>
                            
                            <div class="navtalk-form-row">
                                <label for="modal-call-end-audio">Call End Audio URL:</label>
                                <input type="text" id="modal-call-end-audio" name="call_end_audio" placeholder="https://example.com/end.mp3">
                            </div>
                        </div>
                    </form>
                    
                    <div class="navtalk-shortcode-preview">
                        <h4>Shortcode Preview:</h4>
                        <div id="navtalk-shortcode-preview-box" class="navtalk-preview-box"></div>
                    </div>
                </div>
                
                <div class="navtalk-modal-footer">
                    <button type="button" class="button button-secondary" id="navtalk-modal-cancel">Cancel</button>
                    <button type="button" class="button button-primary" id="navtalk-modal-copy">Copy Shortcode</button>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Get avatars list from API
     * 
     * @return array List of avatars
     */
    private function get_avatars_list() {
        $license = get_option('navtalk_license', '');
        
        if (empty($license)) {
            return [];
        }
        
        $api = new NavTalk_API();
        $url = NavTalk_Config::get_api_endpoint('/api/open/v1/avatar/list');
        
        $response = wp_remote_get($url, [
            'headers' => [
                'license' => $license,
                'Content-Type' => 'application/json'
            ],
            'timeout' => 15,
            'sslverify' => true
        ]);
        
        if (is_wp_error($response)) {
            return [];
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($status_code === 200 && isset($data['code']) && $data['code'] === 200) {
            return isset($data['data']) && is_array($data['data']) ? $data['data'] : [];
        }
        
        return [];
    }

    public static function is_success_avatar($avatar) {
        if (!is_array($avatar) || !isset($avatar['status'])) {
            return false;
        }

        return strtoupper(trim((string) $avatar['status'])) === 'SUCCESS';
    }
    
    /**
     * Render admin avatar card with copy shortcode functionality
     * 
     * @param array $avatar Avatar data from API
     */
    private function render_avatar_card_admin($avatar) {
        if (!is_array($avatar)) return;
        $api = new NavTalk_API();
        $thumbnail_url = isset($avatar['thumbnailUrl']) ? $avatar['thumbnailUrl'] : (isset($avatar['url']) ? $avatar['url'] : '');
        $image_url = $api->get_full_image_url($thumbnail_url);
        $avatar_id = isset($avatar['avatarId']) ? $avatar['avatarId'] : (isset($avatar['id']) ? $avatar['id'] : '');
        $avatar_name = isset($avatar['name']) ? $avatar['name'] : '';
        $status = isset($avatar['status']) ? $avatar['status'] : 'Unknown';
        $is_available = (strtoupper($status) === 'SUCCESS');

        // Extract display name
        $parts = explode('.', $avatar_name);
        $display_name = isset($parts[1]) ? $parts[1] : $avatar_name;

        // Generate shortcodes
        $shortcode_avatar = '[navtalk_avatar avatarId="' . esc_attr($avatar_id) . '"]';
        $shortcode_list = '[navtalk_list]';
        
        ?>
        <div class="navtalk-admin-avatar-card" style="background: #fff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: box-shadow 0.3s;">
            <div style="position: relative; padding-top: 133%; background: #f5f5f5;">
                <img src="<?php echo esc_url($image_url); ?>" 
                     alt="<?php echo esc_attr($display_name); ?>"
                     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 5% !important ;">
                <span class="status-badge" 
                      style="position: absolute; top: 10px; right: 10px; width: 12px; height: 12px; border-radius: 50%; background: <?php echo esc_attr($is_available ? '#4caf50' : '#f44336'); ?>; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
            </div>
            
            <div style="padding: 15px;">
                <h4 style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600; color: #333;">
                    <?php echo esc_html($display_name); ?>
                </h4>
                
                <p style="margin: 0 0 12px 0; font-size: 12px; color: <?php echo esc_attr($is_available ? '#4caf50' : '#999'); ?>; font-weight: 500;">
                    <?php echo esc_html($is_available ? __('● Available', 'navtalk-digital-human') : __('● Unavailable', 'navtalk-digital-human')); ?>
                </p>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #666;">Avatar Shortcode:</label>
                    <div style="display: flex; gap: 6px;">
                        <input type="text" 
                               value="<?php echo esc_attr($shortcode_avatar); ?>" 
                               readonly 
                               class="navtalk-shortcode-input"
                               style="flex: 1; font-size: 11px; font-family: monospace; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; background: #fafafa;">
                        <button type="button" 
                                class="button button-small copy-shortcode" 
                                data-shortcode="<?php echo esc_attr($shortcode_avatar); ?>"
                                style="padding: 4px 10px; font-size: 11px;">
                            Copy
                        </button>
                    </div>
                </div>
                
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-size: 11px; color: #667eea; font-weight: 500;">
                        ✓ Also available in Elementor
                    </p>
                    <p style="margin: 3px 0 0 0; font-size: 10px; color: #999;">
                        Find "Avatar for NavTalk" widget
                    </p>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Enqueue admin styles and inline script for settings page
     */
    public function enqueue_admin_assets($hook) {
        if ('settings_page_navtalk-settings' !== $hook) {
            return;
        }

        // Enqueue WordPress media library
        wp_enqueue_media();

        wp_enqueue_style(
            'navtalk-admin-style',
            NAVTALK_PLUGIN_URL . 'admin/css/admin-style.css',
            [],
            NAVTALK_VERSION
        );

        // Add inline styles for modal
        $modal_styles = <<<'CSS'
.navtalk-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100000;
}

.navtalk-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
}

.navtalk-modal-content {
    position: relative;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    margin: 30px auto;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.navtalk-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #ddd;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
}

.navtalk-modal-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #fff;
}

.navtalk-modal-close {
    background: transparent;
    border: none;
    color: #fff;
    font-size: 32px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
}

.navtalk-modal-close:hover {
    background: rgba(255, 255, 255, 0.2);
}

.navtalk-modal-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
}

.navtalk-config-section {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid #eee;
}

.navtalk-config-section:last-of-type {
    border-bottom: none;
}

.navtalk-config-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #667eea;
}

.navtalk-form-row {
    margin-bottom: 16px;
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 12px;
    align-items: start;
}

.navtalk-form-row label {
    font-weight: 500;
    color: #333;
    padding-top: 6px;
}

.navtalk-form-row input[type="text"],
.navtalk-form-row select,
.navtalk-form-row textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.navtalk-form-row textarea {
    resize: vertical;
    font-family: monospace;
}

.navtalk-shortcode-preview {
    margin-top: 24px;
    padding: 16px;
    background: #f9f9f9;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
}

.navtalk-shortcode-preview h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #555;
}

.navtalk-preview-box {
    padding: 12px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
    color: #333;
    word-break: break-all;
    white-space: pre-wrap;
}

.navtalk-modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #ddd;
    background: #f9f9f9;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

@media (max-width: 768px) {
    .navtalk-modal-content {
        width: 95%;
        margin: 20px auto;
    }
    
    .navtalk-form-row {
        grid-template-columns: 1fr;
        gap: 6px;
    }
    
    .navtalk-form-row label {
        padding-top: 0;
    }
}
CSS;
        wp_add_inline_style('navtalk-admin-style', $modal_styles);

        wp_register_script(
            'navtalk-admin-settings',
            false,
            ['jquery'],
            NAVTALK_VERSION,
            true
        );
        wp_enqueue_script('navtalk-admin-settings');

        wp_localize_script(
            'navtalk-admin-settings',
            'navtalkAdmin',
            [
                'testNonce'    => wp_create_nonce('navtalk_test'),
                'refreshNonce' => wp_create_nonce('navtalk_refresh_avatars'),
            ]
        );

        $inline = <<<'JS'
(function($) {
    // Background field JavaScript
    $('input[name="navtalk_floating_button_bg_type"]').on('change', function() {
        var type = $(this).val();
        if (type === 'image') {
            $('.navtalk-bg-gradient-section, .navtalk-bg-color-section').hide();
            $('.navtalk-bg-image-section').show();
        } else if (type === 'color') {
            $('.navtalk-bg-gradient-section, .navtalk-bg-image-section').hide();
            $('.navtalk-bg-color-section').show();
            $('#navtalk_bg_input').val($('#navtalk_bg_color').val());
        } else {
            $('.navtalk-bg-color-section, .navtalk-bg-image-section').hide();
            $('.navtalk-bg-gradient-section').show();
            $('#navtalk_bg_input').val($('#navtalk_bg_preset').val());
        }
        updateBgPreview();
    });

    $('#navtalk_bg_preset').on('change', function() {
        var value = $(this).val();
        $('#navtalk_bg_input').val(value);
        updateBgPreview();
    });

    $('#navtalk_bg_color').on('input change', function() {
        $('#navtalk_bg_input').val($(this).val());
        updateBgPreview();
    });

    function updateBgPreview() {
        var type = $('input[name="navtalk_floating_button_bg_type"]:checked').val();
        var preview = $('#navtalk_bg_preview_box');
        
        if (type === 'image') {
            var imageUrl = $('#navtalk_bg_image_url').val();
            if (imageUrl) {
                preview.css('background', 'url(' + imageUrl + ') center/cover');
            }
        } else if (type === 'color') {
            preview.css('background', $('#navtalk_bg_color').val());
        } else {
            preview.css('background', $('#navtalk_bg_preset').val());
        }
    }

    $('#navtalk_upload_bg_image').on('click', function(e) {
        e.preventDefault();
        var frame = wp.media({
            title: 'Select background image',
            button: { text: 'Use this image' },
            multiple: false
        });
        frame.on('select', function() {
            var attachment = frame.state().get('selection').first().toJSON();
            $('#navtalk_bg_image_url').val(attachment.url);
            $('#navtalk_bg_image_preview').empty().append(
                $('<img>').attr('src', attachment.url).css({
                    maxWidth: '150px',
                    borderRadius: '8px',
                    border: '2px solid #ddd'
                })
            );
            $('#navtalk_remove_bg_image').show();
            updateBgPreview();
        });
        frame.open();
    });

    $('#navtalk_remove_bg_image').on('click', function() {
        $('#navtalk_bg_image_url').val('');
        $('#navtalk_bg_image_preview').empty();
        $(this).hide();
        updateBgPreview();
    });

    // Call button icon field JavaScript
    $('input[name="navtalk_floating_button_icon_type"]').on('change', function() {
        var type = $(this).val();
        $('.navtalk-icon-image-section').hide();
        if (type === 'image') {
            $('.navtalk-icon-image-section').show();
        }
    });

    $('#navtalk_icon_color_picker').on('change', function() {
        $('#navtalk_icon_color_text').val($(this).val());
    });

    $('#navtalk_icon_color_text').on('input', function() {
        $('#navtalk_icon_color_picker').val($(this).val());
    });

    $('#navtalk_upload_icon_image').on('click', function(e) {
        e.preventDefault();
        var frame = wp.media({
            title: 'Select icon image',
            button: { text: 'Use this image' },
            multiple: false
        });
        frame.on('select', function() {
            var attachment = frame.state().get('selection').first().toJSON();
            $('#navtalk_icon_image_url').val(attachment.url);
            $('#navtalk_icon_image_preview').empty().append(
                $('<img>').attr('src', attachment.url).css({
                    maxWidth: '80px',
                    borderRadius: '8px',
                    border: '2px solid #ddd'
                })
            );
            $('#navtalk_remove_icon_image').show();
        });
        frame.open();
    });

    $('#navtalk_remove_icon_image').on('click', function() {
        $('#navtalk_icon_image_url').val('');
        $('#navtalk_icon_image_preview').empty();
        $(this).hide();
    });
    
    // License and test connection
    // Monitor license input changes
    $('#navtalk_license').on('input', function() {
        var license = $(this).val().trim();
        if (license.length > 0) {
            $('#test-connection-wrapper').fadeIn(200);
        } else {
            $('#test-connection-wrapper').fadeOut(200);
        }
    });
    
    // Test connection handler
    $('#test-connection').on('click', function() {
        var button = $(this);
        var result = $('#test-result');
        var license = $('#navtalk_license').val();
        
        button.prop('disabled', true).text('Testing...');
        result.empty();
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'navtalk_test_connection',
                license: license,
                nonce: (typeof navtalkAdmin !== 'undefined' && navtalkAdmin.testNonce) ? navtalkAdmin.testNonce : ''
            },
            success: function(response) {
                if (response.success) {
                    result.empty().append($('<span>').css('color', 'green').text('Success: ' + response.data.message));
                    // Refresh avatar list and dropdown
                    refreshAvatars();
                } else {
                    result.empty().append($('<span>').css('color', 'red').text('Error: ' + response.data.message));
                }
            },
            error: function() {
                result.empty().append($('<span>').css('color', 'red').text('Error: Connection test failed'));
            },
            complete: function() {
                button.prop('disabled', false).text('Test Connection');
            }
        });
    });
    
    // Refresh avatars function
    function refreshAvatars() {
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'navtalk_refresh_avatars',
                nonce: (typeof navtalkAdmin !== 'undefined' && navtalkAdmin.refreshNonce) ? navtalkAdmin.refreshNonce : ''
            },
            success: function(response) {
                if (response.success) {
                    // Update dropdown
                    $('#navtalk_floating_avatar').html(response.data.dropdown_html);
                    
                    // Update avatar cards
                    $('.navtalk-avatars-grid').parent().html(response.data.cards_html);
                    
                    // Re-bind copy button events
                    bindCopyEvents();
                    
                    console.log('Avatars refreshed: ' + response.data.count + ' avatars found');
                }
            },
            error: function() {
                console.error('Failed to refresh avatars');
            }
        });
    }
    
    // Copy shortcode handler
    function bindCopyEvents() {
        $('.copy-shortcode').off('click').on('click', function() {
            var button = $(this);
            var shortcode = button.data('shortcode');
            var avatarId = extractAvatarId(shortcode);
            var shortcodeType = detectShortcodeType(shortcode);
            
            // Show configuration modal
            showShortcodeModal(shortcode, avatarId, shortcodeType);
        });
    }
    
    // Extract avatar ID from shortcode
    function extractAvatarId(shortcode) {
        var match = shortcode.match(/avatarId="([^"]+)"/);
        return match ? match[1] : '';
    }
    
    // Detect shortcode type
    function detectShortcodeType(shortcode) {
        if (shortcode.indexOf('[navtalk_avatar') === 0) return 'avatar';
        if (shortcode.indexOf('[navtalk_list') === 0) return 'list';
        return 'avatar';
    }
    
    // Show shortcode configuration modal
    function showShortcodeModal(baseShortcode, avatarId, shortcodeType) {
        // Reset form
        $('#navtalk-shortcode-config-form')[0].reset();
        
        $('#modal-avatar-id').val(avatarId);
        $('#modal-shortcode-type').val(shortcodeType);
        
        // Show/hide list-only fields
        if (shortcodeType === 'list') {
            $('.list-only').show();
            if ($('#modal-filter').val() === 'custom') {
                $('.filter-custom-only').show();
            } else {
                $('.filter-custom-only').hide();
            }
        } else {
            $('.list-only').hide();
            $('.filter-custom-only').hide();
        }

        // Show/hide status position
        if ($('#modal-show-status').val() === 'true') {
            $('#status-position-row').show();
        } else {
            $('#status-position-row').hide();
        }
        
        // Update preview
        updateShortcodePreview();
        
        // Show modal
        $('#navtalk-shortcode-modal').fadeIn(200);
    }
    
    // Initialize modal events once
    function initModalEvents() {
        // Handle input changes
        $('#navtalk-shortcode-config-form input, #navtalk-shortcode-config-form select, #navtalk-shortcode-config-form textarea').on('input change', function() {
            updateShortcodePreview();
        });

        // Handle filter change for custom IDs
        $('#modal-filter').on('change', function() {
            if ($(this).val() === 'custom') {
                $('.filter-custom-only').show();
            } else {
                $('.filter-custom-only').hide();
            }
        });

        // Handle show_status change for position
        $('#modal-show-status').on('change', function() {
            if ($(this).val() === 'true') {
                $('#status-position-row').show();
            } else {
                $('#status-position-row').hide();
            }
        });
    }
    
    // Update shortcode preview
    function updateShortcodePreview() {
        var shortcode = generateShortcode();
        $('#navtalk-shortcode-preview-box').text(shortcode);
    }
    
    // Generate shortcode from form
    function generateShortcode() {
        var avatarId = $('#modal-avatar-id').val();
        var shortcodeType = $('#modal-shortcode-type').val();
        var formData = $('#navtalk-shortcode-config-form').serializeArray();
        
        var shortcodeName = 'navtalk_' + shortcodeType;
        var shortcode = '[' + shortcodeName;
        
        if (shortcodeType !== 'list' && avatarId) {
            shortcode += ' avatarId="' + avatarId + '"';
        }
        
        // Add parameters
        $.each(formData, function(index, field) {
            if (field.name !== 'avatarId' && field.name !== 'shortcode_type' && field.value && field.value !== '') {
                // Escape quotes in value
                var value = field.value.replace(/"/g, '\\"');
                shortcode += ' ' + field.name + '="' + value + '"';
            }
        });
        
        shortcode += ']';
        return shortcode;
    }
    
    // Modal close handlers
    $('.navtalk-modal-close, #navtalk-modal-cancel, .navtalk-modal-overlay').on('click', function() {
        $('#navtalk-shortcode-modal').fadeOut(200);
    });
    
    // Prevent modal content click from closing
    $('.navtalk-modal-content').on('click', function(e) {
        e.stopPropagation();
    });
    
    // Update preview on form change
    $('#navtalk-shortcode-config-form').on('change input', function() {
        updateShortcodePreview();
    });
    
    // Copy shortcode button
    $('#navtalk-modal-copy').on('click', function() {
        var shortcode = generateShortcode();
        var button = $(this);
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shortcode).then(function() {
                showModalCopySuccess(button);
                setTimeout(function() {
                    $('#navtalk-shortcode-modal').fadeOut(200);
                }, 1000);
            }).catch(function() {
                fallbackModalCopy(shortcode, button);
            });
        } else {
            fallbackModalCopy(shortcode, button);
        }
    });
    
    // Modal copy success
    function showModalCopySuccess(button) {
        var originalText = button.text();
        button.text('✓ Copied!').addClass('button-success');
        setTimeout(function() {
            button.text(originalText).removeClass('button-success');
        }, 2000);
    }
    
    // Fallback copy for modal
    function fallbackModalCopy(text, button) {
        var temp = $('<textarea>');
        $('body').append(temp);
        temp.val(text).select();
        try {
            document.execCommand('copy');
            showModalCopySuccess(button);
            setTimeout(function() {
                $('#navtalk-shortcode-modal').fadeOut(200);
            }, 1000);
        } catch (err) {
            alert('Failed to copy. Please copy manually from the preview box.');
        }
        temp.remove();
    }
    
    // Initial binding
    bindCopyEvents();
    initModalEvents();
    
    function fallbackCopy(text, button) {
        var temp = $('<textarea>');
        $('body').append(temp);
        temp.val(text).select();
        try {
            document.execCommand('copy');
            showCopySuccess(button);
        } catch (err) {
            button.text('Failed').css('background-color', '#f44336');
            setTimeout(function() {
                button.text('Copy').css('background-color', '');
            }, 2000);
        }
        temp.remove();
    }
    
    function showCopySuccess(button) {
        var originalText = button.text();
        button.text('Copied!').css({
            'background-color': '#4caf50',
            'color': '#fff',
            'border-color': '#4caf50'
        });
        setTimeout(function() {
            button.text(originalText).css({
                'background-color': '',
                'color': '',
                'border-color': ''
            });
        }, 2000);
    }
})(jQuery);
JS;
        wp_add_inline_script('navtalk-admin-settings', $inline);
    }
}

/**
 * AJAX handler for testing API connection
 * Use output buffering to prevent BOM/whitespace from included files breaking JSON response.
 */
add_action('wp_ajax_navtalk_test_connection', function() {
    ob_start();

    if (!current_user_can('manage_options')) {
        ob_end_clean();
        wp_send_json_error(['message' => 'Permission denied'], 403);
    }

    $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
    if (!wp_verify_nonce($nonce, 'navtalk_test')) {
        ob_end_clean();
        wp_send_json_error(['message' => 'Invalid security token.'], 403);
    }

    // Temporarily set license for testing
    $test_license = isset($_POST['license']) ? sanitize_text_field(wp_unslash($_POST['license'])) : '';

    if (empty($test_license)) {
        ob_end_clean();
        wp_send_json_error(['message' => 'License key is empty']);
        return;
    }

    // Update option temporarily for test
    $original_license = get_option('navtalk_license');
    update_option('navtalk_license', $test_license);

    $api = new NavTalk_API();
    $result = $api->test_connection();

    // Restore original license if test failed
    if (!$result['success']) {
        update_option('navtalk_license', $original_license);
    }

    ob_end_clean();
    if ($result['success']) {
        wp_send_json_success($result);
    } else {
        wp_send_json_error($result);
    }
});

/**
 * AJAX handler for refreshing avatars list
 */
add_action('wp_ajax_navtalk_refresh_avatars', function() {
    ob_start();

    if (!current_user_can('manage_options')) {
        ob_end_clean();
        wp_send_json_error(['message' => 'Permission denied'], 403);
    }

    $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
    if (!wp_verify_nonce($nonce, 'navtalk_refresh_avatars')) {
        ob_end_clean();
        wp_send_json_error(['message' => 'Invalid security token.'], 403);
    }

    $license = get_option('navtalk_license', '');
    if (empty($license)) {
        ob_end_clean();
        wp_send_json_error(['message' => 'License key is empty']);
        return;
    }

    // Get avatars list
    $url = NavTalk_Config::get_api_endpoint('/api/open/v1/avatar/list');
    $response = wp_remote_get($url, [
        'headers' => [
            'license' => $license,
            'Content-Type' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => true
    ]);

    if (is_wp_error($response)) {
        ob_end_clean();
        wp_send_json_error(['message' => 'Failed to fetch avatars: ' . $response->get_error_message()]);
        return;
    }

    $status_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if ($status_code !== 200 || !isset($data['code']) || $data['code'] !== 200) {
        ob_end_clean();
        wp_send_json_error(['message' => 'Failed to fetch avatars from API']);
        return;
    }

    $avatars = isset($data['data']) && is_array($data['data']) ? $data['data'] : [];

    // Generate dropdown options HTML
    $dropdown_html = '<option value="">' . esc_html__('— Please Select —', 'navtalk-digital-human') . '</option>';
    foreach ($avatars as $avatar) {
        $avatar_id = isset($avatar['avatarId']) ? $avatar['avatarId'] : (isset($avatar['id']) ? $avatar['id'] : '');
        $name = isset($avatar['name']) ? $avatar['name'] : '';
        $parts = explode('.', $name);
        $display = isset($parts[1]) ? $parts[1] : $name;
        if ('' === (string) $avatar_id || !NavTalk_Admin::is_success_avatar($avatar)) continue;
        
        $dropdown_html .= '<option value="' . esc_attr($avatar_id) . '">' . 
                          esc_html($display ?: $avatar_id) . 
                          '</option>';
    }

    // Generate cards HTML
    ob_start();
    if (!empty($avatars)) {
        echo '<p style="margin-bottom: 10px; color: #666;">Click "Copy" to quickly use these avatars in your pages:</p>';
        
        echo '<div style="margin-bottom: 25px; padding: 15px; background: #fff; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">';
        echo '<label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px;">Avatar List Shortcode:</label>';
        echo '<div style="display: flex; gap: 10px; align-items: center;">';
        echo '<code style="flex: 1; padding: 10px; background: #f9f9f9; border: 1px solid #eee; border-radius: 4px; font-size: 13px; color: #667eea;">[navtalk_list]</code>';
        echo '<button type="button" class="button button-primary copy-shortcode" data-shortcode="[navtalk_list]" style="height: 38px; padding: 0 20px;">Copy with Config</button>';
        echo '</div>';
        echo '<p class="description" style="margin-top: 8px;">Use this shortcode to display all your available avatars in a grid.</p>';
        echo '</div>';

        echo '<div class="navtalk-avatars-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 15px;">';
        $admin = new NavTalk_Admin();
        foreach ($avatars as $avatar) {
            // Use reflection to call private method
            $method = new ReflectionMethod('NavTalk_Admin', 'render_avatar_card_admin');
            $method->setAccessible(true);
            $method->invoke($admin, $avatar);
        }
        echo '</div>';
    } else {
        echo '<p style="color: #d32f2f; font-weight: 500;">⚠ No avatars found. Please verify your license key is correct.</p>';
    }
    $cards_html = ob_get_clean();

    // Clean any accidental output from the first buffer
    ob_get_clean();

    wp_send_json_success([
        'message' => 'Avatars refreshed successfully',
        'dropdown_html' => $dropdown_html,
        'cards_html' => $cards_html,
        'count' => count($avatars)
    ]);
});

/**
 * Data migration: Upgrade from old button_color to new background system
 */
function navtalk_digital_human_migrate_button_background_settings() {
    $old_color = get_option('navtalk_floating_button_color');
    $new_background = get_option('navtalk_floating_button_background');
    $bg_type = get_option('navtalk_floating_button_bg_type');
    
    // If old value exists but new values don't, migrate data
    if (!empty($old_color) && empty($new_background) && empty($bg_type)) {
        update_option('navtalk_floating_button_background', $old_color);
        update_option('navtalk_floating_button_bg_type', 'color');
    }
}
add_action('admin_init', 'navtalk_digital_human_migrate_button_background_settings');
