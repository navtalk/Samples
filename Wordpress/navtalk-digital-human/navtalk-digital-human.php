<?php
/**
 * Plugin Name: NavTalk Digital Human
 * Plugin URI: https://navtalk.ai
 * Description: Integrate NavTalk real-time digital human conversation into WordPress. Simply configure your license key and use [navtalk_avatar name="navtalk.Ethan"] shortcode to embed avatars.
 * Version: 1.0.0
 * Author: NavTalk
 * Author URI: https://navtalk.ai
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: navtalk-dh
 * Domain Path: /languages
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

// Plugin version
define('NAVTALK_VERSION', '1.0.0');

// Plugin directory path
define('NAVTALK_PLUGIN_DIR', plugin_dir_path(__FILE__));

// Plugin directory URL
define('NAVTALK_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * The code that runs during plugin activation.
 */
function activate_navtalk_dh() {
    // Add default options
    add_option('navtalk_license', '');
    
    // Flush rewrite rules
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'activate_navtalk_dh');

/**
 * The code that runs during plugin deactivation.
 */
function deactivate_navtalk_dh() {
    // Flush rewrite rules
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'deactivate_navtalk_dh');

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
function run_navtalk_dh() {
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
add_action('plugins_loaded', 'run_navtalk_dh');

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
            'title' => __('NavTalk', 'navtalk-dh'),
            'icon' => 'fa fa-plug',
        ]
    );
}
add_action('elementor/elements/categories_registered', 'navtalk_add_elementor_widget_categories');
