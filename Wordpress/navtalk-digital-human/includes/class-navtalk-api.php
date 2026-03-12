<?php
/**
 * NavTalk API Class
 * 
 * Handles communication with NavTalk backend API
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class NavTalk_API {
    /**
     * License key
     * 
     * @var string
     */
    private $license;
    
    /**
     * API base URL
     * 
     * @var string
     */
    private $api_url;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->license = get_option('navtalk_license', '');
        $this->api_url = NavTalk_Config::API_URL;
    }
    
    /**
     * Get avatar information by name
     * 
     * @param string $avatar_name Avatar name (e.g., "navtalk.Ethan")
     * @return array|false Avatar data or false on failure
     */
    public function get_avatar_info($avatar_name) {
        if (empty($this->license)) {
            return [
                'error' => true,
                'message' => 'License key is not configured. Please go to Settings > NavTalk Digital Human to configure.'
            ];
        }
        
        // Get all avatars from API
        $url = NavTalk_Config::get_api_endpoint('/api/open/v1/avatar/list');
        
        $response = wp_remote_get($url, [
            'headers' => [
                'license' => $this->license,
                'Content-Type' => 'application/json'
            ],
            'timeout' => 15,
            'sslverify' => true
        ]);
        
        // Check for errors
        if (is_wp_error($response)) {
            return [
                'error' => true,
                'message' => 'API request failed: ' . $response->get_error_message()
            ];
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        // Check response code
        if ($status_code !== 200) {
            return [
                'error' => true,
                'message' => 'API returned error: ' . $status_code
            ];
        }
        
        // Check if response is valid
        if (!isset($data['code']) || $data['code'] !== 200) {
            return [
                'error' => true,
                'message' => isset($data['message']) ? $data['message'] : 'Invalid API response'
            ];
        }
        
        // Check if data exists
        if (empty($data['data']) || !is_array($data['data'])) {
            return [
                'error' => true,
                'message' => 'No avatars found in your account'
            ];
        }
        
        // Find matching avatar
        foreach ($data['data'] as $avatar) {
            if (isset($avatar['name']) && $avatar['name'] === $avatar_name) {
                return $avatar;
            }
        }
        
        // Avatar not found
        return [
            'error' => true,
            'message' => 'Avatar "' . esc_html($avatar_name) . '" not found. Please check the avatar name or create it in your NavTalk account.'
        ];
    }
    
    /**
     * Get full image URL
     * 
     * @param string $avatar_url Avatar URL from API
     * @return string Full URL
     */
    public function get_full_image_url($avatar_url) {
        if (empty($avatar_url)) {
            return '';
        }
        
        // If URL already starts with http/https, return as is
        if (strpos($avatar_url, 'http') === 0) {
            return $avatar_url;
        }
        
        // Otherwise, prepend API base URL
        return $this->api_url . $avatar_url;
    }
    
    /**
     * Test API connection
     * 
     * @return array Test result
     */
    public function test_connection() {
        if (empty($this->license)) {
            return [
                'success' => false,
                'message' => 'License key is empty'
            ];
        }
        
        $url = NavTalk_Config::get_api_endpoint('/api/open/v1/avatar/list');
        
        $response = wp_remote_get($url, [
            'headers' => [
                'license' => $this->license,
                'Content-Type' => 'application/json'
            ],
            'timeout' => 10
        ]);
        
        if (is_wp_error($response)) {
            return [
                'success' => false,
                'message' => 'Connection failed: ' . $response->get_error_message()
            ];
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($status_code === 200 && isset($data['code']) && $data['code'] === 200) {
            $avatar_count = isset($data['data']) ? count($data['data']) : 0;
            return [
                'success' => true,
                'message' => 'Connection successful! Found ' . $avatar_count . ' avatar(s) in your account.'
            ];
        }
        
        return [
            'success' => false,
            'message' => 'API returned error: ' . (isset($data['message']) ? $data['message'] : 'Unknown error')
        ];
    }
}
