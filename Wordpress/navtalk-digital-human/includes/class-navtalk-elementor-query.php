<?php
/**
 * NavTalk Elementor Query Provider
 * 
 * Provides NavTalk Avatars as a data source for Elementor Loop Grid
 */

if (!defined('ABSPATH')) {
    exit;
}

class NavTalk_Elementor_Query {
    
    const QUERY_ID = 'navtalk_avatars';
    
    public function __construct() {
        // Register query hooks
        add_filter('elementor/query/query_results', [$this, 'get_query_results'], 10, 2);
        add_action('elementor/query/get_query_args', [$this, 'modify_query_args'], 10, 2);
    }
    
    /**
     * Get query results
     * 
     * @param mixed $results
     * @param string $query_id
     * @return array
     */
    public function get_query_results($results, $query_id) {
        if (self::QUERY_ID !== $query_id) {
            return $results;
        }
        
        return $this->fetch_avatars();
    }
    
    /**
     * Modify query args
     * 
     * @param array $query_args
     * @param object $widget
     * @return array
     */
    public function modify_query_args($query_args, $widget) {
        // Modify query args if needed
        return $query_args;
    }
    
    /**
     * Fetch avatars from API
     * 
     * @return array
     */
    private function fetch_avatars() {
        $license = get_option('navtalk_license', '');
        if (empty($license)) {
            return [];
        }
        
        $api = new NavTalk_API();
        $url = NavTalk_Config::get_api_endpoint('/api/open/v1/avatar/list');
        
        $response = wp_remote_get($url, [
            'headers' => ['license' => $license],
            'timeout' => 15
        ]);
        
        if (is_wp_error($response)) {
            return [];
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (empty($data['data']) || !is_array($data['data'])) {
            return [];
        }

        // Convert avatars to WP_Post-like objects for Elementor compatibility
        $avatars = [];
        foreach ($data['data'] as $avatar) {
            $post = new stdClass();
            $post->ID = uniqid('avatar_', true);
            $post->post_type = 'navtalk_avatar';
            $name = isset($avatar['name']) ? $avatar['name'] : '';
            $post->post_title = $this->get_display_name($name);

            $post->avatar_data = $avatar;
            $post->avatar_id = isset($avatar['avatarId']) ? $avatar['avatarId'] : (isset($avatar['id']) ? $avatar['id'] : '');
            $post->avatar_name = $name;
            $post->avatar_image = isset($avatar['thumbnailUrl']) ? $avatar['thumbnailUrl'] : (isset($avatar['url']) ? $avatar['url'] : '');
            $post->avatar_status = isset($avatar['status']) ? $avatar['status'] : 'Unknown';
            $post->is_available = (strtoupper($post->avatar_status) === 'SUCCESS');

            $avatars[] = $post;
        }
        
        return $avatars;
    }
    
    /**
     * Get display name from full avatar name
     * 
     * @param string $name
     * @return string
     */
    private function get_display_name($name) {
        return $name;
    }
}
