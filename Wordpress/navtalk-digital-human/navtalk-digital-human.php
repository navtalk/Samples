<?php
/**
 * Plugin Name: NavTalk Digital Human
 * Description: Integrate NavTalk real-time digital human conversation into WordPress. Simply configure your license key and use [navtalk_avatar avatarId="your-avatar-id"] shortcode to embed avatars.
 * Version: 1.0.3
 * Author: NavTalk
 * Author URI: https://navtalk.ai
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: navtalk-digital-human
 * Domain Path: /languages
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

// Plugin version
define('NAVTALK_VERSION', '1.0.3');

// Plugin directory path
define('NAVTALK_PLUGIN_DIR', plugin_dir_path(__FILE__));

// Plugin directory URL
define('NAVTALK_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * The code that runs during plugin activation.
 */
function navtalk_digital_human_activate() {
    // Add default options
    add_option('navtalk_license', '');
    // Global digital human assistant (floating) default options
    add_option('navtalk_floating_enabled', '0');
    add_option('navtalk_floating_avatar', '');
    add_option('navtalk_floating_position', 'bottom-right');
    add_option('navtalk_floating_button_size', '60px');
    add_option('navtalk_floating_button_color', '#667eea');
    // New: Toggle button and advanced configuration
    add_option('navtalk_show_toggle_button', '1');
    add_option('navtalk_floating_prompt', '');
    add_option('navtalk_floating_voice', '');
    add_option('navtalk_floating_model', '');

    // Flush rewrite rules
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'navtalk_digital_human_activate');

/**
 * The code that runs during plugin deactivation.
 */
function navtalk_digital_human_deactivate() {
    // Flush rewrite rules
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'navtalk_digital_human_deactivate');

/**
 * Load plugin classes
 */
require_once NAVTALK_PLUGIN_DIR . 'includes/class-navtalk-config.php';
require_once NAVTALK_PLUGIN_DIR . 'includes/class-navtalk-api.php';
require_once NAVTALK_PLUGIN_DIR . 'includes/class-navtalk-shortcode.php';
require_once NAVTALK_PLUGIN_DIR . 'admin/class-navtalk-admin.php';
require_once NAVTALK_PLUGIN_DIR . 'public/class-navtalk-public.php';

/**
 * Initialize the plugin
 */
function navtalk_digital_human_init() {
    // Initialize admin
    if (is_admin()) {
        $admin = new NavTalk_Admin();
        $admin->init();
    }
    
    // Initialize public
    $public = new NavTalk_Public();
    $public->init();
    
    // Initialize shortcode
    $shortcode = new NavTalk_Shortcode();
    $shortcode->init();
}
/**
 * One-time cleanup and version tracking (e.g. remove deprecated options).
 */
function navtalk_digital_human_maybe_upgrade() {
    $stored = get_option('navtalk_installed_version', '');
    if ($stored === NAVTALK_VERSION) {
        return;
    }
    delete_option('navtalk_floating_js_callbacks');
    update_option('navtalk_installed_version', NAVTALK_VERSION);
}
add_action('plugins_loaded', 'navtalk_digital_human_maybe_upgrade', 1);

/**
 * Load plugin text domain for translations.
 */
function navtalk_load_textdomain() {
    load_plugin_textdomain(
        'navtalk-digital-human',
        false,
        dirname(plugin_basename(__FILE__)) . '/languages'
    );
}
add_action('plugins_loaded', 'navtalk_load_textdomain', 5);

/**
 * Suggested text for the site Privacy Policy (Tools > Privacy).
 */
function navtalk_register_privacy_policy_suggested_text() {
    if (!function_exists('wp_add_privacy_policy_content')) {
        return;
    }
    $content  = '<p>' . esc_html__(
        'This plugin sends your stored NavTalk license key to NavTalk (api.navtalk.ai) and may open WebSocket sessions (wss://transfer.navtalk.ai) for real-time voice and video. Visitor microphone and camera use follows browser permissions; session and media data are processed under NavTalk policies, not stored in the plugin database for visitors.',
        'navtalk-digital-human'
    ) . '</p>';
    $content .= '<p><a href="https://navtalk.ai/policy/privacy-policy/" target="_blank" rel="noopener">' . esc_html__(
        'NavTalk Privacy Policy',
        'navtalk-digital-human'
    ) . '</a> &mdash; <a href="https://navtalk.ai/policy/terms-of-service/" target="_blank" rel="noopener">' . esc_html__(
        'Terms of Service',
        'navtalk-digital-human'
    ) . '</a></p>';
    wp_add_privacy_policy_content(
        __('NavTalk Digital Human', 'navtalk-digital-human'),
        $content
    );
}
add_action('admin_init', 'navtalk_register_privacy_policy_suggested_text');

add_action('plugins_loaded', 'navtalk_digital_human_init');

/**
 * Enable shortcode parsing in Gutenberg HTML blocks
 * 
 * This allows users to use NavTalk shortcodes directly in Custom HTML blocks
 * without needing to use do_shortcode() wrapper or separate Shortcode blocks.
 * 
 * @since 1.0.0
 */
function navtalk_enable_shortcode_in_html_block() {
    add_filter('render_block', function($block_content, $block) {
        // Check if this is a custom HTML block
        if ($block['blockName'] === 'core/html') {
            // Parse shortcodes in the HTML content
            return do_shortcode($block_content);
        }
        return $block_content;
    }, 10, 2);
}
add_action('init', 'navtalk_enable_shortcode_in_html_block');

/**
 * Enable shortcode parsing in all content areas
 * 
 * This ensures NavTalk shortcodes work in all content types including
 * HTML blocks, text widgets, and other content areas.
 * Priority 11 ensures it runs after default WordPress content filters.
 * 
 * @since 1.0.0
 */
add_filter('the_content', 'do_shortcode', 11);

/**
 * Register Elementor Widgets
 */
function navtalk_register_elementor_widgets($widgets_manager) {
    // Check if Elementor is loaded
    if (!did_action('elementor/loaded')) {
        return;
    }
    
    // Load widget classes
    require_once NAVTALK_PLUGIN_DIR . 'includes/class-navtalk-elementor-widget-base.php';
    require_once NAVTALK_PLUGIN_DIR . 'includes/class-navtalk-elementor-avatar-list.php';
    require_once NAVTALK_PLUGIN_DIR . 'includes/class-navtalk-elementor-avatar-single.php';
    
    // Register widgets
    $widgets_manager->register(new NavTalk_Elementor_Avatar_List());
    $widgets_manager->register(new NavTalk_Elementor_Avatar_Single());
}
add_action('elementor/widgets/register', 'navtalk_register_elementor_widgets');

/**
 * Register NavTalk Widget Category
 */
function navtalk_add_elementor_widget_categories($elements_manager) {
    $elements_manager->add_category(
        'navtalk',
        [
            'title' => __('NavTalk', 'navtalk-digital-human'),
            'icon' => 'fa fa-plug',
        ]
    );
}
add_action('elementor/elements/categories_registered', 'navtalk_add_elementor_widget_categories');
