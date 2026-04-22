=== NavTalk Digital Human ===
Contributors: navtalk
Tags: ai, avatar, chatbot, digital human, voice chat
Requires at least: 5.0
Tested up to: 6.9
Stable tag: 1.0.3
Requires PHP: 7.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Integrate NavTalk real-time AI avatar conversations into your WordPress site with ease.

== Description ==

NavTalk Digital Human is a WordPress plugin that enables you to embed interactive AI avatars on your website. Users can have real-time voice and video conversations with AI-powered digital humans directly from your WordPress pages.

The plugin itself is free and the full plugin code is included in this package. Avatar and conversation features are provided by the NavTalk cloud service (Software as a Service); a NavTalk account and license key are required to use that service—this is not hidden or trial-locked code inside the plugin.

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

1. Get your license key from [NavTalk Console](https://console.navtalk.ai/#/projects)
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

= What happens if I delete (uninstall) the plugin? =

Uninstalling removes all settings stored in WordPress (including the license key) and the per-page "show digital human" meta. It does not delete your NavTalk account or data on navtalk.ai; manage those in the NavTalk console.

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

= 1.0.3 =
* i18n: load text domain on plugins_loaded
* Security: require valid nonces for admin AJAX (test connection, refresh avatars)
* Uninstall: add uninstall.php to remove plugin options and _navtalk_show_floating post meta
* Privacy: suggested policy text for Tools > Privacy (NavTalk data handling and policy links)
* Readme: clarify SaaS model vs. trial-locked local code

= 1.0.2 =
* Security and WordPress.org guidelines: removed admin-stored arbitrary JavaScript output; admin/settings scripts use `wp_add_inline_script`
* Floating widget custom CSS and collapse-state script use `wp_add_inline_style` / `wp_add_inline_script` instead of raw tags in the footer
* Shortcode output hardening for `navtalk_link` when license or API calls fail (escaped inner content)
* Readme: expanded External services disclosure with data flow and Terms/Privacy links
* Settings: floating position option sanitized against an allowed list (bottom/top corners)

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

= 1.0.3 =
Adds translations loading, stricter admin AJAX nonces, uninstall cleanup, and privacy policy helper text. No change required to shortcodes; re-save settings if you use "Test Connection".

= 1.0.2 =
Security and WordPress.org guideline updates. The settings field for arbitrary custom JavaScript has been removed; use a child theme or custom plugin to enqueue scripts if you need `window.navtalkOnInit` and related hooks.

= 1.0.0 =
Initial release of NavTalk Digital Human plugin.

== Additional Info ==

For support, documentation, and updates, visit:
* Website: https://navtalk.ai
* Documentation: https://docs.navtalk.ai
* Support: support@navtalk.ai

== Privacy Policy ==

This plugin does not collect or store visitor personal data in the WordPress database. The site administrator stores the NavTalk license key in WordPress options. When visitors use the digital human, audio, video, and chat-related data are processed by NavTalk's services as described below.

== External services ==

This plugin connects the visitor's browser and your WordPress site to NavTalk (operated by NavTalk / navtalk.ai) to load avatars and run real-time conversations.

* HTTPS REST API (`https://api.navtalk.ai`): Used when the plugin or wp-admin requests avatar lists, avatar details, and connection tests. Requests send your license key in HTTP headers and may receive avatar metadata and media URLs.
* WebSocket (`wss://transfer.navtalk.ai`): Used during an active session for real-time voice/video and messaging between the visitor's browser and NavTalk.
* Media delivery: Avatar images and preview videos are loaded from URLs returned by the API (for example from NavTalk CDN hosts such as `https://cdn.navtalk.ai`). The browser requests those assets directly.

Data sent to NavTalk includes at least your license key (from WordPress), session-related traffic over WebSocket (including voice/video where the user grants browser permissions), and any prompts or configuration you set in the plugin. What NavTalk logs or retains is governed by their policies.

Official policies (review before use):
* Terms of Service: https://navtalk.ai/policy/terms-of-service/
* Privacy Policy: https://navtalk.ai/policy/privacy-policy/

== Third Party Services ==

Same as "External services" above: the plugin depends on NavTalk API, WebSocket, and related media hosts. See that section for endpoints, data flow, and policy links.
