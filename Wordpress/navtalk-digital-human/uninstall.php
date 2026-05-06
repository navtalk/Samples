<?php
/**
 * Fired when the plugin is uninstalled.
 *
 * @package NavTalk_Digital_Human
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

$navtalk_option_names = [
    'navtalk_license',
    'navtalk_floating_enabled',
    'navtalk_floating_avatar',
    'navtalk_floating_position',
    'navtalk_floating_button_size',
    'navtalk_floating_button_color',
    'navtalk_floating_button_background',
    'navtalk_floating_button_bg_image',
    'navtalk_floating_button_bg_type',
    'navtalk_floating_button_icon_svg',
    'navtalk_floating_button_icon_image',
    'navtalk_floating_button_icon_type',
    'navtalk_floating_button_icon_color',
    'navtalk_show_toggle_button',
    'navtalk_floating_voice',
    'navtalk_floating_model',
    'navtalk_auto_hangup_enabled',
    'navtalk_auto_hangup_description',
    'navtalk_custom_css',
    'navtalk_installed_version',
];

foreach ($navtalk_option_names as $navtalk_option_name) {
    delete_option($navtalk_option_name);
}

if (function_exists('delete_post_meta_by_key')) {
    delete_post_meta_by_key('_navtalk_show_floating');
}
