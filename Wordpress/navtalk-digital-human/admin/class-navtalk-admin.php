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
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_styles']);
        add_action('add_meta_boxes', [$this, 'add_navtalk_meta_box']);
        add_action('save_post', [$this, 'save_navtalk_meta'], 10, 2);
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
                'auth_callback' => function () { return current_user_can('edit_posts'); },
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
            __('Digital Human Assistant', 'navtalk-dh'),
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
                <?php esc_html_e('Show Digital Human Assistant on This Page', 'navtalk-dh'); ?>
            </label>
        </p>
        <p class="description"><?php esc_html_e('Only takes effect when global digital human assistant is enabled in settings. Uncheck to hide floating digital human on this page.', 'navtalk-dh'); ?></p>
        <?php
    }

    public function save_navtalk_meta($post_id, $post) {
        if (!isset($_POST['navtalk_show_floating_nonce']) ||
            !wp_verify_nonce($_POST['navtalk_show_floating_nonce'], 'navtalk_show_floating_nonce')) {
            return;
        }
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        $val = isset($_POST['navtalk_show_floating']) && $_POST['navtalk_show_floating'] === 'show' ? 'show' : 'hide';
        update_post_meta($post_id, '_navtalk_show_floating', $val);
    }
    
    /**
     * Add settings page to WordPress admin menu
     */
    public function add_settings_page() {
        add_options_page(
            'NavTalk Digital Human Settings',
            'NavTalk Digital Human',
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
        register_setting('navtalk_options_group', 'navtalk_floating_position', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'bottom-right'
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_button_size', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => '60px'
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_button_color', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => '#667eea'
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_custom_style', [
            'type' => 'string',
            'sanitize_callback' => 'wp_strip_all_tags',
            'default' => ''
        ]);
        
        // New: Toggle button and advanced configuration
        register_setting('navtalk_options_group', 'navtalk_show_toggle_button', [
            'type' => 'string',
            'sanitize_callback' => function ($v) { return $v ? '1' : '0'; },
            'default' => '1'
        ]);
        register_setting('navtalk_options_group', 'navtalk_floating_prompt', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_textarea_field',
            'default' => ''
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
        register_setting('navtalk_options_group', 'navtalk_floating_js_callbacks', [
            'type' => 'string',
            'sanitize_callback' => function($v) {
                // Allow script tags but remove dangerous content
                $allowed_tags = [
                    'script' => ['type' => true],
                ];
                return wp_kses($v, $allowed_tags);
            },
            'default' => ''
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
            __('Digital Human Assistant', 'navtalk-dh'),
            [$this, 'render_floating_section_callback'],
            'navtalk-settings'
        );
        add_settings_field(
            'navtalk_floating_enabled',
            __('Enable Digital Human Assistant', 'navtalk-dh'),
            [$this, 'render_floating_enabled_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_avatar',
            __('Select Digital Human Avatar', 'navtalk-dh'),
            [$this, 'render_floating_avatar_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_position',
            __('Floating Position', 'navtalk-dh'),
            [$this, 'render_floating_position_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_button_size',
            __('Call Button Size', 'navtalk-dh'),
            [$this, 'render_floating_button_size_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_button_color',
            __('Call Button Color', 'navtalk-dh'),
            [$this, 'render_floating_button_color_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_custom_style',
            __('Custom Style (CSS)', 'navtalk-dh'),
            [$this, 'render_floating_custom_style_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_show_toggle_button',
            __('Show Toggle Button', 'navtalk-dh'),
            [$this, 'render_show_toggle_button_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_prompt',
            __('Custom Prompt', 'navtalk-dh'),
            [$this, 'render_floating_prompt_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_voice',
            __('Voice Configuration', 'navtalk-dh'),
            [$this, 'render_floating_voice_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_model',
            __('Model Configuration', 'navtalk-dh'),
            [$this, 'render_floating_model_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
        add_settings_field(
            'navtalk_floating_js_callbacks',
            __('Custom JS Callbacks', 'navtalk-dh'),
            [$this, 'render_floating_js_callbacks_field'],
            'navtalk-settings',
            'navtalk_floating_section'
        );
    }
    
    /**
     * Render settings section description
     */
    public function render_section_callback() {
        echo '<p>Configure your NavTalk API license key. Get your license key from <a href="https://console.navtalk.ai" target="_blank">NavTalk Console</a>.</p>';
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
        
        <?php if (!empty($license)): ?>
            <div style="margin-top: 10px;">
                <button type="button" id="test-connection" class="button button-secondary">
                    Test Connection
                </button>
                <span id="test-result" style="margin-left: 10px;"></span>
            </div>
        <?php endif; ?>
        
        <script>
        jQuery(document).ready(function($) {
            $('#test-connection').on('click', function() {
                var button = $(this);
                var result = $('#test-result');
                
                button.prop('disabled', true).text('Testing...');
                result.html('');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'navtalk_test_connection',
                        license: $('#navtalk_license').val()
                    },
                    success: function(response) {
                        if (response.success) {
                            result.html('<span style="color: green;">✓ ' + response.data.message + '</span>');
                        } else {
                            result.html('<span style="color: red;">✗ ' + response.data.message + '</span>');
                        }
                    },
                    error: function() {
                        result.html('<span style="color: red;">✗ Connection test failed</span>');
                    },
                    complete: function() {
                        button.prop('disabled', false).text('Test Connection');
                    }
                });
            });
            
            // Copy shortcode to clipboard
            $('.copy-shortcode').on('click', function() {
                var button = $(this);
                var shortcode = button.data('shortcode');
                
                // Use modern clipboard API if available
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(shortcode).then(function() {
                        showCopySuccess(button);
                    }).catch(function() {
                        fallbackCopy(shortcode, button);
                    });
                } else {
                    fallbackCopy(shortcode, button);
                }
            });
            
            // Fallback copy method for older browsers
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
            
            // Show success feedback
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
        });
        </script>
        <?php
    }

    /**
     * Digital Human Assistant section description
     */
    public function render_floating_section_callback() {
        echo '<p>' . esc_html__('When enabled, a floating digital human assistant will appear on the front end. Each page/post can individually control whether to show the digital human.', 'navtalk-dh') . '</p>';
    }

    public function render_floating_enabled_field() {
        $enabled = get_option('navtalk_floating_enabled', '0');
        ?>
        <input type="hidden" name="navtalk_floating_enabled" value="0">
        <label>
            <input type="checkbox" name="navtalk_floating_enabled" value="1" <?php checked($enabled, '1'); ?>>
            <?php esc_html_e('Enable Global Digital Human Assistant (Floating)', 'navtalk-dh'); ?>
        </label>
        <?php
    }

    public function render_floating_avatar_field() {
        $current = get_option('navtalk_floating_avatar', '');
        $avatars = $this->get_avatars_list();
        ?>
        <select name="navtalk_floating_avatar" id="navtalk_floating_avatar" class="regular-text">
            <option value=""><?php esc_html_e('— Please Select —', 'navtalk-dh'); ?></option>
            <?php foreach ($avatars as $avatar) :
                $name = isset($avatar['name']) ? $avatar['name'] : '';
                $status = isset($avatar['status']) ? $avatar['status'] : '';
                $available = (strtoupper($status) === 'SUCCESS');
                $parts = explode('.', $name);
                $display = isset($parts[1]) ? $parts[1] : $name;
                if (empty($name)) continue;
            ?>
                <option value="<?php echo esc_attr($name); ?>" <?php selected($current, $name); ?>>
                    <?php echo esc_html($display); ?><?php echo $available ? '' : ' (' . esc_html__('Unavailable', 'navtalk-dh') . ')'; ?>
                </option>
            <?php endforeach; ?>
        </select>
        <p class="description"><?php esc_html_e('Select an available digital human avatar from your Avatar list. Please save your License Key first and ensure avatars are available.', 'navtalk-dh'); ?></p>
        <?php
    }

    public function render_floating_position_field() {
        $current = get_option('navtalk_floating_position', 'bottom-right');
        $positions = [
            'bottom-right' => __('Bottom Right', 'navtalk-dh'),
            'bottom-left'  => __('Bottom Left', 'navtalk-dh'),
            'top-right'   => __('Top Right', 'navtalk-dh'),
            'top-left'    => __('Top Left', 'navtalk-dh'),
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
        <p class="description"><?php esc_html_e('Example: 50px, 60px, 70px', 'navtalk-dh'); ?></p>
        <?php
    }

    public function render_floating_button_color_field() {
        $color = get_option('navtalk_floating_button_color', '#667eea');
        ?>
        <input type="text" name="navtalk_floating_button_color" id="navtalk_floating_button_color"
               value="<?php echo esc_attr($color); ?>" class="small-text" placeholder="#667eea">
        <?php
    }

    public function render_floating_custom_style_field() {
        $style = get_option('navtalk_floating_custom_style', '');
        ?>
        <textarea name="navtalk_floating_custom_style" id="navtalk_floating_custom_style" rows="6" class="large-text code" placeholder=".ntw-container { }"><?php echo esc_textarea($style); ?></textarea>
        <p class="description"><?php esc_html_e('Custom CSS for the global floating digital human container. Can override position, size, etc.', 'navtalk-dh'); ?></p>
        <?php
    }

    public function render_show_toggle_button_field() {
        $show_toggle = get_option('navtalk_show_toggle_button', '1');
        ?>
        <input type="hidden" name="navtalk_show_toggle_button" value="0">
        <label>
            <input type="checkbox" name="navtalk_show_toggle_button" value="1" <?php checked($show_toggle, '1'); ?>>
            <?php esc_html_e('Show Hide/Show Toggle Button', 'navtalk-dh'); ?>
        </label>
        <p class="description"><?php esc_html_e('When enabled, users can hide or show the digital human panel via button.', 'navtalk-dh'); ?></p>
        <?php
    }

    public function render_floating_prompt_field() {
        $prompt = get_option('navtalk_floating_prompt', '');
        ?>
        <textarea name="navtalk_floating_prompt" id="navtalk_floating_prompt" rows="4" class="large-text" placeholder="<?php esc_attr_e('Leave empty to use default prompt...', 'navtalk-dh'); ?>"><?php echo esc_textarea($prompt); ?></textarea>
        <p class="description"><?php esc_html_e('Custom prompt instructions for the digital human. Leave empty to use default configuration.', 'navtalk-dh'); ?></p>
        <?php
    }

    public function render_floating_voice_field() {
        $voice = get_option('navtalk_floating_voice', '');
        ?>
        <input type="text" name="navtalk_floating_voice" id="navtalk_floating_voice"
               value="<?php echo esc_attr($voice); ?>" class="regular-text" placeholder="<?php esc_attr_e('Leave empty to use default voice', 'navtalk-dh'); ?>">
        <p class="description"><?php esc_html_e('Configure the digital human voice. Leave empty to use default configuration.', 'navtalk-dh'); ?></p>
        <?php
    }

    public function render_floating_model_field() {
        $model = get_option('navtalk_floating_model', '');
        ?>
        <input type="text" name="navtalk_floating_model" id="navtalk_floating_model"
               value="<?php echo esc_attr($model); ?>" class="regular-text" placeholder="<?php esc_attr_e('Leave empty to use default model', 'navtalk-dh'); ?>">
        <p class="description"><?php esc_html_e('Configure the digital human model. Leave empty to use default configuration.', 'navtalk-dh'); ?></p>
        <?php
    }

    public function render_floating_js_callbacks_field() {
        $js_callbacks = get_option('navtalk_floating_js_callbacks', '');
        ?>
        <textarea name="navtalk_floating_js_callbacks" id="navtalk_floating_js_callbacks" rows="10" class="large-text code" placeholder="// Example:&#10;window.navtalkOnInit = function(widget) {&#10;    console.log('initialized');&#10;};"><?php echo esc_textarea($js_callbacks); ?></textarea>
        <p class="description">
            <?php esc_html_e('Add custom JavaScript callback functions. Available callbacks:', 'navtalk-dh'); ?><br>
            <code>window.navtalkOnInit(widget)</code> - <?php esc_html_e('Triggered on initialization', 'navtalk-dh'); ?><br>
            <code>window.navtalkOnToggle(isExpanded)</code> - <?php esc_html_e('Triggered on toggle show/hide', 'navtalk-dh'); ?><br>
            <code>window.navtalkOnConnect(avatarName, config)</code> - <?php esc_html_e('Triggered on connecting to digital human', 'navtalk-dh'); ?>
        </p>
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
        if (isset($_GET['settings-updated'])) {
            add_settings_error(
                'navtalk_messages',
                'navtalk_message',
                'Settings Saved Successfully',
                'updated'
            );
        }
        
        settings_errors('navtalk_messages');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <div class="navtalk-admin-header" style="margin: 20px 0; padding: 20px; background: #fff; border-left: 4px solid #667eea;">
                <h2 style="margin-top: 0;">Welcome to NavTalk Digital Human</h2>
                <p>Integrate real-time AI avatar conversations into your WordPress site.</p>
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
                        echo '<p style="margin-bottom: 15px; color: #666;">Click "Copy" to quickly use these avatars in your pages:</p>';
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
                
                <p style="font-size: 14px; color: #555;">NavTalk provides two custom Elementor widgets for easy drag-and-drop integration:</p>
                
                <div style="margin: 20px 0;">
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Step 1: Find NavTalk Widgets</h3>
                    <div style="margin: 15px 0; padding: 20px; background: #f5f5f5; border-radius: 6px; text-align: center;">
                        <div style="width: 100%; height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; border: 2px dashed #fff;">
                           <img src="<?php echo NAVTALK_PLUGIN_URL; ?>public/images/widget.png" alt="NavTalk Widgets" style="max-width: 90%; max-height: 90%; object-fit: contain;">
                        </div>
                        <p style="margin-top: 10px; font-size: 12px; color: #666; font-style: italic;">Shows Elementor left sidebar with "NavTalk" category and two widgets</p>
                    </div>
                    <ol style="font-size: 14px; line-height: 1.8;">
                        <li>Open any page in <strong>Elementor Editor</strong></li>
                        <li>In the left sidebar widget panel, find the <strong>"NavTalk"</strong> category</li>
                        <li>You'll see two widgets:
                            <ul style="margin-top: 8px;">
                                <li><strong>NavTalk Avatar List</strong> - Display all avatars in a responsive grid</li>
                                <li><strong>NavTalk Avatar</strong> - Display a single selected avatar</li>
                            </ul>
                        </li>
                    </ol>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Step 2: Drag Widget to Page</h3>
                    <div style="margin: 15px 0; padding: 20px; background: #f5f5f5; border-radius: 6px; text-align: center;">
                        <div style="width: 100%; height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; border: 2px dashed #fff;">
                            <img src="<?php echo NAVTALK_PLUGIN_URL; ?>public/images/avatar-setting.png" alt="Drag Widget" style="max-width: 90%; max-height: 90%; object-fit: contain;">
                        </div>
                        <p style="margin-top: 10px; font-size: 12px; color: #666; font-style: italic;">Shows dragging NavTalk widget from sidebar to page canvas</p>
                    </div>
                    <p style="font-size: 14px;">Simply <strong>drag</strong> your desired widget to the page canvas where you want it to appear.</p>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Step 3: Configure Widget Settings</h3>
                    <div style="margin: 15px 0; padding: 20px; background: #f5f5f5; border-radius: 6px; text-align: center;">
                        <div style="width: 100%; height: 250px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; border: 2px dashed #fff;">
                            <img src="<?php echo NAVTALK_PLUGIN_URL; ?>public/images/avatar-list.png" alt="Widget Settings" style="max-width: 90%; max-height: 90%; object-fit: contain;">
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
                    <span style="color: #555; font-size: 13px;"> Use the <strong>NavTalk Avatar List</strong> widget in full-width sections for best results. Adjust columns based on your layout - try 3 columns for desktop, which automatically adapts to mobile screens.</span>
                </div>
            </div>
            
            <div class="navtalk-config-guide" style="margin-top: 30px; padding: 20px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
                <h2>Shortcode Usage</h2>
                <p>You can also use shortcodes directly in posts, pages, or widgets:</p>
                
                <h3 style="font-size: 14px; margin-top: 15px;">Single Avatar</h3>
                <code style="display: block; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">[navtalk_avatar name="navtalk.Ethan"]</code>
                
                <h3 style="font-size: 14px; margin-top: 15px;">Button Only</h3>
                <code style="display: block; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">[navtalk_button name="navtalk.Emma" text="Chat Now"]</code>
                
                <h3 style="font-size: 14px; margin-top: 15px;">Avatar List</h3>
                <code style="display: block; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">[navtalk_list]</code>

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
    
    /**
     * Render admin avatar card with copy shortcode functionality
     * 
     * @param array $avatar Avatar data from API
     */
    private function render_avatar_card_admin($avatar) {
        $api = new NavTalk_API();
        $thumbnail_url = isset($avatar['thumbnailUrl']) ? $avatar['thumbnailUrl'] : ($avatar['url'] ?? '');
        $image_url = $api->get_full_image_url($thumbnail_url);
        $avatar_name = isset($avatar['name']) ? $avatar['name'] : '';
        $status = isset($avatar['status']) ? $avatar['status'] : 'Unknown';
        $is_available = (strtoupper($status) === 'SUCCESS');
        
        // Extract display name
        $parts = explode('.', $avatar_name);
        $display_name = isset($parts[1]) ? $parts[1] : $avatar_name;
        
        // Generate shortcodes
        $shortcode_avatar = '[navtalk_avatar name="' . esc_attr($avatar_name) . '"]';
        $shortcode_button = '[navtalk_button name="' . esc_attr($avatar_name) . '" text="Chat Now"]';
        $shortcode_list = '[navtalk_list]';
        
        ?>
        <div class="navtalk-admin-avatar-card" style="background: #fff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: box-shadow 0.3s;">
            <div style="position: relative; padding-top: 133%; background: #f5f5f5;">
                <img src="<?php echo esc_url($image_url); ?>" 
                     alt="<?php echo esc_attr($display_name); ?>"
                     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 5% !important ;">
                <span class="status-badge" 
                      style="position: absolute; top: 10px; right: 10px; width: 12px; height: 12px; border-radius: 50%; background: <?php echo $is_available ? '#4caf50' : '#f44336'; ?>; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
            </div>
            
            <div style="padding: 15px;">
                <h4 style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600; color: #333;">
                    <?php echo esc_html($display_name); ?>
                </h4>
                
                <p style="margin: 0 0 12px 0; font-size: 12px; color: <?php echo $is_available ? '#4caf50' : '#999'; ?>; font-weight: 500;">
                    <?php echo $is_available ? '● Available' : '● Unavailable'; ?>
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
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #666;">Button Shortcode:</label>
                    <div style="display: flex; gap: 6px;">
                        <input type="text" 
                               value="<?php echo esc_attr($shortcode_button); ?>" 
                               readonly 
                               class="navtalk-shortcode-input"
                               style="flex: 1; font-size: 11px; font-family: monospace; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; background: #fafafa;">
                        <button type="button" 
                                class="button button-small copy-shortcode" 
                                data-shortcode="<?php echo esc_attr($shortcode_button); ?>"
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
                        Find "NavTalk Avatar" widget
                    </p>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Enqueue admin styles
     */
    public function enqueue_admin_styles($hook) {
        if ('settings_page_navtalk-settings' !== $hook) {
            return;
        }
        
        wp_enqueue_style(
            'navtalk-admin-style',
            NAVTALK_PLUGIN_URL . 'admin/css/admin-style.css',
            [],
            NAVTALK_VERSION
        );
    }
}

/**
 * AJAX handler for testing API connection
 * Use output buffering to prevent BOM/whitespace from included files breaking JSON response.
 */
add_action('wp_ajax_navtalk_test_connection', function() {
    ob_start();

    check_ajax_referer('navtalk_test', 'nonce', false);

    if (!current_user_can('manage_options')) {
        ob_end_clean();
        wp_send_json_error(['message' => 'Permission denied']);
        return;
    }

    // Temporarily set license for testing
    $test_license = isset($_POST['license']) ? sanitize_text_field($_POST['license']) : '';

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
