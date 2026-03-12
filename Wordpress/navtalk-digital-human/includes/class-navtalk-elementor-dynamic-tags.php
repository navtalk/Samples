<?php
/**
 * NavTalk Elementor Dynamic Tags
 * 
 * Provides dynamic tags for accessing avatar data in Elementor templates
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Avatar Name Tag
 */
class NavTalk_Avatar_Name_Tag extends \Elementor\Core\DynamicTags\Tag {
    
    public function get_name() {
        return 'navtalk-avatar-name';
    }
    
    public function get_title() {
        return 'Avatar Name';
    }
    
    public function get_group() {
        return 'navtalk-avatars';
    }
    
    public function get_categories() {
        return [
            \Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY,
        ];
    }
    
    public function render() {
        global $post;
        if (isset($post->avatar_name)) {
            echo esc_html($post->post_title);
        }
    }
}

/**
 * Avatar Image Tag
 */
class NavTalk_Avatar_Image_Tag extends \Elementor\Core\DynamicTags\Tag {
    
    public function get_name() {
        return 'navtalk-avatar-image';
    }
    
    public function get_title() {
        return 'Avatar Image';
    }
    
    public function get_group() {
        return 'navtalk-avatars';
    }
    
    public function get_categories() {
        return [
            \Elementor\Modules\DynamicTags\Module::IMAGE_CATEGORY,
        ];
    }
    
    public function render() {
        global $post;
        if (isset($post->avatar_image)) {
            $api = new NavTalk_API();
            $image_url = $api->get_full_image_url($post->avatar_image);
            
            echo esc_url($image_url);
        }
    }
    
    public function get_value(array $options = []) {
        global $post;
        if (isset($post->avatar_image)) {
            $api = new NavTalk_API();
            return [
                'id' => 0,
                'url' => $api->get_full_image_url($post->avatar_image),
            ];
        }
        return [];
    }
}

/**
 * Call Button Tag
 */
class NavTalk_Call_Button_Tag extends \Elementor\Core\DynamicTags\Tag {
    
    public function get_name() {
        return 'navtalk-call-button';
    }
    
    public function get_title() {
        return 'Call Button';
    }
    
    public function get_group() {
        return 'navtalk-avatars';
    }
    
    public function get_categories() {
        return [
            \Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY,
        ];
    }
    
    protected function register_controls() {
        $this->add_control(
            'button_class',
            [
                'label' => 'Button Class',
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => 'navtalk-icon-button navtalk-call-btn navtalk-start-chat',
            ]
        );
    }
    
    public function render() {
        global $post;
        if (!isset($post->avatar_name) || !$post->is_available) {
            return;
        }
        
        $settings = $this->get_settings();
        $api = new NavTalk_API();
        $image_url = $api->get_full_image_url($post->avatar_image);
        
        $phone_icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>';
        
        echo sprintf(
            '<button class="%s" data-avatar-name="%s" data-avatar-img="%s" data-modal-width="%s" data-modal-height="%s" data-modal-overlay-color="%s" data-call-button-position="%s">%s</button>',
            esc_attr($settings['button_class']),
            esc_attr($post->avatar_name),
            esc_url($image_url),
            esc_attr(NavTalk_Config::DEFAULT_MODAL_WIDTH),
            esc_attr(NavTalk_Config::DEFAULT_MODAL_HEIGHT),
            esc_attr(NavTalk_Config::DEFAULT_MODAL_OVERLAY_COLOR),
            esc_attr(NavTalk_Config::DEFAULT_CALL_BUTTON_POSITION),
            $phone_icon
        );
    }
}

/**
 * Avatar Status Tag
 */
class NavTalk_Avatar_Status_Tag extends \Elementor\Core\DynamicTags\Tag {
    
    public function get_name() {
        return 'navtalk-avatar-status';
    }
    
    public function get_title() {
        return 'Avatar Status';
    }
    
    public function get_group() {
        return 'navtalk-avatars';
    }
    
    public function get_categories() {
        return [
            \Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY,
        ];
    }
    
    public function render() {
        global $post;
        if (isset($post->is_available)) {
            echo $post->is_available ? 'Available' : 'Unavailable';
        }
    }
}
