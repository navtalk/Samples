=== NavTalk Digital Human ===
Contributors: navtalk
Tags: ai, avatar, chatbot, digital human, voice chat
Requires at least: 5.0
Tested up to: 6.9
Stable tag: 1.0.1
Requires PHP: 7.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Integrate NavTalk real-time AI avatar conversations into your WordPress site with ease.

== Description ==

NavTalk Digital Human is a WordPress plugin that enables you to embed interactive AI avatars on your website. Users can have real-time voice and video conversations with AI-powered digital humans directly from your WordPress pages.

= Features =

* Simple Configuration: Only requires a license key to get started
* Multiple Avatars: Support for multiple digital human avatars
* Real-time Communication: WebSocket and WebRTC powered conversations
* Voice Interaction: Full duplex voice communication
* Video Streaming: Real-time video of digital human responses
* Responsive Design: Works on desktop and mobile devices
* Customizable: Adjustable card dimensions and button text
* Secure: License-based authentication
* Elementor Integration: Custom widgets for Elementor page builder
* Multiple Shortcodes: Avatar card, button, floating button, link, and list

= Requirements =

* WordPress 5.0 or higher
* PHP 7.2 or higher
* Modern web browser with WebRTC support
* HTTPS enabled (required for microphone access)
* NavTalk account and license key

== Installation ==

= Automatic Installation =

1. Log in to your WordPress admin panel
2. Go to Plugins > Add New
3. Search for "NavTalk Digital Human"
4. Click "Install Now" and then "Activate"

= Manual Installation =

1. Download the plugin ZIP file
2. Go to Plugins > Add New > Upload Plugin
3. Choose the ZIP file and click "Install Now"
4. Click "Activate Plugin"

= Configuration =

1. Get your license key from [NavTalk Console](https://console.navtalk.ai)
2. Go to Settings > NavTalk Digital Human
3. Enter your license key
4. Click "Test Connection" (optional)
5. Click "Save Settings"

== Frequently Asked Questions ==

= What is NavTalk Digital Human? =

NavTalk Digital Human allows you to embed AI-powered avatars on your WordPress site that can have real-time voice and video conversations with visitors.

= Do I need a license key? =

Yes, you need a NavTalk license key. Sign up at https://navtalk.ai to get your key.

= What browsers are supported? =

Chrome 80+, Firefox 75+, Safari 13+, Edge 80+, Opera 67+. WebRTC support is required.

= Does this work with Elementor? =

Yes! The plugin includes custom Elementor widgets for easy drag-and-drop integration.

= Is HTTPS required? =

Yes, HTTPS is required for microphone access (browser security requirement).

= Can I use multiple avatars? =

Yes, you can use as many avatars as your NavTalk plan allows.

= How do I add an avatar to my page? =

Use the shortcode: [navtalk_avatar avatarId="your-avatar-id"] or use Elementor widgets.

= What shortcodes are available? =

* [navtalk_avatar] - Display avatar card
* [navtalk_button] - Display call button with instant connect
* [navtalk_floating] - Fixed position floating button
* [navtalk_link] - Text link that opens chat
* [navtalk_list] - Display grid of all your avatars

== Screenshots ==

1. Avatar card display with video preview
2. Admin settings page
3. Real-time chat modal with video
4. Elementor widget integration
5. Avatar list grid view
6. Mobile responsive design

== Changelog ==

= 1.0.0 =
* Initial release
* Basic shortcode functionality ([navtalk_avatar])
* Button shortcode ([navtalk_button]) with instant connect
* Floating button shortcode ([navtalk_floating])
* Link shortcode ([navtalk_link])
* Avatar list shortcode ([navtalk_list])
* WebSocket and WebRTC integration
* Real-time voice and video communication
* Chat transcript display
* Multiple avatar support
* Responsive design
* Admin configuration panel
* Elementor widgets integration
* Global floating widget feature
* Custom button styling options
* Inline video mode support
* Download button feature
* Avatar video preview support

== Upgrade Notice ==

= 1.0.0 =
Initial release of NavTalk Digital Human plugin.

== Additional Info ==

For support, documentation, and updates, visit:
* Website: https://navtalk.ai
* Documentation: https://docs.navtalk.ai
* Support: support@navtalk.ai

== Privacy Policy ==

This plugin does not collect or store any personal data on your WordPress site. All communications are directly between the user's browser and NavTalk's servers. Please review NavTalk's privacy policy for information about their data handling practices.

== Third Party Services ==

This plugin connects to NavTalk's external services:
* API: https://api.navtalk.ai - For avatar information and authentication
* WebSocket: wss://transfer.navtalk.ai - For real-time communication
* CDN: https://cdn.navtalk.ai - For avatar images and videos

By using this plugin, you agree to NavTalk's Terms of Service and Privacy Policy.
