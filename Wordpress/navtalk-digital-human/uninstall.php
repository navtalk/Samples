<?php
/**
 * Fired when the plugin is uninstalled.
 *
 * @package NavTalk_Digital_Human
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

$option_names = [
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
    'navtalk_floating_prompt',
    'navtalk_floating_voice',
    'navtalk_floating_model',
    'navtalk_auto_hangup_enabled',
    'navtalk_auto_hangup_description',
    'navtalk_installed_version',
];

foreach ($option_names as $name) {
    delete_option($name);
}

if (function_exists('delete_post_meta_by_key')) {
    delete_post_meta_by_key('_navtalk_show_floating');
}
