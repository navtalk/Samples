<?php
/**
 * Plugin Name: NavTalk Digital Human
 * Description: Third-party integration: connect your site to NavTalk for real-time digital human conversations. Add a license key and use [navtalk_avatar avatarId="your-avatar-id"] to embed avatars.
 * Version: 1.1.7
 * Author: NavTalk
 * Author URI: https://navtalk.ai
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: navtalk-digital-human
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

// Plugin version
define('NAVTALK_VERSION', '1.1.7');

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
    add_option('navtalk_floating_title', 'NavTalk Assistant');
    add_option('navtalk_floating_subtitle', 'Ask me about NavTalk');
    add_option('navtalk_floating_position', 'bottom-right');
    add_option('navtalk_floating_button_size', '60px');
    add_option('navtalk_floating_button_color', '#667eea');
    // New: Toggle button and advanced configuration
    add_option('navtalk_show_toggle_button', '1');
    add_option('navtalk_floating_voice', '');
    add_option('navtalk_floating_model', '');
    add_option('navtalk_auto_hangup_enabled', '0');
    add_option('navtalk_auto_hangup_description', 'Call this function when the user says goodbye');

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
    // Admin functionality
    $admin = new NavTalk_Admin();
    $admin->init();
    
    // Public functionality
    $public = new NavTalk_Public();
    $public->init();
    
    // Shortcode functionality
    $shortcode = new NavTalk_Shortcode();
    $shortcode->init();
}
add_action('plugins_loaded', 'navtalk_digital_human_init');
/**
 * One-time cleanup and version tracking (e.g. remove deprecated options).
 */
function navtalk_digital_human_maybe_upgrade() {
    $stored = get_option('navtalk_installed_version', '');
    if ($stored === NAVTALK_VERSION) {
        return;
    }
    delete_option('navtalk_floating_js_callbacks');
    delete_option('navtalk_custom_css');
    delete_option('navtalk_floating_button_icon_svg');
    add_option('navtalk_floating_title', 'NavTalk Assistant');
    add_option('navtalk_floating_subtitle', 'Ask me about NavTalk');
    update_option('navtalk_installed_version', NAVTALK_VERSION);
}
add_action('plugins_loaded', 'navtalk_digital_human_maybe_upgrade', 1);

/**
 * Suggested text for the site Privacy Policy (Tools > Privacy).
 */
function navtalk_digital_human_register_privacy_policy_suggested_text() {
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
add_action('admin_init', 'navtalk_digital_human_register_privacy_policy_suggested_text');

// Shortcodes are parsed through WordPress core content and Shortcode block handling.

/**
 * Register Elementor Widgets
 */
function navtalk_digital_human_register_elementor_widgets($widgets_manager) {
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
add_action('elementor/widgets/register', 'navtalk_digital_human_register_elementor_widgets');

/**
 * Register NavTalk Widget Category
 */
function navtalk_digital_human_add_elementor_widget_categories($elements_manager) {
    $elements_manager->add_category(
        'navtalk',
        [
            'title' => __('NavTalk integration', 'navtalk-digital-human'),
            'icon' => 'fa fa-plug',
        ]
    );
}
add_action('elementor/elements/categories_registered', 'navtalk_digital_human_add_elementor_widget_categories');
